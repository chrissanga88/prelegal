"""Sign-up, sign-in and cookie sessions.

Passwords are hashed with scrypt (Python's standard library) and a random salt.
A session is a random token in an HttpOnly cookie; only its SHA-256 hash is
stored, so a leaked database can't be used to sign in.
"""

import hashlib
import hmac
import secrets
import sqlite3
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator

from app.deps import Db

SESSION_COOKIE = "prelegal_session"
SESSION_LIFETIME = timedelta(days=7)
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

# scrypt cost parameters (n=2^14, r=8, p=1: about 16 MB and tens of milliseconds per hash).
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**14, 8, 1

SIGN_IN_REQUIRED = "Please sign in to continue."
BAD_CREDENTIALS = "Incorrect email or password."


# --- Passwords ---


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P)
    return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, digest = stored.split("$")
        if scheme != "scrypt":
            return False
        candidate = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p)
        )
    except ValueError:
        return False
    return hmac.compare_digest(candidate.hex(), digest)


# Checked against unknown emails so a failed sign-in takes the same time either way.
_DUMMY_HASH = hash_password(secrets.token_urlsafe())


# --- Sessions ---


class User(BaseModel):
    id: int
    email: str


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def create_session(db: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = _iso(datetime.now(UTC) + SESSION_LIFETIME)
    db.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (_token_hash(token), user_id, expires_at),
    )
    return token


def user_for_token(db: sqlite3.Connection, token: str) -> User | None:
    row = db.execute(
        """SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id
           WHERE sessions.token_hash = ? AND sessions.expires_at > ?""",
        (_token_hash(token), _iso(datetime.now(UTC))),
    ).fetchone()
    return User(id=row["id"], email=row["email"]) if row else None


def current_user(
    db: Db, prelegal_session: Annotated[str | None, Cookie()] = None
) -> User:
    """The signed-in user, or a 401 for requests without a valid session."""
    user = user_for_token(db, prelegal_session) if prelegal_session else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=SIGN_IN_REQUIRED)
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,  # not readable from JavaScript
        samesite="lax",  # not sent on cross-site POSTs
        path="/",
        # Not `secure`: the app is served over plain http://localhost. Behind
        # HTTPS in production this should be set.
    )


# --- API ---


class Credentials(BaseModel):
    email: Annotated[str, Field(max_length=254)]
    password: Annotated[str, Field(max_length=MAX_PASSWORD_LENGTH)]

    @field_validator("email")
    @classmethod
    def normalize_email(cls, email: str) -> str:
        email = email.strip().lower()
        local, _, domain = email.partition("@")
        if not local or "." not in domain or " " in email:
            raise ValueError("Enter a valid email address.")
        return email


class SignUp(Credentials):
    @field_validator("password")
    @classmethod
    def check_length(cls, password: str) -> str:
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Use at least {MIN_PASSWORD_LENGTH} characters.")
        return password


class Account(BaseModel):
    email: str


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def sign_up(body: SignUp, response: Response, db: Db) -> Account:
    try:
        cursor = db.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (body.email, hash_password(body.password)),
        )
    except sqlite3.IntegrityError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="An account with this email already exists."
        )
    _set_session_cookie(response, create_session(db, cursor.lastrowid))
    return Account(email=body.email)


@router.post("/signin")
def sign_in(body: Credentials, response: Response, db: Db) -> Account:
    row = db.execute(
        "SELECT id, email, password_hash FROM users WHERE email = ?", (body.email,)
    ).fetchone()
    if not verify_password(body.password, row["password_hash"] if row else _DUMMY_HASH) or not row:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=BAD_CREDENTIALS)
    _set_session_cookie(response, create_session(db, row["id"]))
    return Account(email=row["email"])


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT)
def sign_out(
    response: Response, db: Db, prelegal_session: Annotated[str | None, Cookie()] = None
) -> None:
    if prelegal_session:
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (_token_hash(prelegal_session),))
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me")
def me(user: CurrentUser) -> Account:
    return Account(email=user.email)
