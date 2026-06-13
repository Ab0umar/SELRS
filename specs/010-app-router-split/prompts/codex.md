Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not start the next task until check passes.

---

## T001 — Create client/src/routes/ directory

Task: Create the routes directory with placeholder files.

1. Create `client/src/routes/`
2. Create these placeholder files (each with content `// placeholder`):
   - `attendance-routes.tsx`
   - `salary-routes.tsx`
   - `kf-routes.tsx`
   - `accounting-routes.tsx`
   - `medical-routes.tsx`
   - `admin-routes.tsx`
   - `marketing-routes.tsx`
   - `misc-routes.tsx`
3. Run `pnpm check`

Report: files created, pnpm check result.

---

## T002 — Extract attendance routes into attendance-routes.tsx

Task: Move all attendance `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/attendance-routes.tsx`.

1. Read `client/src/App.tsx`
2. Find all `<Route>` blocks whose `path` starts with a `/attendance` constant (e.g. `ROUTES.attendance`, `ROUTES.attendanceLive`, etc.)
3. Move those `<Route>` elements — including their lazy component imports and `ProtectedRoute` wrappers — into:
   ```tsx
   export function AttendanceRoutes() {
     return (
       <>
         {/* moved Route blocks here */}
       </>
     );
   }
   ```
   in `client/src/routes/attendance-routes.tsx`
4. Add all required imports to the new file (`ROUTES`, lazy components, `ProtectedRoute`, etc.)
5. In `App.tsx`: delete the extracted blocks, add `import { AttendanceRoutes } from './routes/attendance-routes'`, place `<AttendanceRoutes />` at the same position
6. Run `pnpm check`

Do NOT change any route paths or component logic. Move only.
Report: Route count moved, attendance.ts line count before/after, pnpm check result.

---

## T003 — Extract salary routes into salary-routes.tsx

Task: Move all salary `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/salary-routes.tsx`.

1. Read `client/src/App.tsx`
2. Find all `<Route>` blocks whose `path` uses a `/salary` constant
3. Move them into:
   ```tsx
   export function SalaryRoutes() {
     return <>{/* moved Route blocks */}</>;
   }
   ```
4. Add required imports to the new file
5. In `App.tsx`: replace with `<SalaryRoutes />`, add import
6. Run `pnpm check`

Do NOT change any route paths or components. Move only.
Report: Route count moved, pnpm check result.

---

## T004 — Extract KF routes into kf-routes.tsx

Task: Move all KF `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/kf-routes.tsx`.

1. Read `client/src/App.tsx`
2. Find all `<Route>` blocks whose `path` uses a `/kf` or `/KFsheets` constant
3. Move them into:
   ```tsx
   export function KfRoutes() {
     return <>{/* moved Route blocks */}</>;
   }
   ```
4. Add required imports
5. In `App.tsx`: replace with `<KfRoutes />`, add import
6. Run `pnpm check`

Do NOT change any route paths or components. Move only.
Report: Route count moved, pnpm check result.

---

## T006 — Extract accounting routes into accounting-routes.tsx

Task: Move all accounting `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/accounting-routes.tsx`.

1. Read `client/src/App.tsx` (after T002–T004 cuts)
2. Find all `<Route>` blocks whose `path` uses an `/accounting` constant
3. Move them into:
   ```tsx
   export function AccountingRoutes() {
     return <>{/* moved Route blocks */}</>;
   }
   ```
4. Add required imports
5. In `App.tsx`: replace with `<AccountingRoutes />`, add import
6. Run `pnpm check`

Do NOT change any route paths or components. Move only.
Report: Route count moved, pnpm check result.

---

## T007 — Extract admin routes into admin-routes.tsx

Task: Move all admin `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/admin-routes.tsx`.

1. Read `client/src/App.tsx` (after prior cuts)
2. Find all `<Route>` blocks whose path uses an admin constant (`ROUTES.adminUsers`, `ROUTES.users`, `ROUTES.doctors`, `ROUTES.adminHub`, `ROUTES.adminHubSettingsPricingRules`, etc.)
3. Move them into:
   ```tsx
   export function AdminRoutes() {
     return <>{/* moved Route blocks */}</>;
   }
   ```
4. Add required imports
5. In `App.tsx`: replace with `<AdminRoutes />`, add import
6. Run `pnpm check`

Do NOT change any route paths or components. Move only.
Report: Route count moved, pnpm check result.

---

## T009 — Extract medical/sheets routes into medical-routes.tsx

Task: Move all medical/sheets `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/medical-routes.tsx`.

1. Read `client/src/App.tsx` (after prior cuts)
2. Find all `<Route>` blocks for: `ROUTES.sheetsConsultantDetail`, `ROUTES.sheetsPentacam*`, `ROUTES.refraction*`, `ROUTES.medicalFile*`, `ROUTES.medicalReport*`, `ROUTES.patientSummary*`, `ROUTES.doctorPatientDetail`, `ROUTES.visits*`, `ROUTES.operations`, `ROUTES.quickEntry*`, `ROUTES.newCases*`, `ROUTES.followup*`, `ROUTES.todayRoute`, `ROUTES.workflowHub`, `ROUTES.medicationsRegistry`, `ROUTES.externalDoctors*`, and related medical/sheet paths
3. Move them into:
   ```tsx
   export function MedicalRoutes() {
     return <>{/* moved Route blocks */}</>;
   }
   ```
4. Add required imports
5. In `App.tsx`: replace with `<MedicalRoutes />`, add import
6. Run `pnpm check`

Do NOT change any route paths or components. Move only.
Report: Route count moved, pnpm check result.

---

## T010 — Extract marketing routes into marketing-routes.tsx

Task: Move all marketing `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/marketing-routes.tsx`.

1. Read `client/src/App.tsx` (after prior cuts)
2. Find all `<Route>` blocks whose path uses a `ROUTES.marketing*` constant
3. Move them into:
   ```tsx
   export function MarketingRoutes() {
     return <>{/* moved Route blocks */}</>;
   }
   ```
4. Add required imports
5. In `App.tsx`: replace with `<MarketingRoutes />`, add import
6. Run `pnpm check`

Do NOT change any route paths or components. Move only.
Report: Route count moved, pnpm check result.

---

## T011 — Extract misc routes into misc-routes.tsx

Task: Move all remaining `<Route>` blocks from `client/src/App.tsx` into `client/src/routes/misc-routes.tsx`.

1. Read `client/src/App.tsx` (after all prior cuts)
2. Find all remaining `<Route>` blocks not yet extracted: hubs (`ROUTES.clinicsHub`, `ROUTES.patientsHub`, `ROUTES.servicesHub`, `ROUTES.stockroom`), portals (`/doctor-portal/*`, `/patient-portal/*`, `/my/*`), dev/showcase (`ROUTES.showcase`, `ROUTES.styleguide`, etc.), and any others not already in a domain file
3. Move them into:
   ```tsx
   export function MiscRoutes() {
     return <>{/* moved Route blocks */}</>;
   }
   ```
4. Add required imports
5. In `App.tsx`: replace with `<MiscRoutes />`, add import
6. Run `pnpm check`

Do NOT change any route paths or components. Move only.
Report: Route count moved, App.tsx final line count, pnpm check result.
