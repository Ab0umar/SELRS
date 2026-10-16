# Repository Guidelines

## Project Structure & Module Organization

- `client/`: React + Vite frontend pages/components (patient flows, admin hub, dashboards).
- `server/`: backend routes, sync logic, and API entry (`server/_core/index.ts`).
- `shared/`: shared schemas/types used by both client and server.
- `drizzle/`: database migrations and DB artifacts.
- `scripts/`: operational scripts (DB backup/restore, deploy, sync checks, Android build).
- `tests/` and root `test-*.ts`: automated and smoke-style validation scripts.
- `desktop/` and `desktop-electron/`: Windows desktop wrappers/installers.

## Build, Test, and Development Commands

- `pnpm dev`: run backend in watch mode for local development.
- `pnpm build`: run encoding checks, build frontend, and bundle server into `dist/`.
- `pnpm start`: run production server from `dist/index.js`.
- `pnpm check`: TypeScript typecheck (`--noEmit`).
- `pnpm test`: run Vitest suite.
- `pnpm test:ui`: run Playwright end-to-end tests.
- `pnpm db:push`: generate + apply Drizzle migrations.
- `pnpm db:backup` / `pnpm db:restore`: PowerShell DB maintenance scripts.

## Coding Style & Naming Conventions

- TypeScript-first; keep strict typing and avoid `any` unless unavoidable.
- Follow Prettier defaults; run `pnpm format` before large PRs.
- Use descriptive names: `getPatientServiceEntries`, `syncUserPermissionsToRole`.
- File naming:
- React pages/components: `PascalCase.tsx`.
- Scripts/utilities: `kebab-case` or existing project pattern.
- Keep changes scoped; avoid unrelated refactors in hot paths (sync, queue, medical file).

## Testing Guidelines

- Frameworks: Vitest (unit/integration), Playwright (UI), plus targeted script tests.
- Add or update tests when changing sync logic, patient transactions, queue movement, or medical-file persistence.
- Prefer explicit test names (example: `should_update_existing_exam_instead_of_creating_new_one`).
- Run at minimum: `pnpm check` and `pnpm test` before opening PR.

## Commit & Pull Request Guidelines

- Existing history mixes short and descriptive messages; prefer clear imperative summaries.
- Recommended format: `area: concise change` (example: `medical-file: update existing exam on save`).
- PRs should include:
- what changed and why,
- affected paths/endpoints,
- migration/env implications,
- screenshots for UI changes (patients/admin/medical file),
- verification steps with exact commands run.

## Security & Configuration Tips

- Keep secrets in `.env`; never commit real credentials or production keys.
- Validate sync and DB changes with `pnpm db:sync-check` before deployment.
- For Windows service/desktop packaging, run scripts from elevated PowerShell when required.

## Cursor Cloud specific instructions

- `.cursor/environment.json` installs MySQL when it is missing, then runs `pnpm install --frozen-lockfile`. On boot, `.cursor/start.sh` starts MySQL, prepares `selrs_db` and `selrs_test`, and runs `pnpm dev` on port 4000.
- Do not run `pnpm db:migrate` against an empty database. The Drizzle journal points at SQL files split between `drizzle/` and `drizzle/New folder`, so the migrator stops on a missing file. Startup applies `pnpm exec drizzle-kit push --force` only when `user_permissions` is absent.
- First boot writes local credentials to `~/.selrs-local.env` and a gitignored `.env`. The dev admin username is `devadmin`. `.cursor/seed-dev-admin.mjs` grants page permissions and records that the password was already changed. `pnpm create-user` keeps the MySQL pool open and does not exit.
- The generated `.env` turns off attendance device sync, Pentacam folder import, and MSSQL auto-sync. `DATABASE_TEST_URL` points at `selrs_test` for `pnpm test:backend`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):
- Core filter, always on: `antislop`: `.agents/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.agents/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.agents/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.agents/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.agents/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->
