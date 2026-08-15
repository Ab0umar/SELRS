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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
