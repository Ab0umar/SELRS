# Tasks: Attendance Router Split

**Branch**: `007-attendance-router-split`
**Input**: `specs/007-attendance-router-split/`
**Mirrors**: `specs/002-medical-router-split/` — same extract-and-spread pattern

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup

- [x] T001 Create directory `server/routers/_attendance/` (add `.gitkeep` placeholder)
  - **Owner**: Codex | **Tool**: Bash
  - **Prompt**: "Create the directory `server/routers/_attendance/` and add a `.gitkeep` placeholder file. Run `pnpm check` to confirm nothing is broken. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Directory exists; `pnpm check` passes

**Checkpoint**: `_attendance/` directory present. No code moved yet.

---

## Phase 2: Foundational — Extract Shared Helpers

- [x] T002 Extract device/hardware helpers into `server/routers/_attendance/device-helpers.ts`
  - **Owner**: Codex | **Backup**: Cursor | **Tool**: Write
  - **Input**: `server/routers/attendance.ts` — any ZKTeco/FK device builder functions, connection config objects, command-formatter helpers that are referenced by more than one procedure domain
  - **Output**: New file `server/routers/_attendance/device-helpers.ts` exporting all moved symbols; `attendance.ts` imports them back
  - **Prompt**: "Read `server/routers/attendance.ts`. Identify any helper functions or constants that are shared across the device/sync domain AND the shift domain (connection builders, command-type maps, hardware config objects). Move them into a new file `server/routers/_attendance/device-helpers.ts`, export them, and import them back in `attendance.ts`. If no shared helpers exist, create the file with a single `// no shared device helpers yet` comment and skip extraction. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; `git diff --stat` shows only additions

- [x] T003 [P] Extract schedule helpers into `server/routers/_attendance/schedule-helpers.ts`
  - **Owner**: Codex | **Backup**: Cursor | **Tool**: Write
  - **Input**: `attendance.ts` — weekday mask utilities, shift-cycle computation helpers, day-overlap detectors referenced across shifts + leaves domains
  - **Prompt**: "Read `server/routers/attendance.ts`. Identify any helper functions used across both the shift-management and the leave/permissions domains (weekday mask computations, cycle-period overlap checks, date arithmetic helpers). Move them into `server/routers/_attendance/schedule-helpers.ts`, export them, and import back in `attendance.ts`. If no such cross-domain helpers exist, create the file with a `// no shared schedule helpers yet` comment. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T004 Run `pnpm check` after T002–T003
  - **Owner**: Codex | **Tool**: Bash
  - **Prompt**: "Run `pnpm check`. Report exit code and any errors. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Exit code 0

**Checkpoint**: Helper files exist. `attendance.ts` imports from them. `pnpm check` green.

---

## Phase 3: US1 — Sync + Device Sub-Router (P1)

**Goal**: All sync and device procedures in `attendance-sync.ts`. Reduces `attendance.ts` by ~900 lines.

**Independent Test**: `grep "syncNow:" server/routers/attendance.ts` returns zero — lives only in `attendance-sync.ts`.

- [x] T005 [US1] Create `server/routers/attendance-sync.ts` with all sync and device procedures
  - **Owner**: Codex | **Backup**: Cursor | **Tool**: Write
  - **Input**: `server/routers/attendance.ts` lines ~662–1595 — procedures: `deviceSettings`, `deviceStatus`, `updateDeviceSettings`, `connectDevice`, `disconnectDevice`, `resetDeviceConnection`, `sendDeviceCommand`, `batchAddPunches`, `runDeviceDiagnostics`, `testZKTecoConnection`, `pullDeviceLogs`, `exportDevicePunches`, `syncEmployeesFromDevice`, `syncFromFKDevice`, `testFKDeviceConnection`, `syncNow`, `resetSyncHistory`, `deviceSyncNow`, `deviceSyncStatus`, `initializeDeviceSync`, `materializeDaily`, `generateMonthlyReports`, `healthCheck`, `bootstrapShifts`
  - **Output**: New file `server/routers/attendance-sync.ts` exporting `export const attendanceSyncRoutes = { ... }` (plain object, NOT a `router()` instance); all listed procedures cut from `attendance.ts`; `attendance.ts` spreads `...attendanceSyncRoutes` in `attendanceRouter`; all necessary imports (drizzle tables, getDb, makeAttProcedure, makeAttWriteProcedure, AuditLogService, services) added to the new file
  - **Prompt**: "Read `server/routers/attendance.ts`. Extract the following procedures into a new file `server/routers/attendance-sync.ts`: `deviceSettings`, `deviceStatus`, `updateDeviceSettings`, `connectDevice`, `disconnectDevice`, `resetDeviceConnection`, `sendDeviceCommand`, `batchAddPunches`, `runDeviceDiagnostics`, `testZKTecoConnection`, `pullDeviceLogs`, `exportDevicePunches`, `syncEmployeesFromDevice`, `syncFromFKDevice`, `testFKDeviceConnection`, `syncNow`, `resetSyncHistory`, `deviceSyncNow`, `deviceSyncStatus`, `initializeDeviceSync`, `materializeDaily`, `generateMonthlyReports`, `healthCheck`, `bootstrapShifts`. The new file must export a plain object `export const attendanceSyncRoutes = { procedureName: ..., ... }` — NOT a `router()` instance. In `attendance.ts`, replace the extracted procedure definitions with `...attendanceSyncRoutes` spread, and add `import { attendanceSyncRoutes } from './attendance-sync'` at the top. Copy all required imports (makeAttProcedure, makeAttWriteProcedure, getDb, drizzle tables, services, AuditLogService, etc.) into the new file. Do not rename any procedures. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; `trpc.attendance.syncNow` still callable; `attendance.ts` reduced by ~900 lines

- [x] T006 [US1] Run `pnpm check` + confirm line count
  - **Owner**: Codex | **Tool**: Bash
  - **Prompt**: "Run `pnpm check`. Then run `wc -l server/routers/attendance.ts` and `wc -l server/routers/attendance-sync.ts`. Report both line counts and confirm `pnpm check` passes. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` exit 0; `attendance.ts` ≤ 3,000 lines

**Checkpoint**: Sync + device in their own file. `attendance.ts` ≤ 3,000 lines.

---

## Phase 4: US2 — Shifts + Cycles Sub-Router (P1)

**Goal**: All shift management, assignments, cycles, and change requests in `attendance-shifts.ts`.

**Independent Test**: `grep "createShift:" server/routers/attendance.ts` returns zero.

- [x] T007 [US2] Create `server/routers/attendance-shifts.ts`
  - **Owner**: Codex | **Backup**: Cursor | **Tool**: Write
  - **Input**: `server/routers/attendance.ts` lines ~1596–2360 and ~3161–3864 — procedures: `listShifts`, `createShift`, `updateShift`, `listAssignments`, `assignShift`, `addShiftAssignment`, `updateAssignment`, `deleteAssignment`, `saveDayShiftAssignments`, `updateEmployee`, `deleteEmployee`, `swapShifts`, `tempChangeShift`, `bulkAssignShift`, `createShiftChangeRequest`, `listShiftChangeRequests`, `approveShiftChangeRequest`, `rejectShiftChangeRequest`, `listShiftCycles`, `createShiftCycle`, `updateShiftCycle`, `deleteShiftCycle`, `listCycleAssignments`, `assignCycle`, `updateCycleAssignment`, `removeCycleAssignment`
  - **Output**: New file `server/routers/attendance-shifts.ts` exporting `export const attendanceShiftsRoutes = { ... }`; procedures cut from `attendance.ts`; `attendance.ts` spreads `...attendanceShiftsRoutes`
  - **Prompt**: "Read `server/routers/attendance.ts` (after T005 cuts). Extract the following procedures into a new file `server/routers/attendance-shifts.ts`: `listShifts`, `createShift`, `updateShift`, `listAssignments`, `assignShift`, `addShiftAssignment`, `updateAssignment`, `deleteAssignment`, `saveDayShiftAssignments`, `updateEmployee`, `deleteEmployee`, `swapShifts`, `tempChangeShift`, `bulkAssignShift`, `createShiftChangeRequest`, `listShiftChangeRequests`, `approveShiftChangeRequest`, `rejectShiftChangeRequest`, `listShiftCycles`, `createShiftCycle`, `updateShiftCycle`, `deleteShiftCycle`, `listCycleAssignments`, `assignCycle`, `updateCycleAssignment`, `removeCycleAssignment`. Export a plain object `export const attendanceShiftsRoutes = { ... }` — NOT a `router()` instance. Spread it into `attendanceRouter` in `attendance.ts`. Copy all required imports. Do not rename any procedures. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; `trpc.attendance.createShift` still callable

- [x] T008 [US2] Run `pnpm check` + confirm line count
  - **Owner**: Codex | **Tool**: Bash
  - **Prompt**: "Run `pnpm check`. Run `wc -l server/routers/attendance.ts` and `wc -l server/routers/attendance-shifts.ts`. Report and confirm. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` exit 0; `attendance.ts` ≤ 2,000 lines

**Checkpoint**: Shifts + cycles + change requests in their own file.

---

## Phase 5: US3 — Leaves + Permissions + Holidays Sub-Router (P2)

- [x] T009 [US3] Create `server/routers/attendance-leaves.ts`
  - **Owner**: Codex | **Backup**: Cursor | **Tool**: Write
  - **Input**: `server/routers/attendance.ts` lines ~412–661 and ~2361–2691 — procedures: `employeeLeaves`, `leaveBalance`, `pendingLeaves`, `createLeave`, `approveLeave`, `deleteLeave`, `listLeaves`, `recomputeDaily`, `adjustmentSummary`, `setLeaveBalance`, `allLeaveBalances`, `listPermissions`, `createPermission`, `approvePermission`, `deletePermission`, `permissionReport`, `listHolidays`, `addHoliday`, `deleteHoliday`
  - **Output**: New file `server/routers/attendance-leaves.ts` exporting `export const attendanceLeavesRoutes = { ... }`; procedures cut from `attendance.ts`; `attendance.ts` spreads `...attendanceLeavesRoutes`
  - **Prompt**: "Read `server/routers/attendance.ts` (after T005 and T007 cuts). Extract the following procedures into a new file `server/routers/attendance-leaves.ts`: `employeeLeaves`, `leaveBalance`, `pendingLeaves`, `createLeave`, `approveLeave`, `deleteLeave`, `listLeaves`, `recomputeDaily`, `adjustmentSummary`, `setLeaveBalance`, `allLeaveBalances`, `listPermissions`, `createPermission`, `approvePermission`, `deletePermission`, `permissionReport`, `listHolidays`, `addHoliday`, `deleteHoliday`. Export a plain object `export const attendanceLeavesRoutes = { ... }` — NOT a `router()` instance. Spread into `attendanceRouter`. Copy all required imports. Do not rename any procedures. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; `trpc.attendance.createLeave` still callable

- [x] T010 [US3] Run `pnpm check` + confirm line count
  - **Owner**: Codex | **Tool**: Bash
  - **Prompt**: "Run `pnpm check`. Run `wc -l server/routers/attendance.ts`. Report and confirm. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` exit 0; `attendance.ts` ≤ 1,200 lines

---

## Phase 6: US4 — Reports Sub-Router (P2)

- [x] T011 [US4] Create `server/routers/attendance-reports.ts`
  - **Owner**: Codex | **Backup**: Cursor | **Tool**: Write
  - **Input**: `server/routers/attendance.ts` lines ~337–411 and ~2692–3160 — procedures: `monthlyReport`, `lateReport`, `absentReport`, `otReport`, `summaryReport`, `rangeReport`
  - **Output**: New file `server/routers/attendance-reports.ts` exporting `export const attendanceReportsRoutes = { ... }`; procedures cut from `attendance.ts`; `attendance.ts` spreads `...attendanceReportsRoutes`
  - **Prompt**: "Read `server/routers/attendance.ts` (after prior cuts). Extract the following procedures into a new file `server/routers/attendance-reports.ts`: `monthlyReport`, `lateReport`, `absentReport`, `otReport`, `summaryReport`, `rangeReport`. Export a plain object `export const attendanceReportsRoutes = { ... }` — NOT a `router()` instance. Spread into `attendanceRouter`. Copy all required imports. Do not rename any procedures. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T012 [US4] Reduce `attendance.ts` to core + router composition ≤ 800 lines
  - **Owner**: Codex | **Backup**: Claude | **Tool**: Edit
  - **Input**: `attendance.ts` after T005–T011 cuts — should contain only: `dashboardSummary`, `offTodayList`, `syncStatus`, `employeesList`, `rawPunches`, `dailyByDate`, `dailyByEmployee`, `insideNow` (if present), `auditLogs`, `auditStats`, `systemHealth` (if not in sync file), and the `attendanceRouter = router({ ...attendanceSyncRoutes, ...attendanceShiftsRoutes, ...attendanceLeavesRoutes, ...attendanceReportsRoutes, ...remaining })` composition + all imports
  - **Prompt**: "Read `server/routers/attendance.ts` after all prior extractions. Clean up any remaining orphaned imports. Verify the router composition at the bottom spreads all four sub-router objects. Ensure the file is ≤ 800 lines. Run `pnpm check` and `wc -l server/routers/attendance.ts`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; file ≤ 800 lines; all spreads present

**Checkpoint**: All domains distributed. No file in `server/routers/` exceeds 2,500 lines.

---

## Final Phase: Verification

- [x] T013 Run `pnpm check` + full test suite + line count report
  - **Owner**: Claude | **Tool**: Bash
  - **Prompt**: "Run `pnpm check` then `pnpm test`. Report: (1) exit codes, (2) test counts pass/fail, (3) `wc -l` for all five attendance router files (`attendance.ts`, `attendance-sync.ts`, `attendance-shifts.ts`, `attendance-leaves.ts`, `attendance-reports.ts`). Confirm no file exceeds 2,500 lines. Produce the standard task report: changed files / what changed / checks run / checks skipped. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Both commands pass; all files ≤ 2,500 lines; `attendance.ts` ≤ 800 lines

---

## Dependencies & Execution Order

```
T001 → T002 + T003 (parallel) → T004
T004 → T005 → T006
T006 → T007 → T008
T008 → T009 → T010
T010 → T011 → T012 → T013
```

## Notes

- Sub-routers export **plain objects**, NOT `router()` instances — keeps `trpc.attendance.*` namespace flat
- Do NOT rename any procedures during extraction
- AuditLogService calls already present in mutations must not be removed
- Run `pnpm check` after every phase — Constitution Principle VII
- T005/T007/T009/T011 are sequential because each phase operates on the post-cut version of `attendance.ts`
