# prelegal
A platform for drafting common legal agreements

> **🚧 Status: In progress.** This project is under active development and is expected to be completed by **November 6, 2026**.

## Running Prelegal

Prelegal runs as a single Docker container: a FastAPI backend that serves the API under `/api` and the statically exported Next.js frontend at `/`. Requires [Docker](https://docs.docker.com/get-docker/).

| OS | Start | Stop |
|---|---|---|
| macOS | `scripts/start-mac.sh` | `scripts/stop-mac.sh` |
| Linux | `scripts/start-linux.sh` | `scripts/stop-linux.sh` |
| Windows | `scripts\start-windows.ps1` | `scripts\stop-windows.ps1` |

Then open http://localhost:8000. Sign-in is a placeholder for now: any email and password works.

If a `.env` file exists in the project root (e.g. with `ANTHROPIC_API_KEY`), it is passed to the container at runtime; it is never copied into the image.

The SQLite database is temporary: it is deleted and recreated every time the app starts.

## Development

```bash
# Backend (FastAPI, uv) — API on http://localhost:8000
cd backend
uv sync
uv run pytest
uv run uvicorn app.main:app --reload

# Frontend (Next.js) — UI with hot reload on http://localhost:3000
cd frontend
npm ci
npm test
npm run dev
```

To try the production setup without Docker, build the frontend (`npm run build` writes `frontend/out`) and start the backend with `PRELEGAL_STATIC_DIR=../frontend/out`.

| Variable | Default | Purpose |
|---|---|---|
| `PRELEGAL_DB_PATH` | `data/prelegal.db` | SQLite file, recreated on startup |
| `PRELEGAL_STATIC_DIR` | unset (API only) | Directory of the exported frontend to serve at `/` |
