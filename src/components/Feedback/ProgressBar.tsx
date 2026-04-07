import { motion } from "motion/react";

type ProgressBarTone = "muted" | "primary" | "secondary";

interface ProgressBarProps {
  fillTestId?: string;
  label: string;
  tone?: ProgressBarTone;
  trackTestId?: string;
  value: number;
}

const FILL_CLASSES: Record<ProgressBarTone, string> = {
  muted: "h-full rounded-full bg-outline-variant/30",
  primary: "h-full rounded-full bg-primary shimmer-bg",
  secondary: "h-full rounded-full bg-secondary-container",
};

export function ProgressBar({
  fillTestId,
  label,
  tone = "primary",
  trackTestId,
  value,
}: ProgressBarProps) {
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high"
      data-testid={trackTestId}
      role="progressbar"
    >
      <motion.div
        animate={{ width: `${value}%` }}
        className={FILL_CLASSES[tone]}
        data-testid={fillTestId}
        initial={{ width: 0 }}
      />
    </div>
  );
}
