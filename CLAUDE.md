# Prelegal Project
## Overview
This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The user can carry out AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

Current state: V1 is feature-complete (see "Implementation status" below): users sign up and sign in, draft any of the 11 catalog documents through an AI chat, and come back to their saved documents. The database is still temporary and reset on every startup.

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
- **KAN-5:** Mutual NDA creator with live preview and client-side PDF download (`@react-pdf/renderer`). Its form was replaced by the AI chat in KAN-7, and it was generalised to every document in KAN-8.
- **KAN-6:** V1 foundation:
  - **Backend** (`backend/`, Python 3.13): `create_app()` in `app/main.py`, with settings from the env vars `PRELEGAL_DB_PATH` and `PRELEGAL_STATIC_DIR` (`app/config.py`). `app/db.py` has the SQLite schema (`users`; KAN-9 added `sessions` and `documents`), which `reset_db()` wipes on every startup, and an `open_db()` context manager. `GET /api/health` is the health check (`POST /api/chat` was added in KAN-7). The static frontend is mounted at `/` *after* the API routes, so new API routes must be registered before it.
  - **Frontend:** pages behind the login live in the `app/(app)/` route group, whose layout adds `AuthGuard` and `AppHeader`. The document creator is at `/draft` (it was `/nda` before KAN-8). The original fake login was replaced by real accounts in KAN-9.
  - **Packaging:** a multi-stage `Dockerfile` (Node build, then Python + uv runtime, non-root, port 8000). The mac/linux scripts wrap the shared `scripts/start.sh` and `scripts/stop.sh`, which pass `.env` to the container at runtime.
- **KAN-7:** AI chat replaces the NDA form:
  - **Backend:** `POST /api/chat` (`app/chat.py`) is stateless: the client sends the whole conversation plus the current draft, and Claude Haiku (`messages.parse`) returns a reply and a complete updated draft. Requests must alternate user/assistant turns, starting and ending with the user, with at most 60 messages of up to 4000 characters each.
  - **LLM client:** reads `ANTHROPIC_API_KEY` (from `.env` via `load_dotenv()` locally, or from `--env-file` in Docker). It is created lazily, so the app starts without a key; chat then returns 502, as it does for API errors, refusals and truncated replies. Tests inject a fake with `create_app(settings, llm_client=...)`.
  - **Frontend:** `lib/documents/chat.ts` (`sendChatTurn`, which sends only the last 59 messages of long chats) and `components/documents/DocumentChat.tsx`. The greeting is display-only and not sent to the API. `next dev` doesn't proxy `/api`, so test the chat with the backend serving the built frontend (or Docker).
- **KAN-8:** every catalog document can be drafted:
  - **Specs:** `documents.json` (project root) is the single source of truth for the 11 documents: `id`, `name`, `description`, `template`, two `partyRoles` and hand-curated cover page `fields` (`key`, `label`, `description`, `kind` of `text`/`longtext`/`date`, optional `default`). The NDA's two catalog entries are one document. The backend loads it via `app/documents.py` (`Settings.documents_path`, env `PRELEGAL_DOCUMENTS_PATH`), and the Dockerfile copies it to `/app/documents.json`. The frontend bundles it with every template into `lib/documents/catalog.generated.ts` via `npm run sync-templates`, which must be re-run after editing either; `catalog.test.ts` fails if they drift.
  - **Chat:** the API contract is `DocumentDraft` (`documentType`, `fields` keyed by spec key, `parties`). `build_turn_model` creates the Structured Outputs schema per turn with `create_model`: just `{reply, document_type}` until a document is chosen, then that document's fields (with descriptions) plus `document_type` and both parties. When the type changes, `start_document` starts the new draft (keeping parties and shared keys; defaults otherwise, dates default to today) and the model is asked again with the new schema in the same request. The prompt lists all documents and tells the AI to offer the closest supported one for unsupported requests.
  - **Frontend:** `lib/documents/templates.ts` parses the nested template Markdown into `Clause`s (labels `1.`, `1.2`, `(a)`); `catalog.ts` (`getDocument`, `loadStandardTerms`), `draft.ts` (cover page helpers). `DocumentCreator` shows the list of supported documents until one is chosen, then `DocumentPreview` and the PDF (`DocumentPdf`), all generic.
- **KAN-9:** accounts, saved documents and polish:
  - **Database** (`app/db.py`, still reset on startup): `users` (email `COLLATE NOCASE`), `sessions` (only a SHA-256 hash of the cookie token, with `expires_at`) and `documents` (`user_id`, `document_type`, `draft` and `messages` as JSON, `created_at`/`updated_at`). Timestamps use the shared `NOW` SQL expression (UTC, milliseconds). `open_db` enables foreign keys and allows cross-thread use.
  - **Structure:** `create_app` keeps `settings`, `specs` and `llm_client` on `app.state`; `app/deps.py` exposes them (`Db`, `Specs`) and each feature module has its own `APIRouter`, registered before the static mount. `Db` uses `Depends(get_db, scope="function")` so writes commit *before* the response is sent (the default request scope would commit after it); keep that for any new database dependency. Shared `CamelModel` is in `app/models.py`.
  - **Auth** (`app/auth.py`): `POST /api/auth/signup|signin|signout`, `GET /api/auth/me`. Passwords use stdlib scrypt with a random salt; sessions are a random token in the HttpOnly, SameSite=Lax cookie `prelegal_session` (7 days; not `Secure` because the app runs on http://localhost). `CurrentUser` protects `/api/chat` and `/api/documents`. Sign-in failures share one message.
  - **Saved documents** (`app/library.py`): `GET/POST /api/documents`, `GET/PUT/DELETE /api/documents/{id}`, always scoped to the signed-in user (others' documents are 404). The title is the document name plus the parties' companies.
  - **Frontend:** `lib/api.ts` (`apiRequest`, `ApiError` with user-facing messages; any 401 signs the user out), `lib/session.ts` (same `useSession` API, now backed by `/api/auth/me`), `lib/documents/library.ts`. Sign-in is at `/` and sign-up at `/signup` (`AuthShell` + `AuthForm`); signed-in users land on `/documents` (`DocumentsDashboard`). `DocumentCreator` auto-saves after each AI reply once a document type is chosen (POST then PUT, queued so saves never overlap) and `/draft/?id=N` reopens a document with its chat; `DocumentChat` is controlled (`messages`, `onTurn`). Shared UI: `components/ui/styles.ts` (`inputClass`, `buttonClass`, `alertClass`, `cardClass`) and `Logo`; use them rather than new class strings. `app/not-found.tsx` is exported as the branded `404.html` the backend serves.
  - **Disclaimer:** `DRAFT_NOTICE` in `lib/documents/draft.ts`, shown as a banner in the creator and at the top of every preview and PDF.
  - **Tests:** frontend API tests use `mockApi` (`lib/testing/mockApi.ts`); backend tests sign in with `tests/helpers.py::sign_up`.
- **Not yet built:** rate limiting, password reset, and a persistent database.
- **Tests:** frontend uses vitest, colocated `*.test.ts(x)`, with a `// @vitest-environment jsdom` docblock and `afterEach(cleanup)` for DOM tests (`npm test`). Backend uses pytest with FastAPI `TestClient` (`uv run pytest`).
- **Conventions:** branches are named `kan-N-slug`. Commits are "Add … (KAN-N)" followed by "Fix code review issues … (KAN-N)".
