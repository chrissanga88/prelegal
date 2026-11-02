# Prelegal Project
## Overview
This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The user can carry out AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

Current state: the V1 technical foundation is in place (see "Implementation status" below), and the Mutual NDA is drafted through an AI chat (KAN-7), but the product still only supports the Mutual NDA document, with a fake login.

## Development process
When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your claude-haiku skill to call the Claude Haiku 5.5 model (`claude-haiku-5-5`) directly through the official Anthropic Python SDK. Do not use LiteLLM or OpenRouter. You should use Structured Outputs (`client.messages.parse` with a Pydantic model) so that you can interpret the results and populate fields in the legal document.

There is an ANTHROPIC_API_KEY in the .env file in the project root.

## Technical design
The entire project should be packaged into a Docker container.
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/   
The database should use SQLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in. 
The frontend is statically built (Next.js `output: "export"`) and served by FastAPI.  

There should be scripts in scripts/ for:

```
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
Backend available at http://localhost:8000
```

## Color Scheme
Accent Yellow: #ecad0a   
Blue Primary: #209dd7  
Purple Secondary: #753991 (submit buttons)  
Dark Navy: #032147 (headings)  
Gray Text: #888888  

These are defined as Tailwind theme tokens in `frontend/app/globals.css` (`accent`, `primary`, `secondary`, `navy`, `muted`, plus `line`, `surface`, `danger`). Use the tokens (e.g. `bg-secondary`), not raw hex values or default Tailwind colours.

## Implementation status
- **KAN-4:** Common Paper templates in `templates/` and `catalog.json`.
- **KAN-5:** Mutual NDA creator: form, live preview and client-side PDF download (`@react-pdf/renderer`). The standard terms are bundled from `templates/Mutual-NDA.md` into `frontend/lib/nda/standardTermsSource.generated.ts` by `npm run sync-templates`, which must be re-run if the template changes.
- **KAN-6:** V1 foundation:
  - **Backend** (`backend/`, Python 3.13): `create_app()` in `app/main.py`, with settings from the env vars `PRELEGAL_DB_PATH` and `PRELEGAL_STATIC_DIR` (`app/config.py`). `app/db.py` has the SQLite `users` table, which `reset_db()` wipes on every startup, and an `open_db()` context manager. `GET /api/health` is the only endpoint. The static frontend is mounted at `/` *after* the API routes, so new API routes must be registered before it.
  - **Frontend:** the sign-in page is at `/`. It is a fake login: any non-empty email and password is accepted, and the session is kept client-side in `localStorage` via `lib/session.ts`, which is the only module that touches session storage. Pages behind the login live in the `app/(app)/` route group, whose layout adds `AuthGuard` and `AppHeader`. The NDA creator is at `/nda`.
  - **Packaging:** a multi-stage `Dockerfile` (Node build, then Python + uv runtime, non-root, port 8000). The mac/linux scripts wrap the shared `scripts/start.sh` and `scripts/stop.sh`, which pass `.env` to the container at runtime.
- **KAN-7:** AI chat replaces the NDA form. `POST /api/chat` (`app/chat.py`) is stateless: the client sends the whole conversation plus the current `NdaData`, and Claude Haiku (`messages.parse`) returns a reply and a complete updated snapshot of the fields. `NdaFields` (camelCase) mirrors the frontend `NdaData`; the model fills a flatter `LlmNdaFields`, and `from_llm_fields` maps it back, keeping the previous value for anything invalid (terms outside 1–99, bad dates). The Anthropic client is created lazily and can be injected with `create_app(settings, llm_client=...)` for tests. Frontend: `lib/nda/chat.ts` (`sendChatTurn`) and `components/nda/NdaChat.tsx`; the greeting is display-only and not sent to the API.
- **Not yet built:** real sign-up/sign-in (no auth endpoints or password hashing) and the other catalog documents.
- **Tests:** frontend uses vitest, colocated `*.test.ts(x)`, with a `// @vitest-environment jsdom` docblock and `afterEach(cleanup)` for DOM tests (`npm test`). Backend uses pytest with FastAPI `TestClient` (`uv run pytest`).
- **Conventions:** branches are named `kan-N-slug`. Commits are "Add … (KAN-N)" followed by "Fix code review issues … (KAN-N)".