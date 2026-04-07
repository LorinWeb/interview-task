import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonVariant = "danger" | "neutral" | "primary" | "subtle";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: IconButtonVariant;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  danger: "text-on-surface-variant hover:text-error",
  neutral: "text-on-surface-variant hover:bg-surface-container-low",
  primary: "text-primary hover:bg-primary/10",
  subtle: "text-on-surface-variant hover:text-primary",
};

export function IconButton({
  children,
  className,
  type = "button",
  variant = "neutral",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={[
        "rounded-full p-2 transition-colors disabled:opacity-35",
        VARIANT_CLASSES[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
