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
