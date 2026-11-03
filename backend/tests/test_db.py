import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.db import open_db, reset_db
from app.main import create_app


def test_reset_db_creates_users_table(tmp_path):
    path = tmp_path / "nested" / "dir" / "app.db"
    reset_db(path)
    with open_db(path) as connection:
        columns = [row["name"] for row in connection.execute("PRAGMA table_info(users)")]
    assert columns == ["id", "email", "password_hash", "created_at"]


def test_users_email_is_unique(tmp_path):
    path = tmp_path / "app.db"
    reset_db(path)
    insert = "INSERT INTO users (email, password_hash) VALUES ('a@example.com', 'x')"
    with open_db(path) as connection:
        connection.execute(insert)
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute(insert)


def test_created_at_defaults_to_iso_timestamp(tmp_path):
    path = tmp_path / "app.db"
    reset_db(path)
    with open_db(path) as connection:
        connection.execute("INSERT INTO users (email, password_hash) VALUES ('a@example.com', 'x')")
        created_at = connection.execute("SELECT created_at FROM users").fetchone()[0]
    assert created_at.endswith("Z") and "T" in created_at


def test_startup_recreates_database_from_scratch(settings):
    with TestClient(create_app(settings)):
        with open_db(settings.db_path) as connection:
            connection.execute(
                "INSERT INTO users (email, password_hash) VALUES ('a@example.com', 'x')"
            )

    with TestClient(create_app(settings)):
        with open_db(settings.db_path) as connection:
            count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    assert count == 0


def test_db_dependency_commits_before_the_response():
    """A yield dependency in the default "request" scope would only commit after
    the response is sent, so a client's next request could miss the write."""
    from app.deps import Db

    assert Db.__metadata__[0].scope == "function"
