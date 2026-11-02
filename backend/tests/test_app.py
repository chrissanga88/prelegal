from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_serves_login_page_at_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "login page" in response.text


def test_serves_nested_page(client):
    response = client.get("/nda/")
    assert response.status_code == 200
    assert "nda page" in response.text


def test_redirects_to_trailing_slash(client):
    response = client.get("/nda", follow_redirects=False)
    assert response.status_code in (307, 308)
    assert response.headers["location"].endswith("/nda/")
    assert "nda page" in client.get("/nda").text


def test_unknown_path_serves_404_page(client):
    response = client.get("/does-not-exist")
    assert response.status_code == 404
    assert "not found page" in response.text


def test_unknown_api_path_is_404(client):
    assert client.get("/api/nope").status_code == 404


def test_api_only_without_static_dir(tmp_path):
    settings = Settings(db_path=tmp_path / "test.db", static_dir=None)
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/").status_code == 404


def test_missing_static_dir_is_ignored(tmp_path):
    settings = Settings(db_path=tmp_path / "test.db", static_dir=tmp_path / "missing")
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/health").status_code == 200
