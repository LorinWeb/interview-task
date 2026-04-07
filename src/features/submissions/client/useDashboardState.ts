import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  cancelSubmission,
  fetchSubmissions,
  retrySubmission,
  uploadSubmission,
} from "@/features/submissions/client/api";
import type { DashboardSubmission } from "@/features/submissions/model/contracts";

const ACTIVE_SUBMISSION_POLL_INTERVAL_MS = 1000;
const COMPLETION_EXIT_DELAY_MS = 1000;
const MAX_VISIBLE_PROCESSED_RESULTS = 5;

export function useDashboardState() {
  const [submissions, setSubmissions] = useState<DashboardSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultsModalId, setResultsModalId] = useState<string | null>(null);
  const [completingSubmissionIds, setCompletingSubmissionIds] = useState<Record<string, number>>(
    {},
  );
  const previousSubmissionsRef = useRef<DashboardSubmission[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadSubmissions(markLoaded = false) {
      try {
        const nextSubmissions = await fetchSubmissions();

        if (!isMounted) {
          return;
        }

        setError(null);
        setSubmissions(nextSubmissions);
      } catch (requestError) {
        if (isMounted) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (isMounted && markLoaded) {
          setIsLoading(false);
        }
      }
    }

    void loadSubmissions(true);

    return () => {
      isMounted = false;
    };
  }, []);

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
          ["queued", "processing", "cancelling"].includes(previous.status);

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
        if (["queued", "processing", "cancelling"].includes(submission.status)) {
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
  const shouldPollSubmissions = submissions.some(
    (submission) =>
      submission.status === "queued" ||
      submission.status === "processing" ||
      (submission.status === "cancelled" && !submission.canRetry),
  );

  const resultsSubmission = useMemo(
    () =>
      submissions.find(
        (submission) => submission.id === resultsModalId && submission.results,
      ) ?? null,
    [resultsModalId, submissions],
  );

  useEffect(() => {
    if (!shouldPollSubmissions) {
      return;
    }

    let isMounted = true;
    const pollSubmissions = async () => {
      try {
        const nextSubmissions = await fetchSubmissions();

        if (!isMounted) {
          return;
        }

        setError(null);
        setSubmissions(nextSubmissions);
      } catch (requestError) {
        if (isMounted) {
          setError(getErrorMessage(requestError));
        }
      }
    };

    void pollSubmissions();
    const intervalId = window.setInterval(() => {
      void pollSubmissions();
    }, ACTIVE_SUBMISSION_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [shouldPollSubmissions]);

  async function handleUpload(file: File) {
    setError(null);
    setMessage(null);
    setIsUploading(true);

    try {
      const created = await uploadSubmission(file);
      setMessage(`Queued ${created.filename} for background processing.`);
      await refreshSubmissions();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCancel(submissionId: string) {
    setError(null);
    setMessage(null);
    setActiveActionId(submissionId);

    try {
      await cancelSubmission(submissionId);
      setMessage("Cancellation requested.");
      await refreshSubmissions();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActiveActionId(null);
    }
  }

  async function handleRetry(submissionId: string) {
    setError(null);
    setMessage(null);
    setActiveActionId(submissionId);

    try {
      await retrySubmission(submissionId);
      setMessage("Retry queued.");
      await refreshSubmissions();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActiveActionId(null);
    }
  }

  async function refreshSubmissions() {
    setSubmissions(await fetchSubmissions());
  }

  function reportUploadError(message: string) {
    setMessage(null);
    setError(message);
  }

  return {
    activeActionId,
    activeQueue,
    error,
    isLoading,
    isUploading,
    message,
    processedResults,
    resultsSubmission,
    submissions,
    closeResultsModal: () => setResultsModalId(null),
    openResultsModal: (submissionId: string) => setResultsModalId(submissionId),
    reportUploadError,
    uploadFile: handleUpload,
    cancelSubmission: handleCancel,
    retrySubmission: handleRetry,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The request failed.";
}
