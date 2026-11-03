"""A user's saved documents: each draft together with the chat that produced it.

The frontend saves after every AI reply (POST to create, PUT afterwards), and
the dashboard lists, reopens and deletes them. Every query is scoped to the
signed-in user, so other users' documents behave as if they don't exist (404).
"""

import json
import sqlite3
from typing import Annotated

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

from app.auth import CurrentUser
from app.chat import ChatMessage, DocumentDraft
from app.db import NOW
from app.deps import Db, Specs
from app.documents import DocumentSpec

# A long conversation is still small; this only bounds abuse.
MAX_SAVED_MESSAGES = 500

NOT_FOUND = "Document not found."


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DocumentIn(BaseModel):
    draft: DocumentDraft
    messages: Annotated[list[ChatMessage], Field(max_length=MAX_SAVED_MESSAGES)]

    @model_validator(mode="after")
    def require_document_type(self) -> "DocumentIn":
        if self.draft.document_type is None:
            raise ValueError("choose a document type before saving")
        return self


class DocumentSummary(CamelModel):
    id: int
    document_type: str
    title: str
    created_at: str
    updated_at: str


class SavedDocument(DocumentSummary):
    draft: DocumentDraft
    messages: list[ChatMessage]


def document_title(spec: DocumentSpec, draft: DocumentDraft) -> str:
    """E.g. "Mutual Non-Disclosure Agreement - Acme - Globex"."""
    companies = [party.company.strip() for party in draft.parties if party.company.strip()]
    return " - ".join([spec.name, *companies])


def _summary(row: sqlite3.Row, specs: dict[str, DocumentSpec]) -> DocumentSummary:
    draft = DocumentDraft.model_validate_json(row["draft"])
    spec = specs.get(row["document_type"])
    return DocumentSummary(
        id=row["id"],
        document_type=row["document_type"],
        title=document_title(spec, draft) if spec else row["document_type"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _saved(row: sqlite3.Row, specs: dict[str, DocumentSpec]) -> SavedDocument:
    return SavedDocument(
        **_summary(row, specs).model_dump(),
        draft=DocumentDraft.model_validate_json(row["draft"]),
        messages=json.loads(row["messages"]),
    )


def _check_type(body: DocumentIn, specs: dict[str, DocumentSpec]) -> None:
    if body.draft.document_type not in specs:
        raise HTTPException(422, detail="Unknown document type")


def _serialize(body: DocumentIn) -> tuple[str, str, str]:
    messages = json.dumps([message.model_dump() for message in body.messages])
    return body.draft.document_type, body.draft.model_dump_json(by_alias=True), messages


def _fetch(db: sqlite3.Connection, user_id: int, document_id: int) -> sqlite3.Row:
    row = db.execute(
        "SELECT * FROM documents WHERE id = ? AND user_id = ?", (document_id, user_id)
    ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=NOT_FOUND)
    return row


router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("")
def list_documents(user: CurrentUser, db: Db, specs: Specs) -> list[DocumentSummary]:
    rows = db.execute(
        "SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC, id DESC", (user.id,)
    ).fetchall()
    return [_summary(row, specs) for row in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_document(body: DocumentIn, user: CurrentUser, db: Db, specs: Specs) -> SavedDocument:
    _check_type(body, specs)
    cursor = db.execute(
        "INSERT INTO documents (user_id, document_type, draft, messages) VALUES (?, ?, ?, ?)",
        (user.id, *_serialize(body)),
    )
    return _saved(_fetch(db, user.id, cursor.lastrowid), specs)


@router.get("/{document_id}")
def get_document(document_id: int, user: CurrentUser, db: Db, specs: Specs) -> SavedDocument:
    return _saved(_fetch(db, user.id, document_id), specs)


@router.put("/{document_id}")
def update_document(
    document_id: int, body: DocumentIn, user: CurrentUser, db: Db, specs: Specs
) -> SavedDocument:
    _check_type(body, specs)
    _fetch(db, user.id, document_id)
    db.execute(
        f"UPDATE documents SET document_type = ?, draft = ?, messages = ?, updated_at = {NOW} "
        "WHERE id = ?",
        (*_serialize(body), document_id),
    )
    return _saved(_fetch(db, user.id, document_id), specs)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, user: CurrentUser, db: Db) -> Response:
    _fetch(db, user.id, document_id)
    db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
