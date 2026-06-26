# SRV100 AI Context Document

> Single "read this first" file for any AI model (Cursor, Codex, Claude, GPT, Gemini, GLM, Kimi).
> Version: 2.1.0 — aligned with Constitution v1.0.0, Principles v1.0.0. Updated 2026-06-14. Adds: app router split (JSX constants), doctor portal real-time WS notifications + auto-referral, Pentacam auto-linker, حجز filter in today queue.

---

# SRV100 Overview

## What the Project Is

SELRS (Saadany Eye Laser & Refractive Surgery) Medical Center Platform. A monolithic full-stack TypeScript web application (React + Express + tRPC) with 8 distinct modules:

1. **Medical** — patient registration, examination, operations scheduling, doctor workflows, Pentacam integration, OCR, FCM notifications
2. **Accounting** — financial reporting from legacy MSSQL accounting database, service-based revenue analysis, receipt inquiry, print-preview reports, MySQL cashbook
3. **KF (Clinical — كفرالشيخ)** — isolated MySQL-only clinical sub-module: patients, visits, examinations, operations, follow-ups, accounting ledger. Patient codes follow KF-0001 format.
4. **Attendance** — fingerprint-based staff attendance, live board, monthly reports, ZKTeco device sync, shift management
5. **Salary** — payroll module: salary basics, penalties, commission pools, payroll reports, shift-based staff schedules
6. **Stockroom** — inventory management: stock items per category, stock transactions (receive/dispense), low-stock reports
7. **Patient Portal** — patient self-service: login via phone OTP, view file/refractions/prescriptions/scans, book appointments
8. **Marketing** — social media post management, brand library, draft/post history (admin-only)

## Main Goals

- Replace legacy desktop OP (accounting) application with web-based reports matching row-by-row output
- Modernize the medical workflow (registration, exam, operations) into a responsive web app
- Strict separation between Medical and Accounting: no cross-module imports, no shared mutations
- Service-based accounting only: all revenue derived from `PAPAT_SRV` service rows, never from patient/doctor/visit counts

## Medical vs Accounting Philosophy

| Aspect          | Medical                                                  | Accounting                                                  |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| Database        | MySQL (`selrs26`)                                        | MSSQL (`op2026`)                                            |
| Data direction  | Read + Write                                             | Read-Only (Phase 1)                                         |
| Primary key     | `patients.id` (auto-increment)                           | `PAT_CD` (string, zero-padded)                              |
| Access pattern  | Full CRUD                                                | SELECT only, parameterized                                  |
| Bridge key      | `patients.patientCode` = MSSQL `PAT_CD` (read-time only) | Same                                                        |
| Permission gate | Role-based (doctor, nurse, tech, reception, admin)       | `accountingProcedure` (path-based `/accounting` permission) |
| UI language     | Arabic + English                                         | Arabic (Eastern Arabic-Indic digits for money)              |
| State           | Real-time WebSocket updates                              | Polling (60s auto-refresh)                                  |

---

# Core Architecture

## Frontend Stack

- **React 19** + **Vite** + **Wouter** (router)
- **Tailwind CSS 4** + **shadcn/ui** components (`client/src/components/ui/`)
- **tRPC client** with React Query: `trpc.<router>.<procedure>.useQuery()`
- Lazy-loaded routes via `React.lazy()` in `client/src/App.tsx`
- Arabic RTL layout (`dir="rtl"`)
- `ProtectedRoute` component wraps role-gated routes

## Backend Stack

- **Express** + **tRPC** (superjson transformer)
- **Drizzle ORM** for MySQL access (`server/db.ts`)
- **mssql** package for MSSQL access via `createMssqlPool()` from `server/integrations/mssqlPatients.ts`
- **Zod** for input/output validation on all tRPC procedures
- WebSocket server for real-time medical updates (`server/_core/ws.ts`)
  - Staff connections authenticated via session cookie
  - Doctor portal connections authenticated via `?doctorToken=<jwt>` query param (same `JWT_SECRET`)
  - `broadcastToDoctorPortal(doctorId, payload)` sends targeted messages to a specific doctor's connection

## Database Architecture

```
MySQL (selrs26)                    MSSQL (op2026)
├── patients                       ├── PAPATMF (patient master)
├── patient_service_entries        ├── MDTEAM (doctors)
├── users                          ├── SRVCMF (service catalog)
├── operations                     ├── PAJRNRCVH (receipt headers)
├── audit_logs                     ├── PAPAT_SRV (service lines)
├── branches                       ├── DEPT (departments)
└── ... (medical schema)           └── APPCODES, CMPMF (lookups)
```

**Connection:** MySQL via Drizzle in `server/db.ts`. MSSQL via `createMssqlPool()` in `server/integrations/mssqlPatients.ts`, wrapped by `mssqlQuery()` helper in `server/services/accounting/mssqlAccounting.ts`.

## Routing Architecture

- `client/src/App.tsx` — lazy routes with `ProtectedRoute` wrappers
- Medical routes: `/dashboard`, `/patients/*`, `/operations`, `/today`, etc.
- Accounting routes: `/accounting/*` — gated by path-based permission
- KF (clinical) routes: `/kf/*`, `/KFsheets/*` — gated by `makeKfProcedure` / `makeKfWriteProcedure` (admin + accountant bypass)
- Attendance routes: `/attendance/*` — gated by `makeAttProcedure` / `makeAttWriteProcedure` (admin + manager bypass)
- Salary routes: `/salary/*` — gated by `makeSalaryProcedure` / `makeSalaryWriteProcedure` (admin + manager bypass)
- Stockroom routes: `/stockroom`, `/stockroom/*` — gated by `makeStockroomProcedure` / `makeStockroomWriteProcedure` (admin bypass)
- Patient portal routes: `/my/*` — separate `patientPortalProcedure` (patient session, not staff session)
- Doctor portal routes: `/doctor-portal/*` — separate `doctorPortalProcedure` (external doctor session)
- Marketing routes: `/marketing/*` — `requiredRoles={["admin"]}` in ProtectedRoute
- Admin hub: `/admin-hub`, `/admin/*` — `requiredRoles={["admin"]}`
- **Route groups are JSX constants, NOT function calls.** Route files (`attendance-routes.tsx`, `salary-routes.tsx`, etc.) export `export const AttendanceRoutes = (<>...</>)`. In `App.tsx` use `{AttendanceRoutes}` not `{AttendanceRoutes()}`.
- Backend: `server/routers/index.ts` composes `appRouter = { patientPortal, accounting, attendance, kf, medical, patient, stockroom, salary, marketing, doctorPortal }`

## tRPC Structure

```
server/routers/
├── index.ts          → appRouter composition (ONLY allowed shared edit point)
├── medical.ts        → Medical CRUD (UNTOUCHABLE)
├── patient.ts        → Patient queries (UNTOUCHABLE)
├── accounting.ts     → Accounting reports + MySQL cashbook mutations
├── kf.ts             → KF clinical module (isolated MySQL-only)
├── attendance.ts     → Attendance + fingerprint module + shift management
├── salary.ts         → Salary + payroll module
├── stockroom.ts      → Stockroom inventory module
├── patientPortal.ts  → Patient portal (self-service, OTP-auth)
├── marketing.ts      → Marketing / social media posts (admin-only)
├── doctorPortal.ts   → External doctor portal (login, getMyPatients, getPatientImages)
└── medical-pentacam.ts → Pentacam procedures; exports autoLinkUnlinkedPentacamFiles()

server/_core/
├── procedures.ts     → Role-based procedure builders + per-page factory functions; includes doctorPortalProcedure
├── trpc.ts           → tRPC init
├── context.ts        → Auth context (staff session, patient session, doctor session)
├── index.ts          → Express server bootstrap; runs startPentacamAutoLinker() on startup
├── ws.ts             → WebSocket server; staff (cookie) + doctor portal (?doctorToken= JWT)
└── env.ts            → Environment config
```

**Procedure hierarchy:**

Base procedures (role-based, defined in `server/_core/procedures.ts`):

| Procedure | Auth required | Allowed roles |
|---|---|---|
| `publicProcedure` | None | Any |
| `protectedProcedure` | Staff session | Any authenticated user |
| `doctorProcedure` | Staff session | doctor, admin, manager |
| `nurseProcedure` | Staff session | nurse, admin, manager |
| `technicianProcedure` | Staff session | technician, admin, manager |
| `receptionProcedure` | Staff session | reception, admin, manager |
| `managerProcedure` | Staff session | manager, admin, accountant |
| `accountingProcedure` | Staff session | admin bypass OR `/accounting` path permission |
| `accountingWriteProcedure` | Staff session | admin bypass OR `/accounting:rw` path permission |
| `kfProcedure` | Staff session | admin + accountant bypass OR `/kf` path permission |
| `kfWriteProcedure` | Staff session | admin + accountant bypass OR `/kf:rw` permission |
| `attendanceViewerProcedure` | Staff session | admin + manager bypass OR `/attendance` permission |
| `attendanceManagerProcedure` | Staff session | admin + manager bypass OR `/attendance:rw` permission |
| `attendanceAdminProcedure` | Staff session | admin only |
| `adminProcedure` | Staff session | admin only |
| `medicalStaffProcedure` | Staff session | doctor, nurse, technician, reception, manager, admin |
| `patientPortalProcedure` | Patient session | authenticated patient (OTP) |
| `doctorPortalProcedure` | Doctor session | authenticated external doctor |

**Per-page factory functions** (used inside specific routers to gate per-page access):

Each module exposes a read factory and a write factory, each keyed to a `pagePath` string. The factory checks the user's stored permissions match that path (or a parent).

| Factory pair | Module | Bypass roles |
|---|---|---|
| `makeKfProcedure(pagePath)` / `makeKfWriteProcedure(pagePath)` | KF clinical | admin + accountant |
| `makeAccProcedure(pagePath)` / `makeAccWriteProcedure(pagePath)` | Accounting | admin only |
| `makeAttProcedure(pagePath)` / `makeAttWriteProcedure(pagePath)` | Attendance | admin + manager |
| `makeSalaryProcedure(pagePath)` / `makeSalaryWriteProcedure(pagePath)` | Salary | admin + manager |
| `makeStockroomProcedure(pagePath)` / `makeStockroomWriteProcedure(pagePath)` | Stockroom | admin only |

**Per-page permission semantics:**

Permissions are stored as path strings in the `user_permissions` table. The `permMatchesPath` helper follows this hierarchy:
- `bare path` (e.g. `/salary`) — full access (read + write). Backward-compatible: AdminUsers saves bare paths.
- `path:r` (e.g. `/salary:r`) — read-only access.
- `path:rw` (e.g. `/salary:rw`) — read + write access.
- A parent path covers children: `/salary:rw` grants access to `/salary/payroll`.
- No matching permission → FORBIDDEN.

Write check logic: `if (raw.endsWith(":r") && !raw.endsWith(":rw")) return false` — bare paths AND `:rw` both allow writes. `:r` alone is read-only.

**Permission source by tool:**
- **AdminUsers** (per-user page) saves bare paths → full access by design.
- **AdminPermissions** (team/role page) saves with `:r` or `:rw` suffix.

## React Structure

```
client/src/
├── App.tsx                    → Route definitions (lazy + ProtectedRoute)
├── pages/
│   ├── accounting/            → /accounting/* pages (AccountingHome, DailyRevenue,
│   │                             LasikRevenue, ReceiptsInquiry, ReceiptDetail,
│   │                             LasikServices, PatientAccount, DoctorAccount,
│   │                             AccountingCashbook, AccountingLedger, AccountingAdvances,
│   │                             AccountingLoans, AccountingHomeFund, AccountingInstapay,
│   │                             AccountingDrSaadany, PrintPreview, AccountingPatientsInquiry)
│   ├── kf/                    → /kf/* pages (KfShell, KfHome, KfPatients, KfPatientForm,
│   │                             KfPatientDetail, KfVisitForm, KfExaminationForm,
│   │                             KfOperationForm, KfFollowupForm, KfOperations,
│   │                             KfFollowups, KfConsultantSheet, KfConsultantFollowupSheet,
│   │                             KfAccounting, KfDailyRevenue, KfServiceRevenue,
│   │                             KfReceipts, KfLedger)
│   ├── attendance/            → /attendance/* pages (AttendanceLayout, AttendanceHome,
│   │                             LiveBoard, MyAttendanceProfile, EmployeeDetail,
│   │                             EmployeesHub, ReportsHub, SettingsHub,
│   │                             admin/DeviceSettings, admin/SyncStatus)
│   ├── salary/                → /salary/* pages (SalaryLayout, SalaryBasics, SalaryPenalties,
│   │                             CommissionPools, PayrollReport, SalarySettings,
│   │                             ShiftStaff, ShiftSchedule, ShiftPayroll, AbsentReport,
│   │                             CurrentSalaryData)
│   ├── marketing/             → /marketing/* pages (MarketingLayout, MarketingDashboard,
│   │                             PostHistory, DraftPosts, BrandLibrary, MarketingSettings)
│   ├── patient-portal/        → /my/* pages (PatientLogin, PatientGuestBook, PatientFile,
│   │                             PatientRefraction, PatientPrescription, PatientScans,
│   │                             PatientBook, PatientBookings)
│   ├── doctor-portal/         → /doctor-portal/* pages (DoctorLogin, DoctorDashboard,
│   │                             DoctorPatientImages)
│   ├── dev/                   → Dev-only pages (Styleguide, ComponentsGallery, Prototypes,
│   │                             Documentation)
│   ├── Dashboard.tsx           → Medical dashboard (admin only)
│   ├── Operations.tsx          → Operations scheduling
│   ├── Patients.tsx            → Patient list
│   ├── TodayPatients.tsx       → Today's patient queue
│   ├── PatientDetails.tsx      → Medical file (also at /medicalfile, /patient-file)
│   ├── StockroomShell.tsx      → Stockroom SPA shell
│   └── ...                    → Other medical pages (sheets, examination, followups, etc.)
├── components/
│   ├── ProtectedRoute.tsx      → Frontend auth gate (UNTOUCHABLE)
│   ├── PatientPortalRoute.tsx  → Patient session gate
│   ├── DoctorPortalRoute.tsx   → External doctor session gate
│   ├── layout/
│   │   ├── AppNav.tsx          → Sidebar nav groups (attendanceNavGroup, salaryNavGroup,
│   │   │                         accountingNavGroup, adminNavGroups, staffNavGroups)
│   │   ├── AppTopNav.tsx       → Top navigation bar (desktop tabs + "more" popover)
│   │   ├── AppBottomNav.tsx    → Mobile bottom nav (staff vs admin tab sets)
│   │   └── AppSidebar.tsx      → Sidebar shell (desktop)
│   ├── ui/                     → shadcn/ui primitives
│   └── ...
├── hooks/                      → Auth hooks, data hooks
└── lib/
    ├── trpc.ts                 → tRPC client setup
    ├── page-permissions.ts     → PAGE_PERMISSION_DEFINITIONS (all permission page IDs)
    ├── nav-permission-utils.ts → permissionsToAllowedRoots, pathGrantedByRoots
    └── utils.ts                → cn() helper
```

## Navigation Structure

### Desktop

- **AppTopNav** — horizontal header bar. Admin sees `adminQuickTabs` (8 fixed tabs: لوحة التحكم, مركز المريض, الحسابات, المرتبات, الحضور, كفرالشيخ, المخزن, مركز الإدارة). Non-admin sees permission-filtered tabs from `allNavTabs` (today, patients, operations, accounting, kf, stockroom) plus a "المزيد" popover for sections in `moreGroups`.
- **AppSidebar** — collapsible sidebar (desktop only). Admin sees `adminNavGroups`; staff sees `staffNavGroups`. The "مركز الإدارة" group is NOT in the sidebar (only reachable from top nav / admin hub).
- **"المزيد" popover** — shows `NavGroupSection` entries filtered by user permission. Single-item sections navigate directly on header click without expanding.

### Mobile

- **AppBottomNav** — fixed bottom nav. **Admin tabs**: لوحة التحكم, مركز المريض, الحسابات, المرتبات, الحضور, كفرالشيخ, الإدارة, المزيد. **Staff tabs** (permission-filtered): اليوم, مركز المريض, العمليات, الحسابات, كفرالشيخ, الروستر (doctors/technicians only), المزيد.
- **"المزيد" drawer** — opens `NavGroupSection` list filtered by permission. Same single-item direct-navigate behavior.

### Sidebar Clinics Group (5 sections)

The clinics area in `adminNavGroups` / `staffNavGroups` is split into five `NavGroupSection` entries (keys: `clinics-file`, `clinics-measurements`, `clinics-pentacam`, `clinics-prescriptions`, `clinics-tests`). Each section title navigates directly when it has only one item.

## Print/Report System

- `PrintPreview.tsx` renders structured payload (title, meta, columns, rows, groupBy, totals, footer)
- CSS: `@media print` removes app chrome, A4 portrait, black-on-white
- `window.print()` for browser-native printing (no PDF libs in Phase 1)
- Reports must structurally match legacy OP `.rtm` layout (header / body / totals / footer)
- Arabic column names allowed in print preview to match legacy output

---

# Database Separation Rules

## MySQL (selrs26) — Medical Only

- **Owner:** Medical module (read + write via Drizzle ORM in `server/db.ts`)
- **Accounting access:** Read-only reference of `patients.patientCode` for display only
- **Forbidden for accounting:** Any write, any schema change, any new table
- **Tables:** `patients`, `users`, `operations`, `audit_logs`, `branches`, `patient_service_entries`, `permissions`, etc.

## MSSQL (op2026) — Accounting Source of Truth

- **Owner:** Accounting module (read-only via `mssqlQuery()` in `server/services/accounting/mssqlAccounting.ts`)
- **Access pattern:** Parameterized SELECT queries only
- **Forbidden:** INSERT, UPDATE, DELETE, EXEC, MERGE, any DDL, any new indexes/tables
- **Tables read:** `PAPATMF`, `MDTEAM`, `SRVCMF`, `PAJRNRCVH`, `PAPAT_SRV`, `DEPT`, `APPCODES`, `CMPMF`
- **Connection:** `createMssqlPool()` from `server/integrations/mssqlPatients.ts` (UNTOUCHABLE)

## Allowed Bridge

- `patients.patientCode` (MySQL) maps to `PAT_CD` (MSSQL)
- Used at read-time only for descriptive display (patient name enrichment)
- 1358 matched codes, 2 MSSQL-only codes (`0013`, `0699`) handled with "No medical record linked" placeholder
- **Never** used as a mutation path or shared key for writes

## Forbidden Operations

- Accounting code importing from medical modules (or vice versa)
- Shared mutation paths between modules
- Accounting writing to MySQL
- Medical writing to MSSQL accounting tables
- New MSSQL tables or schema changes
- Cross-module type imports (shared types go through `shared/` only)

## Why Separation Exists

1. Legacy accounting data has its own schema, encoding, and semantics that must not be altered
2. Medical workflows are critical patient-care operations that must never be disrupted by accounting changes
3. The MSSQL database (`op2026`) is a production mirror of a legacy desktop application; any write could corrupt financial records
4. Different access patterns: Medical is real-time CRUD; Accounting is batch reporting
5. Different permission models: Medical roles vs. path-based accounting permissions

---

# MySQL Workflow

## Main Tables

| Table                              | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `users`                            | Staff accounts, roles, branch, shift                             |
| `user_permissions`                 | Path-based per-user permission assignments                       |
| `patients`                         | Patient records, demographics, `patientCode`, `id`               |
| `patient_import_staging`           | Staging rows for bulk patient import                             |
| `patient_service_entries`          | Service entries synced from MSSQL                                |
| `visits`                           | Patient visit records                                            |
| `examinations`                     | Examination data (refraction, diagnosis, etc.)                   |
| `autorefractometryData`            | Autoref/keratometry measurements                                 |
| `afterRefractionData`              | Post-refraction measurements                                     |
| `glassesRecords`                   | Glasses prescription records                                     |
| `pentacamResults`                  | Pentacam corneal scan results                                    |
| `doctorReports`                    | Medical reports authored by doctors                              |
| `prescriptions` / `prescriptionItems` | Drug prescriptions + line items                               |
| `diseases`                         | Disease catalog                                                  |
| `medications` / `tests`            | Medication and test catalogs                                     |
| `testRequests` / `testRequestItems`| Lab/radiology test requests                                      |
| `surgeries` / `postOpFollowups`    | Surgery records + post-op follow-ups                             |
| `operationLists` / `operationListItems` / `operationBookings` | Operation scheduling tables |
| `appointments`                     | Appointment calendar                                             |
| `followupSheets` / `followupItems` | Follow-up sheet entries                                          |
| `visitScheduleRequests`            | Visit scheduling requests                                        |
| `services`                         | Medical service catalog                                          |
| `sheet_entries`                    | Medical sheet data (generic key-value store)                     |
| `consentForms`                     | Patient consent form data                                        |
| `medicalHistoryChecklist` / `examinationChecklistItems` | Checklist templates |
| `auditLog`                         | Action audit trail                                               |
| `userPageStates`                   | Per-user page state JSON (exam page state, etc.)                 |
| `patientPageStates`                | Per-patient page state JSON                                      |
| `pushDeviceRegistrations`          | FCM device tokens for push notifications                         |
| `systemSettings`                   | Key-value system settings store                                  |
| `doctors` (doctorsLookup)          | Local doctor directory                                           |
| `external_doctors`                 | External doctor portal registry                                  |
| `external_doctor_referrals`        | Referral records from external doctors                           |
| `external_doctor_access_logs`      | External doctor portal access log                                |
| `accLedger`                        | Cashbook ledger (income/expense/balance)                         |
| `accAdvances`                      | Employee advances tracking                                       |
| `accLoans`                         | Loan records                                                     |
| `accHome`                          | Home fund records                                                |
| `accInstapay`                      | Instapay transaction records                                     |
| `accEmployees`                     | Accounting employee references                                   |
| `accCategories`                    | Cashbook categories                                              |
| `accSaadany`                       | Dr. Saadany special account entries                              |
| `stock_items`                      | Inventory item catalog                                           |
| `stock_transactions`               | Stock movement (add/dispense)                                    |
| `attendance_shifts`                | Shift definitions (start/end times, grace periods)               |
| `employee_attendance_mapping`      | Maps users to fingerprint machine user IDs                       |
| `attendance_logs`                  | Raw fingerprint logs                                             |
| `attendanceEmployees`              | Employee attendance profiles                                     |
| `attendancePunches`                | Processed punch records                                          |
| `attendanceDaily`                  | Daily materialized attendance summary                            |
| `attendanceMonthlyReport`          | Monthly attendance roll-up per employee                          |
| `attendanceShiftAssignments`       | Per-employee shift assignments                                   |
| `attendanceShiftCycles` / `attendanceShiftCycleSlots` / `attendanceShiftCycleAssignments` | Rotating shift cycles |
| `attendanceLeaves`                 | Leave requests                                                   |
| `attendanceHolidays`               | Public holiday calendar                                          |
| `attendanceLeaveBalances`          | Accrued leave balance per employee                               |
| `attendancePermissions`            | Permission/early-exit records                                    |
| `attendanceSyncRuns`               | Fingerprint device sync run log                                  |
| `attendanceDeviceSettings`         | ZKTeco device connection settings                                |
| `attendanceShiftChangeRequests`    | Shift swap/change requests                                       |
| `salaryBasics`                     | Basic salary components per employee                             |
| `salaryPenalties`                  | Penalty records                                                  |
| `salaryCommissionPools`            | Commission pool configurations                                   |
| `salaryPayroll`                    | Computed payroll entries                                         |
| `salaryAdvances`                   | Salary advance records                                           |
| `salaryHolidays`                   | Salary-module holiday calendar                                   |
| `salaryRaiseHistory`               | Raise history per employee                                       |
| `salaryConfig`                     | Module-level salary configuration                                |
| `shiftStaff`                       | Shift staff assignment (for surgical/daily shift schedules)      |
| `shiftAttendance`                  | Shift-level attendance tracking                                  |
| `shiftStaffCycle`                  | Cyclic shift assignments                                         |
| `patient_portal_otps`              | OTP codes for patient portal login                               |
| `patient_portal_sessions`          | Authenticated patient portal sessions                            |
| `booking_schedule_config`          | Appointment booking schedule configuration                       |
| `booking_closures`                 | Booking closure (holiday/blocked) dates                          |
| `patient_portal_bookings`          | Bookings made through patient portal                             |
| `marketing_posts`                  | Social media post records                                        |
| `marketing_settings`               | Marketing module settings                                        |
| `marketing_logs`                   | AI/post generation logs                                          |
| `marketing_reference_designs`      | Reference design assets                                          |
| `marketing_brand_profile`          | Brand identity profile                                           |
| `kf_patients`                      | KF clinical patients (kfCode: KF-0001 format)                    |
| `kf_visits`                        | KF patient visits                                                |
| `kf_examinations`                  | KF examination records                                           |
| `kf_operations`                    | KF operation/surgery records                                     |
| `kf_followups`                     | KF post-op follow-up records                                     |
| `kf_ledger`                        | KF accounting ledger (income/expense entries)                    |

## What Is Allowed

- Full CRUD via Drizzle ORM in medical router/services
- `patientCode` read from `patients` table for display in accounting UI
- Cashbook operations (`accLedger`, `accCategories`) are a MySQL-side sub-module for daily cash tracking

## What Is Forbidden

- Accounting services importing from `server/db.ts` for their own query logic
- Any schema change to existing tables without constitutional amendment
- Removing encoding/decoding helpers for legacy text data
- Dropping or renaming columns

## Typical Flow

1. Patient registers → `patients` table insert via `patientRouter`
2. MSSQL sync runs → pulls `PAT_CD` data, matches to `patientCode`
3. Doctor examines → `medicalRouter` creates/updates examination records
4. Operations scheduled → `operations` table via `medicalRouter`
5. Audit log entries created automatically for mutations

## Important Routes/Services/Components

- `server/routers/medical.ts` — core medical CRUD (UNTOUCHABLE)
- `server/routers/patient.ts` — patient queries (UNTOUCHABLE)
- `server/db.ts` — Drizzle MySQL access (UNTOUCHABLE)
- `client/src/components/ProtectedRoute.tsx` — auth gate (UNTOUCHABLE)
- `client/src/pages/Dashboard.tsx` — medical dashboard
- `client/src/pages/Operations.tsx` — operations scheduling
- `client/src/pages/Patients.tsx` — patient management

---

# MSSQL Workflow

## Main Accounting Tables

| Table       | Purpose            | Key Columns                                                                               |
| ----------- | ------------------ | ----------------------------------------------------------------------------------------- |
| `PAPATMF`   | Patient master     | `PAT_CD`, `NAM`                                                                           |
| `MDTEAM`    | Doctor directory   | `CODE`, `PHNM_AR`                                                                         |
| `SRVCMF`    | Service catalog    | `SRV_CD`, `SRV_NM_AR`                                                                     |
| `PAJRNRCVH` | Receipt headers    | `SEC_CD`, `TR_TY`, `TR_NO`, `TR_DT`, `PAT_CD`, `TOTL`, `DISC`, `PA_VL`, `CNCL`            |
| `PAPAT_SRV` | Service line items | `SEC_CD`, `TR_TY`, `TR_NO`, `SRV_CD`, `PRC`, `QTY`, `PA_VL`, `DISC_VL`, `SRV_BY1`, `CNCL` |

## Revenue Logic

- **All revenue** is service-based: derived from `PAPAT_SRV.QTY * PAPAT_SRV.PRC` joined with `PAJRNRCVH` headers
- Gross = `QTY * PRC` (line level)
- Discount = `DISC_VL` (line level) or `DISC` (header level)
- Paid = `PA_VL` (patient-paid value)
- Net = Gross - Discount
- Revenue is NEVER computed from patient counts, visit counts, or doctor counts

## Join Logic

```sql
-- Standard receipt + service join
FROM PAJRNRCVH h
JOIN PAPAT_SRV d ON h.SEC_CD = d.SEC_CD
                AND h.TR_TY = d.TR_TY
                AND h.TR_NO = d.TR_NO

-- Doctor join (priority: SRV_BY1 from service row, fallback DRS_CD from header)
LEFT JOIN MDTEAM dr ON d.SRV_BY1 = dr.CODE

-- Service catalog join
LEFT JOIN SRVCMF s ON d.SRV_CD = s.SRV_CD

-- Patient master join
LEFT JOIN PAPATMF p ON h.PAT_CD = p.PAT_CD
```

## SEC_CD Logic

- `SEC_CD = 15` = Lasik section (Phase 1 default)
- All Lasik endpoints default to `sectionCode: 15`
- Generic endpoints (`dailyRevenue`, `serviceRevenue`, `receiptsInquiry`) accept optional `sectionCode` override
- Group-by-section is supported in service revenue reports

## CNCL Logic

- Cancelled transactions have `CNCL` flag set (non-null value)
- All standard reports filter `CNCL IS NULL` on both `PAJRNRCVH` and `PAPAT_SRV` where applicable
- This matches legacy OP behavior: cancelled receipts excluded from all revenue/receipt reports
- CNCL filter is applied in `sqlBuilders.ts` WHERE clauses

## Reporting Logic

- **Daily Revenue:** Group by `TR_DT` date, sum per-day totals
- **Service Revenue:** Group by section → service (with optional doctor detail), accumulate row counts, gross, paid, discount
- **Receipts Inquiry:** Flat list of `PAJRNRCVH` headers with configurable filters
- **Patient Summary:** All receipts + services for a single `PAT_CD`, with totals
- **Doctor Summary:** Service revenue pinned to one doctor code
- All grouping and totalling done in `mappers.ts` (post-query aggregation)

## Read-Only Rules

- `mssqlQuery()` in `server/services/accounting/mssqlAccounting.ts` is SELECT-only
- `sqlBuilders.ts` produces parameterized queries — no string concatenation of user input
- `grep -iE "INSERT|UPDATE|DELETE|EXEC|MERGE"` on `server/services/accounting/` must return zero results
- No stored procedure calls, no dynamic SQL assembly

---

# Accounting Module

## Endpoints (tRPC Procedures)

All under `accountingRouter`, gated by `accountingProcedure`:

| Procedure             | Input                                                                                   | Output                         | Purpose                               |
| --------------------- | --------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------- |
| `dashboardSummary`    | `{ sectionCode?, date? }`                                                               | 4 KPI numbers                  | Today/month revenue + receipt counts  |
| `transactions`        | `{ sectionCode?, limit?, date? }`                                                       | `ReceiptHeader[]`              | Today's receipt activity feed         |
| `dailyRevenue`        | `{ fromDate, toDate, sectionCode?, doctorCode? }`                                       | Daily rows + totals            | Per-day revenue breakdown             |
| `serviceRevenue`      | `{ fromDate, toDate, sectionCode?, doctorCode?, serviceCode? }`                         | Grouped sections + services    | Service-based revenue report          |
| `receiptsInquiry`     | `{ fromDate?, toDate?, patientCode?, doctorCode?, sectionCode?, trNo?, trTy?, limit? }` | `ReceiptHeader[]`              | Receipt search                        |
| `receiptDetail`       | `{ sectionCode, trTy, trNo }`                                                           | `{ header, lines[] }`          | Single receipt + line items           |
| `lasikReceipts`       | Lasik-pinned alias (SEC_CD=15)                                                          | `ReceiptHeader[]`              | Lasik receipt list                    |
| `lasikServices`       | `{ fromDate?, toDate?, patientCode?, serviceCode?, doctorCode?, limit? }`               | `ServiceRow[]`                 | Lasik service lines                   |
| `lasikRevenueSummary` | `{ fromDate?, toDate?, doctorCode? }`                                                   | Revenue totals                 | Lasik revenue summary                 |
| `patientLasikSummary` | `{ patientCode }`                                                                       | Patient financial summary      | Patient account view                  |
| `patientLookup`       | `{ patientCode }`                                                                       | `{ patientCode, patientName }` | Patient name lookup                   |
| `doctorLookup`        | `{ doctorCode }`                                                                        | `{ doctorCode, doctorName }`   | Doctor name lookup                    |
| `serviceLookup`       | `{ serviceCode, sectionCode? }`                                                         | `{ serviceCode, serviceName }` | Service name lookup                   |
| `accLedgerSummary`    | `{ dateFrom?, dateTo? }`                                                                | Income/expense/balance totals  | Cashbook summary (MySQL)              |
| `accLedger`           | `{ dateFrom?, dateTo?, type?, page?, pageSize? }`                                       | Paginated ledger rows          | Cashbook entries (MySQL)              |
| `accCategories`       | —                                                                                       | Category list                  | Cashbook categories (MySQL)           |
| `addAccEntry`         | Entry fields                                                                            | Mutation result                | Add cashbook entry (MySQL, mutation)  |
| `addPatientServices`  | Patient + services                                                                      | Mutation result                | Add service entries (mutation)        |
| `deleteReceipt`       | Receipt key                                                                             | Mutation result                | Delete receipt (mutation, admin only) |
| `updateReceipt`       | Receipt update fields                                                                   | Mutation result                | Update receipt (mutation)             |
| `serviceEntryCatalog` | —                                                                                       | Services + doctors catalog     | Service entry form data               |
| `patientNameLookup`   | `{ patientCode }`                                                                       | Patient name                   | Quick name lookup                     |
| `triggerAccSync`      | —                                                                                       | Sync result                    | Trigger Access DB sync (admin only)   |

## Services

```
server/services/accounting/
├── mssqlAccounting.ts              → Pool wrapper + mssqlQuery<T>()
├── sqlBuilders.ts                  → Parameterized SQL builders per endpoint
├── mappers.ts                      → Raw row → DTO mapping (UPPERCASE → camelCase)
├── dashboardSummary.service.ts     → Dashboard KPI query
├── home.service.ts                 → Dashboard summary + today's transactions
├── dailyRevenue.service.ts         → Daily revenue query + mapping
├── lasikRevenue.service.ts         → Service revenue + revenue summary
├── lasikReceipts.service.ts        → Lasik receipt list
├── lasikServices.service.ts        → Lasik service lines
├── lasikPatientAccounting.service.ts → Patient financial summary
└── receiptsInquiry.service.ts      → Receipt search + detail
```

## Reports

| Report                           | Legacy Source                          | Page Component        |
| -------------------------------- | -------------------------------------- | --------------------- |
| Daily Revenue                    | `DAY_IN SQLSRV.txt`, `تقرير الرمد.rtm` | `DailyRevenue.tsx`    |
| Service Revenue (Doctor→Service) | `اطباء.rtm`, `TRF_DRSRV1.RTM`          | `LasikRevenue.tsx`    |
| Receipts Inquiry                 | `تقرير الرمد.rtm`                      | `ReceiptsInquiry.tsx` |
| Patient Account                  | `PAPATMF.rtm`                          | `PatientAccount.tsx`  |
| Doctor Account                   | `اطباء.rtm`                            | `DoctorAccount.tsx`   |

## Print Workflow

1. Report page builds a `PrintPayload` object (title, meta, columns, rows, groupBy, totals, footer)
2. "Print" button navigates to `/accounting/print` with payload in `location.state`
3. `PrintPreview.tsx` renders A4-portrait layout with `@media print` CSS
4. `window.print()` triggers browser print dialog
5. Output must structurally match legacy OP `.rtm` reports

## Route Structure

```
/accounting                              → AccountingHome (dashboard + activity + quick links)
/accounting/daily-revenue                → DailyRevenue
/accounting/service-revenue              → LasikRevenue
/accounting/receipts                     → ReceiptsInquiry
/accounting/receipts/:secCd/:trTy/:trNo  → ReceiptDetail
/accounting/services                     → LasikServices
/accounting/patients                     → AccountingPatientsInquiry
/accounting/patient                      → PatientAccount
/accounting/doctor                       → DoctorAccount
/accounting/cashbook                     → AccountingCashbook
/accounting/ledger                       → AccountingLedger
/accounting/advances                     → AccountingAdvances
/accounting/loans                        → AccountingLoans
/accounting/home-fund                    → AccountingHomeFund
/accounting/instapay                     → AccountingInstapay
/accounting/dr-saadany                   → AccountingDrSaadany
/accounting/print                        → PrintPreview
```

## UI Structure

- `AccountingShell.tsx` wraps all accounting pages with a top bar and sub-navigation
- All pages use `dir="rtl"` for Arabic layout
- Money displayed using Eastern Arabic-Indic digits via `formatMoneyAr()` from `accountingFormat.ts`
- Counts displayed using `formatCountAr()`
- Status colors: emerald for paid-in-full, amber for partial payment
- All tables use `AccountingOpReport.module.css` for consistent report styling
- Filter pages URL-sync query parameters for shareable links
- Loading states: spinner + Arabic loading text
- Error states: inline error with retry button
- Empty states: icon + Arabic message + subtitle

## Performance Requirements

- NFR-1: Each report query returns within 2s for a 30-day window on `op2026` (~1.8k receipts, ~1.8k service rows)
- Auto-refresh: activity feed polls every 60s, dashboard refreshes on window focus
- Query timing logged at debug level (`ACCOUNTING_SQL_DEBUG=1`)
- No full-row payload logging (PII protection)

## Parity Requirements

- Every report MUST match legacy OP output for the same filter set
- Tolerance: ±0.01 currency unit for totals
- Receipt counts must match exactly
- Reference test month: **2026-04** on `op2026`
- Parity artifacts stored under `specs/parity/`
- Parity script: `scripts/accounting/parity-check.ts`

---

# Medical Module

## Patient Workflow

1. **Registration** → `patientRouter` creates patient in MySQL (`patients` table)
2. **MSSQL Sync** → background job syncs patient data from MSSQL `PAPATMF` to MySQL
3. **Examination** → doctor opens patient, examines, records findings in `medicalRouter`
4. **Operations** → scheduled via `medicalRouter`, tracked in `operations` table
5. **Follow-up** → post-op tracking, Pentacam integration, notifications

## Examination Workflow

- Doctor selects patient → opens medical file panel
- Records examination data (diagnosis, notes, measurements)
- Can trigger Pentacam device integration for corneal measurements
- State persisted in JSON fields (exam page state)

## Registration Flow

- Patient enters clinic → reception creates record in `patients` table
- `patientCode` assigned (maps to MSSQL `PAT_CD`)
- If patient exists in MSSQL but not MySQL, sync pulls data

## Operations Flow

- Doctor schedules operation → `operations` table via `medicalRouter`
- Operation type selected from pricing config (`operationsPricing.ts`)
- Day view with doctor pills (filter by doctor)
- Inline toolbar for quick actions (edit, delete, change status)

## Notifications Flow

- FCM (Firebase Cloud Messaging) for push notifications to mobile
- WebSocket for real-time in-app updates (staff) and doctor portal browser notifications
- Notification triggers: patient arrival, operation status change, new patient for doctor
- Doctor portal real-time: on new patient registration with matching `doctorCode`, `autoLinkAndNotifyDoctors()` fires → `INSERT IGNORE INTO external_doctor_referrals` + WS `{ type: "new-patient" }` → `DoctorDashboard` shows browser `Notification`

## Pentacam Auto-Linker

- `startPentacamAutoLinker()` runs in `server/_core/index.ts` on server startup, then every 5 minutes
- Calls `autoLinkUnlinkedPentacamFiles()` from `server/routers/medical-pentacam.ts`
- Queries `srv100_uploads` where `patient_id IS NULL`, matches by patient code in file name
- Guarded by `busy` flag; logs only when `imported > 0`
- **Do not add manual triggers or UI buttons** for Pentacam linking — the scheduler handles it

## Doctor Portal

- External doctors access at `/doctor-portal/*` with JWT auth (`doctorPortalProcedure`)
- JWT signed with same `JWT_SECRET`; `type: "externalDoctor"` claim distinguishes from staff tokens
- `getMyPatients`: returns patients linked via `external_doctor_referrals` OR auto-matched by `doctorCode`, **only those with at least one `srv100_uploads` record**
- Auto-referral: on any new patient registration, `autoLinkAndNotifyDoctors()` checks for active external doctors with matching `doctorCode` and inserts referrals idempotently
- Real-time: doctor WS connection uses `?doctorToken=<jwt>`; receives `new-patient` events instantly

## What Must NEVER Break

- Patient registration and lookup
- Doctor examination flow
- Operation scheduling and status management
- MSSQL patient sync (`createMssqlPool`, sync scripts)
- Audit logging on all mutations
- Permission enforcement (ProtectedRoute + role-based procedures)
- Encoding/decoding of legacy Arabic text data

---

# Critical Rules

(From Constitution v1.0.0 — all NON-NEGOTIABLE)

## Principle I: Strict Module Separation

- Medical and Accounting code, types, queries MUST NOT cross-import
- Only bridge: `patientCode` = `PAT_CD` at read-time
- No shared mutation paths

## Principle II: Service-Based Accounting Only

- Revenue derived from `PAPAT_SRV`/`PAJRNRCVH` service rows only
- NEVER from patient count, doctor count, visit count, or medical-side computation

## Principle III: Read-Only Accounting APIs

- All accounting tRPC procedures MUST be queries (no mutations)
- Exception: MySQL-side cashbook operations and service entry additions (post-Phase 1 extensions)
- Any new mutation requires constitutional amendment

## Principle IV: Use Existing Databases As-Is

- No schema redesigns, no destructive migrations, no renamed columns
- No replacement of encoding/decoding helpers
- New tables allowed only when no existing table serves the need AND no legacy semantics are altered

## Principle V: Legacy Output Parity

- Every accounting report validated against legacy OP output
- Row-level or total-level comparison on representative date range required
- Parity artifact must exist before task is accepted

## Principle VI: Spec-Driven, Minimal-Diff Execution

- No implementation before `/specify`, `/plan`, `/tasks` exist
- Each task carries: Owner Model, Backup Model, Tool, Role, Input, Output, Prompt, Acceptance Criteria
- Smallest correct diff wins — out-of-scope refactors are FORBIDDEN

## Principle VII: Do Not Break Medical

- Any change preserves Medical module: routes, permissions, patient/doctor flows, MSSQL sync, audit logging
- Tasks touching shared infrastructure MUST run `pnpm check` minimum

## Doctor/Service Matching (Critical Pattern)

- Both `doctorCode` and `serviceCode` must come from the **same `PAPAT_SRV` row**
- Priority: `SRV_BY1` (from service row) first, `DRS_CD` fallback only
- NEVER pick `doctorCode` from `PAJRNRCVH.DRS_CD` independently

## Stale Exam State

- For non-manually-locked patients, exclude `latestExamDoctorByPatient`, `latestExamServiceCodeByPatient` from resolution chains
- Use ONLY synced DB fields + official entries table
- Exam page state JSON persists and overrides fresh MSSQL sync data

---

# Protected Files

These files should almost NEVER be modified:

| File                                           | Reason                                          |
| ---------------------------------------------- | ----------------------------------------------- |
| `server/routers/medical.ts`                    | Core medical business logic (UNTOUCHABLE)       |
| `server/routers/patient.ts`                    | Patient CRUD API (UNTOUCHABLE)                  |
| `server/db.ts`                                 | Database + legacy text handling (UNTOUCHABLE)   |
| `server/integrations/mssqlPatients.ts`         | MSSQL pool + sync logic                         |
| `client/src/components/ProtectedRoute.tsx`     | Frontend auth gate for all staff pages          |
| `client/src/components/PatientPortalRoute.tsx` | Patient session gate                            |
| `client/src/components/DoctorPortalRoute.tsx`  | External doctor session gate                    |
| `server/_core/procedures.ts`                   | Role-based procedure definitions + factories    |
| `server/_core/context.ts`                      | Auth context (staff + patient + doctor)         |
| `server/_core/trpc.ts`                         | tRPC initialization                             |
| `server/_core/env.ts`                          | Environment configuration                       |
| `ecosystem.config.js`                          | PM2 process config                              |
| `shared/types.ts`                              | Shared types (re-exports drizzle schema types)  |
| `shared/const.ts`                              | Shared constants                                |
| `drizzle/schema.ts`                            | MySQL schema definition                         |
| `client/src/lib/page-permissions.ts`           | All permission page IDs (source of truth)       |

---

# Allowed Shared Edit Points

Only these shared files may be edited when adding new module features:

1. **`server/routers/index.ts`** — to register new routers (2-line edit max)
2. **`client/src/App.tsx`** — to add lazy routes with ProtectedRoute wrappers
3. **`shared/accounting/contracts.ts`** — accounting-specific zod schemas and types
4. **`shared/kf/contracts.ts`** — KF-specific zod schemas and types
5. **`client/src/lib/page-permissions.ts`** — to register new permission page IDs
6. **`server/_core/procedures.ts`** — only if a new procedure type is genuinely needed (requires review)
7. **`client/src/components/layout/AppNav.tsx`** — to add new nav group entries

---

# Performance Rules

- NFR-1: Report queries ≤2s for 30-day window on `op2026`
- Query timing at debug level only (never log full rows or PII)
- Frontend: React Query caching, `refetchOnWindowFocus` for dashboard, 60s polling for activity feed
- No new heavy dependencies (reuse `mssql`, `zod`, tRPC, React Query)
- Larger date windows paginate via `limit`/`offset` or date chunking
- Index creation on MSSQL is out of scope — only semantics-preserving query rewrites

---

# Print & Report Rules

- Reports use `AccountingOpReport.module.css` for consistent table styling
- Print layout: `@media print` removes nav, chrome, colored banners
- A4 portrait, black-on-white, readable borders
- Arabic column names allowed in print to match legacy OP
- `window.print()` only (no PDF libs)
- Structure: header / body / totals / footer matching OP `.rtm` layout
- Formatting: `formatMoneyAr()` for money, `formatCountAr()` for counts, `toArabicDigits()` for all Arabic digit display
- Date format: `formatDateAr()` produces YYYY-MM-DD with Arabic digits
- Truncation warnings when results hit `limit` cap (e.g., ≥500 rows)

---

# Development Workflow

## Spec-Driven Pipeline

```
Constitution → Principles → /specify → /clarify → /plan → /tasks → Execute → Review
```

1. **Constitution** — established once; amendments require justification + user approval
2. **Project Principles** — operating model (how to produce Constitution-consistent work)
3. **`/specify`** — feature spec: problem, scope, in/out, success criteria
4. **`/clarify`** — targeted questions if scope is ambiguous
5. **`/plan`** — architecture, data flow, contracts, Constitution Check
6. **`/tasks`** — dependency-ordered, model-routed task list
7. **Execution** — implement per task (Cursor/Codex/etc.)
8. **Review** — Claude reviews each task against acceptance criteria

## Validation Discipline

- Per task: `pnpm check` → `pnpm test` → `pnpm smoke` → `pnpm build` (smallest relevant first)
- Auth/routing/permissions/shared types touched: `pnpm check` mandatory
- Shipped behavior changed: `pnpm build` mandatory
- Reports: legacy-output parity check mandatory

## Task Reporting Format

Every completed task reports:

- Changed files
- What changed
- Checks run
- Checks skipped (with reason)

---

# Model Routing

| Task Type                                   | Best Model              | Backup     | Notes                        |
| ------------------------------------------- | ----------------------- | ---------- | ---------------------------- |
| Specs, plan, tasks, review                  | Claude                  | —          | Leader/planner/reviewer only |
| Multi-file edits inside repo                | Cursor                  | Codex      | Default execution surface    |
| Implementation / refactor / bugfix          | Codex                   | Cursor     | Backend + frontend wiring    |
| SQL design, report logic, complex reasoning | GPT-5                   | Claude     | Query parity, aggregation    |
| Bulk extraction, legacy summaries           | GPT-5 mini / GLM / Kimi | OpenRouter | Cheap long-form work         |
| UI layout / visual variants                 | Gemini                  | Cursor     | Design alternatives          |
| Local lightweight edits                     | Ollama / Continue       | Cursor     | Offline mode                 |

**Key rules:**

- Never use Claude for heavy implementation
- Never use cheap models for legacy parity checks without Claude review
- Every task prompt ends with: "Follow the project Constitution and Project Principles strictly."

---

# Common Mistakes To Avoid

1. **Cross-importing between Medical and Accounting modules** — violates Principle I
2. **Deriving revenue from patient/doctor/visit counts** — violates Principle II
3. **Adding INSERT/UPDATE/DELETE to accounting SQL** — violates Principle III
4. **Creating new MSSQL tables or renaming columns** — violates Principle IV
5. **Shipping reports without legacy parity artifacts** — violates Principle V
6. **Implementing before spec/plan/tasks exist** — violates Principle VI
7. **Breaking Medical module behavior** — violates Principle VII
8. **Using `DRS_CD` from `PAJRNRCVH` instead of `SRV_BY1` from `PAPAT_SRV`** — creates doctor/service mismatches
9. **Coercing `PAT_CD` to number** — must stay string (zero-padded codes like "0013")
10. **Removing encoding/decoding helpers** — breaks legacy Arabic text display
11. **Widening access by renaming routes** — must preserve permission enforcement
12. **Using raw `fetch()` instead of tRPC hooks** — all data through `trpc.*.useQuery()`
13. **Skipping `pnpm check` after shared file edits** — mandatory for auth/routing/types
14. **Logging full row payloads** — PII risk; only log timing at debug level
15. **Crashing on MSSQL-only patient codes (0013, 0699)** — must show graceful placeholder
16. **Using raw path strings in ProtectedRoute or App.tsx** — all permission paths use `ROUTES.*`
17. **Reverting route files to function calls** — `export const AttendanceRoutes = (<>...</>)` not `export function AttendanceRoutes() { return (<>...</>) }`; function calls bypass React component semantics
18. **Calling `{AttendanceRoutes()}`** in App.tsx — use `{AttendanceRoutes}` (JSX constant reference)
19. **Adding Pentacam link UI buttons** — the 5-minute server scheduler in `server/_core/index.ts` handles all linking automatically
20. **Removing `EXISTS srv100_uploads` from doctor portal `getMyPatients`** — doctors must only see patients with Pentacam images; auto-referral and notifications still fire for all new patients regardless

---

# Safe Execution Checklist

Before editing any code, verify:

- [ ] Task exists in `specs/tasks.md` with full schema
- [ ] Dependencies are completed and reviewed
- [ ] Files to edit are listed in task Output
- [ ] No file in the Protected Files list is being modified (unless explicitly authorized)
- [ ] Constitution Check passes for all 7 principles
- [ ] SQL is parameterized (no string concatenation of user input)
- [ ] No cross-module imports introduced
- [ ] Revenue logic traces to `PAPAT_SRV`/`PAJRNRCVH` service rows
- [ ] `PAT_CD` treated as string, never number
- [ ] CNCL filter applied where legacy excludes cancelled
- [ ] Doctor code sourced from `SRV_BY1` (service row), not `DRS_CD` (header)
- [ ] Arabic RTL layout preserved (`dir="rtl"`)
- [ ] Arabic digit formatting via `formatMoneyAr()`/`formatCountAr()`
- [ ] Loading/error/empty states implemented
- [ ] `pnpm check` will be run if shared infrastructure touched
- [ ] No PII in logs (timing only at debug level)
- [ ] Task prompt ends with: "Follow the project Constitution and Project Principles strictly."

After editing:

- [ ] Run smallest relevant check (`pnpm check` / `pnpm test` / `pnpm build`)
- [ ] Verify zero changes to protected files (`git diff --stat`)
- [ ] Verify no mutating SQL verbs in accounting files (`grep -iE "INSERT|UPDATE|DELETE|EXEC|MERGE"`)
- [ ] Report: changed files, what changed, checks run, checks skipped

---

**Document version:** 2.1.0 — updated 2026-06-14
**Aligned with:** Constitution v1.0.0, Project Principles v1.0.0, Spec v1.0.0, Plan v1.0.0, Tasks v1.0.0
**Plans complete:** 001–005 + 010 (app router split — JSX constants, dead import cleanup, Vite strip-impeccable-live plugin)
**Recent features (no plan):** Pentacam 5-min auto-linker (server startup scheduler), doctor portal real-time WS notifications + auto-referral on patient registration, حجز filter in today queue (appointments-activity.tsx)
