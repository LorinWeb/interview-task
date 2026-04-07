import type { Database } from "better-sqlite3";

const DEFAULT_SUMMARY_JSON =
  '{"strong_match":0,"good_match":0,"weak_match":0,"failed_to_process":0}';

export function initializeSchema(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      original_filename TEXT NOT NULL,
      stored_file_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      latest_attempt_id TEXT
    );

    CREATE TABLE IF NOT EXISTS submission_attempts (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      retried_from_attempt_id TEXT,
      attempt_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      total_rows INTEGER NOT NULL DEFAULT 0,
      processed_rows INTEGER NOT NULL DEFAULT 0,
      summary_json TEXT NOT NULL DEFAULT '${DEFAULT_SUMMARY_JSON}',
      error_text TEXT,
      failure_kind TEXT,
      retryable INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id),
      FOREIGN KEY (retried_from_attempt_id) REFERENCES submission_attempts(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS submission_attempts_unique_number
      ON submission_attempts(submission_id, attempt_number);

    CREATE INDEX IF NOT EXISTS submission_attempts_status_created
      ON submission_attempts(status, created_at);

    CREATE INDEX IF NOT EXISTS submission_attempts_submission_attempt
      ON submission_attempts(submission_id, attempt_number DESC);
  `);
}
