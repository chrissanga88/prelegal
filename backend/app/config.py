"""Runtime settings, read from environment variables."""

import os
from dataclasses import dataclass
from pathlib import Path

# The project root locally (backend/app/config.py -> project root) and /app in Docker.
DEFAULT_DOCUMENTS_PATH = Path(__file__).resolve().parents[2] / "documents.json"


@dataclass(frozen=True)
class Settings:
    # SQLite file; deleted and recreated every time the app starts.
    db_path: Path = Path("data/prelegal.db")
    # Statically exported frontend (frontend/out). None serves the API only.
    static_dir: Path | None = None
    # Specs of the documents the AI can draft.
    documents_path: Path = DEFAULT_DOCUMENTS_PATH

    @classmethod
    def from_env(cls) -> "Settings":
        static_dir = os.environ.get("PRELEGAL_STATIC_DIR")
        return cls(
            db_path=Path(os.environ.get("PRELEGAL_DB_PATH", cls.db_path)),
            static_dir=Path(static_dir) if static_dir else None,
            documents_path=Path(os.environ.get("PRELEGAL_DOCUMENTS_PATH", cls.documents_path)),
        )
