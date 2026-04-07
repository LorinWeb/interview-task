import { resolve } from "node:path";

export interface AppConfig {
  dbSource: "local" | "remote";
  localDbPath: string;
  uploadsDir: string;
  workerPollIntervalMs: number;
  processingBatchSize: number;
  processingBatchDelayMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dbSource = env.DB_SOURCE ?? "local";

  if (dbSource !== "local" && dbSource !== "remote") {
    throw new Error(`Unsupported DB_SOURCE value "${dbSource}".`);
  }

  return {
    dbSource,
    localDbPath: resolve(env.LOCAL_DB_PATH ?? "./runtime/data/interview-task.sqlite"),
    uploadsDir: resolve(env.UPLOADS_DIR ?? "./runtime/uploads"),
    workerPollIntervalMs: parsePositiveInteger(
      env.WORKER_POLL_INTERVAL_MS,
      500,
      "WORKER_POLL_INTERVAL_MS",
    ),
    processingBatchSize: parsePositiveInteger(
      env.PROCESSING_BATCH_SIZE,
      4,
      "PROCESSING_BATCH_SIZE",
    ),
    processingBatchDelayMs: parsePositiveInteger(
      env.PROCESSING_BATCH_DELAY_MS,
      350,
      "PROCESSING_BATCH_DELAY_MS",
    ),
  };
}

export function assertSupportedDbSource(config: AppConfig): void {
  if (config.dbSource === "remote") {
    throw new Error(
      'DB_SOURCE="remote" is reserved for a future adapter and is not implemented in v1. Use DB_SOURCE="local".',
    );
  }
}

function parsePositiveInteger(
  rawValue: string | undefined,
  fallback: number,
  name: string,
): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}
