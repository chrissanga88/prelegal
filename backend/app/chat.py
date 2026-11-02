"""AI chat that drafts the Mutual NDA cover page with Claude Haiku.

The API is stateless: each request carries the whole conversation plus the
current field values, and the model returns its reply together with a complete,
updated snapshot of the fields.

Two field shapes are used:

* ``NdaFields`` is the API contract. It mirrors the frontend's ``NdaData`` type
  (camelCase JSON, tagged unions for the terms), so the frontend needs no mapping.
* ``LlmNdaFields`` is the flatter shape the model fills in through Structured
  Outputs (``None`` instead of tagged unions, two named parties instead of a
  tuple), which is simpler and more reliable for the model to produce.
"""

import json
from datetime import date
from typing import Annotated, Literal

from anthropic import Anthropic
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

MODEL = "claude-haiku-5-5"
MAX_TOKENS = 16000
OUTPUT_CONFIG = {"effort": "low"}

MIN_TERM_YEARS = 1
MAX_TERM_YEARS = 99
# Party fields appear in a non-breaking signature table in the PDF, so keep them short.
PARTY_FIELD_MAX_LENGTH = 200
TEXT_FIELD_MAX_LENGTH = 2000
# Bounds on a single request, to cap the cost of one model call.
MAX_MESSAGES = 60
MAX_MESSAGE_LENGTH = 4000


class ChatError(Exception):
    """The model did not produce a usable reply."""


# --- API contract (mirrors frontend/lib/nda/types.ts) ---


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


PartyText = Annotated[str, Field(max_length=PARTY_FIELD_MAX_LENGTH)]
LongText = Annotated[str, Field(max_length=TEXT_FIELD_MAX_LENGTH)]
TermYears = Annotated[int, Field(ge=MIN_TERM_YEARS, le=MAX_TERM_YEARS)]


class Party(CamelModel):
    print_name: PartyText
    title: PartyText
    company: PartyText
    notice_address: PartyText


class ExpiresTerm(CamelModel):
    kind: Literal["expires"]
    years: TermYears


class UntilTerminatedTerm(CamelModel):
    kind: Literal["untilTerminated"]


class YearsTerm(CamelModel):
    kind: Literal["years"]
    years: TermYears


class PerpetualTerm(CamelModel):
    kind: Literal["perpetual"]


class NdaFields(CamelModel):
    purpose: LongText
    effective_date: Annotated[str, Field(max_length=10, description="YYYY-MM-DD")]
    mnda_term: Annotated[ExpiresTerm | UntilTerminatedTerm, Field(discriminator="kind")]
    confidentiality_term: Annotated[YearsTerm | PerpetualTerm, Field(discriminator="kind")]
    governing_law: LongText
    jurisdiction: LongText
    modifications: LongText
    parties: tuple[Party, Party]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)]


class ChatRequest(BaseModel):
    messages: Annotated[list[ChatMessage], Field(min_length=1, max_length=MAX_MESSAGES)]
    fields: NdaFields

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
    fields: NdaFields


# --- Structured Outputs schema for the model ---


class LlmParty(BaseModel):
    print_name: str = Field(description="Full name of the person signing")
    title: str = Field(description="Job title of the person signing")
    company: str = Field(description="Legal name of the company")
    notice_address: str = Field(description="Email or postal address for legal notices")


class LlmNdaFields(BaseModel):
    purpose: str = Field(description="How Confidential Information may be used")
    effective_date: str = Field(description="Effective Date as YYYY-MM-DD")
    mnda_term_years: int | None = Field(
        description="Length of the MNDA in whole years (1-99), or null if it "
        "continues until terminated"
    )
    confidentiality_term_years: int | None = Field(
        description="How long Confidential Information is protected, in whole "
        "years (1-99), or null for in perpetuity"
    )
    governing_law: str = Field(description="US state whose laws govern, e.g. Delaware")
    jurisdiction: str = Field(
        description="City or county and state of the courts, e.g. New Castle, DE"
    )
    modifications: str = Field(description="Changes to the Standard Terms; empty if none")
    party_1: LlmParty
    party_2: LlmParty


class ChatTurn(BaseModel):
    reply: str = Field(description="Your next chat message to the user, in plain text")
    fields: LlmNdaFields = Field(description="The complete, updated NDA fields")


# --- Mapping between the two shapes ---


def to_llm_fields(fields: NdaFields) -> LlmNdaFields:
    party_1, party_2 = (LlmParty(**party.model_dump()) for party in fields.parties)
    return LlmNdaFields(
        purpose=fields.purpose,
        effective_date=fields.effective_date,
        mnda_term_years=getattr(fields.mnda_term, "years", None),
        confidentiality_term_years=getattr(fields.confidentiality_term, "years", None),
        governing_law=fields.governing_law,
        jurisdiction=fields.jurisdiction,
        modifications=fields.modifications,
        party_1=party_1,
        party_2=party_2,
    )


def _clip(text: str, max_length: int) -> str:
    return text.strip()[:max_length]


def _is_valid_term(years: int | None) -> bool:
    return years is None or MIN_TERM_YEARS <= years <= MAX_TERM_YEARS


def _is_iso_date(text: str) -> bool:
    try:
        return len(text) == 10 and date.fromisoformat(text).year >= 1000
    except ValueError:
        return False


def _from_llm_party(party: LlmParty) -> Party:
    return Party(
        print_name=_clip(party.print_name, PARTY_FIELD_MAX_LENGTH),
        title=_clip(party.title, PARTY_FIELD_MAX_LENGTH),
        company=_clip(party.company, PARTY_FIELD_MAX_LENGTH),
        notice_address=_clip(party.notice_address, PARTY_FIELD_MAX_LENGTH),
    )


def from_llm_fields(llm: LlmNdaFields, previous: NdaFields) -> NdaFields:
    """Convert the model's fields to the API shape.

    Values the document can't represent (a term outside 1-99 years, a malformed
    date) are dropped in favour of the previous value rather than failing the turn.
    """
    if _is_valid_term(llm.mnda_term_years):
        mnda_term = (
            UntilTerminatedTerm(kind="untilTerminated")
            if llm.mnda_term_years is None
            else ExpiresTerm(kind="expires", years=llm.mnda_term_years)
        )
    else:
        mnda_term = previous.mnda_term

    if _is_valid_term(llm.confidentiality_term_years):
        confidentiality_term = (
            PerpetualTerm(kind="perpetual")
            if llm.confidentiality_term_years is None
            else YearsTerm(kind="years", years=llm.confidentiality_term_years)
        )
    else:
        confidentiality_term = previous.confidentiality_term

    effective_date = llm.effective_date.strip()
    return NdaFields(
        purpose=_clip(llm.purpose, TEXT_FIELD_MAX_LENGTH),
        effective_date=effective_date if _is_iso_date(effective_date) else previous.effective_date,
        mnda_term=mnda_term,
        confidentiality_term=confidentiality_term,
        governing_law=_clip(llm.governing_law, TEXT_FIELD_MAX_LENGTH),
        jurisdiction=_clip(llm.jurisdiction, TEXT_FIELD_MAX_LENGTH),
        modifications=_clip(llm.modifications, TEXT_FIELD_MAX_LENGTH),
        parties=(_from_llm_party(llm.party_1), _from_llm_party(llm.party_2)),
    )


# --- Prompt and model call ---

SYSTEM_PROMPT = """\
You are Prelegal's assistant. You help the user fill in the Cover Page of a \
Common Paper Mutual Non-Disclosure Agreement (MNDA) through a friendly chat. \
The Standard Terms are fixed; only the Cover Page fields below are filled in.

Cover Page fields:
- purpose: how Confidential Information may be used.
- effective_date: the date the MNDA starts (YYYY-MM-DD).
- mnda_term_years: how long the MNDA lasts, in whole years from the Effective \
Date, or null if it continues until terminated.
- confidentiality_term_years: how long Confidential Information stays \
protected, in whole years from the Effective Date, or null for in perpetuity.
- governing_law: the US state whose laws govern the MNDA.
- jurisdiction: the city or county and state whose courts hear disputes.
- modifications: any changes to the Standard Terms (usually empty).
- party_1 and party_2: for each party, the signer's print_name and title, the \
company name, and a notice_address (email or postal address).

How to run the conversation:
- The chat opened with you greeting the user and asking what the NDA is for \
and who the other party is.
- Ask about one or two fields at a time, in a natural order, and keep replies \
short (a few sentences). Briefly explain a field if the user seems unsure.
- Some fields start with sensible defaults. Mention them so the user can \
confirm or change them, but don't insist.
- Never invent names, companies, addresses or places. Only fill in what the \
user has told you; leave unknown fields as they are.
- When every field is filled in, summarise the key terms and tell the user \
they can review the preview and download the PDF, or keep making changes.
- If the user asks for something other than a Mutual NDA, explain that only \
the Mutual NDA is supported for now. Don't give legal advice; you can explain \
what a field means.
- Write the reply in plain text, without Markdown.

Return your reply and the complete set of fields every time. Copy every field \
you are not changing exactly as it is in the current values.

Today's date is {today}.

Current field values:
{fields}
"""


def build_system_prompt(fields: NdaFields, today: date) -> str:
    current = json.dumps(to_llm_fields(fields).model_dump(), indent=2)
    return SYSTEM_PROMPT.format(today=today.isoformat(), fields=current)


def run_chat_turn(
    client: Anthropic, messages: list[ChatMessage], fields: NdaFields, today: date
) -> ChatResponse:
    """Ask the model for its next reply and the updated fields."""
    response = client.messages.parse(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=build_system_prompt(fields, today),
        messages=[message.model_dump() for message in messages],
        output_config=OUTPUT_CONFIG,
        output_format=ChatTurn,
    )
    turn = response.parsed_output
    if response.stop_reason in ("refusal", "max_tokens") or turn is None or not turn.reply.strip():
        raise ChatError(f"unusable model response (stop_reason={response.stop_reason})")
    return ChatResponse(reply=turn.reply.strip(), fields=from_llm_fields(turn.fields, fields))
