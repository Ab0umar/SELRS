# Implementation Plan: Frontend Feature Folders

**Branch**: `20260613-frontend-feature-folders` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)
**Independent of 003/004**: Can be executed in parallel with other branches.

## Summary

Move domain-specific pages and components from flat `pages/` and `components/` into `features/<domain>/` folders. Update all import paths in `App.tsx`. One domain at a time, `pnpm check` after each move.

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 19
**Primary Dependencies**: None new
**Storage**: N/A
**Testing**: `pnpm check`, `pnpm build`, 62-test Playwright suite
**Target Platform**: Web browser
**Constraints**: Zero behavior changes; no component API changes; no route path changes

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| VI. Spec-Driven, Minimal-Diff | PASS | Pure file moves + import updates — no logic changes |
| VII. Do Not Break Medical | PASS | Medical pages stay in `pages/` for now — not touched |

---

## Project Structure

### Before
```text
client/src/
├── pages/         ← 95 files (all domains mixed)
└── components/    ← 40 files (all domains mixed)
```

### After
```text
client/src/
├── features/
│   ├── kf/                 ← KF pages + KF-specific components
│   ├── attendance/         ← Attendance pages + components
│   ├── salary/             ← Salary pages + components
│   ├── accounting/         ← Accounting pages + components
│   ├── stockroom/          ← Stockroom pages + components
│   ├── admin/              ← Admin pages + components
│   ├── doctor-portal/      ← Doctor portal pages
│   └── patient-portal/     ← Patient portal (/my/*) pages
├── pages/          ← ~15 shared pages (Dashboard, Home, Login, Profile, NotFound, etc.)
└── components/     ← ~15 shared components (ProtectedRoute, layout, shared UI)
```

---

## Domain File Assignment

### KF → `features/kf/`
Pages: KfPatientList, KfPatientDetail, KfNewPatientForm, KfEditPatient, KfOperations, KfFollowups, KfNewVisit, KfNewExamination, KfNewOperation, KfNewFollowup, KfAccounting, KfAccountingDailyRevenue, KfAccountingServiceRevenue, KfAccountingReceipts, KfAccountingLedger, ConsultantSheet, ConsultantFollowupPage

### Attendance → `features/attendance/`
Pages: AttendancePage, AttendanceLive, AttendanceMy, AttendanceEmployeePage, AttendanceEmployeesList, AttendanceReports, AttendanceSettings, AttendanceDevice, AttendanceSync, AttendanceShiftSchedule

### Salary → `features/salary/`
Pages: SalaryPage, SalaryPenalties, SalaryPools, SalaryPayroll, SalarySettings, SalaryShiftStaff, SalaryShiftPayroll, SalaryAbsentReport, SalaryCurrentData

### Accounting → `features/accounting/`
Pages: AccountingPage, AccountingPrototypes, AccountingDailyRevenue, AccountingServiceRevenue, AccountingReceipts, AccountingReceiptDetail, AccountingServices, AccountingPatientsInquiry, AccountingPatients, AccountingPatientAccount, AccountingDoctor, AccountingDoctorAccount, AccountingCashbook, AccountingLedger, AccountingAdvances, AccountingLoans, AccountingHomeFund, AccountingInstapay, AccountingDrSaadany, AccountingPrint

### Stockroom → `features/stockroom/`
Pages: StockroomPage

### Admin → `features/admin/`
Pages: AdminUsers, AdminMigrations, AdminApiTools, AdminStatus, AdminCardVisibility, AdminSettings, AdminPricingRules, AdminNotificationSettings, AdminPermissions, AdminPatients, AdminFormsHub, AdminSheets, AdminSheetDesigner, AdminSheetCopies, AdminDoctors, AdminPentacamFailed, AdminServices, AdminTests, AdminDataSourceAudit

### Doctor Portal → `features/doctor-portal/`
Pages: DoctorLogin, DoctorPatientView, DoctorDashboard, DoctorPortalShell

### Patient Portal → `features/patient-portal/`
Pages: PatientLogin, PatientGuestBook, PatientFile, PatientRefraction, PatientPrescription, PatientScans, PatientBook, PatientBookings, PatientPortalHome

---

## Implementation Order

Process one domain at a time:
1. KF (most active, benefits most)
2. Attendance
3. Salary
4. Accounting
5. Stockroom
6. Admin
7. Doctor portal
8. Patient portal

After each domain: `pnpm check` → must pass before moving to next domain.

Final: `pnpm build` + 62-test suite.
