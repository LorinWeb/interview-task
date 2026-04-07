import { getAppContext } from "@/server/app-context";
import { processNextQueuedAttempt } from "@/server/submissions/worker";

const context = getAppContext();

let keepRunning = true;
let interruptIdleWait: (() => void) | null = null;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    keepRunning = false;
    interruptIdleWait?.();
  });
}

async function main() {
  while (keepRunning) {
    const submissionId = await processNextQueuedAttempt(context);

    if (!submissionId) {
      await waitForNextPoll(context.config.workerPollIntervalMs);
    }
  }

  context.database.close();
}

main().catch((error) => {
  console.error("[worker] Fatal error", error);
  process.exitCode = 1;
});

function waitForNextPoll(durationMs: number) {
  return new Promise((resolve) => {
    if (!keepRunning) {
      resolve(undefined);
      return;
    }

    const timeoutId = setTimeout(() => {
      interruptIdleWait = null;
      resolve(undefined);
    }, durationMs);

    interruptIdleWait = () => {
      clearTimeout(timeoutId);
      interruptIdleWait = null;
      resolve(undefined);
    };
  });
}
