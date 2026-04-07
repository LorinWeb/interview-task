import { readFile } from "node:fs/promises";
import type { Express } from "express";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";

import { createServerApp } from "../../server";
import { processNextQueuedAttempt } from "@/features/submissions/server/worker";
import type { DashboardSubmission } from "@/features/submissions/model/contracts";
import { createTestContext } from "../support/test-context";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe("server routes", () => {
  it("uploads a file and returns flattened completed results", async () => {
    const { cleanup, context } = await createTestContext();
    cleanups.push(cleanup);

    const app = createServerApp({ context });
    const fixture = await readFile("tests/fixtures/valid-dataset.csv");

    const uploadResponse = await request(app)
      .post("/api/upload")
      .attach("file", fixture, { contentType: "text/csv", filename: "valid-dataset.csv" });

    expect(uploadResponse.status).toBe(202);
    expect(uploadResponse.body).toMatchObject({
      canCancel: true,
      canRetry: false,
      filename: "valid-dataset.csv",
      progress: 0,
      status: "queued",
    });

    await processNextQueuedAttempt(context, async () => undefined);

    const listResponse = await request(app).get("/api/submissions");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body[0]).toMatchObject({
      canCancel: false,
      canRetry: false,
      filename: "valid-dataset.csv",
      progress: 100,
      results: {
        failed_to_process: 1,
        good_match: 2,
        strong_match: 3,
        total: 8,
        weak_match: 2,
      },
      status: "completed",
    });
  });

  it("surfaces asynchronous validation failures from the list route", async () => {
    const { cleanup, context } = await createTestContext();
    cleanups.push(cleanup);

    const app = createServerApp({ context });
    const fixture = await readFile("tests/fixtures/invalid-duplicate-id.csv");

    await request(app)
      .post("/api/upload")
      .attach("file", fixture, {
        contentType: "text/csv",
        filename: "invalid-duplicate-id.csv",
      });

    await processNextQueuedAttempt(context, async () => undefined);

    const listResponse = await request(app).get("/api/submissions");

    expect(listResponse.body[0]).toMatchObject({
      canRetry: false,
      error: expect.stringMatching(/repeats the id/i),
      filename: "invalid-duplicate-id.csv",
      status: "failed",
    });
  });

  it("returns queued cancellations as processed cancelled submissions", async () => {
    const { cleanup, context } = await createTestContext();
    cleanups.push(cleanup);

    const app = createServerApp({ context });
    const uploadResponse = await uploadFixture(app, "valid-dataset.csv");

    const cancelResponse = await request(app).post(`/api/submissions/${uploadResponse.id}/cancel`);

    expect(cancelResponse.body).toMatchObject({
      canCancel: false,
      canRetry: true,
      status: "cancelled",
    });

    const listResponse = await request(app).get("/api/submissions");
    expect(listResponse.body[0]).toMatchObject({
      id: uploadResponse.id,
      canCancel: false,
      canRetry: true,
      status: "cancelled",
    });
  });

  it("lets a stale cancel request win even if the submission already completed", async () => {
    const { cleanup, context } = await createTestContext();
    cleanups.push(cleanup);

    const app = createServerApp({ context });
    const uploadResponse = await uploadFixture(app, "valid-dataset.csv");

    await processNextQueuedAttempt(context, async () => undefined);

    const cancelResponse = await request(app).post(`/api/submissions/${uploadResponse.id}/cancel`);
    expect(cancelResponse.body).toMatchObject({
      canCancel: false,
      canRetry: true,
      status: "cancelled",
    });

    const listResponse = await request(app).get("/api/submissions");
    expect(listResponse.body[0]).toMatchObject({
      id: uploadResponse.id,
      canCancel: false,
      canRetry: true,
      status: "cancelled",
    });
  });

  it("projects processing cancellations as cancelled before the worker reaches its checkpoint", async () => {
    const { cleanup, context } = await createTestContext({ processingBatchDelayMs: 40 });
    cleanups.push(cleanup);

    const app = createServerApp({ context });
    const uploadResponse = await uploadFixture(app, "long-running-dataset.csv");
    const releaseBatch = deferred();
    const processor = processNextQueuedAttempt(context, async () => releaseBatch.promise);

    await waitForSubmissionStatus(app, uploadResponse.id, "processing");

    const cancelResponse = await request(app).post(`/api/submissions/${uploadResponse.id}/cancel`);
    expect(cancelResponse.body).toMatchObject({
      canCancel: false,
      status: "cancelled",
    });

    expect(["cancelling", "cancelled"]).toContain(
      context.repository.getSubmissionDetail(uploadResponse.id)?.latestAttempt.status,
    );

    const listWhileCancelling = await request(app).get("/api/submissions");
    expect(listWhileCancelling.body[0]).toMatchObject({
      id: uploadResponse.id,
      canCancel: false,
      status: "cancelled",
    });

    releaseBatch.resolve();
    await processor;

    const cancelledSubmission = await getSubmission(app, uploadResponse.id);
    expect(cancelledSubmission).toMatchObject({
      canCancel: false,
      canRetry: true,
      status: "cancelled",
    });

    const retryResponse = await request(app).post(`/api/submissions/${uploadResponse.id}/retry`);
    const secondRetryResponse = await request(app).post(
      `/api/submissions/${uploadResponse.id}/retry`,
    );

    expect(retryResponse.body).toMatchObject({
      canCancel: true,
      canRetry: false,
      status: "queued",
    });
    expect(secondRetryResponse.body).toMatchObject({
      canCancel: true,
      canRetry: false,
      status: "queued",
    });
  });
});

async function uploadFixture(app: Express, fileName: string) {
  const fixture = await readFile(`tests/fixtures/${fileName}`);
  const response = await request(app)
    .post("/api/upload")
    .attach("file", fixture, { contentType: "text/csv", filename: fileName });

  expect(response.status).toBe(202);
  return response.body as DashboardSubmission;
}

async function getSubmission(app: Express, submissionId: string) {
  const response = await request(app).get("/api/submissions");
  return (response.body as DashboardSubmission[]).find(
    (submission) => submission.id === submissionId,
  );
}

async function waitForSubmissionStatus(
  app: Express,
  submissionId: string,
  expectedStatus: DashboardSubmission["status"],
) {
  const timeoutAt = Date.now() + 2000;

  while (Date.now() < timeoutAt) {
    if ((await getSubmission(app, submissionId))?.status === expectedStatus) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
  }

  throw new Error(`Timed out waiting for submission ${submissionId} to reach ${expectedStatus}.`);
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}
