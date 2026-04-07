# Initial Plan

## Summary
- Use Vite + React for the frontend, served by an Express server in `server.ts`.
- Run a separate background worker from `src/server/worker-entry.ts`, started alongside the app by `npm run dev`.
- Keep SQLite and local filesystem storage as the only working v1 persistence path.

## Why This Shape
- The UI only needs one polished screen, so a lightweight SPA is enough.
- A separate worker process keeps asynchronous processing explicit without introducing queue infrastructure too early.
- Shared domain logic should live in `src/server` and `src/submissions` so the API and worker use the same rules.

## Product Surface
- One page with:
  - hero / upload area
  - active queue
  - processed results
  - lightweight results modal for completed submissions
- No submission detail page in v1.
- Keep the visible product submission-centric even though the backend stores attempt history internally.

## Public API
- `POST /api/upload`
  - accept multipart CSV upload
  - save the file
  - create the submission plus first attempt
  - return `202` with the queued dashboard view
- `GET /api/submissions`
  - return the flattened dashboard list used by the SPA
- `POST /api/submissions/:id/cancel`
  - idempotent
  - allowed from `queued`, `processing`, or already-`cancelling`
- `POST /api/submissions/:id/retry`
  - idempotent for repeated requests
  - allowed only from `cancelled` or retryable `failed`

## Data Model
- `submissions`
  - logical upload record
  - original filename
  - stored file key
  - created timestamp
  - latest attempt pointer
- `submission_attempts`
  - attempt number
  - status
  - total / processed rows
  - summary JSON
  - failure kind
  - retryable flag
  - timestamps
  - optional retried-from attempt reference

## Lifecycle Rules
- `queued -> processing -> completed`
- `queued -> cancelled`
- `processing -> cancelling -> cancelled`
- `processing -> failed`
- `failed_to_process` is a completed row outcome, not a submission failure.
- Submission `failed` is only for validation, transient, or system failure of the processing attempt itself.

## CSV Handling
- Reject only obviously bad upload requests at request time.
- Do full CSV parsing and validation in the worker so invalid files still appear in the lifecycle.
- Treat CSV `id` as a string, not a number, because the requirements example conflicts with the prose.
- Enforce uniqueness of `id` values within each uploaded file.

## Processing
- Worker claims queued attempts transactionally.
- Store progress as `processed_rows` versus `total_rows`.
- Process in batches with a small delay so progress is visible in the UI.
- Cancellation during processing should move through `cancelling` and stop at the next checkpoint.

## Config
- Support:
  - `PORT`
  - `DB_SOURCE`
  - `LOCAL_DB_PATH`
  - `UPLOADS_DIR`
  - worker timing settings
- `DB_SOURCE=local` is the only implemented adapter in v1.
- `DB_SOURCE=remote` should exist as a fail-fast seam, not a fake implementation.

## Repository Structure
- `server.ts`: Express server and frontend hosting
- `src/main.tsx`, `src/App.tsx`, `src/components/*`: frontend
- `src/client/*`: browser API/state wiring
- `src/server/submissions/*`: CSV, repository, service, worker logic
- `src/server/app-context.ts`: runtime wiring
- `src/submissions/contracts.ts`: shared domain types
- `tests/integration/*`: API-level behavioral tests
- `tests/e2e/*`: browser behavioral tests

## Test Strategy
- Prefer behavioral tests over narrow unit tests.
- Integration coverage should exercise the real API for:
  - upload to completed
  - async validation failure
  - processing cancel
  - idempotent retry
- End-to-end coverage should exercise the browser flows for:
  - upload
  - polling-driven state changes
  - cancel / retry actions
  - completed results modal
  - failed submission messaging

## Documentation
- Capture the key interpretations in `docs/architecture-design.md`:
  - string-based CSV ids
  - `failed_to_process` semantics
  - single-package Vite + Express + worker architecture
  - `DB_SOURCE=remote` as a reserved seam
