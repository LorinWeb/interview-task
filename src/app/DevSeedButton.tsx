import { useState } from "react";

import { seedDemoData } from "@/api/client";

interface DevSeedButtonProps {
  onSeeded: () => Promise<void>;
}

export function DevSeedButton({ onSeeded }: DevSeedButtonProps) {
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSeed() {
    setError(null);
    setIsSeeding(true);

    try {
      await seedDemoData();
      await onSeeded();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The seed request failed.");
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2">
      {error ? (
        <div className="max-w-xs rounded-2xl border border-error-container bg-error-container/90 px-4 py-3 text-sm text-error shadow-lg">
          {error}
        </div>
      ) : null}
      <button
        className="rounded-full bg-on-surface px-5 py-3 text-sm font-semibold text-surface shadow-[0_16px_32px_rgba(28,26,34,0.14)] transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100"
        data-testid="seed-data-button"
        disabled={isSeeding}
        onClick={() => void handleSeed()}
        type="button"
      >
        {isSeeding ? "Seeding..." : "Seed Data"}
      </button>
    </div>
  );
}
