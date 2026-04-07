import type { ReactNode } from "react";

interface SurfaceSectionProps {
  children: ReactNode;
  dataTestId?: string;
  headerAside?: ReactNode;
  title: ReactNode;
}

export function SurfaceSection({
  children,
  dataTestId,
  headerAside,
  title,
}: SurfaceSectionProps) {
  return (
    <section
      className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm"
      data-testid={dataTestId}
    >
      <div className="mb-8 flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold font-headline">{title}</h3>
        {headerAside}
      </div>
      {children}
    </section>
  );
}
