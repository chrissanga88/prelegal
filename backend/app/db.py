"""SQLite database. It is temporary: rebuilt from SCHEMA on every startup."""

import sqlite3
from pathlib import Path

SCHEMA = """
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""


def connect(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    return connection


def reset_db(path: Path) -> None:
    """Delete any existing database at ``path`` and create a fresh, empty one."""
    path.parent.mkdir(parents=True, exist_ok=True)
    for suffix in ("", "-wal", "-shm", "-journal"):
        Path(f"{path}{suffix}").unlink(missing_ok=True)
    with connect(path) as connection:
        connection.executescript(SCHEMA)
    connection.close()
