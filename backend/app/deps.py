"""Shared FastAPI dependencies. create_app stores its state on ``app.state``."""

import sqlite3
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request

from app.config import Settings
from app.db import open_db
from app.documents import DocumentSpec


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_specs(request: Request) -> dict[str, DocumentSpec]:
    return request.app.state.specs


def get_db(settings: Annotated[Settings, Depends(get_settings)]) -> Iterator[sqlite3.Connection]:
    """One connection per request, committed when the request succeeds."""
    with open_db(settings.db_path) as connection:
        yield connection


Db = Annotated[sqlite3.Connection, Depends(get_db)]
Specs = Annotated[dict[str, DocumentSpec], Depends(get_specs)]
