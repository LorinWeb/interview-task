# Design

## Architecture
- Single-package Vite + React frontend served by an Express server in `server.ts`.
- Separate worker runtime in `src/server/worker-entry.ts`, started alongside the web server by the root scripts.
- Source code is split by responsibility:
  - app shell in `src/app`
  - submission feature logic in `src/features/submissions`
  - runtime infrastructure in `src/server`
- Local persistence uses SQLite plus filesystem-backed upload storage. Uploaded filenames are kept as metadata; stored files use generated keys.

## Key Assumptions
- CSV `id` is treated as a string, not a number. The requirements text says “numeric” but the example value is non-numeric, so the implementation follows the example and enforces uniqueness instead.
- Dataset label `failed_to_process` is a completed row outcome, not a submission failure.
- Submission `failed` is reserved for validation, transient, or system failures of the processing attempt itself.
- `DB_SOURCE=remote` is intentionally reserved and fails fast; only `local` is implemented in v1.

## Product Surface
- The active app is a single page with a hero, upload zone, active queue, and processed results list.
- The visible API is intentionally narrow:
  - `POST /api/upload`
  - `GET /api/submissions`
  - `POST /api/submissions/:id/cancel`
  - `POST /api/submissions/:id/retry`

## Data Model

### submissions
- `id`
- `original_filename`
- `stored_file_key`
- `created_at`
- `latest_attempt_id`

### submission_attempts
- `id`
- `submission_id`
- `retried_from_attempt_id`
- `attempt_number`
- `status`
- `total_rows`
- `processed_rows`
- `summary_json`
- `error_text`
- `failure_kind`
- `retryable`
- `created_at`
- `started_at`
- `finished_at`
- `updated_at`

## Lifecycle
- `queued -> processing -> completed`
- `queued -> cancelled`
- `processing -> cancelling -> cancelled`
- `processing -> failed`

## Processing Notes
- Upload requests only reject obviously bad form submissions such as a missing file.
- CSV parsing and validation happen in the worker so invalid files still move through the lifecycle and surface as failed attempts in the UI.
- Worker progress is stored as processed rows versus total rows, with batch delays to keep state changes observable.
- Cancel is idempotent.
- Retry is deduplicated by linking a new attempt to `retried_from_attempt_id`, so repeated retry requests do not create duplicate queued attempts.

## Tradeoffs
- Polling is simpler than SSE/WebSockets for interview scope and keeps the demo-like UI easy to reason about.
- An Express server plus separate worker process is simpler than a queue-backed multi-service setup now, while still preserving a clean seam for later extraction.
- SQLite is the local default because it gives durable state without external setup.

## Future Improvements
- Replace the worker loop with a queue-backed processor.
- Add an actual remote database adapter behind `DB_SOURCE`.
- Add auth and multi-tenant boundaries.
