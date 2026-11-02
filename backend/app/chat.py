"""AI chat that picks a legal document and drafts its cover page with Claude Haiku.

The API is stateless: each request carries the whole conversation plus the
current draft (the chosen document type, its field values and the two parties),
and the model returns its reply together with a complete, updated draft.

The Structured Outputs schema is built per turn from the current document's spec
(see documents.py), so the model sees exactly that document's fields, each with
its own description. Until a document is chosen, it only returns a reply and,
once it is clear, the document type. When the type changes, the new document is
started (keeping values both documents share) and the model is asked again with
the new schema, so the same reply can already fill in its fields.
"""

import json
from datetime import date
from typing import Annotated, Any, Literal

from anthropic import Anthropic
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, create_model, model_validator
from pydantic.alias_generators import to_camel

from app.documents import DocumentSpec

MODEL = "claude-haiku-5-5"
MAX_TOKENS = 16000
OUTPUT_CONFIG = {"effort": "low"}

# Party fields appear in a non-breaking signature table in the PDF, so keep them short.
PARTY_FIELD_MAX_LENGTH = 200
TEXT_FIELD_MAX_LENGTH = 2000
MAX_FIELDS = 50
# Bounds on a single request, to cap the cost of one model call.
MAX_MESSAGES = 60
MAX_MESSAGE_LENGTH = 4000


class ChatError(Exception):
    """The model did not produce a usable reply."""


# --- API contract (mirrors frontend/lib/documents/types.ts) ---


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


PartyText = Annotated[str, Field(max_length=PARTY_FIELD_MAX_LENGTH)]
LongText = Annotated[str, Field(max_length=TEXT_FIELD_MAX_LENGTH)]


class Party(CamelModel):
    print_name: PartyText
    title: PartyText
    company: PartyText
    notice_address: PartyText


class DocumentDraft(CamelModel):
    # A document id from documents.json, or None until the user has chosen one.
    document_type: str | None
    # Cover page values keyed by the document's field keys (snake_case, not aliased).
    fields: Annotated[dict[str, LongText], Field(max_length=MAX_FIELDS)]
    parties: tuple[Party, Party]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    # Stripped first: the Messages API rejects whitespace-only text.
    content: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_MESSAGE_LENGTH)
    ]


class ChatRequest(BaseModel):
    messages: Annotated[list[ChatMessage], Field(min_length=1, max_length=MAX_MESSAGES)]
    draft: DocumentDraft

    @model_validator(mode="after")
    def check_turn_order(self) -> "ChatRequest":
        # The Messages API requires user/assistant turns to alternate, starting
        # and (since we never prefill) ending with the user.
        for index, message in enumerate(self.messages):
            expected = "user" if index % 2 == 0 else "assistant"
            if message.role != expected:
                raise ValueError("messages must alternate user/assistant, starting with user")
        if self.messages[-1].role != "user":
            raise ValueError("the last message must be from the user")
        return self


class ChatResponse(BaseModel):
    reply: str
    draft: DocumentDraft


# --- Structured Outputs schema for the model, built per document ---


class LlmParty(BaseModel):
    print_name: str = Field(description="Full name of the person signing")
    title: str = Field(description="Job title of the person signing")
    company: str = Field(description="Legal name of the company")
    notice_address: str = Field(description="Email or postal address for legal notices")


REPLY_FIELD = (str, Field(description="Your next chat message to the user, in plain text"))


def build_turn_model(documents: dict[str, DocumentSpec], spec: DocumentSpec | None) -> type[BaseModel]:
    """The output schema for one turn: only a document choice until a document is chosen."""
    document_id = Literal[tuple(documents)]  # type: ignore[valid-type]
    if spec is None:
        return create_model(
            "ChatTurn",
            reply=REPLY_FIELD,
            document_type=(
                document_id | None,
                Field(description="The id of the document the user wants, once it is clear; otherwise null"),
            ),
        )

    fields_model = create_model(
        "DocumentFields",
        **{
            field.key: (
                str,
                Field(
                    description=f"{field.label}: {field.description}"
                    + (" (YYYY-MM-DD)" if field.kind == "date" else "")
                ),
            )
            for field in spec.fields
        },
    )
    role_1, role_2 = spec.party_roles
    return create_model(
        "ChatTurn",
        reply=REPLY_FIELD,
        document_type=(
            document_id,
            Field(description=f"Keep '{spec.id}' unless the user wants a different document"),
        ),
        fields=(fields_model, Field(description=f"The complete, updated {spec.name} fields")),
        party_1=(LlmParty, Field(description=f"The {role_1}")),
        party_2=(LlmParty, Field(description=f"The {role_2}")),
    )


# --- Drafts ---


def _clip(text: str, max_length: int) -> str:
    return text.strip()[:max_length]


def _is_iso_date(text: str) -> bool:
    try:
        return len(text) == 10 and date.fromisoformat(text).year >= 1000
    except ValueError:
        return False


def start_document(spec: DocumentSpec, draft: DocumentDraft, today: date) -> DocumentDraft:
    """Switch the draft to ``spec``, keeping the parties and any values for field
    keys both documents share; other fields get their defaults (dates: today)."""
    fields = {}
    for field in spec.fields:
        carried = draft.fields.get(field.key, "").strip()
        default = today.isoformat() if field.kind == "date" else field.default
        fields[field.key] = carried or default
    return DocumentDraft(document_type=spec.id, fields=fields, parties=draft.parties)


def _party_from_llm(party: LlmParty) -> Party:
    return Party(
        **{key: _clip(value, PARTY_FIELD_MAX_LENGTH) for key, value in party.model_dump().items()}
    )


def apply_turn(turn: Any, spec: DocumentSpec, previous: DocumentDraft) -> DocumentDraft:
    """Convert the model's fields to a draft. Text is trimmed and clipped to the
    field limits; a malformed date keeps its previous value rather than failing the turn."""
    values = turn.fields.model_dump()
    fields = {}
    for field in spec.fields:
        value = _clip(values[field.key], TEXT_FIELD_MAX_LENGTH)
        if field.kind == "date" and value and not _is_iso_date(value):
            value = previous.fields.get(field.key, "")
        fields[field.key] = value
    parties = (_party_from_llm(turn.party_1), _party_from_llm(turn.party_2))
    return DocumentDraft(document_type=spec.id, fields=fields, parties=parties)


# --- Prompt and model call ---

SYSTEM_PROMPT = """\
You are Prelegal's assistant. Through a friendly chat, you help the user draft \
a legal agreement from Common Paper's standard templates: you work out which \
document they need, then fill in its Cover Page. The Standard Terms are fixed.

Documents you can draft (id: name - description):
{catalog}

How to run the conversation:
- The chat opened with you greeting the user and asking what they need.
- If the user asks for a document that is not in the list above, explain \
that you can't draft it yet, suggest the closest document you can draft and \
briefly say why it may fit. Only choose it once the user agrees.
- Keep replies short (a few sentences). Don't give legal advice; you can \
explain what a document or field means.
- Write the reply in plain text, without Markdown.

Today's date is {today}.

{task}
"""

CHOOSE_TASK = """\
No document has been chosen yet. Find out what the user needs. Set \
document_type as soon as it is clear which document they want (ask if it is \
ambiguous); otherwise leave it null."""

DRAFT_TASK = """\
The user is drafting a {name} between the {role_1} (party_1) and the {role_2} \
(party_2).

Cover Page fields:
{field_list}
- party_1 and party_2: for each party, the signer's print_name and title, the \
company name, and a notice_address (email or postal address).

- Guide the user through the fields, asking about one or two at a time in a \
natural order. Briefly explain a field if the user seems unsure.
- Some fields start with sensible defaults. Mention them so the user can \
confirm or change them, but don't insist.
- Never invent names, companies, addresses or terms. Only fill in what the \
user has told you; leave unknown fields as they are.
- When every field is filled in, summarise the key terms and tell the user \
they can review the preview and download the PDF, or keep making changes.
- If the user wants a different document, set document_type to its id.

Return your reply, the document_type and the complete set of fields every \
time. Copy every field you are not changing exactly as it is in the current \
values.

Current values:
{values}"""


def build_system_prompt(
    documents: dict[str, DocumentSpec], spec: DocumentSpec | None, draft: DocumentDraft, today: date
) -> str:
    catalog = "\n".join(f"- {doc.id}: {doc.name} - {doc.description}" for doc in documents.values())
    if spec is None:
        task = CHOOSE_TASK
    else:
        field_list = "\n".join(
            f"- {field.key}: {field.label}. {field.description}." for field in spec.fields
        )
        values = {
            "fields": {field.key: draft.fields.get(field.key, "") for field in spec.fields},
            "party_1": draft.parties[0].model_dump(),
            "party_2": draft.parties[1].model_dump(),
        }
        role_1, role_2 = spec.party_roles
        task = DRAFT_TASK.format(
            name=spec.name,
            role_1=role_1,
            role_2=role_2,
            field_list=field_list,
            values=json.dumps(values, indent=2),
        )
    return SYSTEM_PROMPT.format(catalog=catalog, today=today.isoformat(), task=task)


def _ask(
    client: Anthropic,
    documents: dict[str, DocumentSpec],
    spec: DocumentSpec | None,
    draft: DocumentDraft,
    messages: list[ChatMessage],
    today: date,
) -> tuple[Any, str]:
    response = client.messages.parse(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=build_system_prompt(documents, spec, draft, today),
        messages=[message.model_dump() for message in messages],
        output_config=OUTPUT_CONFIG,
        output_format=build_turn_model(documents, spec),
    )
    turn = response.parsed_output
    reply = turn.reply.strip() if turn else ""
    if response.stop_reason in ("refusal", "max_tokens") or not reply:
        raise ChatError(f"unusable model response (stop_reason={response.stop_reason})")
    return turn, reply


def run_chat_turn(
    client: Anthropic,
    documents: dict[str, DocumentSpec],
    messages: list[ChatMessage],
    draft: DocumentDraft,
    today: date,
) -> ChatResponse:
    """Ask the model for its next reply and the updated draft."""
    spec = documents[draft.document_type] if draft.document_type else None
    turn, reply = _ask(client, documents, spec, draft, messages, today)
    if turn.document_type is None:  # still choosing
        return ChatResponse(reply=reply, draft=draft)

    if spec is None or turn.document_type != spec.id:
        # A document was chosen (or switched to): start it and ask again with its
        # fields, so this reply can already fill in what the user has said.
        spec = documents[turn.document_type]
        draft = start_document(spec, draft, today)
        turn, reply = _ask(client, documents, spec, draft, messages, today)
        if turn.document_type != spec.id:  # it changed its mind again; keep the started draft
            return ChatResponse(reply=reply, draft=draft)

    return ChatResponse(reply=reply, draft=apply_turn(turn, spec, draft))
