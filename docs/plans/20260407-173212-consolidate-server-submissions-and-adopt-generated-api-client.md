# Consolidate Server Submissions And Adopt Generated API Client

## Summary
- Move all submissions backend modules under `src/server/submissions` so backend code has one clear home.
- Replace the hand-written client-side contract file with generated API types under `src/api/generated`.
- Use React Query for frontend server-state fetching, polling, and mutations.

## Key Changes
- Source layout:
  - Move `src/features/submissions/server/*` to `src/server/submissions/*`.
  - Keep backend infrastructure in `src/server/*`.
  - Keep feature UI code in `src/features/submissions/*`.
  - Add generated API artifacts under `src/api/generated/*`.
- Backend types:
  - Split internal server domain types from API response types.
  - Keep internal submission lifecycle and repository types in server-owned files.
  - Stop importing backend domain types from a feature-model file.
- API generation:
  - Add an OpenAPI document for the HTTP surface.
  - Generate TypeScript API types from that document.
  - Expose a typed generated client surface for the frontend to consume.
- Frontend data layer:
  - Add `QueryClientProvider` at the app entrypoint.
  - Replace manual fetch/poll/refetch logic in `useDashboardState` with React Query queries and mutations.
  - Keep UI-only derived state local to the feature, including modal state and the completion handoff behavior.
- Verification:
  - Update tests and imports for the new layout.
  - Run `npm run typecheck`, `npm test`, and `npm run test:e2e`.

## Assumptions
- The HTTP surface remains unchanged.
- Generated API types are for client/server contract clarity, not for backend persistence or worker internals.
- React Query should reduce custom server-state orchestration, but UI-specific derived state remains feature-local.
