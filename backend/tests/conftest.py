from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def static_dir(tmp_path: Path) -> Path:
    """A minimal stand-in for the Next.js static export."""
    out = tmp_path / "out"
    (out / "draft").mkdir(parents=True)
    (out / "index.html").write_text("<h1>login page</h1>")
    (out / "draft" / "index.html").write_text("<h1>draft page</h1>")
    (out / "404.html").write_text("<h1>not found page</h1>")
    return out


@pytest.fixture
def settings(tmp_path: Path, static_dir: Path) -> Settings:
    return Settings(db_path=tmp_path / "data" / "test.db", static_dir=static_dir)


@pytest.fixture
def client(settings: Settings):
    # Entering the context manager runs the lifespan, which builds the database.
    with TestClient(create_app(settings)) as test_client:
        yield test_client

