import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  expect,
  test,
  type APIRequestContext,
} from "@playwright/test";

import type { DashboardSubmission } from "@/api/types";

test("shows the completed outcome summary in the results modal", async ({
  page,
  request,
}) => {
  const submission = await uploadFixture(request, "valid-dataset.csv");

  await waitForSubmissionStatus(request, submission.id, "completed");
  await page.goto("/");
  await expect(page.getByTestId(`processed-submission-${submission.id}`)).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId(`view-results-${submission.id}`).click();
  await expect(page.getByTestId("results-modal")).toContainText("Total observations: 8");
  await expect(page.getByTestId("results-modal")).toContainText("Strong match");
  await expect(page.getByTestId("results-modal")).toContainText("3");
  await page.getByTestId("close-results-modal").click();
  await expect(page.getByTestId("results-modal")).toHaveCount(0);
});

test("lets dev users seed demo data from the floating button", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("seed-data-button")).toBeVisible();

  await page.getByTestId("seed-data-button").click();

  await expect(page.getByTestId("processed-results")).toContainText("seed-completed.csv", {
    timeout: 15000,
  });
  await expect(page.getByTestId("processed-results")).toContainText("seed-failed.csv");
  await expect(page.getByTestId("processed-results")).toContainText("seed-cancelled.csv");
  await expect(page.getByTestId("active-queue")).toContainText("seed-long-running.csv");
});

test("shows only the latest five processed results", async ({ page, request }) => {
  await waitForNoActiveSubmissions(request);

  const createdSubmissionIds: string[] = [];

  for (let index = 1; index <= 6; index += 1) {
    const submission = await uploadFixture(request, "valid-dataset.csv", `processed-limit-${index}.csv`);
    createdSubmissionIds.push(submission.id);
    await waitForSubmissionStatus(request, submission.id, "completed");
  }

  await page.goto("/");

  await expect(page.locator('[data-testid^="processed-submission-"]')).toHaveCount(5);
  await expect(page.getByTestId(`processed-submission-${createdSubmissionIds[0]}`)).toHaveCount(0);

  for (const submissionId of createdSubmissionIds.slice(1)) {
    await expect(page.getByTestId(`processed-submission-${submissionId}`)).toBeVisible();
  }
});

test("allows uploading the same file again without refreshing", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const existingIds = await listSubmissionIds(request, "valid-dataset.csv");

  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/valid-dataset.csv");
  const firstSubmissionId = await waitForNewSubmissionId(
    request,
    "valid-dataset.csv",
    existingIds,
  );

  await waitForSubmissionStatus(request, firstSubmissionId, "completed");

  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/valid-dataset.csv");
  const secondSubmissionId = await waitForNewSubmissionId(
    request,
    "valid-dataset.csv",
    [...existingIds, firstSubmissionId],
  );

  expect(secondSubmissionId).not.toBe(firstSubmissionId);
});

test("supports cancellation, retry, and idempotent repeated action requests", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("upload-zone")).toBeVisible();

  const existingIds = await listSubmissionIds(request, "long-running-dataset.csv");
  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/long-running-dataset.csv");

  const submissionId = await waitForNewSubmissionId(
    request,
    "long-running-dataset.csv",
    existingIds,
  );

  await expect(page.getByTestId(`active-submission-${submissionId}`)).toBeVisible();
  await expect(page.getByTestId(`cancel-submission-${submissionId}`)).toBeEnabled();

  await page.getByTestId(`cancel-submission-${submissionId}`).click();
  const repeatedCancel = await request.post(`/api/submissions/${submissionId}/cancel`);
  expect(repeatedCancel.ok()).toBeTruthy();

  await expect(page.getByTestId(`active-submission-${submissionId}`)).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.getByTestId(`processed-submission-${submissionId}`)).toContainText(
    "cancelled",
    {
      timeout: 15000,
    },
  );

  await expect(page.getByTestId(`retry-submission-${submissionId}`)).toBeVisible({
    timeout: 15000,
  });

  await page.getByTestId(`retry-submission-${submissionId}`).click();
  const repeatedRetry = await request.post(`/api/submissions/${submissionId}/retry`);
  expect(repeatedRetry.ok()).toBeTruthy();

  await expect(page.getByTestId(`active-submission-${submissionId}`)).toBeVisible({ timeout: 15000 });
});

test("shows visible progress bar updates while a submission is processing", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await waitForNoActiveSubmissions(request);
  const existingIds = await listSubmissionIds(request, "long-running-dataset.csv");
  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/long-running-dataset.csv");
  const submissionId = await waitForNewSubmissionId(
    request,
    "long-running-dataset.csv",
    existingIds,
  );

  const activeSubmission = page.getByTestId(`active-submission-${submissionId}`);
  const progressTrack = page.getByTestId(`progress-track-${submissionId}`);
  const progressFill = page.getByTestId(`progress-fill-${submissionId}`);
  await expect(activeSubmission).toBeVisible();
  await expect(progressTrack).toBeVisible();

  await expect.poll(
    async () => {
      if ((await progressTrack.count()) === 0) {
        return -1;
      }

      return Number(await progressTrack.getAttribute("aria-valuenow"));
    },
    {
      message: "progress bar should report a value above 0 while processing",
      timeout: 4000,
    },
  ).toBeGreaterThan(0);

  await expect.poll(
    async () => {
      if ((await progressFill.count()) === 0) {
        return -1;
      }

      const style = (await progressFill.getAttribute("style")) ?? "";
      const width = style.match(/width:\s*([\d.]+)%/i)?.[1];
      return width ? Number(width) : 0;
    },
    {
      message: "progress bar fill should expand above 0% while processing",
      timeout: 4000,
    },
  ).toBeGreaterThan(0);
});

test("completes the active progress bar before moving a submission to processed results", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await waitForNoActiveSubmissions(request);
  const existingIds = await listSubmissionIds(request, "long-running-dataset.csv");
  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/long-running-dataset.csv");
  const submissionId = await waitForNewSubmissionId(
    request,
    "long-running-dataset.csv",
    existingIds,
  );

  const activeSubmission = page.getByTestId(`active-submission-${submissionId}`);
  const progressTrack = page.getByTestId(`progress-track-${submissionId}`);
  const progressFill = page.getByTestId(`progress-fill-${submissionId}`);
  const processedSubmission = page.getByTestId(`processed-submission-${submissionId}`);

  await expect(activeSubmission).toBeVisible();
  await expect.poll(
    async () => Number(await progressTrack.getAttribute("aria-valuenow")),
    { message: "submission should begin making visible progress", timeout: 4000 },
  ).toBeGreaterThan(0);

  await expect.poll(
    async () => {
      if ((await processedSubmission.count()) > 0) {
        return "processed-too-soon";
      }

      if ((await activeSubmission.count()) === 0) {
        return "active-missing";
      }

      if (Number(await progressTrack.getAttribute("aria-valuenow")) !== 100) {
        return "waiting";
      }

      const style = (await progressFill.getAttribute("style")) ?? "";
      const width = style.match(/width:\s*([\d.]+)%/i)?.[1];
      return width && Number(width) >= 100 ? "ready" : "waiting";
    },
    {
      message: "active row should visually reach 100% before it appears in processed results",
      timeout: 10000,
    },
  ).toBe("ready");

  await expect(activeSubmission).toHaveCount(0, { timeout: 4000 });
  await expect(processedSubmission).toBeVisible({ timeout: 4000 });
});

test("lets a stale cancel click win for fast submissions", async ({ page, request }) => {
  await page.goto("/");
  const existingIds = await listSubmissionIds(request, "valid-dataset.csv");
  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/valid-dataset.csv");
  const submissionId = await waitForNewSubmissionId(request, "valid-dataset.csv", existingIds);

  await expect(page.getByTestId(`active-submission-${submissionId}`)).toBeVisible();

  await page.waitForTimeout(700);
  await page.getByTestId(`cancel-submission-${submissionId}`).click();

  await expect(page.getByTestId(`active-submission-${submissionId}`)).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.getByTestId(`processed-submission-${submissionId}`)).toContainText(
    "cancelled",
    {
      timeout: 15000,
    },
  );
});

test("shows failed submissions with their validation error and no retry action", async ({
  page,
  request,
}) => {
  const submission = await uploadFixture(request, "invalid-label.csv");

  await waitForSubmissionStatus(request, submission.id, "failed");
  await page.goto("/");
  await expect(page.getByTestId(`processed-submission-${submission.id}`)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId(`submission-error-${submission.id}`)).toContainText(
    "unsupported label",
  );
  await expect(page.getByTestId(`retry-submission-${submission.id}`)).toHaveCount(0);
});

test("rejects non-CSV files before upload", async ({ page, request }) => {
  await page.goto("/");
  const initialResponse = await request.get("/api/submissions");
  const initialSubmissions = (await initialResponse.json()) as DashboardSubmission[];

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["not a csv"], "preview.png", { type: "image/png" }));
    return transfer;
  });

  await page.getByTestId("upload-zone").dispatchEvent("drop", { dataTransfer });

  await expect(page.getByTestId("error-banner")).toContainText("Only CSV files can be uploaded.");
  await expect.poll(async () => {
    const response = await request.get("/api/submissions");
    const submissions = (await response.json()) as DashboardSubmission[];

    return {
      count: submissions.length,
      hasPreviewImage: submissions.some((submission) => submission.filename === "preview.png"),
    };
  }).toEqual({
    count: initialSubmissions.length,
    hasPreviewImage: false,
  });
});

async function uploadFixture(
  request: APIRequestContext,
  fixtureFileName: string,
  uploadFileName = fixtureFileName,
) {
  const response = await request.post("/api/upload", {
    multipart: {
      file: {
        buffer: await readFile(join(process.cwd(), "tests", "fixtures", fixtureFileName)),
        mimeType: "text/csv",
        name: uploadFileName,
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as DashboardSubmission;
}

async function waitForSubmissionStatus(
  request: APIRequestContext,
  submissionId: string,
  expectedStatus: DashboardSubmission["status"],
) {
  await expect.poll(
    async () => {
      const response = await request.get("/api/submissions");
      const submissions = (await response.json()) as DashboardSubmission[];
      return submissions.find((submission) => submission.id === submissionId)?.status ?? null;
    },
    {
      message: `submission ${submissionId} should reach ${expectedStatus}`,
      timeout: 15000,
    },
  ).toBe(expectedStatus);
}

async function waitForNoActiveSubmissions(request: APIRequestContext) {
  await expect.poll(
    async () => {
      const response = await request.get("/api/submissions");
      const submissions = (await response.json()) as DashboardSubmission[];

      return submissions.some(
        (submission) =>
          submission.status === "queued" ||
          submission.status === "processing" ||
          (submission.status === "cancelled" && !submission.canRetry),
      );
    },
    {
      message: "previous active submissions should finish before starting the progress test",
      timeout: 15000,
    },
  ).toBe(false);
}

async function listSubmissionIds(request: APIRequestContext, fileName: string) {
  const response = await request.get("/api/submissions");
  const submissions = (await response.json()) as DashboardSubmission[];

  return submissions
    .filter((submission) => submission.filename === fileName)
    .map((submission) => submission.id);
}

async function waitForNewSubmissionId(
  request: APIRequestContext,
  fileName: string,
  existingIds: string[],
) {
  let submissionId = "";

  await expect.poll(async () => {
    const response = await request.get("/api/submissions");
    const submissions = (await response.json()) as DashboardSubmission[];
    submissionId =
      submissions.find(
        (submission) =>
          submission.filename === fileName && !existingIds.includes(submission.id),
      )?.id ?? "";
    return submissionId;
  }).not.toBe("");

  return submissionId;
}
