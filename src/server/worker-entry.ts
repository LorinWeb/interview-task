import { getAppContext } from "@/server/app-context";
import { processNextQueuedAttempt } from "@/server/submissions/worker";

const context = getAppContext();

let keepRunning = true;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    keepRunning = false;
  });
}

async function main() {
  while (keepRunning) {
    const submissionId = await processNextQueuedAttempt(context);

    if (!submissionId) {
      await wait(context.config.workerPollIntervalMs);
    }
  }

  context.database.close();
}

main().catch((error) => {
  console.error("[worker] Fatal error", error);
  process.exitCode = 1;
});

function wait(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
