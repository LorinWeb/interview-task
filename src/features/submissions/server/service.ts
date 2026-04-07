import { HttpError } from "@/server/http-error";
import type { AppContext } from "@/server/app-context";
import type {
  DashboardResults,
  DashboardSubmission,
  SubmissionAttempt,
  SubmissionDetail,
  SubmissionSummary,
} from "@/features/submissions/model/contracts";

async function createSubmissionFromUpload(context: AppContext, file: File) {
  const storedFileKey = await context.storage.saveUpload(file);
  const createdAt = new Date().toISOString();

  const detail = context.repository.createSubmissionWithInitialAttempt({
    attemptId: crypto.randomUUID(),
    createdAt,
    originalFilename: file.name || "dataset.csv",
    storedFileKey,
    submissionId: crypto.randomUUID(),
  });

  if (!detail) {
    throw new HttpError(500, "The submission could not be created.");
  }

  return detail;
}

export function listDashboardSubmissions(context: AppContext) {
  return context.repository.listSubmissionSummaries().map(toDashboardSubmission);
}

export function createDashboardSubmissionFromUpload(context: AppContext, file: File) {
  return createSubmissionFromUpload(context, file).then(toDashboardSubmission);
}

export function cancelDashboardSubmission(context: AppContext, submissionId: string) {
  return toDashboardSubmission(context.repository.cancelLatestAttempt(submissionId));
}

export function retryDashboardSubmission(context: AppContext, submissionId: string) {
  return toDashboardSubmission(context.repository.retryLatestAttempt(submissionId));
}

function toDashboardSubmission(
  submission: SubmissionSummary | SubmissionDetail,
): DashboardSubmission {
  const rawStatus = submission.latestAttempt.status;
  const status = rawStatus === "cancelling" ? "cancelled" : rawStatus;

  return {
    id: submission.id,
    filename: submission.originalFilename,
    status,
    progress: submission.latestAttempt.progressPercent,
    createdAt: submission.createdAt,
    canCancel: rawStatus === "queued" || rawStatus === "processing",
    canRetry:
      rawStatus === "cancelled" ||
      (rawStatus === "failed" && submission.latestAttempt.retryable),
    error: submission.latestAttempt.errorText ?? undefined,
    results: getDashboardResults(
      status,
      submission.latestAttempt.totalRows,
      submission.latestAttempt.summary,
    ),
  };
}

function getDashboardResults(
  status: DashboardSubmission["status"],
  totalRows: number,
  summary: SubmissionAttempt["summary"],
): DashboardResults | undefined {
  if (status !== "completed") {
    return undefined;
  }

  return { ...summary, total: totalRows };
}
