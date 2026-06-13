# Tasks: App.tsx Router Split

**Branch**: `010-app-router-split`
**Hard Dependency**: `009-routes-full-coverage` merged (all paths typed)
**Input**: `specs/010-app-router-split/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup

- [ ] T001 Create `client/src/routes/` directory with placeholder files
  - **Owner**: Codex | **Tool**: Bash
  - **Prompt**: "Create directory `client/src/routes/`. Create placeholder files: `attendance-routes.tsx`, `salary-routes.tsx`, `kf-routes.tsx`, `accounting-routes.tsx`, `medical-routes.tsx`, `admin-routes.tsx`, `marketing-routes.tsx`, `misc-routes.tsx`. Each file starts with `// placeholder`. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Directory exists; `pnpm check` passes

**Checkpoint**: Directory present. No routes moved yet.

---

## Phase 2: Extract Domain Route Files

- [ ] T002 Extract attendance routes into `client/src/routes/attendance-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Input**: All `<Route path={ROUTES.attendance*}` blocks in `App.tsx`
  - **Output**: `AttendanceRoutes` component; `App.tsx` renders `<AttendanceRoutes />`
  - **Prompt**: "Read `client/src/App.tsx`. Move all attendance-domain `<Route>` blocks (paths starting with `/attendance`) — including their lazy imports and `ProtectedRoute` wrappers — into a new component `export function AttendanceRoutes()` in `client/src/routes/attendance-routes.tsx`. In `App.tsx`, replace the extracted blocks with `<AttendanceRoutes />` and add the import. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; attendance routes still render

- [ ] T003 [P] Extract salary routes into `client/src/routes/salary-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Read `client/src/App.tsx`. Move all salary-domain `<Route>` blocks (paths starting with `/salary`) into `export function SalaryRoutes()` in `client/src/routes/salary-routes.tsx`. Replace in `App.tsx` with `<SalaryRoutes />`. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [ ] T004 [P] Extract KF routes into `client/src/routes/kf-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Read `client/src/App.tsx`. Move all KF-domain `<Route>` blocks (paths starting with `/kf` or `/KFsheets`) into `export function KfRoutes()` in `client/src/routes/kf-routes.tsx`. Replace in `App.tsx` with `<KfRoutes />`. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [ ] T005 Run `pnpm check` after T002–T004
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

- [ ] T006 Extract accounting routes into `client/src/routes/accounting-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Read `client/src/App.tsx`. Move all accounting-domain `<Route>` blocks (paths starting with `/accounting`) into `export function AccountingRoutes()` in `client/src/routes/accounting-routes.tsx`. Replace in `App.tsx` with `<AccountingRoutes />`. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [ ] T007 [P] Extract admin routes into `client/src/routes/admin-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Read `client/src/App.tsx`. Move all admin-domain `<Route>` blocks (paths starting with `/admin`, `/admin-hub`, `/users`, `/doctors`, `/permissions`, `/services`, `/medical-sheets`, `/sheet-designer`, `/system-status`, `/migrations`, `/api-tools`, `/admin-patients`) into `export function AdminRoutes()` in `client/src/routes/admin-routes.tsx`. Replace in `App.tsx` with `<AdminRoutes />`. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [ ] T008 Run `pnpm check` after T006–T007
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

- [ ] T009 Extract medical/sheets routes into `client/src/routes/medical-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Read `client/src/App.tsx`. Move all medical/sheets-domain `<Route>` blocks (paths: `/sheets/*`, `/refraction*`, `/medicalfile*`, `/medical-reports*`, `/patient-summary*`, `/doctor/*`, `/visits*`, `/operations`, `/quick-entry*`, `/new-cases*`, `/followup*`, `/today`, `/workflow-hub`, `/medications*`, `/external-doctors*`, `/request-tests*`, `/sheet-copies`, `/pentacam`) into `export function MedicalRoutes()` in `client/src/routes/medical-routes.tsx`. Replace in `App.tsx` with `<MedicalRoutes />`. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [ ] T010 [P] Extract marketing routes into `client/src/routes/marketing-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Read `client/src/App.tsx`. Move all marketing-domain `<Route>` blocks (paths starting with `/marketing`) into `export function MarketingRoutes()` in `client/src/routes/marketing-routes.tsx`. Replace in `App.tsx` with `<MarketingRoutes />`. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [ ] T011 [P] Extract misc routes into `client/src/routes/misc-routes.tsx`
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Read `client/src/App.tsx`. Move remaining `<Route>` blocks not yet extracted (hubs: `/clinics-hub`, `/patients-hub`, `/services-hub`, `/stockroom`, `/txhub`; dev/showcase: `/showcase`, `/styleguide`, `/components-gallery`, `/prototypes`, `/documentation`; portals: `/doctor-portal/*`, `/patient-portal/*`, `/my/*`) into `export function MiscRoutes()` in `client/src/routes/misc-routes.tsx`. Replace in `App.tsx` with `<MiscRoutes />`. Do not change any route paths or components. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [ ] T012 Run `pnpm check` after T009–T011
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

---

## Final Phase: Verification

- [ ] T013 Verify App.tsx line count + run full test suite
  - **Owner**: Claude | **Tool**: Bash
  - **Prompt**: "Run `pnpm check` then `pnpm test`. Run `(Get-Content client/src/App.tsx).Count` — must be ≤ 300. Run `(Get-Content client/src/routes/*.tsx | Measure-Object -Line).Lines` to confirm no domain file exceeds 400 lines. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: check + test pass; App.tsx ≤ 300 lines; no domain file > 400 lines

- [ ] T014 Run `pnpm build` as final gate
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

---

## Dependencies & Execution Order

```
T001 → T002 + T003 + T004 (parallel) → T005
T005 → T006 + T007 (parallel) → T008
T008 → T009 + T010 + T011 (parallel) → T012 → T013 → T014
```
