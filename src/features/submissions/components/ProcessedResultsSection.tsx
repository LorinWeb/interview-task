import {
  AlertCircle,
  CheckCircle2,
  Eye,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DashboardSubmission } from "@/features/submissions/model/contracts";

interface ProcessedResultsSectionProps {
  activeActionId: string | null;
  isLoading: boolean;
  submissions: DashboardSubmission[];
  onOpenResults: (submissionId: string) => void;
  onRetry: (submissionId: string) => Promise<void>;
}

export function ProcessedResultsSection({
  activeActionId,
  isLoading,
  submissions,
  onOpenResults,
  onRetry,
}: ProcessedResultsSectionProps) {
  return (
    <section className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-outline-variant/10" data-testid="processed-results">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold font-headline">Latest Results</h3>
        {isLoading ? (
          <span className="text-on-surface-variant text-sm">Refreshing...</span>
        ) : null}
      </div>
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant" data-testid="processed-results-empty">
            <p>No processed results yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {submissions.map((submission) => (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className={
                  submission.status === "completed"
                    ? "p-4 rounded-2xl border transition-all bg-green-50/30 border-green-100/50"
                    : submission.status === "failed"
                      ? "p-4 rounded-2xl border transition-all bg-error-container/10 border-error-container/20"
                      : "p-4 rounded-2xl border transition-all bg-surface-container/50 border-outline-variant/10"
                }
                data-testid={`processed-submission-${submission.id}`}
                initial={{ opacity: 0, y: 10 }}
                key={submission.id}
              >
                <div className="flex items-center">
                  <div
                    className={
                      submission.status === "completed"
                        ? "w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-green-100"
                        : submission.status === "failed"
                          ? "w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-error-container/30"
                          : "w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-surface-container-high"
                    }
                  >
                    {submission.status === "completed" ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : submission.status === "failed" ? (
                      <AlertCircle className="w-6 h-6 text-error" />
                    ) : (
                      <XCircle className="w-6 h-6 text-on-surface-variant" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center gap-4">
                      <span
                        className={
                          submission.status === "cancelled"
                            ? "font-semibold text-on-surface-variant"
                            : "font-semibold text-on-surface"
                        }
                      >
                        {submission.filename}
                      </span>
                      <span
                        className={
                          submission.status === "completed"
                            ? "text-xs font-bold uppercase tracking-wider text-green-600"
                            : submission.status === "failed"
                              ? "text-xs font-bold uppercase tracking-wider text-error"
                              : "text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                        }
                      >
                        {submission.status === "completed" ? "Success" : submission.status}
                      </span>
                    </div>
                    {submission.error ? (
                      <p className="text-sm text-error mt-2" data-testid={`submission-error-${submission.id}`}>
                        {submission.error}
                      </p>
                    ) : null}
                  </div>
                  <div className="ml-6 flex items-center gap-2">
                    {submission.results ? (
                      <button
                        className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                        data-testid={`view-results-${submission.id}`}
                        onClick={() => onOpenResults(submission.id)}
                        type="button"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    ) : null}
                    {submission.canRetry ? (
                      <button
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-35"
                        data-testid={`retry-submission-${submission.id}`}
                        disabled={activeActionId === submission.id}
                        onClick={() => void onRetry(submission.id)}
                        type="button"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
