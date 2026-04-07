export type DatasetLabel =
  | "strong_match"
  | "good_match"
  | "weak_match"
  | "failed_to_process";
export type SubmissionStatus =
  | "queued"
  | "processing"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";
export type FailureKind = "validation" | "transient" | "system" | "cancelled";
export type DatasetSummary = Record<DatasetLabel, number>;
export type DashboardResults = DatasetSummary & { total: number };

export interface DashboardSubmission {
  id: string;
  filename: string;
  status: SubmissionStatus;
  progress: number;
  createdAt: string;
  canCancel: boolean;
  canRetry: boolean;
  error?: string;
  results?: DashboardResults;
}

export interface SubmissionAttempt {
  id: string;
  attemptNumber: number;
  status: SubmissionStatus;
  totalRows: number;
  processedRows: number;
  progressPercent: number;
  summary: DatasetSummary;
  errorText: string | null;
  failureKind: FailureKind | null;
  retryable: boolean;
  retriedFromAttemptId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

export interface SubmissionSummary {
  id: string;
  originalFilename: string;
  createdAt: string;
  latestAttempt: SubmissionAttempt;
}

export interface SubmissionDetail extends SubmissionSummary {
  attempts: SubmissionAttempt[];
}

export function createEmptySummary(): DatasetSummary {
  return {
    strong_match: 0,
    good_match: 0,
    weak_match: 0,
    failed_to_process: 0,
  };
}
