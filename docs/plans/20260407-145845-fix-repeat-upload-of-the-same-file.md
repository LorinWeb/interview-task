# Fix Repeat Upload Of The Same File

## Summary
- Allow users to upload the same file again without refreshing the page.
- Reset the hidden file input after each selection so the browser fires `change` for the same path on the next selection.
- Add browser coverage for the repeat-upload flow.

## Key Changes
- Clear the upload input value immediately after reading the selected file in the upload component.
- Add an end-to-end test that uploads a file, waits for completion, uploads the same file again, and verifies that a second distinct submission is created.

## Test Plan
- Run the new repeat-upload browser test.
- Run `npm run typecheck`, `npm test`, and `npm run test:e2e`.

## Assumptions
- Re-uploading an identical file should create a new submission rather than being ignored by the client.
- This is a browser-input fix only; backend behavior stays unchanged.
