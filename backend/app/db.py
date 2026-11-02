"""SQLite database. It is temporary: rebuilt from SCHEMA on every startup."""

import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

SCHEMA = """
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""


@contextmanager
def open_db(path: Path) -> Iterator[sqlite3.Connection]:
    """Open a connection that commits on success, rolls back on error, and always closes."""
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
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
