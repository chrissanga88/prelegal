"""SQLite database. It is temporary: rebuilt from SCHEMA on every startup."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

# The current UTC time in SQL, as e.g. 2026-11-02T09:30:12.345Z. Milliseconds keep
# "most recently updated" ordering right for edits made within the same second.
NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"

SCHEMA = f"""
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT ({NOW})
);

-- Sign-in sessions. Only a SHA-256 hash of the cookie token is stored.
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ({NOW})
);

-- Documents a user has drafted: the draft and the chat that produced it, as JSON.
CREATE TABLE documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    draft         TEXT NOT NULL,
    messages      TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT ({NOW}),
    updated_at    TEXT NOT NULL DEFAULT ({NOW})
);
CREATE INDEX documents_by_user ON documents (user_id, updated_at);
"""


@contextmanager
def open_db(path: Path) -> Iterator[sqlite3.Connection]:
    """Open a connection that commits on success, rolls back on error, and always closes."""
    # FastAPI may run a dependency and its route on different worker threads.
    connection = sqlite3.connect(path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:  # commit or roll back the transaction
            yield connection
    finally:
        connection.close()


def reset_db(path: Path) -> None:
    """Delete any existing database at ``path`` and create a fresh, empty one."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    with open_db(path) as connection:
        connection.executescript(SCHEMA)
