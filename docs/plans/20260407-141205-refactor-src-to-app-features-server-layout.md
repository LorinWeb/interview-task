# Refactor `src` To `app` + `features` + `server`

## Summary
- Move the source tree to the exact interview-facing structure:
  - `src/app`
  - `src/features/submissions`
  - `src/server`
- Treat the submission UI as feature-local, not shared global components.
- Keep behavior unchanged while making the codebase read as intentionally feature-oriented.

## Target Structure
```text
src/
  app/
    App.tsx
    main.tsx
    index.css

  features/
    submissions/
      components/
        ActiveQueueSection.tsx
        ProcessedResultsSection.tsx
        ResultsModal.tsx
        UploadZone.tsx
      client/
        api.ts
        useDashboardState.ts
      model/
        contracts.ts
      server/
        csv.ts
        mappers.ts
        repository.ts
        service.ts
        worker.ts

  server/
    app-context.ts
    config.ts
    http-error.ts
    worker-entry.ts
    db/
      schema.ts
    files/
      local-file-storage.ts
```

## Key Changes
- Move `src/main.tsx` into `src/app/main.tsx` and update `index.html` to use `/src/app/main.tsx`.
- Move all submission UI from `src/components/submissions/*` into `src/features/submissions/components/*`.
- Move submission client code into `src/features/submissions/client/*`.
- Move submission domain contracts into `src/features/submissions/model/contracts.ts`.
- Move submission server logic into `src/features/submissions/server/*`.
- Update imports across app, server, and tests to use `@/app`, `@/features/submissions`, and `@/server`.
- Update docs so the repository structure matches the implemented tree.

## Interfaces
- No public API changes:
  - `POST /api/upload`
  - `GET /api/submissions`
  - `POST /api/submissions/:id/cancel`
  - `POST /api/submissions/:id/retry`
- No schema or behavioral changes.
- Components remain prop-driven and feature-local; no shared-component compatibility layer.

## Test Plan
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run dev`

## Assumptions
- The stronger interview signal is the exact `app` + `features` + `server` tree, even if it is stricter than the earlier compromise.
- Submission-specific components belong with the feature because they are not generic building blocks.
- This is still a structure-only refactor; runtime behavior must remain unchanged.
