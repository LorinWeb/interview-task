import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import Database from "better-sqlite3";

import { assertSupportedDbSource, loadConfig, type AppConfig } from "@/server/config";
import { initializeSchema } from "@/server/db/schema";
import { LocalFileStorage } from "@/server/files/local-file-storage";
import { SubmissionRepository } from "@/features/submissions/server/repository";

export interface AppContext {
  config: AppConfig;
  database: Database.Database;
  repository: SubmissionRepository;
  storage: LocalFileStorage;
}

declare global {
  var __interviewTaskContext: AppContext | undefined;
}

export function createAppContext(config: AppConfig): AppContext {
  assertSupportedDbSource(config);

  mkdirSync(dirname(config.localDbPath), { recursive: true });
  mkdirSync(config.uploadsDir, { recursive: true });

  const database = new Database(config.localDbPath);

  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("synchronous = NORMAL");

  initializeSchema(database);

  return {
    config,
    database,
    repository: new SubmissionRepository(database),
    storage: new LocalFileStorage(config.uploadsDir),
  };
}

export function getAppContext(): AppContext {
  globalThis.__interviewTaskContext ??= createAppContext(loadConfig());
  return globalThis.__interviewTaskContext;
}

export function closeAppContext(context: AppContext): void {
  context.database.close();
}
