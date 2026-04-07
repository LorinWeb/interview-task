import { mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { DashboardSubmission } from "@/api/types";
import {
  cancelDashboardSubmission,
  createDashboardSubmissionFromUpload,
  listDashboardSubmissions,
} from "@/server/submissions/service";
import { processNextQueuedAttempt } from "@/server/submissions/worker";
import type { AppContext } from "@/server/app-context";

const FIXTURES_DIR = resolve(process.cwd(), "tests", "fixtures");

export async function reseedDemoData(context: AppContext) {
  await clearRuntimeData(context);
  return seedDemoData(context);
}

export async function seedDemoData(context: AppContext) {
  await seedCompletedSubmission(context);
  await seedFailedSubmission(context);
  await seedCancelledSubmission(context);
  await seedLongRunningSubmission(context);
  await seedQueuedSubmission(context);

  return listDashboardSubmissions(context);
}

async function clearRuntimeData(context: AppContext) {
  context.database.exec(`
    DELETE FROM submission_attempts;
    DELETE FROM submissions;
  `);

  await rm(context.config.uploadsDir, { force: true, recursive: true });
  await mkdir(context.config.uploadsDir, { recursive: true });
}

async function seedCompletedSubmission(context: AppContext) {
  await createSubmission(context, "valid-dataset.csv", "seed-completed.csv");
  await processOneQueuedSubmission(context);
}

async function seedFailedSubmission(context: AppContext) {
  await createSubmission(context, "invalid-label.csv", "seed-failed.csv");
  await processOneQueuedSubmission(context);
}

async function seedCancelledSubmission(context: AppContext) {
  const submission = await createSubmission(context, "valid-dataset.csv", "seed-cancelled.csv");
  cancelDashboardSubmission(context, submission.id);
}

async function seedLongRunningSubmission(context: AppContext) {
  await createSubmission(context, "long-running-dataset.csv", "seed-long-running.csv");
}

async function seedQueuedSubmission(context: AppContext) {
  await createSubmission(context, "valid-dataset.csv", "seed-queued.csv");
}

async function createSubmission(
  context: AppContext,
  fixtureFileName: string,
  uploadFileName: string,
): Promise<DashboardSubmission> {
  const buffer = await readFile(join(FIXTURES_DIR, fixtureFileName));
  const file = new File([buffer], uploadFileName, { type: "text/csv" });

  return createDashboardSubmissionFromUpload(context, file);
}

async function processOneQueuedSubmission(context: AppContext) {
  await processNextQueuedAttempt(context, async () => undefined);
}
