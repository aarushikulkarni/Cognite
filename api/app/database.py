from collections.abc import Generator
from datetime import datetime, timezone

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
import dotenv
dotenv.load_dotenv()
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_legacy_user_ids() -> None:
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    id_column = next(column for column in inspector.get_columns("users") if column["name"] == "id")
    if "INT" in str(id_column["type"]).upper():
        return

    connection = engine.raw_connection()
    cursor = connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("BEGIN")
        cursor.execute("SELECT id, email, hashed_password, created_at FROM users")
        users = cursor.fetchall()
        user_ids: dict[str, int] = {}
        cursor.execute(
            "CREATE TABLE users_migrated ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, email VARCHAR(320) NOT NULL, "
            "hashed_password VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL)"
        )
        for old_id, email, password_hash, created_at in users:
            cursor.execute(
                "INSERT INTO users_migrated (email, hashed_password, created_at) VALUES (?, ?, ?)",
                (email, password_hash, created_at or datetime.now(timezone.utc).isoformat()),
            )
            user_ids[str(old_id)] = cursor.lastrowid

        has_logs = cursor.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='intervention_logs'"
        ).fetchone() is not None
        if has_logs:
            cursor.execute("SELECT * FROM intervention_logs")
            log_columns = [column[0] for column in cursor.description]
            logs = [dict(zip(log_columns, row)) for row in cursor.fetchall()]
            cursor.execute(
                "CREATE TABLE intervention_logs_migrated ("
                "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "user_id INTEGER NOT NULL REFERENCES users_migrated(id), "
                "category VARCHAR(64) NOT NULL, mode VARCHAR(32) NOT NULL, quiz_score FLOAT, "
                "completion_time_ms INTEGER NOT NULL DEFAULT 0, skipped BOOLEAN NOT NULL DEFAULT 0, "
                "timestamp DATETIME NOT NULL, intervention_id VARCHAR)"
            )
            for log in logs:
                new_user_id = user_ids.get(str(log.get("user_id")))
                if new_user_id is None:
                    raise ValueError("Cannot migrate intervention log with missing user")
                cursor.execute(
                    "INSERT INTO intervention_logs_migrated "
                    "(user_id, category, mode, quiz_score, completion_time_ms, skipped, timestamp, intervention_id) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        new_user_id,
                        log["category"],
                        log["mode"],
                        log.get("quiz_score"),
                        log.get("completion_time_ms") or 0,
                        log.get("skipped", False),
                        log.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                        log.get("intervention_id"),
                    ),
                )

        if has_logs:
            cursor.execute("DROP TABLE intervention_logs")
        cursor.execute("DROP TABLE users")
        cursor.execute("ALTER TABLE users_migrated RENAME TO users")
        cursor.execute("CREATE UNIQUE INDEX ix_users_email ON users(email)")
        if has_logs:
            cursor.execute("ALTER TABLE intervention_logs_migrated RENAME TO intervention_logs")
            cursor.execute("CREATE INDEX ix_intervention_logs_user_id ON intervention_logs(user_id)")
            cursor.execute(
                "CREATE UNIQUE INDEX ix_intervention_logs_intervention_id "
                "ON intervention_logs(intervention_id)"
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        connection.close()