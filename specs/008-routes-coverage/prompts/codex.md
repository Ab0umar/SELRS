Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not start the next task until check passes.

---

## T002 — Add attendance route constants to shared/routes.ts

Task: Add all attendance route constants to `shared/routes.ts`.

1. Read `shared/routes.ts` — note the existing structure and `as const` usage
2. Add the following keys to the `ROUTES` object (do NOT change any existing key values):
   ```typescript
   attendance: '/attendance',
   attendanceLive: '/attendance/live',
   attendanceEmployees: '/attendance/employees',
   attendanceEmployeeDetail: '/attendance/employees/:empCd',
   attendanceReports: '/attendance/reports',
   attendanceSettings: '/attendance/settings',
   attendanceAdminDevice: '/attendance/admin/device',
   attendanceAdminSync: '/attendance/admin/sync',
   ```
3. Also add any other `/attendance/*` paths found in the T001 audit that are not listed above
4. Keep `as const` on the object
5. Run `pnpm check`

Do NOT change any existing constant values. Add only.
Report: keys added, pnpm check result.

---

## T003 — Add salary route constants to shared/routes.ts

Task: Add all salary route constants to `shared/routes.ts`.

1. Read `shared/routes.ts`
2. Add the following keys (do NOT change any existing key values):
   ```typescript
   salary: '/salary',
   salaryPenalties: '/salary/penalties',
   salaryPools: '/salary/pools',
   salaryPayroll: '/salary/payroll',
   salarySettings: '/salary/settings',
   salaryShiftStaff: '/salary/shift-staff',
   salaryShiftPayroll: '/salary/shift-payroll',
   salaryAbsentReport: '/salary/absent-report',
   salaryCurrentData: '/salary/current-data',
   ```
3. Also add any other `/salary/*` paths from the T001 audit
4. Run `pnpm check`

Do NOT change any existing constant values.
Report: keys added, pnpm check result.

---

## T004 — Add KF sub-path constants to shared/routes.ts

Task: Add missing KF sub-path constants to `shared/routes.ts`.

1. Read `shared/routes.ts` — note all existing `kf*` constants
2. Run: `grep -n "path.*kf" client/src/App.tsx` — find any KF sub-paths not yet in ROUTES
3. Add missing KF sub-path constants, for example:
   ```typescript
   kfPatients: '/kf/patients',
   kfPatientsNew: '/kf/patients/new',
   kfVisits: '/kf/visits',
   kfExaminations: '/kf/examinations',
   kfOperations: '/kf/operations',
   kfFollowups: '/kf/followups',
   ```
   (Adjust based on what App.tsx actually contains — only add paths that exist)
4. Run `pnpm check`

Do NOT change any existing constant values.
Report: keys added (or "none needed"), pnpm check result.

---

## T005 — Add remaining domain constants to shared/routes.ts

Task: Add any remaining raw path constants from the T001 audit (stockroom sub-paths, admin sub-paths, or any other domain not yet covered).

1. Read `shared/routes.ts`
2. Check the T001 audit results for any domain paths not yet added in T002–T004 (stockroom, admin sub-paths, other)
3. Add each missing constant to `ROUTES` with the correct value
4. Run `pnpm check`

Do NOT change any existing constant values.
Report: keys added (or "none remaining"), pnpm check result.

---

## T007 — Replace raw /attendance/* path= strings in App.tsx with ROUTES.*

Task: Migrate all attendance path declarations in `client/src/App.tsx` to use `ROUTES.*`.

1. Read `client/src/App.tsx`
2. Find all `path={'/attendance...'}` and `path="/attendance..."` declarations
3. Replace each with the corresponding `ROUTES.*` constant:
   - `'/attendance'` → `{ROUTES.attendance}`
   - `'/attendance/live'` → `{ROUTES.attendanceLive}`
   - etc.
4. Confirm `import { ROUTES } from '../../shared/routes'` (or the correct relative path) is present at the top of the file — add it if missing
5. Run `pnpm check`

Do NOT change any path values. Replace string literals with constants of the same value only.
Report: replacements made (count), pnpm check result.

---

## T008 — Replace raw /salary/* path= strings in App.tsx with ROUTES.*

Task: Migrate all salary path declarations in `client/src/App.tsx` to use `ROUTES.*`.

1. Read `client/src/App.tsx`
2. Find all `path={'/salary...'}` and `path="/salary..."` declarations
3. Replace each with the corresponding `ROUTES.*` constant from T003
4. Run `pnpm check`

Do NOT change any path values.
Report: replacements made (count), pnpm check result.

---

## T009 — Replace raw /kf/* path= strings in App.tsx with ROUTES.*

Task: Migrate all KF sub-path declarations in `client/src/App.tsx` to use `ROUTES.*`.

1. Read `client/src/App.tsx`
2. Find all `path={'/kf...'}` declarations (sub-paths only; ROUTES.kf and ROUTES.kfSheets should already be in place from plan 003)
3. Replace each with the corresponding `ROUTES.*` constant from T004
4. Run `pnpm check`

Do NOT change any path values.
Report: replacements made (count), pnpm check result.

---

## T010 — Replace all remaining raw domain path= strings in App.tsx with ROUTES.*

Task: Migrate any remaining raw path declarations in `client/src/App.tsx` (stockroom, admin sub-paths, other domains).

1. Read `client/src/App.tsx`
2. Run: `grep -n "path={'" client/src/App.tsx | grep -v ROUTES`
3. For each remaining raw string, replace with the corresponding `ROUTES.*` constant from T005
4. Run `pnpm check`

Do NOT change any path values.
Report: replacements made (count, or "none remaining"), pnpm check result.
