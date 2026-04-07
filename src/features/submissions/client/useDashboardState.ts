import { useEffect, useMemo, useState } from "react";

import {
  cancelSubmission,
  fetchSubmissions,
  retrySubmission,
  uploadSubmission,
} from "@/features/submissions/client/api";
import type { DashboardSubmission } from "@/features/submissions/model/contracts";

export function useDashboardState() {
  const [submissions, setSubmissions] = useState<DashboardSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultsModalId, setResultsModalId] = useState<string | null>(null);

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

  const activeQueue = useMemo(
    () =>
      submissions.filter((submission) =>
        ["queued", "processing", "cancelling"].includes(submission.status),
      ),
    [submissions],
  );

  const processedResults = useMemo(
    () =>
      submissions.filter((submission) =>
        ["completed", "failed", "cancelled"].includes(submission.status),
      ),
    [submissions],
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

    const intervalId = window.setInterval(() => {
      void (async () => {
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
      })();
    }, 3000);

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
