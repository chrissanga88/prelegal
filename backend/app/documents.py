"""The legal documents Prelegal can draft, loaded from documents.json.

documents.json (in the project root) is the single source of truth for each
document's cover page fields. The frontend bundles the same file (see
frontend/scripts/sync-templates.mjs) to render previews and PDFs.
"""

import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

FieldKind = Literal["text", "longtext", "date"]


class FieldSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    key: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    label: str
    description: str
    kind: FieldKind = "text"
    default: str = ""


class DocumentSpec(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, frozen=True)

    id: str = Field(pattern=r"^[a-z][a-z0-9-]*$")
    name: str
    description: str
    template: str
    party_roles: tuple[str, str]
    fields: tuple[FieldSpec, ...]

    @model_validator(mode="after")
    def check_unique_keys(self) -> "DocumentSpec":
        keys = [field.key for field in self.fields]
        if len(keys) != len(set(keys)):
            raise ValueError(f"{self.id}: duplicate field keys")
        return self


def load_documents(path: Path) -> dict[str, DocumentSpec]:
    """Load the document specs, keyed by id, in catalog order."""
    specs = [DocumentSpec.model_validate(item) for item in json.loads(path.read_text("utf-8"))]
    documents = {spec.id: spec for spec in specs}
    if len(documents) != len(specs):
        raise ValueError(f"{path}: duplicate document ids")
    return documents
