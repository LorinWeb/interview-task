import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelSubmission, retrySubmission, uploadSubmission } from "@/api/client";
import type { DashboardSubmission } from "@/api/types";
import { submissionsQueryKey, submissionsQueryOptions } from "@/features/submissions/queries";

const COMPLETION_EXIT_DELAY_MS = 1000;
const MAX_VISIBLE_PROCESSED_RESULTS = 5;

export function useDashboardState() {
  const queryClient = useQueryClient();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [resultsModalId, setResultsModalId] = useState<string | null>(null);
  const [completingSubmissionIds, setCompletingSubmissionIds] = useState<Record<string, number>>(
    {},
  );
  const previousSubmissionsRef = useRef<DashboardSubmission[]>([]);
  const submissionsQuery = useQuery(submissionsQueryOptions);
  const uploadMutation = useMutation({ mutationFn: uploadSubmission });
  const cancelMutation = useMutation({ mutationFn: cancelSubmission });
  const retryMutation = useMutation({ mutationFn: retrySubmission });
  const submissions = submissionsQuery.data ?? [];

  useLayoutEffect(() => {
    const previousSubmissions = previousSubmissionsRef.current;
    const previousById = new Map(previousSubmissions.map((submission) => [submission.id, submission]));

    setCompletingSubmissionIds((current) => {
      const next = { ...current };
      let changed = false;

      for (const submission of submissions) {
        const previous = previousById.get(submission.id);
        const completedAfterBeingActive =
          submission.status === "completed" &&
          previous &&
          ["queued", "processing"].includes(previous.status);

        if (completedAfterBeingActive && !next[submission.id]) {
          next[submission.id] = Date.now() + COMPLETION_EXIT_DELAY_MS;
          changed = true;
        }

        if (submission.status !== "completed" && next[submission.id]) {
          delete next[submission.id];
          changed = true;
        }
      }

      for (const submissionId of Object.keys(next)) {
        if (!submissions.some((submission) => submission.id === submissionId)) {
          delete next[submissionId];
          changed = true;
        }
      }

      return changed ? next : current;
    });

    previousSubmissionsRef.current = submissions;
  }, [submissions]);

  useEffect(() => {
    const expiryTimes = Object.values(completingSubmissionIds);

    if (expiryTimes.length === 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const now = Date.now();

      setCompletingSubmissionIds((current) => {
        const next = { ...current };
        let changed = false;

        for (const [submissionId, expiresAt] of Object.entries(current)) {
          if (expiresAt <= now) {
            delete next[submissionId];
            changed = true;
          }
        }

        return changed ? next : current;
      });
    }, Math.max(0, Math.min(...expiryTimes) - Date.now()));

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [completingSubmissionIds]);

  const activeQueue = useMemo(
    () =>
      submissions.flatMap((submission) => {
        if (["queued", "processing"].includes(submission.status)) {
          return [submission];
        }

        if (submission.status === "completed" && completingSubmissionIds[submission.id]) {
          return [
            {
              ...submission,
              canCancel: false,
              canRetry: false,
              progress: 100,
              status: "processing" as const,
            },
          ];
        }

        return [];
      }),
    [completingSubmissionIds, submissions],
  );

  const processedResults = useMemo(
    () =>
      submissions.filter(
        (submission) =>
          ["completed", "failed", "cancelled"].includes(submission.status) &&
          !completingSubmissionIds[submission.id],
      ).slice(0, MAX_VISIBLE_PROCESSED_RESULTS),
    [completingSubmissionIds, submissions],
  );
  const resultsSubmission = useMemo(
    () =>
      submissions.find(
        (submission) => submission.id === resultsModalId && submission.results,
      ) ?? null,
    [resultsModalId, submissions],
  );

  async function handleUpload(file: File) {
    setClientError(null);

    try {
      await uploadMutation.mutateAsync(file);
      await refreshSubmissions();
    } catch (requestError) {
      setClientError(getErrorMessage(requestError));
    }
  }

  async function handleCancel(submissionId: string) {
    setClientError(null);
    setActiveActionId(submissionId);

    try {
      await cancelMutation.mutateAsync(submissionId);
      await refreshSubmissions();
    } catch (requestError) {
      setClientError(getErrorMessage(requestError));
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleRetry(submissionId: string) {
    setClientError(null);
    setActiveActionId(submissionId);

    try {
      await retryMutation.mutateAsync(submissionId);
      await refreshSubmissions();
    } catch (requestError) {
      setClientError(getErrorMessage(requestError));
    } finally {
      setActiveActionId(null);
    }
  }

  async function refreshSubmissions() {
    await queryClient.invalidateQueries({ queryKey: submissionsQueryKey });
    await submissionsQuery.refetch();
  }

  function reportUploadError(message: string) {
    setClientError(message);
  }

  return {
    activeActionId,
    activeQueue,
    error: clientError ?? getErrorMessage(submissionsQuery.error),
    isLoading: submissionsQuery.isFetching,
    isUploading: uploadMutation.isPending,
    processedResults,
    resultsSubmission,
    submissions,
    closeResultsModal: () => setResultsModalId(null),
    openResultsModal: (submissionId: string) => setResultsModalId(submissionId),
    reportUploadError,
    refreshSubmissions,
    uploadFile: handleUpload,
    cancelSubmission: handleCancel,
    retrySubmission: handleRetry,
  };
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  return error instanceof Error ? error.message : "The request failed.";
}
