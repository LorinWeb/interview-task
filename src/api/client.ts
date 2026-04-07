import createClient from "openapi-fetch";

import type { components, paths } from "@/api/generated/types";

const client = createClient<paths>({ baseUrl: "/" });

type ErrorResponse = components["schemas"]["ErrorResponse"];

export async function fetchSubmissions() {
  return unwrapResponse(client.GET("/api/submissions"));
}

export async function uploadSubmission(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<paths["/api/upload"]["post"]["responses"]["202"]["content"]["application/json"]>(
    "/api/upload",
    {
      body: formData,
      method: "POST",
    },
  );
}

export async function cancelSubmission(submissionId: string) {
  return unwrapResponse(
    client.POST("/api/submissions/{id}/cancel", {
      params: { path: { id: submissionId } },
    }),
  );
}

export async function retrySubmission(submissionId: string) {
  return unwrapResponse(
    client.POST("/api/submissions/{id}/retry", {
      params: { path: { id: submissionId } },
    }),
  );
}

export async function seedDemoData() {
  return unwrapResponse(client.POST("/api/dev/seed"));
}

async function unwrapResponse<T>(
  request: Promise<{ data?: T; error?: ErrorResponse }>,
): Promise<T> {
  const { data, error } = await request;

  if (error) {
    throw new Error(error.error || "The request failed.");
  }

  if (!data) {
    throw new Error("The request failed.");
  }

  return data;
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T | ErrorResponse;

  if (!response.ok) {
    throw new Error((payload as ErrorResponse).error || "The request failed.");
  }

  return payload as T;
}
