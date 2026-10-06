from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "data" / "cognite.db"
SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def _schema_sql() -> str:
    if SCHEMA_PATH.exists():
        return SCHEMA_PATH.read_text(encoding="utf-8")
    return """
CREATE TABLE IF NOT EXISTS interventions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    passage_markdown TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL,
    questions_json TEXT NOT NULL,
    created_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS user_arms (
    user_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    alpha REAL DEFAULT 1.0,
    beta REAL DEFAULT 1.0,
    PRIMARY KEY (user_id, tag)
);

CREATE TABLE IF NOT EXISTS session_history (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tag TEXT,
    completed INTEGER NOT NULL,
    accuracy REAL,
    reading_seconds INTEGER,
    reward REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(_schema_sql())


def cleanup_expired_interventions(now: datetime | None = None) -> None:
    now_value = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    with get_connection() as conn:
        conn.execute(
            "DELETE FROM interventions WHERE expires_at <= ?",
            (now_value.isoformat(),),
        )


init_db()
