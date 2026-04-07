# Add Dev Runtime Reset And Seed Data Button

## Summary
- Start `npm run dev` from a clean local runtime every time.
- Move demo data seeding out of startup and behind an explicit dev-only UI control.
- Keep production builds free of the seed control and dev-only API surface.

## Key Changes
- Tooling:
  - Add a runtime reset script that clears the SQLite database directory and uploads directory.
  - Update `npm run dev` to run the runtime reset before starting the app and worker.
  - Keep a separate `npm run seed:data` helper for manual reseeding.
- Server:
  - Extract shared demo-seeding logic into a reusable server-side module.
  - Add a dev-only `POST /api/dev/seed` route that clears current runtime state in place and recreates seeded demo submissions from `tests/fixtures`.
  - Keep this route disabled in production.
- UI:
  - Add a floating `Seed Data` button in the bottom-right corner of the app.
  - Load that button only in dev builds through a lazy import from the app shell.
  - Refresh the dashboard after seeding completes.
- Tests:
  - Add an integration test for the dev seed route.
  - Add an end-to-end test for the floating seed button.

## Assumptions
- `npm run dev` should prioritize a clean manual development environment over preserving previous local data.
- Seeding should be explicit and user-triggered during development rather than happening automatically on every startup.
- The worker should continue to operate against the current open SQLite connection, so live reseeding must clear state in place rather than deleting the database file while the app is running.
