import { BarChart3, FileText, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DashboardSubmission } from "@/features/submissions/model/contracts";

interface ActiveQueueSectionProps {
  activeActionId: string | null;
  submissions: DashboardSubmission[];
  onCancel: (submissionId: string) => Promise<void>;
}

export function ActiveQueueSection({
  activeActionId,
  submissions,
  onCancel,
}: ActiveQueueSectionProps) {
  if (submissions.length === 0) {
    return null;
  }

  return (
    <section className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm border border-outline-variant/10" data-testid="active-queue">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold font-headline">Active Queue</h3>
        <span className="bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          {submissions.length} {submissions.length === 1 ? "File" : "Files"} Processing
        </span>
      </div>
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {submissions.map((submission) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center p-4 rounded-2xl hover:bg-surface-container-low transition-colors group"
              data-testid={`active-submission-${submission.id}`}
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, x: -20 }}
              key={submission.id}
              layout
            >
              <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center mr-4">
                {submission.status === "processing" ? (
                  <FileText className="w-6 h-6 text-primary" />
                ) : submission.status === "cancelling" ? (
                  <Loader2 className="w-6 h-6 text-primary-container animate-spin" />
                ) : (
                  <BarChart3 className="w-6 h-6 text-on-surface-variant" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-on-surface">{submission.filename}</span>
                  <span
                    className={
                      submission.status === "processing"
                        ? "text-sm font-bold text-primary"
                        : submission.status === "queued"
                          ? "text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                          : "text-xs font-bold uppercase tracking-wider text-on-secondary-container"
                    }
                  >
                    {submission.status === "processing"
                      ? `${submission.progress}%`
                      : submission.status}
                  </span>
                </div>
                <div
                  aria-label={`${submission.filename} progress`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={submission.progress}
                  className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden"
                  data-testid={`progress-track-${submission.id}`}
                  role="progressbar"
                >
                  <motion.div
                    animate={{ width: `${submission.progress}%` }}
                    className={
                      submission.status === "processing"
                        ? "h-full rounded-full bg-primary shimmer-bg"
                        : submission.status === "queued"
                          ? "h-full rounded-full bg-outline-variant/30"
                          : "h-full rounded-full bg-secondary-container"
                    }
                    data-testid={`progress-fill-${submission.id}`}
                    initial={{ width: 0 }}
                  />
                </div>
              </div>
              <button
                className="ml-6 p-2 text-on-surface-variant hover:text-error opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                data-testid={`cancel-submission-${submission.id}`}
                disabled={!submission.canCancel || activeActionId === submission.id}
                onClick={() => void onCancel(submission.id)}
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
