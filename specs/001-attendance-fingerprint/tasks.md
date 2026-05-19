---
description: "Tasks for SRV100 Attendance & Fingerprint Module (Phase 1)"
---

# Tasks: SRV100 Attendance & Fingerprint Module

**Input**: Design documents from `specs/001-attendance-fingerprint/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`.

**Tests**: Unit + service-layer tests are required (see `plan.md` R14 and Constitution Principle VII — `pnpm check` and `pnpm test` are mandatory gates). Tests are scoped to the rules engine, sync engine, and adapter.

**Organization**: Tasks are grouped into Setup → Foundational → one phase per user story (priority order from `spec.md`) → Polish. Every task carries the full Task Contract from `PROJECT_PRINCIPLES.md §2` after the checklist line.

## Format

```
- [ ] T### [P?] [Story?] Description — file path(s)
```

Followed by an indented block with: **Owner**, **Backup**, **Tool**, **Role**, **Inputs**, **Outputs**, **Prompt** (ends with the mandatory phrase), **Acceptance**, **Deps**, **Constitution Refs**.

`[P]` = parallelizable (different files, no incomplete dependency).
`[USn]` = user story label (US1…US6).

**Routing matrix abbreviations** (per `PROJECT_PRINCIPLES.md §4`): `Claude` (plan/review only — never implements code per §3), `Cursor` (default executor in repo), `Codex` (implementation), `GPT-5` (SQL/report logic), `Gemini` (UI variants), `cheap` (bulk extraction).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire env, permission keys, and the empty router so subsequent phases compile cleanly.

- [ ] **T001** Add Attendance env vars to `server/_core/env.ts` — `server/_core/env.ts`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `specs/001-attendance-fingerprint/research.md` §R15
  - **Outputs**: 10 new optional env entries (ATTENDANCE_*) with the defaults from R15. No existing entry changed.
  - **Prompt**: "Add ten ATTENDANCE_* environment variable validators to `server/_core/env.ts` per `specs/001-attendance-fingerprint/research.md` §R15. Additive only — do not modify any existing validator. Default values must match R15 exactly. ATTENDANCE_ACCESS_PATH is optional at the env layer (validated at scheduler boot). Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; env file diff is additive; no existing key affected.
  - **Deps**: none
  - **Constitution Refs**: IV, VI, VII

- [ ] **T002** [P] Register Attendance permission keys in the existing permission system — `server/_core/procedures.ts` and the permission key registry (locate via repo grep on existing keys like `accounting.view`)
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` (role factories), `.claude/rules/permissions.md`
  - **Outputs**: Three new permission keys registered (`attendance.view`, `attendance.manage`, `attendance.admin`) plus three procedure factories `attendanceViewerProcedure`, `attendanceManagerProcedure`, `attendanceAdminProcedure`. Factories build on top of existing `protectedProcedure`. Admin bypass and branch restrictions preserved.
  - **Prompt**: "In `server/_core/procedures.ts`, add three NEW procedure factories `attendanceViewerProcedure`, `attendanceManagerProcedure`, `attendanceAdminProcedure` that build on top of the existing `protectedProcedure` and assert the new permission keys `attendance.view`, `attendance.manage`, `attendance.admin` respectively. Reuse the EXACT pattern used by existing role-gated factories in this file (e.g., the accounting/manager equivalents). Register the new permission keys in the existing key registry. Preserve admin bypass and branch restrictions. Do not modify any existing factory's signature or behavior. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; three exported factories present; an authenticated test request without the keys gets `FORBIDDEN`.
  - **Deps**: none
  - **Constitution Refs**: I, VII

- [ ] **T003** [P] Create empty `attendanceRouter` and register it — `server/routers/attendance.ts` (NEW), `server/routers/index.ts` (EDIT — one line)
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md`
  - **Outputs**: New router file exporting an empty `attendanceRouter`; `routers/index.ts` augmented with `attendance: attendanceRouter` alongside `medical`/`accounting`. No procedures yet.
  - **Prompt**: "Create `server/routers/attendance.ts` exporting `export const attendanceRouter = router({})`. In `server/routers/index.ts`, add `attendance: attendanceRouter` to the existing app router composition. Do NOT touch any other router. Do NOT add procedures yet. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; calling `trpc.attendance` from the client compiles; no runtime regression in Medical/Accounting.
  - **Deps**: none
  - **Constitution Refs**: I, VI, VII

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user-story work begins until this phase is complete. Establishes schema, adapter seam, sync engine, rules engine, materializer, scheduler stub, frontend route shell.

- [ ] **T004** Drizzle schema additions for the 8 new `attendance_*` tables — `drizzle/schema.ts` (additive) + new migration `drizzle/00XX_add_attendance_tables.sql`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `data-model.md`
  - **Outputs**: 8 Drizzle table definitions appended to `schema.ts` (employees, punches, shifts, shift_assignments, leaves, holidays, daily, sync_runs). Generated migration applies cleanly. No existing table modified.
  - **Prompt**: "Append Drizzle table definitions for all 8 tables in `specs/001-attendance-fingerprint/data-model.md` to `drizzle/schema.ts`. Column types, indexes, and primary keys MUST match the data-model document exactly. Do NOT modify any existing table. Run `pnpm db:push` and verify the generated migration is purely additive (no DROP/ALTER on existing tables). Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `SHOW TABLES LIKE 'attendance_%'` lists 8 tables; `pnpm check` passes; `pnpm db:push` is reversible by dropping only the new migration.
  - **Deps**: T001
  - **Constitution Refs**: IV, VII

- [ ] **T005** [P] `AttendanceSource` interface + `sourceFactory` + `tcpDeviceAdapter` placeholder — `server/services/attendance/sources/AttendanceSource.ts`, `server/services/attendance/sources/sourceFactory.ts`, `server/services/attendance/sources/tcpDeviceAdapter.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/attendance-source.md`
  - **Outputs**: Interface + factory + a placeholder class that throws `not implemented` for the TCP adapter. No runtime dependency on a real device.
  - **Prompt**: "Implement the `AttendanceSource` interface and `RawPunch`/`RawEmployee`/`RawPunchOrQuarantine` types exactly as defined in `specs/001-attendance-fingerprint/contracts/attendance-source.md`. Add `sourceFactory.ts` that returns the adapter based on `process.env.ATTENDANCE_SOURCE` (default `access`). Add `tcpDeviceAdapter.ts` that throws `new Error('tcp adapter not implemented in Phase 1')` from its constructor. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Files compile; factory called with `ATTENDANCE_SOURCE=access` returns an `AccessDbAdapter` instance once T006 lands; factory with `tcp` throws the expected error.
  - **Deps**: T003
  - **Constitution Refs**: I, VI

- [ ] **T006** `accessDbAdapter` implementation using `mdb-reader` with copy-first fallback — `server/services/attendance/sources/accessDbAdapter.ts`, `package.json` (add `mdb-reader` dep)
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/attendance-source.md`, `research.md` §R1
  - **Outputs**: Implements `AttendanceSource`. `fetchPunchesSince` yields `RawPunch` rows from the Access file's punches table where `time >= sinceLocal`, ascending. `fetchEmployees` yields rows from the employees table. Future-dated (`punchAt > now + 24h`) or malformed rows yield `{kind:'quarantine'}`. `isReachable` returns `false` on any error (no throw). Copy-first when `ATTENDANCE_ACCESS_COPY_FIRST=true`. `close` deletes the temp copy if used.
  - **Prompt**: "Implement `accessDbAdapter.ts` per `specs/001-attendance-fingerprint/contracts/attendance-source.md` using `mdb-reader`. The exact source table and column names will be discovered from the fixture provided in T009 — until then, parametrize them via constants at the top of the file (`PUNCH_TABLE`, `PUNCH_TIME_COL`, `PUNCH_EMP_COL`, `PUNCH_ID_COL`, etc.) so they can be adjusted once the fixture is in place. Copy-first when `ATTENDANCE_ACCESS_COPY_FIRST` is true. Quarantine (do not throw) on future-dated or malformed rows. `isReachable` MUST NOT throw. Sanitize any error before surfacing — never include the file path. Add `mdb-reader` to `package.json` dependencies. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: T015 tests pass against the fixture; manual `isReachable()` returns `false` for a non-existent path without throwing.
  - **Deps**: T005
  - **Constitution Refs**: I, VI

- [ ] **T007** Sync engine — `server/services/attendance/syncEngine.ts`, `server/services/attendance/employees.service.ts`, `server/services/attendance/punches.service.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/attendance-source.md`, `research.md` §R3, §R8, §R12, §R13
  - **Outputs**: `runSyncOnce({trigger, triggeredBy})` that: (1) acquires `GET_LOCK('attendance_sync', 0)`; (2) opens an `attendance_sync_runs` row `status='running'`; (3) reads HWM, applies safety window; (4) streams from the adapter; (5) UPSERTs employees mirror (including unknown placeholders per R12); (6) `INSERT IGNORE` into `attendance_punches` with composite UNIQUE + `source_hash` (SHA-1 per R8); (7) tracks counts (`rows_seen/inserted/skipped/quarantined`); (8) advances HWM; (9) closes the run row with the correct status per R13; (10) returns `{runId, status, rowsInserted, hwm}`; (11) releases the lock in a `finally`.
  - **Prompt**: "Implement `server/services/attendance/syncEngine.ts` per `specs/001-attendance-fingerprint/contracts/attendance-source.md` and `research.md` §R3, §R8, §R12, §R13. Use the factory from T005 to obtain the source; do NOT depend directly on `accessDbAdapter`. Implement the helper services `employees.service.ts` (UPSERT mirror + insertUnknownPlaceholder) and `punches.service.ts` (INSERT IGNORE with source_hash). The hash MUST be `sha1(emp_cd + '|' + isoLocal(punch_at) + '|' + source_row_id)`. Wrap the run in `GET_LOCK('attendance_sync', 0)` / `RELEASE_LOCK`. Status mapping MUST follow R13 exactly. NEVER include env values, file paths, or stack traces in `attendance_sync_runs.error`. After a successful run, call `dailyMaterializer.recomputeRange(min(date), max(date))` for affected dates (import the materializer from T008 — soft import via lazy require if T008 not yet landed to avoid a circular dep). Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: T016 tests pass; calling `runSyncOnce` twice in parallel returns `status='locked'` on the second; manual run against a fixture produces the expected counts; an `INSERT IGNORE` on a duplicate row does not increment `rows_inserted`.
  - **Deps**: T004, T005, T008 (lazy)
  - **Constitution Refs**: I, IV, VI

- [ ] **T008** Rules engine + daily materializer — `server/services/attendance/rulesEngine.ts`, `server/services/attendance/dailyMaterializer.ts`, `server/services/attendance/shifts.service.ts`, `server/services/attendance/leaves.service.ts`, `server/services/attendance/holidays.service.ts`
  - **Owner**: Codex · **Backup**: GPT-5 (for any complex date arithmetic) · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/rules-engine.md`, `data-model.md`
  - **Outputs**: Pure-function `resolveShift`, `pairPunches`, `computeDay` exactly per contract. `materializeRange(from, to, scope?)` loads shifts/assignments/leaves/holidays once, iterates employees×dates, builds `DayContext`, calls `computeDay`, UPSERTs into `attendance_daily`. Helper services expose typed CRUD-ish read+write functions.
  - **Prompt**: "Implement `rulesEngine.ts` as PURE FUNCTIONS (no DB, no `Date.now()` — caller passes `now`) exactly per `specs/001-attendance-fingerprint/contracts/rules-engine.md`. Implement `dailyMaterializer.ts` which is the only writer to `attendance_daily`. Reads via the helper services `shifts.service.ts`, `leaves.service.ts`, `holidays.service.ts`. Pairing window for overnight shifts MUST be `[shift.start on D, shift.end on D+1 + 4h]` per research.md §R9. UPSERTs use `INSERT … ON DUPLICATE KEY UPDATE`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: T017 tests pass (14 unit cases listed in the contract); a manual `materializeRange('2026-05-12','2026-05-19')` against the fixture produces rows that hand-reconcile.
  - **Deps**: T004
  - **Constitution Refs**: I, VI

- [ ] **T009** [P] Test fixture `.mdb` + Vitest harness for adapter — `server/services/attendance/__tests__/fixtures/tararus-sample.mdb` (binary), `server/services/attendance/__tests__/accessDbAdapter.test.ts`
  - **Owner**: cheap (file generation) → Cursor (test code) · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: Tararus column schema (discoverable from production file or vendor docs)
  - **Outputs**: Small `.mdb` containing ~10 employees and ~50 punches across 7 days, including: one unknown emp_cd, one future-dated row (quarantine), one malformed row, one overnight-shift pair. Test file exercises every code path of `accessDbAdapter`.
  - **Prompt**: "Produce a small fixture `.mdb` at `server/services/attendance/__tests__/fixtures/tararus-sample.mdb` with the column schema used by Tararus (confirm with a real export). Include ~10 employees and ~50 punches with the edge-case rows listed above. Then write `accessDbAdapter.test.ts` that opens the fixture and asserts: (a) all valid rows yielded; (b) future-dated row yields a `quarantine` record; (c) `isReachable` returns false for a bogus path. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm test server/services/attendance` passes.
  - **Deps**: T006
  - **Constitution Refs**: VI, VII

- [ ] **T010** [P] Frontend route shell + nav entry — `client/src/App.tsx` (EDIT — add lazy routes), `client/src/pages/attendance/AttendanceLayout.tsx` (NEW), update main navigation component to add an **Attendance** top-level entry
  - **Owner**: Cursor · **Backup**: Gemini (for layout) · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `plan.md` (routes table), `spec.md` FR-001/FR-002, `.claude/rules/frontend.md`
  - **Outputs**: All 13 lazy routes registered under `/attendance/*` exactly mirroring the pattern used for `/accounting/*`. Each route wrapped in `ProtectedRoute` with the appropriate permission key. New top-level nav entry "Attendance" visible only when the user has `attendance.view`. Empty placeholder pages for each route so navigation works.
  - **Prompt**: "Edit `client/src/App.tsx` to register 13 lazy-loaded routes under `/attendance/*` (`/attendance`, `/attendance/live`, `/attendance/daily`, `/attendance/employees`, `/attendance/employees/:empCd`, `/attendance/logs`, `/attendance/reports`, `/attendance/reports/late`, `/attendance/reports/absence`, `/attendance/reports/overtime`, `/attendance/settings`, `/attendance/admin/sync`, `/attendance/admin/device`). Wrap each in the existing `ProtectedRoute` with permission key `attendance.view` (or `attendance.manage` for `/settings` and `/admin/*`). Mirror the exact pattern used for `/accounting/*` routes. Add an Attendance entry to the main top-level navigation component (find via grep for the accounting nav entry). All page components are temporary placeholders that render their route name. Do NOT touch any non-attendance route. UI text in English. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm build` succeeds; manual smoke: a user with `attendance.view` sees the Attendance nav entry and can land on each route; a user without the permission sees neither the nav entry nor the routes (404 or redirect).
  - **Deps**: T002
  - **Constitution Refs**: I, VI, VII

- [ ] **T011** [P] Shared types — `shared/attendance/types.ts`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` § "Common types"
  - **Outputs**: `EmployeeRow`, `PunchRow`, `DailyRow`, `SyncRunRow`, `ShiftRow`, `AssignmentRow`, `LeaveRow`, `HolidayRow` type exports.
  - **Prompt**: "Create `shared/attendance/types.ts` exporting the TypeScript types listed under `## Common types` in `specs/001-attendance-fingerprint/contracts/trpc-attendance.md`. Do NOT import from anywhere outside `shared/`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes.
  - **Deps**: none
  - **Constitution Refs**: I, VI

- [ ] **T012** Sync scheduler — `server/_core/attendanceSyncScheduler.ts`, server bootstrap edit at `server/_core/index.ts` (one line: `startAttendanceSyncScheduler()`)
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `research.md` §R2, existing `server/_core/mssqlSyncScheduler.ts` (pattern to mirror)
  - **Outputs**: Two-tier `setInterval` scheduler driven by env (`ATTENDANCE_SYNC_BIZ_INTERVAL_MS`, `ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS`, `ATTENDANCE_BIZ_HOURS_START/END`). `started` guard, exits cleanly when `ATTENDANCE_ENABLED=false` or no source path. Tick function calls `syncEngine.runSyncOnce({trigger:'cron'})`. Server boot is NEVER blocked on attendance source state (FR-012).
  - **Prompt**: "Create `server/_core/attendanceSyncScheduler.ts` mirroring the exact structure of `server/_core/mssqlSyncScheduler.ts`. Use a single `setInterval` at the SHORTER of the two intervals (every 2 min during business hours, dropping ticks to every 15 min off-hours via a wall-clock check in the tick function). Wire it into the existing server bootstrap by adding ONE call site in `server/_core/index.ts` next to the MSSQL scheduler start. The scheduler MUST log `[attendance] disabled` and return early when `ATTENDANCE_ENABLED=false` or `ATTENDANCE_ACCESS_PATH` missing. The scheduler MUST NOT block server startup if the source is unreachable. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: With `ATTENDANCE_ENABLED=true` and a valid fixture path, `pnpm dev` logs the scheduler start and triggers a sync within 2 minutes; with `ATTENDANCE_ENABLED=false` the scheduler logs disabled and the app starts normally; `pnpm check` passes.
  - **Deps**: T007
  - **Constitution Refs**: VI, VII

**Checkpoint**: Foundation ready. Tables exist, adapter+engine+rules+materializer compile and are tested, scheduler runs, frontend routes resolve. User story work can begin in parallel.

---

## Phase 3: User Story 1 — Dashboard at a glance (Priority: P1) 🎯 MVP

**Goal**: Authorized HR user lands on `/attendance` and immediately sees six cards reflecting today's posture.

**Independent test**: With a sample sync completed, opening `/attendance` shows six populated cards within 5 s.

- [ ] **T013** [P] [US1] `attendance.dashboardSummary` query procedure — `server/routers/attendance.ts`, `server/services/attendance/dashboard.service.ts` (NEW)
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §dashboardSummary
  - **Outputs**: Query returns the exact output shape; uses `attendance_daily` for counts and latest `attendance_sync_runs` row for `lastSync`. Backed by `attendanceViewerProcedure`.
  - **Prompt**: "Implement the `dashboardSummary` query on `attendanceRouter` per the contract. Queries MUST use `attendance_daily` for counts (FR-027) — never raw punches. `presentToday = count where work_date=today and status in ('present','partial','holiday_with_punches')`, `absentToday = count where work_date=today and status='absent'`, `lateToday = count where work_date=today and late_minutes > 0`, `insideNow = count where work_date=today and inside_now=1`, `missingCheckoutYesterday = count where work_date=yesterday and status='missing_checkout'`. Last-sync block reads the most recent `attendance_sync_runs` row with sanitized error. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; manual call with seeded data returns expected counts; the procedure rejects without `attendance.view`.
  - **Deps**: T004, T008, T010
  - **Constitution Refs**: I, VI

- [ ] **T014** [P] [US1] `attendance.syncStatus` query procedure — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: contracts/trpc-attendance.md §syncStatus
  - **Outputs**: Query returns `{runs, current}`; default `limit=50`, max `200`.
  - **Prompt**: "Implement the `syncStatus` query on `attendanceRouter` per the contract. `runs` returns the latest N rows from `attendance_sync_runs` ordered by `started_at DESC`. `current` is the row where `status='running'` if any. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; returns sanitized errors.
  - **Deps**: T004, T010
  - **Constitution Refs**: I, VI

- [ ] **T015** [US1] `AttendanceHome` page with six dashboard cards — `client/src/pages/attendance/AttendanceHome.tsx`, `client/src/components/attendance/widgets/*.tsx`, `client/src/hooks/attendance/useDashboardSummary.ts`
  - **Owner**: Cursor (with Gemini for card layout iteration) · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §dashboardSummary, spec FR-020, spec Story 1 acceptance scenarios, clarification Q4 (polling 30 s)
  - **Outputs**: Six cards (Present today, Absent today, Late today, Inside now, Missing checkout, Last sync). React-query hook with `refetchInterval: 30_000`, `refetchIntervalInBackground: false`. Manual Refresh button. Loading skeletons and "Never synced" empty state. UI in English.
  - **Prompt**: "Build `AttendanceHome.tsx` matching spec FR-020 and Story 1 acceptance scenarios in `specs/001-attendance-fingerprint/spec.md`. Use the existing tRPC client + `@tanstack/react-query`. Set `refetchInterval: 30_000`, `refetchIntervalInBackground: false`. Six cards as separate components under `client/src/components/attendance/widgets/`. Each card has a loading skeleton; the Last-sync card renders 'Never synced' when no run exists. Manual Refresh button triggers `refetch()`. UI text in English. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 1 acceptance scenarios 1–3 pass manually; the page polls every 30 s while visible and stops when tab is hidden; SC-001 5-second render target met at sample data sizes.
  - **Deps**: T013, T014
  - **Constitution Refs**: I, VI

---

## Phase 4: User Story 2 — Manual sync + raw logs (Priority: P1) 🎯 MVP

**Goal**: Admin triggers sync, sees the run logged, drills into Raw Logs and verifies the new punches.

**Independent test**: Manual sync produces a run row with `status=ok` and the inserted punches are visible in `/attendance/logs` filtered to the test date.

- [ ] **T016** [P] [US2] `attendance.syncNow` mutation — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §syncNow, `research.md` §R3, §R13
  - **Outputs**: Manager-gated mutation that calls `syncEngine.runSyncOnce({trigger:'manual', triggeredBy: ctx.user.id})` and returns `{runId, status: 'running'|'locked'}`. Audit log entry written via existing helper.
  - **Prompt**: "Implement the `syncNow` mutation on `attendanceRouter` per the contract. Wrap with `attendanceManagerProcedure`. The mutation MUST return immediately after the engine acquires (or fails to acquire) the advisory lock — do not await the full sync. Audit-log with `action='attendance.syncNow'`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Two near-simultaneous calls return one `running` and one `locked`; non-manager role gets `FORBIDDEN`.
  - **Deps**: T007
  - **Constitution Refs**: I, VI

- [ ] **T017** [P] [US2] `attendance.rawPunches` query — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §rawPunches
  - **Outputs**: Paginated query with `empCd?, from, to, source?, page?, pageSize?` (default 100, max 500). Uses `idx_emp_time` / `idx_punch_at`.
  - **Prompt**: "Implement the `rawPunches` query per the contract. Wrap with `attendanceViewerProcedure`. Validate input with Zod. Use `idx_emp_time` when `empCd` is set, `idx_punch_at` otherwise. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Returns paginated results with correct totals; query plan uses the expected index.
  - **Deps**: T004
  - **Constitution Refs**: I, VI

- [ ] **T018** [US2] `SyncStatus` admin page with manual sync trigger — `client/src/pages/attendance/admin/SyncStatus.tsx`, `client/src/hooks/attendance/useSyncStatus.ts`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: spec Story 2, `contracts/trpc-attendance.md` §syncNow, §syncStatus
  - **Outputs**: Shows current run state + list of recent runs (status, started/finished, counts, HWM, sanitized error). "Sync now" button calls the mutation, displays a toast (success / error / locked), and refreshes the list. Polling at 5 s while a run is `running`, 30 s otherwise.
  - **Prompt**: "Build `SyncStatus.tsx` per spec Story 2 acceptance scenarios. The page MUST work for both admin and manager roles. Show: the current running run (if any) with a live progress indicator, and a paginated list of recent runs. Status pill colors: green=ok, amber=partial/locked, red=failed, blue=running, gray=never. Manual `Sync now` button triggers the mutation and shows a toast based on the response. Refetch interval is 5 s while any run is `running`, otherwise 30 s. UI text in English. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 2 acceptance scenarios 1, 3, 4 pass manually.
  - **Deps**: T016, T014
  - **Constitution Refs**: I, VI

- [ ] **T019** [US2] `RawLogs` page with filters — `client/src/pages/attendance/RawLogs.tsx`, `client/src/hooks/attendance/useRawPunches.ts`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: spec Story 2 scenario 2, `contracts/trpc-attendance.md` §rawPunches
  - **Outputs**: Table with date-range picker, employee-code search, source filter. Default range: last 7 days. Pagination 100/page.
  - **Prompt**: "Build `RawLogs.tsx` per spec Story 2 scenario 2. Filters: date range (default last 7 days), employee code (free-text → exact match), source (access/tcp/manual/all). Table columns: timestamp, emp_cd, direction, source, source_row_id, note. Pagination 100/page. UI text in English. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Filtering by employee and date returns the expected rows; pagination works.
  - **Deps**: T017
  - **Constitution Refs**: I, VI

---

## Phase 5: User Story 3 — Daily attendance view (Priority: P2)

**Goal**: Manager opens Daily Attendance for a date, sees per-employee processed rows with first-in/last-out/late/OT/status.

**Independent test**: With raw punches synced and a basic shift defined, `/attendance/daily?date=...` shows correct rows.

- [ ] **T020** [P] [US3] `attendance.dailyByDate` query — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §dailyByDate
  - **Outputs**: Paginated query joining `attendance_daily` to `attendance_employees`, optional `department` filter.
  - **Prompt**: "Implement `dailyByDate` per the contract. Pure read of `attendance_daily` joined to `attendance_employees`. Sort by `full_name`. Default pageSize 50, max 200. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check`; returns processed rows for the requested date.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T021** [P] [US3] `attendance.dailyByEmployee` query — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §dailyByEmployee
  - **Outputs**: Range query for a single employee.
  - **Prompt**: "Implement `dailyByEmployee` per the contract. Index on `(emp_cd, work_date)` PK. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check`; returns expected rows.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T022** [P] [US3] `attendance.insideNow` query — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Returns list backed by `idx_inside_now` on today's rows.
  - **Prompt**: "Implement `insideNow` per the contract. `SELECT … FROM attendance_daily WHERE work_date = CURDATE() AND inside_now = 1` joined to employees for name/department. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check`; manual seeding produces expected rows.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T023** [P] [US3] `attendance.recomputeRange` mutation — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §recomputeRange, `research.md` §R11
  - **Outputs**: Manager-gated mutation calling `dailyMaterializer.recomputeRange(from, to, {empCd?})`. Returns `{rowsWritten}`. Idempotent.
  - **Prompt**: "Implement `recomputeRange` per the contract. Wrap with `attendanceManagerProcedure`. Validate `from <= to` and bound range to <= 90 days (Phase 1 safety). Audit-log with `action='attendance.recompute'`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Two consecutive calls produce identical rows; range > 90 days returns `BAD_REQUEST`.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T024** [US3] `DailyView` page — `client/src/pages/attendance/DailyView.tsx`, `client/src/hooks/attendance/useDailyByDate.ts`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: spec Story 3, `contracts/trpc-attendance.md` §dailyByDate
  - **Outputs**: Date picker (default today), department filter, table with columns: name, dept, first-in, last-out, worked min, late min, early-leave min, OT min, status (badge). Status badge colors per spec. UI in English.
  - **Prompt**: "Build `DailyView.tsx` per spec Story 3 acceptance scenarios. Default date is today; URL synced via `?date=YYYY-MM-DD`. Status badges: present=green, partial=amber, missing_checkout=amber, absent=red, leave=blue, holiday=purple. NULL `last_out`/`worked_minutes` render as em-dash. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 3 acceptance scenarios 1–5 pass.
  - **Deps**: T020
  - **Constitution Refs**: I, VI

- [ ] **T025** [US3] `LiveBoard` page — `client/src/pages/attendance/LiveBoard.tsx`, `client/src/hooks/attendance/useInsideNow.ts`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: spec FR-020 ("inside now"), `contracts/trpc-attendance.md` §insideNow
  - **Outputs**: Big-screen friendly grid of avatars/names of employees currently inside. Refetch every 30 s.
  - **Prompt**: "Build `LiveBoard.tsx`: simple grid (initials/avatar + name + since-time). `refetchInterval: 30_000`. Empty state: 'Nobody inside right now.' UI text in English. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Renders the expected list when employees have an open day.
  - **Deps**: T022
  - **Constitution Refs**: I, VI

---

## Phase 6: User Story 4 — Employees list with unknown surfacing (Priority: P2)

**Goal**: HR sees mapped + unknown employees; can open an employee detail page.

**Independent test**: Inserting a punch with an unknown code surfaces it in the Unknown tab; sync still succeeds.

- [ ] **T026** [P] [US4] `attendance.employeesList` query — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Paginated, filterable by `search/department/activeOnly/unknownOnly`.
  - **Prompt**: "Implement `employeesList` per the contract. `unknownOnly=true` filters to `active=0 AND full_name='UNKNOWN'`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check`; pagination correct.
  - **Deps**: T004
  - **Constitution Refs**: I, VI

- [ ] **T027** [P] [US4] `attendance.employeeDetail` query — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Returns employee + last 10 daily rows + assignments + leaves.
  - **Prompt**: "Implement `employeeDetail` per the contract. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check`.
  - **Deps**: T004
  - **Constitution Refs**: I, VI

- [ ] **T028** [US4] `EmployeesList` page with Mapped/Unknown tabs — `client/src/pages/attendance/EmployeesList.tsx`, `client/src/components/attendance/UnknownEmployeesPanel.tsx`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Two tabs: "Mapped" (`unknownOnly=false, activeOnly=true`), "Unknown" (`unknownOnly=true`). Search + department filter. Pagination 50/page. UI in English.
  - **Prompt**: "Build `EmployeesList.tsx` per spec Story 4. The Unknown tab badge shows the count of unknown employees. Clicking a row opens `/attendance/employees/:empCd`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 4 scenario 1 passes manually.
  - **Deps**: T026
  - **Constitution Refs**: I, VI

- [ ] **T029** [US4] `EmployeeDetail` page — `client/src/pages/attendance/EmployeeDetail.tsx`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Profile section + recent attendance + assignments + leaves. For unknown employees, a banner explaining the state with an "Edit name/department" action.
  - **Prompt**: "Build `EmployeeDetail.tsx` per spec Story 4 scenario 2. For unknown employees (`active=0 AND full_name='UNKNOWN'`), show a yellow banner: 'This employee code was seen in punches but has no profile. Edit below to activate.' Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 4 scenario 2 passes manually.
  - **Deps**: T027
  - **Constitution Refs**: I, VI

---

## Phase 7: User Story 5 — Reports (Priority: P3)

**Goal**: Late, Absence, Overtime reports, printable with Arabic headers, sourced from `attendance_daily`.

**Independent test**: Each report run reconciles to Daily view totals over the same range.

- [ ] **T030** [P] [US5] `attendance.lateReport` query — `server/routers/attendance.ts`
  - **Owner**: GPT-5 (draft SQL) → Codex (implement) · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §lateReport
  - **Outputs**: Aggregated SQL over `attendance_daily` with `late_minutes >= threshold`. Returns rows + totals.
  - **Prompt**: "Implement `lateReport` per the contract. SQL aggregates `attendance_daily` (NOT raw punches) over `[from, to]` filtering `late_minutes >= threshold`. Group by `(emp_cd, full_name)`. Include totals. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Totals reconcile to manual sum from `dailyByDate`.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T031** [P] [US5] `attendance.absenceReport` query — `server/routers/attendance.ts`
  - **Owner**: GPT-5 (draft) → Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Counts `status='absent'` rows over the range, grouped by employee.
  - **Prompt**: "Implement `absenceReport` per the contract. SQL aggregates `attendance_daily WHERE status='absent'`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Totals reconcile.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T032** [P] [US5] `attendance.overtimeReport` query — `server/routers/attendance.ts`
  - **Owner**: GPT-5 (draft) → Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Aggregates `overtime_minutes`, days with OT.
  - **Prompt**: "Implement `overtimeReport` per the contract. SQL aggregates `SUM(overtime_minutes), COUNT(*) WHERE overtime_minutes > 0`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Totals reconcile.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T033** [US5] Reports hub + three report pages with print/CSV — `client/src/pages/attendance/Reports.tsx`, `client/src/pages/attendance/reports/LateReport.tsx`, `AbsenceReport.tsx`, `OvertimeReport.tsx`, `client/src/components/attendance/ReportPrintable.tsx`, `client/src/lib/attendance/csv.ts`
  - **Owner**: Cursor · **Backup**: Gemini (RTL layout review) · **Tool**: Cursor · **Role**: implement
  - **Inputs**: spec Story 5, clarification Q2 (English UI, Arabic reports), `research.md` §R6
  - **Outputs**: Three report pages. Filters in English chrome; printable region wrapped in `<div dir="rtl" lang="ar">` with Arabic headers/column labels/totals. Print CSS hides chrome (`@media print`). CSV export client-side via `Blob` + `URL.createObjectURL`. Numeric and date values use facility-local formatting.
  - **Prompt**: "Build the three report pages per spec Story 5. Filters (date range, department, threshold for Late) are in English. The printable report region uses `dir=\"rtl\" lang=\"ar\"` and Arabic strings for header (e.g., 'تقرير التأخير'), column labels, and totals. Print CSS hides everything except the printable region. CSV export serializes the SAME data shape and triggers a browser download. The page MUST refuse to load for users without `attendance.view`. Reconciliation requirement: every total displayed MUST equal the SUM of the matching field in `attendance_daily` for the same range — verify in code via a unit test on the serializer if practical. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 5 scenarios 1–3 pass; printing produces the expected layout; CSV opens cleanly in Excel; access-denied for users without `attendance.view`.
  - **Deps**: T030, T031, T032
  - **Constitution Refs**: I, VI

---

## Phase 8: User Story 6 — Settings (shifts/assignments/leaves/holidays) + manual punch adjustment (Priority: P3)

**Goal**: Manager configures basic shifts, assignments, leaves, holidays. Admin can adjust punches (audit-logged) without overwriting raw rows.

**Independent test**: Define shift, assign employee, recompute, observe lateness/OT change.

- [ ] **T034** [P] [US6] `attendance.shifts.{list,upsert,delete}` + `assignments.{listByEmployee,upsert,delete}` — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: contracts/trpc-attendance.md §shifts/assignments
  - **Outputs**: 5+3 procedures. Assignment upsert validates non-overlapping ranges per employee.
  - **Prompt**: "Implement the shifts and assignments procedures per the contract. Assignment overlap check: reject if a new (effective_from, effective_to) range overlaps an existing one for the same emp_cd (CONFLICT). Shift delete: only if no assignments reference it (else CONFLICT with suggestion to deactivate). Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check`; overlap test triggers `CONFLICT`.
  - **Deps**: T004
  - **Constitution Refs**: I, VI

- [ ] **T035** [P] [US6] `attendance.leaves.{list,upsert,delete}` + `holidays.{list,upsert,delete}` — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Standard CRUD on `attendance_leaves` and `attendance_holidays`.
  - **Prompt**: "Implement leaves and holidays procedures per the contract. Holiday `date` is primary key; upsert on conflict. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check`.
  - **Deps**: T004
  - **Constitution Refs**: I, VI

- [ ] **T036** [P] [US6] `attendance.punches.adjust` mutation — `server/routers/attendance.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/trpc-attendance.md` §punches.adjust, FR-017
  - **Outputs**: Admin-gated mutation inserts a NEW `attendance_punches` row with `source='manual'`, `inserted_by`, `note`. Original rows never modified.
  - **Prompt**: "Implement `punches.adjust` per the contract. Wrap with `attendanceAdminProcedure`. The mutation MUST be insert-only against `attendance_punches`; verify in code that no UPDATE or DELETE is ever issued. Audit-log with `action='attendance.punchAdjust'`. After insert, trigger `recomputeRange(date, date, {empCd})`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: After an adjust, raw rows for that employee/day are unchanged; a new `source='manual'` row exists; daily row reflects the new pairing.
  - **Deps**: T008
  - **Constitution Refs**: I, VI

- [ ] **T037** [US6] `Settings` page (shifts, assignments, leaves, holidays editors) — `client/src/pages/attendance/Settings.tsx`, `client/src/components/attendance/ShiftEditor.tsx`, `AssignmentEditor.tsx`, `LeaveEditor.tsx`, `HolidayEditor.tsx`
  - **Owner**: Cursor (Gemini for layout) · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: spec Story 6, T034/T035 contracts
  - **Outputs**: Tabbed page (Shifts / Assignments / Leaves / Holidays). Inline CRUD with optimistic updates. After mutating a shift parameter, prompt user with "Recompute affected dates?" → calls `recomputeRange`. UI in English.
  - **Prompt**: "Build `Settings.tsx` per spec Story 6 scenarios 1–2. Use `attendanceManagerProcedure`-backed mutations. After a shift parameter change, show a non-blocking prompt: 'Shift parameters changed. Recompute affected range?' with a date picker defaulting to (effective_from, today). Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 6 scenarios 1–2 pass.
  - **Deps**: T034, T035, T023
  - **Constitution Refs**: I, VI

- [ ] **T038** [US6] `PunchAdjustDialog` and integration into Raw Logs — `client/src/components/attendance/PunchAdjustDialog.tsx`, EDIT `client/src/pages/attendance/RawLogs.tsx`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Outputs**: Per-row "Adjust" action (admin-only). Dialog requires `note`. On submit, calls `punches.adjust` and refreshes the list.
  - **Prompt**: "Add an admin-only 'Adjust' button per row in RawLogs. Clicking opens `PunchAdjustDialog`: emp_cd (prefilled, readonly), punch_at (datetime), direction (in/out/unknown), note (required, ≥3 chars). On submit, call `attendance.punches.adjust` and show a toast with the new row id. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Story 6 scenario 3 passes: original raw rows unchanged after adjustment.
  - **Deps**: T036, T019
  - **Constitution Refs**: I, VI

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] **T039** [P] Unit tests for rules engine — `server/services/attendance/__tests__/rulesEngine.test.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `contracts/rules-engine.md` test plan (14 cases for `computeDay`, 8 for `resolveShift`, 6 for `pairPunches`)
  - **Outputs**: 28 Vitest cases. All pure-function; no DB, no fs.
  - **Prompt**: "Write Vitest cases for every case listed under `## Test plan` in `specs/001-attendance-fingerprint/contracts/rules-engine.md`. Each case has a focused `it()` and asserts on the full `DayResult` shape (or shift / pairing return value). Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm test server/services/attendance/__tests__/rulesEngine.test.ts` passes; coverage of rulesEngine ≥ 95%.
  - **Deps**: T008
  - **Constitution Refs**: VI, VII

- [ ] **T040** [P] Service-layer tests for sync engine — `server/services/attendance/__tests__/syncEngine.test.ts`
  - **Owner**: Codex · **Backup**: Cursor · **Tool**: Cursor · **Role**: implement
  - **Inputs**: `research.md` §R3, §R13; a `FakeAttendanceSource` in the same file
  - **Outputs**: Tests for: HWM advance, dedup via `INSERT IGNORE`, advisory lock prevents overlap, unknown-employee placeholder UPSERT, quarantine → `partial`, adapter throw before any rows → `failed`, `GET_LOCK` returns 0 → `locked`, run row always closed.
  - **Prompt**: "Write tests for `syncEngine.ts` using a `FakeAttendanceSource` (in-test class). Cover: HWM advance, dedup on re-import, advisory-lock concurrency (two concurrent calls — second is `locked`), unknown emp_cd path, quarantine count, failed/locked status mapping per `research.md §R13`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm test server/services/attendance/__tests__/syncEngine.test.ts` passes.
  - **Deps**: T007
  - **Constitution Refs**: VI, VII

- [ ] **T041** [P] Nightly recompute job — extension of `server/_core/attendanceSyncScheduler.ts`
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: implement
  - **Inputs**: spec Assumptions (nightly safety-net recompute, last 7 days)
  - **Outputs**: At 02:30 facility-local, calls `dailyMaterializer.recomputeRange(today-7, today)`. Logged via the same run mechanism if convenient; otherwise a separate audit log line.
  - **Prompt**: "Add a nightly cron-like check in `attendanceSyncScheduler.ts`'s tick: if the wall clock just crossed 02:30 facility-local AND today's nightly recompute hasn't run yet (persist a marker via `db.getSystemSetting`/`db.setSystemSetting`), call `dailyMaterializer.recomputeRange(today-7, today)`. Idempotent across restarts. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Manual simulation (override system clock or call the helper directly) writes the expected daily rows.
  - **Deps**: T012, T008
  - **Constitution Refs**: VI

- [ ] **T042** [P] Audit-log integration verification — touches existing audit helper usage in T016, T023, T036, T034, T035
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: review
  - **Outputs**: Confirms every mutation emits an audit log entry via the existing helper used by Medical/Accounting. No new audit table; reuse the existing one.
  - **Prompt**: "Verify that every Attendance mutation (`syncNow`, `recomputeRange`, `shifts.*`, `assignments.*`, `leaves.*`, `holidays.*`, `punches.adjust`) calls the existing audit-log helper with a unique `action` value namespaced under `attendance.*`. List any gaps and fix them inline. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Manual mutation produces a corresponding audit row.
  - **Deps**: T016, T023, T034, T035, T036
  - **Constitution Refs**: VI, VII

- [ ] **T043** Quickstart smoke pass — manual run of `specs/001-attendance-fingerprint/quickstart.md` end-to-end
  - **Owner**: Claude (review) · **Backup**: — · **Tool**: manual · **Role**: review
  - **Inputs**: `quickstart.md`
  - **Outputs**: Each numbered step in quickstart confirmed working; gaps filed as follow-up tasks.
  - **Prompt**: "Execute every numbered step in `specs/001-attendance-fingerprint/quickstart.md` against the local environment with the fixture `.mdb`. Record pass/fail for each step. Report any deviation. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: All steps 1–13 pass; rollback (step 14) verified non-destructive to Medical/Accounting data.
  - **Deps**: T015, T018, T019, T024, T025, T028, T029, T033, T037, T038
  - **Constitution Refs**: V (parity exempted per spec Assumptions), VI, VII

- [ ] **T044** Final `pnpm check` + `pnpm test` + smoke of Medical/Accounting unchanged
  - **Owner**: Cursor · **Backup**: Codex · **Tool**: Cursor · **Role**: review
  - **Outputs**: Verification report: `pnpm check`, `pnpm test`, manual smoke of one Medical and one Accounting page, attached to the PR description per Project Principles §5.
  - **Prompt**: "Run `pnpm check` and `pnpm test`. Manually load one Medical page (e.g., `/medical` home) and one Accounting page (e.g., `/accounting`); confirm they behave identically to `main`. Produce the standard task report (changed files / what changed / checks run / checks skipped). Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Both commands pass; Medical/Accounting smoke clean.
  - **Deps**: T043
  - **Constitution Refs**: VII

---

## Dependency Graph

```
Setup:                T001 ─┐
                      T002 ─┼─→ T003
                              │
Foundation:                   ├─→ T004 ──┬─→ T008 ──┬─→ T013 (US1 server)
                              │          │          ├─→ T020/T021/T022/T023 (US3 server)
                              │          │          ├─→ T026/T027 (US4 server)
                              │          │          ├─→ T030/T031/T032 (US5 server)
                              │          │          ├─→ T034/T035 (US6 server)
                              │          │          └─→ T036 (US6 mutation)
                              │          │
                              │          ├─→ T005 ──→ T006 ──→ T007 ──→ T012
                              │          │           │         │
                              │          │           T009 ────┘
                              │          ├─→ T010 ──→ T015 (US1 UI), T018 (US2 UI),
                              │          │           T019 (US2 UI), T024/T025 (US3 UI),
                              │          │           T028/T029 (US4 UI), T033 (US5 UI),
                              │          │           T037/T038 (US6 UI)
                              │          └─→ T011

US1 (P1 MVP):  T013 + T014 ─→ T015
US2 (P1 MVP):  T016 + T014 ─→ T018;  T017 ─→ T019
US3 (P2):      T020/T021/T022/T023 ─→ T024/T025
US4 (P2):      T026/T027 ─→ T028/T029
US5 (P3):      T030/T031/T032 ─→ T033
US6 (P3):      T034/T035/T036 ─→ T037/T038

Polish:        T039 (after T008); T040 (after T007); T041 (after T012, T008);
               T042 (after all mutations); T043 (after all UI); T044 (after T043).
```

## Parallel Execution Examples

**Phase 1 (Setup)**: T001, T002, T003 — all three independent files, run in parallel.

**Phase 2 (Foundation)**, after T004 lands:
- Track A: T005 → T006 → T009 (adapter pipeline)
- Track B: T008 (rules engine + materializer)
- Track C: T010 (frontend route shell)
- Track D: T011 (shared types)
Then T007 (sync engine) joins after T005 and T008. T012 follows T007.

**Within each user-story phase**, all server-side query procedures are parallel `[P]` (they share only the router file, which can be merged trivially), and the UI tasks depend on their respective server tasks.

**Polish phase**: T039, T040, T041, T042 are all parallel.

## Implementation Strategy

1. **MVP** = Setup + Foundation + **US1 + US2**. Stop, demo, validate.
2. After MVP sign-off, deliver **US3** (Daily) and **US4** (Employees) in parallel.
3. Then **US5** (Reports) and **US6** (Settings) in parallel.
4. Polish phase last; `pnpm check` + `pnpm test` are mandatory at every story checkpoint.

## Task Count Summary

| Phase | Tasks |
|---|---|
| Phase 1 — Setup | 3 |
| Phase 2 — Foundation | 9 |
| Phase 3 — US1 (P1 MVP) | 3 |
| Phase 4 — US2 (P1 MVP) | 4 |
| Phase 5 — US3 (P2) | 6 |
| Phase 6 — US4 (P2) | 4 |
| Phase 7 — US5 (P3) | 4 |
| Phase 8 — US6 (P3) | 5 |
| Phase 9 — Polish | 6 |
| **Total** | **44** |

Independent test criteria per story:

| Story | Independent test |
|---|---|
| US1 | After a successful sample sync, `/attendance` shows six populated cards in ≤5 s. |
| US2 | Manual sync produces a logged run; raw logs filtered to the test date show the inserted punches. |
| US3 | With a shift + assignment, `/attendance/daily?date=X` totals reconcile to a hand calc from raw punches. |
| US4 | Insert a punch with an unknown emp_cd → sync ok; unknown surfaces in tab; dashboard counts not crashed. |
| US5 | Late/Absence/Overtime totals reconcile to Daily view over the same range; print produces RTL Arabic-headed layout. |
| US6 | Edit a shift, recompute, observe late/OT change; punch adjust leaves raw rows untouched and creates a `source='manual'` row. |
