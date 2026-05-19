# SELRS Claude Code Guide

For code tasks in this repo only.

Read first:
- specs/AI_CONTEXT.md

Then follow the project Constitution and Project Principles strictly.


## Goal
- Make the smallest correct diff.
- Prefer root-cause fixes.
- Keep output short and concrete.

## Read Order
Read only what the task needs. Start here:
- frontend route/page work: `client/src/App.tsx`, then the target page in `client/src/pages`, then related components in `client/src/components`
- auth or page access: `client/src/components/ProtectedRoute.tsx`, `client/src/hooks/useAuth*`
- backend API work: `server/routers/index.ts`, then `server/routers/medical.ts` or `server/routers/patient.ts`
- tRPC/auth context: `server/_core/trpc.ts`, `server/_core/procedures.ts`, `server/_core/context.ts`
- server/runtime issues: `server/_core/index.ts`, `server/_core/env.ts`, `server/_core/ws.ts`
- db behavior: `server/db.ts`, then `drizzle/schema.ts`
- shared types/constants: `shared/types.ts`, `shared/const.ts`

## SELRS-Specific Rules
- UI text is mixed Arabic/English. Preserve existing language and wording style in the touched screen.
- Do not replace Arabic labels/messages with English unless the file already uses English for that exact UI.
- Patient/medical/admin flows are permission-sensitive. If a route, action, or page changes, verify both frontend gating and backend procedure protection.
- Existing access control uses `ProtectedRoute` in the frontend and role-based procedures in `server/_core/procedures.ts`. Follow that pattern.
- Frontend page access is enforced in `client/src/components/ProtectedRoute.tsx`.
- Backend access is enforced with `protectedProcedure` and role-based procedures in `server/_core/procedures.ts`.
- Keep special permission cases intact, including admin bypasses, branch restrictions, and path-based permission mapping.
- Do not widen access accidentally when renaming routes or moving features.
- API changes should stay inside the existing tRPC router structure. Do not introduce a parallel API style.
- Data access belongs in `server/db.ts` or established backend helpers, not inside frontend code.
- This repo already handles mojibake/legacy encoding in DB code. Do not remove or bypass decode/encode helpers without understanding the data path.
- Keep route paths stable unless the task explicitly requires changing URLs.
- Prefer extending current page/component patterns over creating new abstractions.

## Architecture
- Frontend: React 19 + Vite + Wouter in `client/src`
- Backend: Express + tRPC in `server/_core` and `server/routers`
- Shared contracts: `shared`
- Database: Drizzle schema with MySQL access in `server/db.ts`
- Extra integrations exist for MSSQL sync, FCM, S3, Pentacam, OCR, and WebSocket updates

## High-Value Areas
- Main frontend router and lazy page loading: `client/src/App.tsx`
- Protected page access and permission-derived routing: `client/src/components/ProtectedRoute.tsx`
- Core medical business logic: `server/routers/medical.ts`
- Patient CRUD-like API: `server/routers/patient.ts`
- App router composition: `server/routers/index.ts`
- Database and legacy-text handling: `server/db.ts`
- Server bootstrap, health, CORS, file import/OCR flows: `server/_core/index.ts`

## Edit Rules
- Edit the fewest files possible.
- Do not touch `dist`, `node_modules`, backups, logs, or generated files.
- Avoid refactors unless required to complete the task.
- Match local naming, zod usage, trpc patterns, and existing component structure.
- For frontend route work, keep lazy imports and `ProtectedRoute` usage consistent with nearby routes.
- For backend mutations, preserve audit logging and permission checks if the surrounding feature already has them.

## Verification
- Run the smallest relevant check first.
- Use:
  - `pnpm check` for TypeScript or API surface changes
  - `pnpm test` for logic changes with existing coverage
  - `pnpm build` when changing shipped frontend/server behavior
  - `pnpm smoke` for workflow-sensitive changes
- If a change touches auth, routing, permissions, patient flows, or shared types, prefer `pnpm check` at minimum.
- Report checks run and skipped checks explicitly.

## Final Response
Return only:
- changed files
- what changed
- check run / not run

## MSSQL Patient Sync (Critical Pattern)
**Doctor/Service Matching:** Both `doctorCode` and `serviceCode` must come from the **same PAPAT_SRV row** to stay matched. Do NOT pick `doctorCode` from PAJRNRCVH.DRS_CD independently — this creates mismatches. Priority: SRV_BY1 (from service row) first, DRS_CD fallback only.

**Stale Exam State:** For non-manually-locked patients, exclude `latestExamDoctorByPatient`, `latestExamServiceCodeByPatient`, and similar exam-state fields from resolution chains. Use ONLY synced DB fields + official entries table. Exam page state JSON persists and overrides fresh MSSQL sync data, causing "nothing changes" behavior.

**Reset Sync Codes:** Use `resetMssqlSyncCodes()` to bulk-clear `doctorCode`, `doctorId`, `serviceCode` and delete mssql-sourced `patientServiceEntries`, then run full sync. Located in medical.ts tRPC and db.ts helper.

See Claude memory files: `project_mssql_sync_fix.md`, `feedback_stale_exam_state.md`.

## Extra Project Rules
- Use `.claude/rules/frontend.md` for route/page/component work.
- Use `.claude/rules/backend.md` for tRPC/server work.
- Use `.claude/rules/permissions.md` for auth and access-control changes.
- Use `.claude/rules/database.md` for DB/schema/data issues.
- Use `.claude/rules/verification.md` when choosing checks.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-attendance-fingerprint/plan.md`
<!-- SPECKIT END -->
