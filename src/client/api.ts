import type { DashboardSubmission } from "@/submissions/contracts";

export async function fetchSubmissions() {
  return requestJson<DashboardSubmission[]>("/api/submissions");
}

export async function uploadSubmission(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<DashboardSubmission>("/api/upload", {
    body: formData,
    method: "POST",
  });
}

export async function cancelSubmission(submissionId: string) {
  return requestJson<DashboardSubmission>(`/api/submissions/${submissionId}/cancel`, {
    method: "POST",
  });
}

export async function retrySubmission(submissionId: string) {
  return requestJson<DashboardSubmission>(`/api/submissions/${submissionId}/retry`, {
    method: "POST",
  });
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T | { error?: string };

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || "The request failed.");
  }

  return payload as T;
}
