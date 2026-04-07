import { lazy, Suspense } from "react";

import { AnimatePresence, motion } from "motion/react";

import { useDashboardState } from "@/features/submissions/client/useDashboardState";
import { ActiveQueueSection } from "@/features/submissions/components/ActiveQueueSection";
import { ProcessedResultsSection } from "@/features/submissions/components/ProcessedResultsSection";
import { ResultsModal } from "@/features/submissions/components/ResultsModal";
import { UploadZone } from "@/features/submissions/components/UploadZone";

const DevSeedButton = import.meta.env.DEV
  ? lazy(async () => ({
      default: (await import("@/app/DevSeedButton")).DevSeedButton,
    }))
  : null;

export function App() {
  const {
    activeActionId,
    activeQueue,
    closeResultsModal,
    error,
    isLoading,
    isUploading,
    openResultsModal,
    processedResults,
    reportUploadError,
    refreshSubmissions,
    resultsSubmission,
    submissions,
    cancelSubmission,
    retrySubmission,
    uploadFile,
  } = useDashboardState();

  return (
    <>
      <div className="min-h-screen py-20 px-6 max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold font-headline tracking-tight text-on-surface mb-4"
            initial={{ opacity: 0, y: -20 }}
          >
            Upload Test Results
          </motion.h1>
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="text-on-surface-variant max-w-2xl mx-auto text-lg leading-relaxed"
            initial={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.1 }}
          >
            Process dataset submissions asynchronously, monitor progress, and retry or cancel
            where the lifecycle allows it.
          </motion.p>
        </header>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="mb-8 rounded-2xl border border-error-container bg-error-container/40 px-5 py-4 text-error"
              data-testid="error-banner"
              exit={{ opacity: 0, scale: 0.98, y: -12 }}
              initial={{ opacity: 0, scale: 0.98, y: -12 }}
              key="error-banner"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="space-y-12">
          <UploadZone
            isUploading={isUploading}
            onInvalidFile={reportUploadError}
            onUpload={uploadFile}
          />
          <ActiveQueueSection
            activeActionId={activeActionId}
            onCancel={cancelSubmission}
            submissions={activeQueue}
          />
          <ProcessedResultsSection
            activeActionId={activeActionId}
            isLoading={isLoading}
            onOpenResults={openResultsModal}
            onRetry={retrySubmission}
            submissions={processedResults}
          />
        </div>

        <footer className="mt-12 text-center text-sm text-on-surface-variant">
          {submissions.length} submission{submissions.length === 1 ? "" : "s"} tracked
        </footer>
      </div>

      <ResultsModal onClose={closeResultsModal} submission={resultsSubmission} />

      {DevSeedButton ? (
        <Suspense fallback={null}>
          <DevSeedButton onSeeded={refreshSubmissions} />
        </Suspense>
      ) : null}
    </>
  );
}
