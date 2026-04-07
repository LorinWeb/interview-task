# interview-task

Single-package dataset submission app with a Vite + React frontend, an Express API server, and a separate background worker.

## Requirements
- Node.js 22+
- npm

## Run locally
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` if you want to override the defaults.
3. Start the app and worker with `npm run dev`.
4. Open `http://localhost:3000`.

## Scripts
- `npm run dev`: start the Express server and worker together.
- `npm run build`: build the Vite frontend into `dist/`.
- `npm run start`: run the production server and worker together.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm test`: run the Vitest suite.
- `npm run test:e2e`: run the Playwright suite against the app.

## Environment
- `PORT`: web server port. Defaults to `3000`.
- `DB_SOURCE`: `local` or `remote`. `remote` is reserved and intentionally fails fast in v1.
- `LOCAL_DB_PATH`: path to the SQLite database file.
- `UPLOADS_DIR`: directory for uploaded CSV files.
- `WORKER_POLL_INTERVAL_MS`: idle wait between worker polls.
- `PROCESSING_BATCH_SIZE`: number of CSV rows processed per worker batch.
- `PROCESSING_BATCH_DELAY_MS`: delay between observable worker batches.

## Notes
- CSV `id` values are treated as strings and must be unique within a file.
- `failed_to_process` is counted as a completed dataset outcome, not a submission failure.
- Submission retries create a new attempt internally, but the UI keeps the surface submission-centric.
