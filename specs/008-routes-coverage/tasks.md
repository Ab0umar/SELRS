# Tasks: Routes Coverage — Extend ROUTES.* to App.tsx Raw Strings

**Branch**: `008-routes-coverage`
**Hard Dependency**: `003-permission-typed-constants` merged (provides `shared/routes.ts`)
**Input**: `specs/008-routes-coverage/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup — Audit Raw Strings

- [x] T001 Audit `client/src/App.tsx` for all remaining raw path strings not using `ROUTES.*`
  - **Owner**: Claude | **Tool**: Bash + Read
  - **Prompt**: "Run `grep -n 'path={\"/' client/src/App.tsx` and `grep -n \"path='\/\" client/src/App.tsx`. Also run `grep -n 'navigate(\"/' client/src/App.tsx` and `grep -n 'to=\"/' client/src/App.tsx`. Group the results by domain (attendance, salary, KF, stockroom, admin, other). Count how many raw strings remain vs how many already use `ROUTES.*`. Output the complete inventory as a table: domain | raw path | line number. Follow the project Constitution and Project Principles strictly."
  - **Output**: Full inventory table; total raw string count per domain
  - **Acceptance**: Every raw path string in `App.tsx` is listed; grouped by domain

**Checkpoint**: Exact scope known. No constants added yet.

---

## Phase 2: Foundational — Add Missing Constants

- [x] T002 Add attendance route constants to `shared/routes.ts`
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Input**: `shared/routes.ts`; attendance raw strings from T001 audit
  - **Output**: Add to the `ROUTES` object: `attendance`, `attendanceLive`, `attendanceEmployees`, `attendanceEmployeeDetail`, `attendanceReports`, `attendanceSettings`, `attendanceAdminDevice`, `attendanceAdminSync` (plus any others found in T001)
  - **Prompt**: "Read `shared/routes.ts`. Add the following attendance route constants to the `ROUTES` object (keeping `as const`): `attendance: '/attendance'`, `attendanceLive: '/attendance/live'`, `attendanceEmployees: '/attendance/employees'`, `attendanceEmployeeDetail: '/attendance/employees/:empCd'`, `attendanceReports: '/attendance/reports'`, `attendanceSettings: '/attendance/settings'`, `attendanceAdminDevice: '/attendance/admin/device'`, `attendanceAdminSync: '/attendance/admin/sync'`. Also add any other `/attendance/*` paths found in the T001 audit that are not yet in `ROUTES`. Do not change any existing constant values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; all new keys are string literal types via `as const`

- [x] T003 [P] Add salary route constants to `shared/routes.ts`
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Input**: `shared/routes.ts`; salary raw strings from T001 audit
  - **Output**: Add: `salary`, `salaryPenalties`, `salaryPools`, `salaryPayroll`, `salarySettings`, `salaryShiftStaff`, `salaryShiftPayroll`, `salaryAbsentReport`, `salaryCurrentData`
  - **Prompt**: "Read `shared/routes.ts`. Add the following salary route constants to the `ROUTES` object (keeping `as const`): `salary: '/salary'`, `salaryPenalties: '/salary/penalties'`, `salaryPools: '/salary/pools'`, `salaryPayroll: '/salary/payroll'`, `salarySettings: '/salary/settings'`, `salaryShiftStaff: '/salary/shift-staff'`, `salaryShiftPayroll: '/salary/shift-payroll'`, `salaryAbsentReport: '/salary/absent-report'`, `salaryCurrentData: '/salary/current-data'`. Do not change any existing constant values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T004 [P] Add KF sub-path constants to `shared/routes.ts`
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Input**: `shared/routes.ts`; KF raw strings from T001 audit (sub-paths not yet covered by existing `ROUTES.kf`)
  - **Output**: Add: `kfPatients`, `kfPatientsNew`, `kfVisits`, `kfExaminations`, `kfOperations`, `kfFollowups` (plus any others found)
  - **Prompt**: "Read `shared/routes.ts` and note all existing `kf*` constants. Run `grep -n 'path=.*kf' client/src/App.tsx` to find KF sub-paths not yet covered. Add the missing KF sub-path constants to the `ROUTES` object (e.g. `kfPatients: '/kf/patients'`, `kfPatientsNew: '/kf/patients/new'`). Do not change any existing constant values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T005 [P] Add remaining domain constants (stockroom, admin sub-paths, etc.)
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Input**: Remaining raw strings from T001 audit that don't belong to attendance/salary/KF
  - **Prompt**: "Read `shared/routes.ts` and the T001 audit results. Add any remaining raw path strings found in the audit that are not yet in `ROUTES` — stockroom sub-paths, admin sub-paths, or any other domain. Keep `as const`. Do not change existing constant values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; every raw string from T001 now has a corresponding `ROUTES.*` constant

- [x] T006 Run `pnpm check` after T002–T005
  - **Owner**: Codex | **Tool**: Bash
  - **Prompt**: "Run `pnpm check`. Report exit code and any errors. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Exit code 0

**Checkpoint**: All missing constants exist in `shared/routes.ts`. No call sites migrated yet.

---

## Phase 3: US1 — Migrate App.tsx path= declarations (P1)

**Goal**: Every `path=` declaration in `App.tsx` uses `ROUTES.*` — no raw strings for any domain.

**Independent Test**: `grep -n 'path={"/' client/src/App.tsx | grep -vE "ROUTES\."` returns zero.

- [x] T007 [US1] Replace raw `/attendance/*` `path=` strings in `client/src/App.tsx` with `ROUTES.*`
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Input**: `client/src/App.tsx`; `shared/routes.ts` from T002
  - **Prompt**: "Read `client/src/App.tsx`. Replace every `path={'/attendance...'}` or `path={'/attendance...'}` string literal with the corresponding `ROUTES.*` constant from `shared/routes.ts`. Ensure `import { ROUTES } from '../../shared/routes'` (or the correct relative path) is present at the top of the file. Do not change any route path values — only replace strings with constants of the same value. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; no raw `/attendance` path strings remain in `App.tsx`

- [x] T008 [P] [US1] Replace raw `/salary/*` strings in `client/src/App.tsx` with `ROUTES.*`
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Prompt**: "Read `client/src/App.tsx`. Replace every raw `/salary...` path string literal in `path=` declarations with the corresponding `ROUTES.*` constant from `shared/routes.ts`. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; no raw `/salary` path strings remain in `path=` declarations

- [x] T009 [P] [US1] Replace raw `/kf/*` sub-path strings in `client/src/App.tsx` with `ROUTES.*`
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Prompt**: "Read `client/src/App.tsx`. Replace every raw `/kf...` path string literal in `path=` declarations with the corresponding `ROUTES.*` constant from `shared/routes.ts`. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T010 [P] [US1] Replace all remaining raw domain path strings in `client/src/App.tsx` with `ROUTES.*`
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Prompt**: "Read `client/src/App.tsx`. Find all remaining raw path string literals in `path=` declarations that are not yet using `ROUTES.*` (stockroom, admin sub-paths, other domains found in T001 audit). Replace each with the corresponding `ROUTES.*` constant from `shared/routes.ts`. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T011 [US1] Run `pnpm check` + full test suite + confirm zero raw strings remain
  - **Owner**: Claude | **Tool**: Bash
  - **Prompt**: "Run `pnpm check` then `pnpm test`. Then run `grep -n 'path=.*\"/[a-z]' client/src/App.tsx` and confirm it returns zero matches for attendance, salary, kf, stockroom paths. Report results. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Both commands pass; zero raw path strings remain for migrated domains

**Checkpoint**: US1 complete. A route rename now produces compile errors at every App.tsx reference.

---

## Phase 4: US2 — Migrate Internal Navigation Calls (P2)

**Goal**: `navigate()`, `<Link to=`, and `<Redirect to=` calls in feature pages use `ROUTES.*` instead of raw strings.

- [x] T012 [US2] Audit navigation call sites in attendance + KF feature pages
  - **Owner**: Claude | **Tool**: Grep
  - **Prompt**: "Run `grep -rn 'navigate(\"/attendance\|navigate(\"/kf\|to=\"/attendance\|to=\"/kf\|href=\"/attendance\|href=\"/kf' client/src/features/`. List all matches as: file | line | raw string. Follow the project Constitution and Project Principles strictly."
  - **Output**: Inventory of raw navigation strings in feature components
  - **Acceptance**: Complete list identified

- [x] T013 [US2] Replace raw navigation strings in attendance + KF feature pages
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Input**: Files from T012; `shared/routes.ts`
  - **Prompt**: "Read the files identified in T012. In each file, replace raw `/attendance/*` and `/kf/*` navigation strings in `navigate()`, `<Link to=`, `<Redirect to=`, and `href=` with the corresponding `ROUTES.*` constants. Add the `ROUTES` import to each file that needs it. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; no raw `/attendance` or `/kf` navigation strings in feature components

- [x] T014 [P] [US2] Replace raw navigation strings in salary + stockroom feature pages
  - **Owner**: Cursor | **Backup**: Codex | **Tool**: Edit
  - **Prompt**: "Run `grep -rn 'navigate(\"/salary\|navigate(\"/stockroom\|to=\"/salary\|to=\"/stockroom' client/src/features/`. For each match, replace the raw string with the corresponding `ROUTES.*` constant from `shared/routes.ts`. Add the `ROUTES` import where missing. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

---

## Final Phase: Verification

- [x] T015 Run `pnpm check` + `pnpm build` + full test suite as final gate
  - **Owner**: Claude | **Tool**: Bash
  - **Prompt**: "Run `pnpm check`, then `pnpm test`, then `pnpm build`. Report all three exit codes and test counts. Confirm: (1) zero raw path strings remain in `client/src/App.tsx` for attendance/salary/KF/stockroom domains, (2) zero raw navigation strings in `client/src/features/`. Produce the standard task report: changed files / what changed / checks run / checks skipped. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: All three commands pass; standard task report produced

---

## Dependencies & Execution Order

```
T001 → T002 + T003 + T004 + T005 (parallel) → T006
T006 → T007 + T008 + T009 + T010 (parallel) → T011
T011 → T012 → T013 + T014 (parallel) → T015
```

## Notes

- Do NOT change any route path values — only replace string literals with typed constants
- `ROUTES` uses `as const` — a typo in any new constant is a compile error
- T007–T010 can run in parallel (each domain is independent in App.tsx)
- Constitution Principle VII: `pnpm check` mandatory after every phase touching `App.tsx`
- Plan 003 covered `ProtectedRoute.tsx`; this plan covers `App.tsx` and feature component navigation
