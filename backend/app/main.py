"""FastAPI application: JSON API under /api plus the static frontend at /."""

from contextlib import asynccontextmanager

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app import auth, chat, library
from app.config import Settings
from app.db import reset_db
from app.deps import Db
from app.documents import load_documents

# Local development reads ANTHROPIC_API_KEY from the project's .env; in Docker it
# is already in the environment (and existing variables are never overridden).
load_dotenv()


def create_app(settings: Settings | None = None, llm_client: Anthropic | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        reset_db(settings.db_path)
        yield

    app = FastAPI(title="Prelegal", lifespan=lifespan)
    # Shared with the routers through app/deps.py.
    app.state.settings = settings
    app.state.specs = load_documents(settings.documents_path)
    app.state.llm_client = llm_client  # None: created on first chat (see chat.get_llm_client)

    @app.get("/api/health")
    def health(db: Db) -> dict[str, str]:
        db.execute("SELECT 1")
        return {"status": "ok"}

    app.include_router(auth.router)
    app.include_router(chat.router)
    app.include_router(library.router)

    # Mounted last: a mount at "/" matches every path, so API routes must come first.
    # html=True serves index.html for directories (e.g. /draft/) and 404.html for misses.
    if settings.static_dir and settings.static_dir.is_dir():
        app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="frontend")

    return app


app = create_app()
