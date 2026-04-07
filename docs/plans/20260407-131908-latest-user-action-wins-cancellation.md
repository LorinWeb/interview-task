# Latest User Action Wins Cancellation

## Summary
- Make cancellation authoritative even when the UI is slightly stale.
- If a user clicks cancel while the dashboard still presents the submission as cancellable, the eventual state should resolve to `cancelled`.
- Preserve the worker-safe internal lifecycle while ensuring the public result matches the latest user intent.

## Behavior Change
- Keep the internal processing flow:
  - `queued -> cancelled`
  - `processing -> cancelling -> cancelled`
- Extend cancellation so a just-completed submission can still be cancelled if the user action arrives during the stale UI window.
- Do not let later worker writes override a successful cancel request.

## Implementation
- Repository:
  - allow `POST /api/submissions/:id/cancel` from `completed` as well as `queued`, `processing`, `cancelling`, and `cancelled`
  - treat repeated cancel requests as effect-idempotent
  - guard progress, completion, and failure writes so they only apply while the attempt is still `processing`
- Worker:
  - if a guarded repository write no longer applies, treat that as cancellation winning the race
  - finalize the attempt as `cancelled` instead of allowing `completed` or `failed` to overwrite the user action
- Dashboard/API:
  - continue projecting internal `cancelling` as visible `cancelled` in the list response
  - keep retry availability tied to the true terminal backend state

## Tests
- Integration coverage:
  - queued cancellation returns `cancelled`
  - processing cancellation projects as `cancelled`
  - stale cancel after backend completion still resolves to `cancelled`
- End-to-end coverage:
  - cancelling a long-running submission moves it from Active Queue to Processed Results as `cancelled`
  - cancelling a fast submission during the stale-button window still ends as `cancelled`

## Assumptions
- The latest explicit user action should win over a near-simultaneous worker completion.
- This rule is specific to cancellation semantics and does not change retry eligibility rules.
- Returning `cancelled` to the dashboard immediately is acceptable even if the worker is still converging internally on terminal `cancelled`.
