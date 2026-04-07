# Fix Active Queue Progress Visibility

## Summary
- Make active submissions show visible progress while processing.
- Keep completed submissions in Active Queue long enough to reach a visible `100%` progress state before they move to Processed Results.
- Add browser behavior coverage for both live progress updates and the completed-to-processed handoff.

## Key Changes
- Reduce active-submission polling latency and trigger an immediate refresh when polling starts.
- Expose stable progress-bar semantics and test ids on the Active Queue progress indicator.
- Hold freshly completed submissions in Active Queue briefly at `100%` before rendering them in Processed Results.

## Test Plan
- Add a browser test that asserts the active progress bar advances above `0%` while processing.
- Add a browser test that asserts the active progress bar reaches `100%` before the row appears in Processed Results.
- Run `npm run typecheck`, `npm test`, and `npm run test:e2e`.

## Assumptions
- The product should prioritize visible progress feedback over immediate removal from Active Queue.
- This is a UI-only handoff change; backend submission state and API contracts remain unchanged.
