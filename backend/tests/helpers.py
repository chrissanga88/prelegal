"""Test helpers shared across test modules."""

from fastapi.testclient import TestClient

PASSWORD = "correct horse battery"


def sign_up(client: TestClient, email: str = "ada@example.com", password: str = PASSWORD):
    """Create an account; the client keeps its session cookie."""
    response = client.post("/api/auth/signup", json={"email": email, "password": password})
    assert response.status_code == 201, response.text
    return response
