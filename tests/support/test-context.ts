import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { closeAppContext, createAppContext } from "@/server/app-context";
import type { AppConfig } from "@/server/config";

export async function createTestContext(overrides: Partial<AppConfig> = {}) {
  const rootDir = await mkdtemp(join(tmpdir(), "interview-task-"));
  const config: AppConfig = {
    dbSource: "local",
    localDbPath: join(rootDir, "data.sqlite"),
    uploadsDir: join(rootDir, "uploads"),
    workerPollIntervalMs: 5,
    processingBatchSize: 4,
    processingBatchDelayMs: 5,
    ...overrides,
  };

  const context = createAppContext(config);

  return {
    context,
    cleanup: async () => {
      closeAppContext(context);
      await rm(rootDir, { force: true, recursive: true });
    },
  };
}
