"""FastAPI application: JSON API under /api plus the static frontend at /."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import Settings
from app.db import open_db, reset_db


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        reset_db(settings.db_path)
        yield

    app = FastAPI(title="Prelegal", lifespan=lifespan)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        with open_db(settings.db_path) as connection:
            connection.execute("SELECT 1")
        return {"status": "ok"}

    # Mounted last: a mount at "/" matches every path, so API routes must come first.
    # html=True serves index.html for directories (e.g. /nda/) and 404.html for misses.
    if settings.static_dir and settings.static_dir.is_dir():
        app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="frontend")

    return app


app = create_app()
