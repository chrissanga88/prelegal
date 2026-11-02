"""FastAPI application: JSON API under /api plus the static frontend at /."""

import logging
from contextlib import asynccontextmanager
from datetime import date

from anthropic import Anthropic, AnthropicError
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from app.chat import ChatError, ChatRequest, ChatResponse, run_chat_turn
from app.config import Settings
from app.db import open_db, reset_db

# Local development reads ANTHROPIC_API_KEY from the project's .env; in Docker it
# is already in the environment (and existing variables are never overridden).
load_dotenv()

logger = logging.getLogger(__name__)

CHAT_UNAVAILABLE = "The AI assistant is unavailable right now. Please try again."


def create_app(settings: Settings | None = None, llm_client: Anthropic | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        reset_db(settings.db_path)
        yield

    app = FastAPI(title="Prelegal", lifespan=lifespan)

    def get_llm_client() -> Anthropic:
        # Created on first use so the app starts (and /api/health works) without an API key.
        nonlocal llm_client
        if llm_client is None:
            client = Anthropic()
            # The SDK only complains about missing credentials once a request is sent.
            if client.api_key is None and client.auth_token is None:
                raise ChatError("ANTHROPIC_API_KEY is not set")
            llm_client = client
        return llm_client

    @app.get("/api/health")
    def health() -> dict[str, str]:
        with open_db(settings.db_path) as connection:
            connection.execute("SELECT 1")
        return {"status": "ok"}

    @app.post("/api/chat")
    def chat(request: ChatRequest) -> ChatResponse:
        try:
            return run_chat_turn(get_llm_client(), request.messages, request.fields, date.today())
        except (AnthropicError, ChatError, ValidationError):
            logger.exception("Chat turn failed")
            raise HTTPException(status_code=502, detail=CHAT_UNAVAILABLE)

    # Mounted last: a mount at "/" matches every path, so API routes must come first.
    # html=True serves index.html for directories (e.g. /nda/) and 404.html for misses.
    if settings.static_dir and settings.static_dir.is_dir():
        app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="frontend")

    return app


app = create_app()
