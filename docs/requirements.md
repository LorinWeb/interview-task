# Product Requirements

## User Flows

The product should support the following user flows:

- A user should be able to upload a dataset file, see the submission move through processing states, and understand the outcome of that processing.
- Users should also be able to take follow-up actions when appropriate, such as retrying failed submissions or cancelling in-progress submissions.

The solution should address consistency and correctness expectations and behave predictably under failures and retries.

## User Interface

Design a simple, clear UI that supports the core external user flows:

- Creating a new submission (uploading a dataset)
- Viewing existing submissions and their current status
- Performing allowed actions (for example retry or cancel)

The exact layout and UI patterns are up to you. Aim for a small but polished experience with sensible defaults, clear states and appropriate feedback.

## Dataset Upload

The product should accept a CSV file with the following columns:

- **id:** unique numeric identifier per row, e.g. `test_case_123`
- **label:** one of `strong_match`, `good_match`, `weak_match`, `failed_to_process`

The uploaded file represents the results of a single test run. Each row corresponds to one individual observation.

While `strong_match`, `good_match`, `weak_match` reprent an observed outcome, `failed_to_process` represents a failed test case (e.g. the test data was corrupted).

## Data Processing

Submission processing should be implemented asynchronously and must not complete within the initial upload request. You may simulate background processing (e.g. though fixed a 1min delay), so that progress and state changes are observable from the web application.

The design should make it straightforward to evolve this into a more production-grade background processing setup later.

## Submission States

Define a clear submission lifecycle from initial upload to a terminal outcome.

The lifecycle should include stages such as `queued`, `processing`, `completed`, `failed`, and `cancelled`, with clear transitions between them.

The UI should reflect this lifecycle and keep users in the loop.

## API & Data Model

Design an API and data schema that supports the core product flows.

The exact structure is up to you. We care about clarity, correctness, and how well the schemas support the requirements while remaining easy to evolve as the product grows.

## Error Handling

Error handling should be designed with both technical correctness and user experience in mind.

