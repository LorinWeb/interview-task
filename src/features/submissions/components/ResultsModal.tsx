import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { DashboardSubmission } from "@/api/types";
import { IconButton } from "@/components/Button/IconButton";

interface ResultsModalProps {
  submission: DashboardSubmission | null;
  onClose: () => void;
}

export function ResultsModal({ submission, onClose }: ResultsModalProps) {
  return (
    <AnimatePresence>
      {submission?.results ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-6"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-2xl p-8"
            data-testid="results-modal"
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <p className="text-on-surface-variant uppercase tracking-wider text-xs font-bold mb-2">
                  Completed results
                </p>
                <h3 className="text-3xl font-bold font-headline">{submission.filename}</h3>
                <p className="text-on-surface-variant mt-2">
                  Total observations: {submission.results.total}
                </p>
              </div>
              <IconButton
                data-testid="close-results-modal"
                onClick={onClose}
                variant="neutral"
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ResultCard label="Strong match" value={submission.results.strong_match} />
              <ResultCard label="Good match" value={submission.results.good_match} />
              <ResultCard label="Weak match" value={submission.results.weak_match} />
              <ResultCard
                label="Failed to process"
                value={submission.results.failed_to_process}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

interface ResultCardProps {
  label: string;
  value: number;
}

function ResultCard({ label, value }: ResultCardProps) {
  return (
    <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-5">
      <p className="text-on-surface-variant text-sm mb-2">{label}</p>
      <strong className="text-3xl font-headline">{value}</strong>
    </div>
  );
}
