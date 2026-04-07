import type { Database } from "better-sqlite3";

import { createEmptySummary, type DatasetSummary } from "@/submissions/contracts";
import { HttpError } from "@/server/http-error";
import {
  buildSubmissionDetail,
  mapSummaryRow,
  stringifySummary,
  type AttemptRow,
  type ClaimedAttemptRow,
  type SubmissionRow,
  type SummaryRow,
} from "@/server/submissions/mappers";

export class SubmissionRepository {
  constructor(private readonly database: Database) {}

  createSubmissionWithInitialAttempt(input: {
    submissionId: string;
    attemptId: string;
    originalFilename: string;
    storedFileKey: string;
    createdAt: string;
  }) {
    const create = this.database.transaction((value: typeof input) => {
      this.database
        .prepare(
          `
            INSERT INTO submissions (id, original_filename, stored_file_key, created_at, latest_attempt_id)
            VALUES (@submissionId, @originalFilename, @storedFileKey, @createdAt, @attemptId)
          `,
        )
        .run(value);

      this.database
        .prepare(
          `
            INSERT INTO submission_attempts (
              id, submission_id, retried_from_attempt_id, attempt_number, status,
              total_rows, processed_rows, summary_json, error_text, failure_kind,
              retryable, created_at, started_at, finished_at, updated_at
            ) VALUES (
              @attemptId, @submissionId, NULL, 1, 'queued',
              0, 0, @summaryJson, NULL, NULL,
              0, @createdAt, NULL, NULL, @createdAt
            )
          `,
        )
        .run({ ...value, summaryJson: stringifySummary(createEmptySummary()) });
    });

    create.immediate(input);

    return this.getSubmissionDetail(input.submissionId);
  }

  listSubmissionSummaries() {
    const rows = this.database
      .prepare<unknown[], SummaryRow>(
        `
          SELECT
            s.id AS submission_id,
            s.original_filename,
            s.created_at AS submission_created_at,
            a.*
          FROM submissions s
          JOIN submission_attempts a ON a.id = s.latest_attempt_id
          ORDER BY s.created_at DESC
        `,
      )
      .all();

    return rows.map(mapSummaryRow);
  }

  getSubmissionDetail(submissionId: string) {
    const submission = this.database
      .prepare<[string], SubmissionRow>(
          `
          SELECT id, original_filename, created_at
          FROM submissions
          WHERE id = ?
        `,
      )
      .get(submissionId);

    if (!submission) {
      return null;
    }

    const attempts = this.database
      .prepare<[string], AttemptRow>(
        `
          SELECT *
          FROM submission_attempts
          WHERE submission_id = ?
          ORDER BY attempt_number DESC
        `,
      )
      .all(submissionId);

    return buildSubmissionDetail(submission, attempts);
  }

  cancelLatestAttempt(submissionId: string) {
    const cancel = this.database.transaction((id: string) => {
      const latestAttempt = this.getLatestAttemptRow(id);

      if (!latestAttempt) {
        throw new HttpError(404, "Submission not found.");
      }

      if (latestAttempt.status === "queued") {
        this.database
          .prepare(
            `
              UPDATE submission_attempts
              SET status = 'cancelled', failure_kind = 'cancelled', retryable = 1,
                  finished_at = @finishedAt, updated_at = @finishedAt
              WHERE id = @attemptId
            `,
          )
          .run({ attemptId: latestAttempt.id, finishedAt: new Date().toISOString() });
      } else if (latestAttempt.status === "processing") {
        this.database
          .prepare(
            `
              UPDATE submission_attempts
              SET status = 'cancelling', updated_at = @updatedAt
              WHERE id = @attemptId
            `,
          )
          .run({ attemptId: latestAttempt.id, updatedAt: new Date().toISOString() });
      } else if (latestAttempt.status === "completed") {
        this.database
          .prepare(
            `
              UPDATE submission_attempts
              SET status = 'cancelled', failure_kind = 'cancelled', retryable = 1,
                  finished_at = @finishedAt, updated_at = @finishedAt
              WHERE id = @attemptId
            `,
          )
          .run({ attemptId: latestAttempt.id, finishedAt: new Date().toISOString() });
      } else if (latestAttempt.status !== "cancelling" && latestAttempt.status !== "cancelled") {
        throw new HttpError(409, "Only queued, processing, or just-completed submissions can be cancelled.");
      }
    });

    cancel.immediate(submissionId);

    return this.requireSubmissionDetail(submissionId);
  }

  retryLatestAttempt(submissionId: string) {
    const retry = this.database.transaction((id: string) => {
      const latestAttempt = this.getLatestAttemptRow(id);

      if (!latestAttempt) {
        throw new HttpError(404, "Submission not found.");
      }

      if (
        ["queued", "processing", "cancelling"].includes(latestAttempt.status) &&
        latestAttempt.retried_from_attempt_id
      ) {
        return;
      }

      const retryableFailure =
        latestAttempt.status === "cancelled" ||
        (latestAttempt.status === "failed" && Boolean(latestAttempt.retryable));

      if (!retryableFailure) {
        throw new HttpError(409, "The latest attempt cannot be retried.");
      }

      const attemptId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      this.database
        .prepare(
          `
            INSERT INTO submission_attempts (
              id, submission_id, retried_from_attempt_id, attempt_number, status,
              total_rows, processed_rows, summary_json, error_text, failure_kind,
              retryable, created_at, started_at, finished_at, updated_at
            ) VALUES (
              @attemptId, @submissionId, @retriedFromAttemptId, @attemptNumber, 'queued',
              0, 0, @summaryJson, NULL, NULL,
              0, @createdAt, NULL, NULL, @createdAt
            )
          `,
        )
        .run({
          attemptId,
          attemptNumber: latestAttempt.attempt_number + 1,
          createdAt,
          retriedFromAttemptId: latestAttempt.id,
          submissionId,
          summaryJson: stringifySummary(createEmptySummary()),
        });

      this.database
        .prepare(
          `
            UPDATE submissions
            SET latest_attempt_id = @attemptId
            WHERE id = @submissionId
          `,
        )
        .run({ attemptId, submissionId });
    });

    retry.immediate(submissionId);

    return this.requireSubmissionDetail(submissionId);
  }

  claimNextQueuedAttempt(now: string) {
    const claim = this.database.transaction((claimedAt: string) => {
      const nextAttempt = this.database
        .prepare<unknown[], ClaimedAttemptRow>(
          `
            SELECT a.*, s.stored_file_key
            FROM submission_attempts a
            JOIN submissions s ON s.id = a.submission_id
            WHERE a.status = 'queued'
            ORDER BY a.created_at ASC
            LIMIT 1
          `,
        )
        .get();

      if (!nextAttempt) {
        return null;
      }

      this.database
        .prepare(
          `
            UPDATE submission_attempts
            SET status = 'processing', started_at = @claimedAt, updated_at = @claimedAt
            WHERE id = @attemptId AND status = 'queued'
          `,
        )
        .run({ attemptId: nextAttempt.id, claimedAt });

      return { ...nextAttempt, status: "processing", started_at: claimedAt, updated_at: claimedAt };
    });

    return claim.immediate(now);
  }

  setAttemptTotalRows(attemptId: string, totalRows: number, updatedAt: string) {
    return this.database
      .prepare(
        `
          UPDATE submission_attempts
          SET total_rows = @totalRows, updated_at = @updatedAt
          WHERE id = @attemptId AND status = 'processing'
        `,
      )
      .run({ attemptId, totalRows, updatedAt }).changes > 0;
  }

  getAttemptStatus(attemptId: string) {
    const row = this.database
      .prepare<[string], Pick<AttemptRow, "status">>(
        `
          SELECT status
          FROM submission_attempts
          WHERE id = ?
        `,
      )
      .get(attemptId);

    return row?.status ?? null;
  }

  updateAttemptProgress(
    attemptId: string,
    processedRows: number,
    totalRows: number,
    summary: DatasetSummary,
    updatedAt: string,
  ) {
    return this.database
      .prepare(
        `
          UPDATE submission_attempts
          SET processed_rows = @processedRows,
              total_rows = @totalRows,
              summary_json = @summaryJson,
              updated_at = @updatedAt
          WHERE id = @attemptId AND status = 'processing'
        `,
      )
      .run({ attemptId, processedRows, totalRows, summaryJson: stringifySummary(summary), updatedAt }).changes > 0;
  }

  markAttemptCompleted(attemptId: string, processedRows: number, totalRows: number, summary: DatasetSummary) {
    const finishedAt = new Date().toISOString();

    return this.database
      .prepare(
        `
          UPDATE submission_attempts
          SET status = 'completed', processed_rows = @processedRows, total_rows = @totalRows,
              summary_json = @summaryJson, failure_kind = NULL, error_text = NULL, retryable = 0,
              finished_at = @finishedAt, updated_at = @finishedAt
          WHERE id = @attemptId AND status = 'processing'
        `,
      )
      .run({ attemptId, processedRows, totalRows, summaryJson: stringifySummary(summary), finishedAt }).changes > 0;
  }

  markAttemptFailed(
    attemptId: string,
    input: { errorText: string; failureKind: "validation" | "system" | "transient"; retryable: boolean },
  ) {
    const finishedAt = new Date().toISOString();

    return this.database
      .prepare(
        `
          UPDATE submission_attempts
          SET status = 'failed', failure_kind = @failureKind, error_text = @errorText,
              retryable = @retryable, finished_at = @finishedAt, updated_at = @finishedAt
          WHERE id = @attemptId AND status = 'processing'
        `,
      )
      .run({
        attemptId,
        errorText: input.errorText,
        failureKind: input.failureKind,
        finishedAt,
        retryable: Number(input.retryable),
      }).changes > 0;
  }

  markAttemptCancelled(
    attemptId: string,
    processedRows: number,
    totalRows: number,
    summary: DatasetSummary,
  ) {
    const finishedAt = new Date().toISOString();

    this.database
      .prepare(
        `
          UPDATE submission_attempts
          SET status = 'cancelled', processed_rows = @processedRows, total_rows = @totalRows,
              summary_json = @summaryJson, failure_kind = 'cancelled', retryable = 1,
              finished_at = @finishedAt, updated_at = @finishedAt
          WHERE id = @attemptId
        `,
      )
      .run({ attemptId, finishedAt, processedRows, totalRows, summaryJson: stringifySummary(summary) });
  }

  private getLatestAttemptRow(submissionId: string) {
    return this.database
      .prepare<[string], AttemptRow>(
        `
          SELECT a.*
          FROM submission_attempts a
          JOIN submissions s ON s.latest_attempt_id = a.id
          WHERE s.id = ?
        `,
      )
      .get(submissionId);
  }

  private requireSubmissionDetail(submissionId: string) {
    const detail = this.getSubmissionDetail(submissionId);

    if (!detail) {
      throw new HttpError(404, "Submission not found.");
    }

    return detail;
  }
}
