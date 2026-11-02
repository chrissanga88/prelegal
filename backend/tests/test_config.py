from pathlib import Path

from app.config import Settings


def test_defaults(monkeypatch):
    monkeypatch.delenv("PRELEGAL_DB_PATH", raising=False)
    monkeypatch.delenv("PRELEGAL_STATIC_DIR", raising=False)
    settings = Settings.from_env()
    assert settings.db_path == Path("data/prelegal.db")
    assert settings.static_dir is None


def test_env_overrides(monkeypatch):
    monkeypatch.setenv("PRELEGAL_DB_PATH", "/tmp/x.db")
    monkeypatch.setenv("PRELEGAL_STATIC_DIR", "/srv/static")
    settings = Settings.from_env()
    assert settings.db_path == Path("/tmp/x.db")
    assert settings.static_dir == Path("/srv/static")


def test_empty_static_dir_means_api_only(monkeypatch):
    monkeypatch.setenv("PRELEGAL_STATIC_DIR", "")
    assert Settings.from_env().static_dir is None
