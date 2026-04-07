import type { components } from "@/api/generated/types";

export type DashboardResults = components["schemas"]["DashboardResults"];
export type DashboardSubmission = components["schemas"]["DashboardSubmission"];
export type SubmissionStatus = DashboardSubmission["status"];
