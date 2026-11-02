import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.config import DEFAULT_DOCUMENTS_PATH
from app.documents import load_documents

ROOT = DEFAULT_DOCUMENTS_PATH.parent


def test_documents_json_loads():
    documents = load_documents(DEFAULT_DOCUMENTS_PATH)
    assert len(documents) == 11
    assert next(iter(documents)) == "mutual-nda"


def test_every_document_has_a_template_and_fields():
    for spec in load_documents(DEFAULT_DOCUMENTS_PATH).values():
        assert (ROOT / spec.template).is_file(), spec.template
        assert spec.fields, spec.id


def test_every_catalog_template_is_supported():
    """Every template in catalog.json can be drafted (the NDA cover page is built in)."""
    catalog = json.loads((ROOT / "catalog.json").read_text("utf-8"))
    supported = {spec.template for spec in load_documents(DEFAULT_DOCUMENTS_PATH).values()}
    expected = {entry["filename"] for entry in catalog} - {"templates/Mutual-NDA-coverpage.md"}
    assert supported == expected


def write_specs(tmp_path: Path, specs: list[dict]) -> Path:
    path = tmp_path / "documents.json"
    path.write_text(json.dumps(specs))
    return path


def spec(id_: str = "doc", keys: tuple[str, ...] = ("a",)) -> dict:
    return {
        "id": id_,
        "name": "Doc",
        "description": "A doc",
        "template": "templates/doc.md",
        "partyRoles": ["Provider", "Customer"],
        "fields": [{"key": key, "label": key, "description": key} for key in keys],
    }


def test_rejects_duplicate_document_ids(tmp_path):
    with pytest.raises(ValueError, match="duplicate document ids"):
        load_documents(write_specs(tmp_path, [spec(), spec()]))


def test_rejects_duplicate_field_keys(tmp_path):
    with pytest.raises(ValidationError, match="duplicate field keys"):
        load_documents(write_specs(tmp_path, [spec(keys=("a", "a"))]))


@pytest.mark.parametrize("key", ["Bad", "has space", "1st", ""])
def test_rejects_invalid_field_keys(tmp_path, key):
    with pytest.raises(ValidationError):
        load_documents(write_specs(tmp_path, [spec(keys=(key,))]))


def test_field_kind_defaults_to_text(tmp_path):
    [loaded] = load_documents(write_specs(tmp_path, [spec()])).values()
    assert loaded.fields[0].kind == "text"
    assert loaded.fields[0].default == ""
    assert loaded.party_roles == ("Provider", "Customer")
