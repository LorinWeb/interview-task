import { BarChart3, FileText, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { IconButton } from "@/components/Button/IconButton";
import { ProgressBar } from "@/components/Feedback/ProgressBar";
import { SurfaceSection } from "@/components/Layout/SurfaceSection";
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
    <SurfaceSection
      dataTestId="active-queue"
      headerAside={
        <span className="rounded-full bg-secondary-container px-4 py-1 text-xs font-bold uppercase tracking-wider text-on-secondary-container">
          {submissions.length} {submissions.length === 1 ? "File" : "Files"} Processing
        </span>
      }
      title="Active Queue"
    >
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
                <ProgressBar
                  fillTestId={`progress-fill-${submission.id}`}
                  label={`${submission.filename} progress`}
                  tone={getProgressTone(submission.status)}
                  trackTestId={`progress-track-${submission.id}`}
                  value={submission.progress}
                />
              </div>
              <IconButton
                className="ml-6 opacity-0 group-hover:opacity-100 disabled:opacity-30"
                data-testid={`cancel-submission-${submission.id}`}
                disabled={!submission.canCancel || activeActionId === submission.id}
                onClick={() => void onCancel(submission.id)}
                variant="danger"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SurfaceSection>
  );
}

function getProgressTone(status: DashboardSubmission["status"]) {
  if (status === "processing") {
    return "primary";
  }

  if (status === "queued") {
    return "muted";
  }

  return "secondary";
}
