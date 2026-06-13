Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each domain migration. Do NOT move multiple domains without checking in between.

---

## T001 — Create features/ directory structure

Task: Create the `client/src/features/` directory and all 8 domain subdirectories.

1. Create the following directories:
   - `client/src/features/kf/`
   - `client/src/features/attendance/`
   - `client/src/features/salary/`
   - `client/src/features/accounting/`
   - `client/src/features/stockroom/`
   - `client/src/features/admin/`
   - `client/src/features/doctor-portal/`
   - `client/src/features/patient-portal/`
2. Add a `.gitkeep` file to each (so they are tracked by git before files are moved in)
3. Run `pnpm check` — must pass (no files moved yet, no imports broken)

Report: directories created, pnpm check result.

---

## T002 — Audit App.tsx lazy imports

Task: Read `client/src/App.tsx` and produce a complete map of every lazy-imported page file and its current path.

1. Read `client/src/App.tsx` in full
2. For every `() => import("../pages/...")` or `() => import("./pages/...")` call, list:
   - The component name (from the `const ComponentName = lazy(...)` line)
   - The current import path
   - The target domain folder based on the Domain File Assignment in `specs/005-frontend-feature-folders/plan.md`

Output format (per component):
```
KfPatientList: ../pages/KfPatientList → features/kf/KfPatientList
AttendancePage: ../pages/AttendancePage → features/attendance/AttendancePage
...
```

This is the master checklist for T003–T012. Do NOT modify any file in this task.

---

## T005 — Move Attendance pages to features/attendance/

Task: Move all Attendance pages from `client/src/pages/` to `client/src/features/attendance/`. Update App.tsx import paths.

**Prerequisite**: T003 and T004 (KF domain) complete with `pnpm check` passing.

Attendance pages to move (from plan.md):
`AttendancePage`, `AttendanceLive`, `AttendanceMy`, `AttendanceEmployeePage`, `AttendanceEmployeesList`, `AttendanceReports`, `AttendanceSettings`, `AttendanceDevice`, `AttendanceSync`, `AttendanceShiftSchedule`

1. For each page file, run: `git mv client/src/pages/PageName.tsx client/src/features/attendance/PageName.tsx`
2. After all moves, update every `import("../pages/PageName")` in `client/src/App.tsx` → `import("../features/attendance/PageName")`
3. Run `pnpm check`

**CRITICAL**: Use `git mv` — NOT regular file copy. This preserves git history.
Report: files moved (count), App.tsx import paths updated (count), pnpm check result.

---

## T006 — Move Attendance-specific components to features/attendance/

Task: Move Attendance-specific components from `client/src/components/` to `client/src/features/attendance/`. Update all import sites.

**Prerequisite**: T005 complete.

1. Read `client/src/components/` — identify files with `Attendance` or `attendance` in the name
2. For each attendance-specific component (NOT shared across other domains):
   - `git mv client/src/components/AttendanceXxx.tsx client/src/features/attendance/AttendanceXxx.tsx`
   - Find and update all import sites (grep for the component name, update paths)
3. Run `pnpm check`

Report: components moved, import sites updated, pnpm check result.

---

## T007 — Move Salary pages to features/salary/

Task: Move all Salary pages from `client/src/pages/` to `client/src/features/salary/`. Update App.tsx imports.

Salary pages (from plan.md): `SalaryPage`, `SalaryPenalties`, `SalaryPools`, `SalaryPayroll`, `SalarySettings`, `SalaryShiftStaff`, `SalaryShiftPayroll`, `SalaryAbsentReport`, `SalaryCurrentData`

1. `git mv` each file to `client/src/features/salary/`
2. Update App.tsx import paths
3. Run `pnpm check`

Report: files moved, App.tsx updated, pnpm check result.

---

## T008 — Move Accounting pages to features/accounting/

Task: Move all Accounting pages from `client/src/pages/` to `client/src/features/accounting/`. Update App.tsx imports.

Accounting pages (from plan.md): `AccountingPage`, `AccountingPrototypes`, `AccountingDailyRevenue`, `AccountingServiceRevenue`, `AccountingReceipts`, `AccountingReceiptDetail`, `AccountingServices`, `AccountingPatientsInquiry`, `AccountingPatients`, `AccountingPatientAccount`, `AccountingDoctor`, `AccountingDoctorAccount`, `AccountingCashbook`, `AccountingLedger`, `AccountingAdvances`, `AccountingLoans`, `AccountingHomeFund`, `AccountingInstapay`, `AccountingDrSaadany`, `AccountingPrint`

1. `git mv` each file to `client/src/features/accounting/`
2. Update App.tsx import paths
3. Run `pnpm check`

Report: files moved, App.tsx updated, pnpm check result.

---

## T009 — Move Stockroom pages to features/stockroom/

Task: Move all Stockroom pages from `client/src/pages/` to `client/src/features/stockroom/`. Update App.tsx imports.

Stockroom pages (from plan.md): `StockroomPage`

1. `git mv client/src/pages/StockroomPage.tsx client/src/features/stockroom/StockroomPage.tsx`
2. Update App.tsx import path
3. Run `pnpm check`

Report: file moved, App.tsx updated, pnpm check result.

---

## T010 — Move Admin pages to features/admin/

Task: Move all Admin pages from `client/src/pages/` to `client/src/features/admin/`. Update App.tsx imports.

Admin pages (from plan.md): `AdminUsers`, `AdminMigrations`, `AdminApiTools`, `AdminStatus`, `AdminCardVisibility`, `AdminSettings`, `AdminPricingRules`, `AdminNotificationSettings`, `AdminPermissions`, `AdminPatients`, `AdminFormsHub`, `AdminSheets`, `AdminSheetDesigner`, `AdminSheetCopies`, `AdminDoctors`, `AdminPentacamFailed`, `AdminServices`, `AdminTests`, `AdminDataSourceAudit`

1. `git mv` each file to `client/src/features/admin/`
2. Update App.tsx import paths
3. Run `pnpm check`

Report: files moved, App.tsx updated, pnpm check result.

---

## T011 — Move Doctor portal pages to features/doctor-portal/

Task: Move all Doctor portal pages from `client/src/pages/` to `client/src/features/doctor-portal/`. Update App.tsx imports.

Doctor portal pages (from plan.md): `DoctorLogin`, `DoctorPatientView`, `DoctorDashboard`, `DoctorPortalShell`

1. `git mv` each file to `client/src/features/doctor-portal/`
2. Update App.tsx import paths
3. Run `pnpm check`

Report: files moved, App.tsx updated, pnpm check result.

---

## T012 — Move Patient portal pages to features/patient-portal/

Task: Move all Patient portal pages from `client/src/pages/` to `client/src/features/patient-portal/`. Update App.tsx imports.

Patient portal pages (from plan.md): `PatientLogin`, `PatientGuestBook`, `PatientFile`, `PatientRefraction`, `PatientPrescription`, `PatientScans`, `PatientBook`, `PatientBookings`, `PatientPortalHome`

1. `git mv` each file to `client/src/features/patient-portal/`
2. Update App.tsx import paths
3. Run `pnpm check`

Report: files moved, App.tsx updated, pnpm check result.

---

## T013 — Verify pages/ cleanup

Task: Confirm `client/src/pages/` contains only shared/cross-domain pages after all domain migrations complete.

1. List all remaining files in `client/src/pages/`
2. The count must be fewer than 20 files
3. Each remaining file should be a shared/cross-domain page (Dashboard, Home, Login, Profile, NotFound, medical pages, etc.)
4. Report any domain-specific pages that were missed

Report: file count in pages/, list of remaining files, confirmation that none are domain-specific.

---

## T015 — Remove .gitkeep files

Task: Remove any `.gitkeep` files from the features/ subdirectories now that they contain real files.

1. Find all `.gitkeep` files in `client/src/features/`
2. Delete each one
3. Run `pnpm check`

Report: files deleted, pnpm check result.
