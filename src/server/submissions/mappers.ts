import {
  createEmptySummary,
  type DatasetSummary,
  type FailureKind,
  type SubmissionAttempt,
  type SubmissionDetail,
  type SubmissionStatus,
  type SubmissionSummary,
} from "@/submissions/contracts";

export interface SubmissionRow {
  id: string;
  original_filename: string;
  created_at: string;
}

export interface AttemptRow {
  id: string;
  submission_id: string;
  retried_from_attempt_id: string | null;
  attempt_number: number;
  status: SubmissionStatus;
  total_rows: number;
  processed_rows: number;
  summary_json: string;
  error_text: string | null;
  failure_kind: FailureKind | null;
  retryable: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

export interface SummaryRow extends AttemptRow {
  original_filename: string;
  submission_created_at: string;
}

export interface ClaimedAttemptRow extends AttemptRow {
  stored_file_key: string;
}

export function mapAttemptRow(row: AttemptRow): SubmissionAttempt {
  return {
    id: row.id,
    attemptNumber: row.attempt_number,
    status: row.status,
    totalRows: row.total_rows,
    processedRows: row.processed_rows,
    progressPercent: calculateProgress(row.processed_rows, row.total_rows, row.status),
    summary: parseSummary(row.summary_json),
    errorText: row.error_text,
    failureKind: row.failure_kind,
    retryable: Boolean(row.retryable),
    retriedFromAttemptId: row.retried_from_attempt_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at,
  };
}

export function mapSummaryRow(row: SummaryRow): SubmissionSummary {
  return {
    id: row.submission_id,
    originalFilename: row.original_filename,
    createdAt: row.submission_created_at,
    latestAttempt: mapAttemptRow(row),
  };
}

export function buildSubmissionDetail(
  submission: SubmissionRow,
  attempts: AttemptRow[],
): SubmissionDetail {
  return {
    id: submission.id,
    originalFilename: submission.original_filename,
    createdAt: submission.created_at,
    latestAttempt: mapAttemptRow(attempts[0]),
    attempts: attempts.map(mapAttemptRow),
  };
}

export function stringifySummary(summary: DatasetSummary): string {
  return JSON.stringify(summary);
}

function parseSummary(summaryJson: string): DatasetSummary {
  try {
    const parsed = JSON.parse(summaryJson) as Partial<DatasetSummary>;
    return {
      ...createEmptySummary(),
      ...parsed,
    };
  } catch {
    return createEmptySummary();
  }
}

function calculateProgress(
  processedRows: number,
  totalRows: number,
  status: SubmissionStatus,
): number {
  if (status === "completed") {
    return 100;
  }

  if (totalRows === 0) {
    return 0;
  }

  return Math.min(100, Math.round((processedRows / totalRows) * 100));
}
