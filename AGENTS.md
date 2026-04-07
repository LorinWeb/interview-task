# Product Requirements
As and if required, please read docs/requirements.md

# Assumptions & Scope
- Prefer simple, pragmatic solutions over speculative or complex designs
- We document any important assumptions briefly in docs/design.md

# Repository Instructions
- Whenever a plan is approved, save it in `/docs/plans/*` as a Markdown file named `{timestamp}-{plan-title}.md`.
- Use the timestamp format `YYYYMMDD-HHMMSS`.
- Use a kebab-case slug for `{plan-title}`.
- These planning and plan-linked commit rules apply to AI-generated output in this repository.
- After executing an approved plan, do not commit immediately. First present the result to a human and wait for explicit approval before creating any commit.
- Commits that implement an approved plan must include a `Plan:` footer that references the matching `docs/plans/{timestamp}-{plan-title}.md` file.
- Never edit `package-lock.json` directly. If dependency changes are needed, let `npm` update the lockfile as a byproduct of package manager commands.
- Planned-work commits must use this shape:
```
<type>: <summary>
// blank line
<detail line 1>
<detail line 2>
// blank line
Plan: docs/plans/YYYYMMDD-HHMMSS-plan-title.md
```
- In repository documentation, reference files with relative paths only. Never use absolute filesystem paths.

# UI Components

- For UI components we use `src/components`
- also follow the local instructions in `src/components/AGENTS.md`.

# Refactoring Mandates

- Remove dead code when the product surface has been intentionally dropped; do not keep compatibility layers without a clear owner.
- Keep export surfaces minimal. Do not export code unless another file imports it, and when an export becomes unused, remove the export first and then delete the now-dead internal code.
- Keep generic helpers in generic domains. Do not mix utility concerns such as class name joining into domain-specific files like `src/helpers/print.ts`.
- Prefer moving code closer to its domain rather than adding more “misc” layers. Resume-specific rendering belongs with resume code, layout infrastructure belongs under `src/components/Layout`, and test bootstrapping belongs under `tests/support`.
- Keep source files under 200 lines where practical. When a file grows past that, split by responsibility, not arbitrarily.
- Split large React files by separating pure logic from framework wiring. Examples: move canvas drawing/math out of components, and move DOM observer/state orchestration out of layout shells.
- Before moving code, confirm the destination reduces coupling instead of scattering related pieces across unrelated folders.
- Treat visual refactors as high-risk even when behavior is unchanged. Run the full verification pass, including Playwright visual tests, after structural cleanup.