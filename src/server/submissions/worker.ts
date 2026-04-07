import { createEmptySummary } from "@/submissions/contracts";
import type { AppContext } from "@/server/app-context";
import { CsvValidationError, parseDatasetCsv } from "@/server/submissions/csv";

export type SleepFn = (durationMs: number) => Promise<void>;

const defaultSleep: SleepFn = (durationMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

export async function processNextQueuedAttempt(
  context: AppContext,
  sleep: SleepFn = defaultSleep,
) {
  const claimedAttempt = context.repository.claimNextQueuedAttempt(new Date().toISOString());

  if (!claimedAttempt) {
    return null;
  }

  const summary = createEmptySummary();
  let processedRows = 0;
  let totalRows = 0;

  try {
    if (isCancellationRequested(context, claimedAttempt.id)) {
      context.repository.markAttemptCancelled(claimedAttempt.id, processedRows, totalRows, summary);
      return claimedAttempt.submission_id;
    }

    const fileContent = await context.storage.readUpload(claimedAttempt.stored_file_key);
    const rows = parseDatasetCsv(fileContent);

    totalRows = rows.length;
    context.repository.setAttemptTotalRows(
      claimedAttempt.id,
      totalRows,
      new Date().toISOString(),
    );

    while (processedRows < rows.length) {
      if (isCancellationRequested(context, claimedAttempt.id)) {
        context.repository.markAttemptCancelled(
          claimedAttempt.id,
          processedRows,
          totalRows,
          summary,
        );
        return claimedAttempt.submission_id;
      }

      const batch = rows.slice(
        processedRows,
        processedRows + context.config.processingBatchSize,
      );

      for (const row of batch) {
        summary[row.label] += 1;
      }

      processedRows += batch.length;

      context.repository.updateAttemptProgress(
        claimedAttempt.id,
        processedRows,
        totalRows,
        summary,
        new Date().toISOString(),
      );

      if (processedRows < rows.length) {
        await sleep(context.config.processingBatchDelayMs);
      }
    }

    if (isCancellationRequested(context, claimedAttempt.id)) {
      context.repository.markAttemptCancelled(claimedAttempt.id, processedRows, totalRows, summary);
      return claimedAttempt.submission_id;
    }

    context.repository.markAttemptCompleted(claimedAttempt.id, processedRows, totalRows, summary);
  } catch (error) {
    if (error instanceof CsvValidationError) {
      context.repository.markAttemptFailed(claimedAttempt.id, {
        errorText: error.message,
        failureKind: "validation",
        retryable: false,
      });
    } else {
      const message = error instanceof Error ? error.message : "Unknown processing error.";

      context.repository.markAttemptFailed(claimedAttempt.id, {
        errorText: message,
        failureKind: "system",
        retryable: true,
      });
    }
  }

  return claimedAttempt.submission_id;
}

function isCancellationRequested(context: AppContext, attemptId: string): boolean {
  return context.repository.getAttemptStatus(attemptId) === "cancelling";
}
