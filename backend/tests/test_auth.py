from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.auth import SESSION_COOKIE, hash_password, verify_password
from app.db import open_db
from app.main import create_app
from tests.helpers import PASSWORD, sign_up


# --- Passwords ---


def test_password_hash_round_trip():
    stored = hash_password("s3cret-pass")
    assert stored.startswith("scrypt$")
    assert "s3cret-pass" not in stored
    assert verify_password("s3cret-pass", stored)
    assert not verify_password("wrong-pass", stored)


def test_hashes_are_salted():
    assert hash_password("same") != hash_password("same")


@pytest.mark.parametrize("stored", ["", "plain", "bcrypt$1$2$3$aa$bb", "scrypt$x$8$1$aa$bb", "scrypt$16384$8$1$zz$bb"])
def test_malformed_hashes_never_verify(stored):
    assert not verify_password("anything", stored)


# --- Sign up ---


def test_sign_up_creates_account_and_session(client, settings):
    response = sign_up(client, email="  Ada@Example.COM ")
    assert response.json() == {"email": "ada@example.com"}

    cookie = response.headers["set-cookie"]
    assert cookie.startswith(f"{SESSION_COOKIE}=")
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie
    assert client.get("/api/auth/me").json() == {"email": "ada@example.com"}

    with open_db(settings.db_path) as db:
        user = db.execute("SELECT email, password_hash FROM users").fetchone()
        token_hash = db.execute("SELECT token_hash FROM sessions").fetchone()[0]
    assert user["email"] == "ada@example.com"
    assert PASSWORD not in user["password_hash"]
    # Only a hash of the cookie token is stored.
    assert client.cookies[SESSION_COOKIE] != token_hash


def test_sign_up_rejects_duplicate_email_case_insensitively(client):
    sign_up(client)
    response = client.post("/api/auth/signup", json={"email": "ADA@example.com", "password": PASSWORD})
    assert response.status_code == 409
    assert response.json() == {"detail": "An account with this email already exists."}


@pytest.mark.parametrize(
    "body",
    [
        {"email": "not-an-email", "password": PASSWORD},
        {"email": "ada@localhost", "password": PASSWORD},
        {"email": "a da@example.com", "password": PASSWORD},
        {"email": "ada@example.com", "password": "short"},
        {"email": "ada@example.com", "password": "x" * 129},
        {"email": "ada@example.com"},
    ],
)
def test_sign_up_validates_input(client, body):
    assert client.post("/api/auth/signup", json=body).status_code == 422


# --- Sign in and out ---


def test_sign_in_with_correct_password(settings):
    with TestClient(create_app(settings)) as client:
        sign_up(client)
        client.post("/api/auth/signout")
        assert client.get("/api/auth/me").status_code == 401

        response = client.post(
            "/api/auth/signin", json={"email": "ADA@example.com", "password": PASSWORD}
        )
        assert response.status_code == 200
        assert response.json() == {"email": "ada@example.com"}
        assert client.get("/api/auth/me").status_code == 200


@pytest.mark.parametrize(
    "body",
    [
        {"email": "ada@example.com", "password": "wrong password"},
        {"email": "nobody@example.com", "password": PASSWORD},
    ],
)
def test_sign_in_failures_share_one_message(client, body):
    sign_up(client)
    client.cookies.clear()
    response = client.post("/api/auth/signin", json=body)
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password."}
    assert SESSION_COOKIE not in response.headers.get("set-cookie", "")


def test_sign_out_ends_the_session_on_the_server(client, settings):
    sign_up(client)
    token = client.cookies[SESSION_COOKIE]

    response = client.post("/api/auth/signout")
    assert response.status_code == 204
    assert f'{SESSION_COOKIE}=""' in response.headers["set-cookie"]

    # Replaying the old cookie no longer works.
    client.cookies.set(SESSION_COOKIE, token)
    assert client.get("/api/auth/me").status_code == 401
    with open_db(settings.db_path) as db:
        assert db.execute("SELECT COUNT(*) FROM sessions").fetchone()[0] == 0


def test_sign_out_without_a_session_is_fine(client):
    assert client.post("/api/auth/signout").status_code == 204


# --- Sessions ---


def test_me_requires_a_valid_session(client):
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set(SESSION_COOKIE, "forged")
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {"detail": "Please sign in to continue."}


def test_expired_sessions_are_rejected(client, settings):
    sign_up(client)
    past = (datetime.now(UTC) - timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open_db(settings.db_path) as db:
        db.execute("UPDATE sessions SET expires_at = ?", (past,))
    assert client.get("/api/auth/me").status_code == 401


def test_accounts_are_wiped_on_restart(settings):
    with TestClient(create_app(settings)) as client:
        sign_up(client)
    with TestClient(create_app(settings)) as client:
        response = client.post("/api/auth/signin", json={"email": "ada@example.com", "password": PASSWORD})
        assert response.status_code == 401
