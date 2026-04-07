# Limit Visible Processed Results To Five

## Summary
- Show only the latest five processed submissions in the dashboard.
- Keep the full submission list in the backend; apply the limit only in the UI projection.
- Add browser coverage that verifies the oldest processed item drops off once six completed submissions exist.

## Key Changes
- Cap the visible processed results array in the dashboard state hook.
- Add an end-to-end test that creates six completed submissions and asserts only the latest five are rendered.

## Test Plan
- Run the new processed-results limit browser test.
- Run `npm run typecheck`, `npm test`, and `npm run test:e2e`.

## Assumptions
- The limit is a presentation rule for the current dashboard, not a change to server-side history retention.
- “Latest” follows the existing submission ordering returned by the API.
