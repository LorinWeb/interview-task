import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  expect,
  test,
  type APIRequestContext,
} from "@playwright/test";

import type { DashboardSubmission } from "@/features/submissions/model/contracts";

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

test("supports cancellation, retry, and idempotent repeated action requests", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("upload-zone")).toBeVisible();

  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/long-running-dataset.csv");

  let submissionId = "";

  await expect.poll(async () => {
    const response = await request.get("/api/submissions");
    const submissions = (await response.json()) as Array<{ filename: string; id: string }>;
    submissionId =
      submissions.find((submission) => submission.filename === "long-running-dataset.csv")?.id ??
      "";
    return submissionId;
  }).not.toBe("");

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

test("lets a stale cancel click win for fast submissions", async ({ page, request }) => {
  await page.goto("/");
  await page.getByTestId("upload-input").setInputFiles("tests/fixtures/valid-dataset.csv");

  let submissionId = "";

  await expect.poll(async () => {
    const response = await request.get("/api/submissions");
    const submissions = (await response.json()) as Array<{ filename: string; id: string }>;
    submissionId =
      submissions.find((submission) => submission.filename === "valid-dataset.csv")?.id ?? "";
    return submissionId;
  }).not.toBe("");

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

async function uploadFixture(request: APIRequestContext, fileName: string) {
  const response = await request.post("/api/upload", {
    multipart: {
      file: {
        buffer: await readFile(join(process.cwd(), "tests", "fixtures", fileName)),
        mimeType: "text/csv",
        name: fileName,
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
