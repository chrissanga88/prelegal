import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.helpers import sign_up

PARTY = {"printName": "", "title": "", "company": "", "noticeAddress": ""}


def nda_body(company: str = "", governing_law: str = "") -> dict:
    return {
        "draft": {
            "documentType": "mutual-nda",
            "fields": {"governing_law": governing_law},
            "parties": [PARTY | {"company": company}, PARTY],
        },
        "messages": [
            {"role": "user", "content": "An NDA please"},
            {"role": "assistant", "content": "Sure. Who is the other party?"},
        ],
    }


@pytest.fixture
def user(client):
    sign_up(client)
    return client


def create(client: TestClient, body: dict | None = None) -> dict:
    response = client.post("/api/documents", json=body or nda_body())
    assert response.status_code == 201, response.text
    return response.json()


def test_create_returns_the_saved_document(user):
    saved = create(user, nda_body(company="Acme", governing_law="Delaware"))
    assert saved["id"] > 0
    assert saved["documentType"] == "mutual-nda"
    assert saved["title"] == "Mutual Non-Disclosure Agreement - Acme"
    assert saved["draft"]["fields"] == {"governing_law": "Delaware"}
    assert saved["draft"]["parties"][0]["company"] == "Acme"
    assert saved["messages"][1] == {"role": "assistant", "content": "Sure. Who is the other party?"}
    assert saved["createdAt"].endswith("Z") and saved["updatedAt"].endswith("Z")


def test_get_list_update_and_delete(user):
    first = create(user)
    second = create(user, nda_body(company="Globex"))

    assert user.get(f"/api/documents/{first['id']}").json() == first

    updated = user.put(f"/api/documents/{first['id']}", json=nda_body(company="Initech"))
    assert updated.status_code == 200
    assert updated.json()["title"] == "Mutual Non-Disclosure Agreement - Initech"

    listing = user.get("/api/documents").json()
    # Most recently updated first; summaries carry no draft or messages.
    assert [doc["id"] for doc in listing] == [first["id"], second["id"]]
    assert set(listing[0]) == {"id", "documentType", "title", "createdAt", "updatedAt"}

    assert user.delete(f"/api/documents/{first['id']}").status_code == 204
    assert user.get(f"/api/documents/{first['id']}").status_code == 404
    assert [doc["id"] for doc in user.get("/api/documents").json()] == [second["id"]]


def test_switching_document_type_on_update(user):
    saved = create(user)
    body = nda_body()
    body["draft"]["documentType"] = "pilot-agreement"
    updated = user.put(f"/api/documents/{saved['id']}", json=body).json()
    assert updated["documentType"] == "pilot-agreement"
    assert updated["title"] == "Pilot Agreement"


def test_users_only_see_their_own_documents(settings):
    app = create_app(settings)
    # Two clients (separate cookie jars) on one app, so they share the database.
    with TestClient(app) as ada, TestClient(app) as bob:
        sign_up(ada, "ada@example.com")
        sign_up(bob, "bob@example.com")
        ada_doc = create(ada)

        assert bob.get("/api/documents").json() == []
        for method in ("get", "delete"):
            assert getattr(bob, method)(f"/api/documents/{ada_doc['id']}").status_code == 404
        assert bob.put(f"/api/documents/{ada_doc['id']}", json=nda_body()).status_code == 404
        assert ada.get(f"/api/documents/{ada_doc['id']}").status_code == 200


@pytest.mark.parametrize(
    "request_",
    [("get", "/api/documents"), ("post", "/api/documents"), ("get", "/api/documents/1"),
     ("put", "/api/documents/1"), ("delete", "/api/documents/1")],
)
def test_requires_sign_in(client, request_):
    method, path = request_
    kwargs = {"json": nda_body()} if method in ("post", "put") else {}
    assert getattr(client, method)(path, **kwargs).status_code == 401


@pytest.mark.parametrize(
    "mutate",
    [
        lambda body: body["draft"].update(documentType=None),
        lambda body: body["draft"].update(documentType="employment-contract"),
        lambda body: body.update(messages=[{"role": "system", "content": "x"}]),
        lambda body: body.update(messages=[{"role": "user", "content": "x"}] * 501),
        lambda body: body.pop("messages"),
    ],
)
def test_rejects_invalid_documents(user, mutate):
    body = nda_body()
    mutate(body)
    assert user.post("/api/documents", json=body).status_code == 422
    saved = create(user)
    assert user.put(f"/api/documents/{saved['id']}", json=body).status_code == 422


def test_unknown_document_is_404(user):
    assert user.get("/api/documents/999").status_code == 404
    assert user.put("/api/documents/999", json=nda_body()).status_code == 404
    assert user.delete("/api/documents/999").status_code == 404
