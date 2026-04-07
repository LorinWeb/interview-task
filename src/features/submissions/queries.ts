import { queryOptions } from "@tanstack/react-query";

import { fetchSubmissions } from "@/api/client";
import type { DashboardSubmission } from "@/api/types";

const ACTIVE_SUBMISSION_POLL_INTERVAL_MS = 1000;

export const submissionsQueryKey = ["submissions"] as const;

export const submissionsQueryOptions = queryOptions({
  queryKey: submissionsQueryKey,
  queryFn: fetchSubmissions,
  refetchInterval: (query) =>
    shouldPollSubmissions(query.state.data ?? []) ? ACTIVE_SUBMISSION_POLL_INTERVAL_MS : false,
});

function shouldPollSubmissions(submissions: DashboardSubmission[]) {
  return submissions.some(
    (submission) =>
      submission.status === "queued" ||
      submission.status === "processing" ||
      (submission.status === "cancelled" && !submission.canRetry),
  );
}
