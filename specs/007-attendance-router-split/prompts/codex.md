Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not start the next task until check passes.

---

## T001 — Create _attendance/ directory

Task: Create the helpers directory `server/routers/_attendance/`.

1. Create `server/routers/_attendance/`
2. Create two placeholder files:
   - `server/routers/_attendance/device-helpers.ts` — content: `// placeholder`
   - `server/routers/_attendance/schedule-helpers.ts` — content: `// placeholder`
3. Run `pnpm check` — must pass

Report: files created, pnpm check result.

---

## T002 — Extract device helpers

Task: Extract ZKTeco/FK device builder helpers from `server/routers/attendance.ts` into `server/routers/_attendance/device-helpers.ts`.

1. Read `server/routers/attendance.ts`
2. Identify any helper functions or constants used across multiple device/sync procedures (connection config builders, command-type maps, hardware config constants). If none exist, leave the placeholder file as-is.
3. If helpers exist: move them to `device-helpers.ts`, export each, import back in `attendance.ts`
4. Run `pnpm check`

Report: symbols moved (or "none found"), pnpm check result.

---

## T003 — Extract schedule helpers

Task: Extract shift/cycle date helpers from `server/routers/attendance.ts` into `server/routers/_attendance/schedule-helpers.ts`.

1. Read `server/routers/attendance.ts`
2. Identify helper functions used across both shift-management and leave/permissions domains (weekday mask computations, cycle-period overlap checks, date arithmetic). If none exist, leave the placeholder file as-is.
3. If helpers exist: move them, export each, import back in `attendance.ts`
4. Run `pnpm check`

Report: symbols moved (or "none found"), pnpm check result.

---

## T005 — Extract attendance-sync.ts

Task: Extract all sync and device procedures from `server/routers/attendance.ts` into `server/routers/attendance-sync.ts`.

CRITICAL: Export a PLAIN OBJECT — NOT a router() instance:
`export const attendanceSyncRoutes = { procedureName: procedure, ... }`
In `attendance.ts`, spread it: `attendanceRouter = router({ ...attendanceSyncRoutes, ...rest })`

1. Read `server/routers/attendance.ts`
2. Move ALL of the following procedures to the new file:
   `deviceSettings`, `deviceStatus`, `updateDeviceSettings`, `connectDevice`, `disconnectDevice`, `resetDeviceConnection`, `sendDeviceCommand`, `batchAddPunches`, `runDeviceDiagnostics`, `testZKTecoConnection`, `pullDeviceLogs`, `exportDevicePunches`, `syncEmployeesFromDevice`, `syncFromFKDevice`, `testFKDeviceConnection`, `syncNow`, `resetSyncHistory`, `deviceSyncNow`, `deviceSyncStatus`, `initializeDeviceSync`, `materializeDaily`, `generateMonthlyReports`, `healthCheck`, `bootstrapShifts`
3. New file imports all required symbols: `makeAttProcedure`, `makeAttWriteProcedure`, `getDb`, drizzle tables, services, `AuditLogService`, etc.
4. In `attendance.ts`: cut the procedures, add `import { attendanceSyncRoutes } from './attendance-sync'`, spread `...attendanceSyncRoutes` in the router
5. Run `pnpm check`

Do NOT rename any procedures. Do NOT change any logic. Move only.
Report: procedure count in new file (must be 24), attendance.ts line count before/after, pnpm check result.

---

## T007 — Extract attendance-shifts.ts

Task: Extract all shift management, assignments, cycles, and change request procedures from `server/routers/attendance.ts` into `server/routers/attendance-shifts.ts`.

CRITICAL: Export a PLAIN OBJECT: `export const attendanceShiftsRoutes = { ... }`
Spread in `attendance.ts`: `...attendanceShiftsRoutes`

1. Read `server/routers/attendance.ts` (after T005 cuts)
2. Move ALL of the following:
   `listShifts`, `createShift`, `updateShift`, `listAssignments`, `assignShift`, `addShiftAssignment`, `updateAssignment`, `deleteAssignment`, `saveDayShiftAssignments`, `updateEmployee`, `deleteEmployee`, `swapShifts`, `tempChangeShift`, `bulkAssignShift`, `createShiftChangeRequest`, `listShiftChangeRequests`, `approveShiftChangeRequest`, `rejectShiftChangeRequest`, `listShiftCycles`, `createShiftCycle`, `updateShiftCycle`, `deleteShiftCycle`, `listCycleAssignments`, `assignCycle`, `updateCycleAssignment`, `removeCycleAssignment`
3. New file imports all required symbols
4. Cut from `attendance.ts`, add import, spread in router
5. Run `pnpm check`

Do NOT rename anything. Move only.
Report: procedure count in new file (must be 26), attendance.ts line count before/after, pnpm check result.

---

## T009 — Extract attendance-leaves.ts

Task: Extract all leave, permissions, holidays, and leave balance procedures from `server/routers/attendance.ts` into `server/routers/attendance-leaves.ts`.

CRITICAL: Export a PLAIN OBJECT: `export const attendanceLeavesRoutes = { ... }`
Spread in `attendance.ts`: `...attendanceLeavesRoutes`

1. Read `server/routers/attendance.ts` (after T005 and T007 cuts)
2. Move ALL of the following:
   `employeeLeaves`, `leaveBalance`, `pendingLeaves`, `createLeave`, `approveLeave`, `deleteLeave`, `listLeaves`, `recomputeDaily`, `adjustmentSummary`, `setLeaveBalance`, `allLeaveBalances`, `listPermissions`, `createPermission`, `approvePermission`, `deletePermission`, `permissionReport`, `listHolidays`, `addHoliday`, `deleteHoliday`
3. New file imports all required symbols
4. Cut from `attendance.ts`, add import, spread in router
5. Run `pnpm check`

Do NOT rename anything. Move only.
Report: procedure count in new file (must be 19), attendance.ts line count before/after, pnpm check result.

---

## T011 — Extract attendance-reports.ts

Task: Extract all report procedures from `server/routers/attendance.ts` into `server/routers/attendance-reports.ts`.

CRITICAL: Export a PLAIN OBJECT: `export const attendanceReportsRoutes = { ... }`
Spread in `attendance.ts`: `...attendanceReportsRoutes`

1. Read `server/routers/attendance.ts` (after T005, T007, T009 cuts)
2. Move ALL of the following:
   `monthlyReport`, `lateReport`, `absentReport`, `otReport`, `summaryReport`, `rangeReport`
3. New file imports all required symbols
4. Cut from `attendance.ts`, add import, spread in router
5. Run `pnpm check`

Do NOT rename anything. Move only.
Report: procedure count in new file (must be 6), attendance.ts line count before/after, pnpm check result.

---

## T012 — Verify attendance.ts final state

Task: After T005/T007/T009/T011 all complete, clean up `attendance.ts` and verify final state.

1. Read `server/routers/attendance.ts`
2. Confirm the router spreads all four sub-route objects:
   `...attendanceSyncRoutes`, `...attendanceShiftsRoutes`, `...attendanceLeavesRoutes`, `...attendanceReportsRoutes`
3. Remove any orphaned imports for symbols that were moved out
4. Run `pnpm check`
5. Run `wc -l server/routers/attendance.ts` — target ≤ 800 lines

Report: final line count, spread count (must be 4), pnpm check result.
