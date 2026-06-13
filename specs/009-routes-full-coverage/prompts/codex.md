Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not start the next task until check passes.

---

## T002 — Add accounting route constants to shared/routes.ts

Task: Add all accounting sub-path constants to `shared/routes.ts`.

1. Read `shared/routes.ts`
2. Add the following keys to the `ROUTES` object (do NOT change any existing key values):
   ```typescript
   accountingPrototypes: '/accounting/prototypes',
   accountingDailyRevenue: '/accounting/daily-revenue',
   accountingServiceRevenue: '/accounting/service-revenue',
   accountingReceiptDetail: '/accounting/receipts/:secCd/:trTy/:trNo',
   accountingReceipts: '/accounting/receipts',
   accountingServices: '/accounting/services',
   accountingPatientsInquiry: '/accounting/patients-inquiry',
   accountingPatients: '/accounting/patients',
   accountingPatientDetail: '/accounting/patient/:patientCode',
   accountingPatient: '/accounting/patient',
   accountingPatientAccount: '/accounting/patient-account',
   accountingDoctor: '/accounting/doctor',
   accountingDoctorAccount: '/accounting/doctor-account',
   accountingDoctorDetail: '/accounting/doctor/:doctorCode',
   accountingCashbook: '/accounting/cashbook',
   accountingLedger: '/accounting/ledger',
   accountingAdvances: '/accounting/advances',
   accountingLoans: '/accounting/loans',
   accountingHomeFund: '/accounting/home-fund',
   accountingInstapay: '/accounting/instapay',
   accountingDrSaadany: '/accounting/dr-saadany',
   accountingPrint: '/accounting/print',
   ```
3. Keep `as const` on the object
4. Run `pnpm check`

Do NOT change any existing constant values. Add only.
Report: keys added (count), pnpm check result.

---

## T003 — Add admin sub-path constants to shared/routes.ts

Task: Add all admin sub-path and legacy top-level admin constants to `shared/routes.ts`.

1. Read `shared/routes.ts`
2. Add the following keys (do NOT change existing values):
   ```typescript
   adminUsers: '/admin/users',
   adminMigrations: '/admin/migrations',
   adminApiTools: '/admin/api-tools',
   adminStatus: '/admin/status',
   adminCardVisibility: '/admin/card-visibility',
   adminSettings: '/admin/settings',
   adminNotificationSettings: '/admin/notification-settings',
   adminPermissions: '/admin/permissions',
   adminPatients: '/admin/patients',
   adminForms: '/admin/forms',
   adminSheets: '/admin/sheets',
   adminSheetDesigner: '/admin/sheet-designer',
   adminSheetCopies: '/admin/sheet-copies',
   adminDoctors: '/admin/doctors',
   adminPentacamFailed: '/admin/pentacam-failed',
   adminServices: '/admin/services',
   adminTests: '/admin/tests',
   adminDataSourceAudit: '/admin/data-source-audit',
   users: '/users',
   doctors: '/doctors',
   permissionsPage: '/permissions',
   servicesPage: '/services',
   medicalSheets: '/medical-sheets',
   sheetDesigner: '/sheet-designer',
   systemStatus: '/system-status',
   migrationsPage: '/migrations',
   apiTools: '/api-tools',
   adminPatientsList: '/admin-patients',
   ```
3. Keep `as const`
4. Run `pnpm check`

Do NOT change any existing constant values.
Report: keys added (count), pnpm check result.

---

## T004 — Add sheets + refraction route constants to shared/routes.ts

Task: Add all sheets and refraction route constants to `shared/routes.ts`.

1. Read `shared/routes.ts`
2. Add the following keys:
   ```typescript
   sheetsConsultantDetail: '/sheets/consultant/:id',
   sheetsConsultantFollowup: '/sheets/consultant/:id/followup',
   sheetsSpecialistDetail: '/sheets/specialist/:id',
   sheetsExternalDetail: '/sheets/external/:id',
   sheetsLasikDetail: '/sheets/lasik/:id',
   sheetsLasikFollowup: '/sheets/lasik/:id/followup',
   sheetsPentacamDashboard: '/sheets/pentacam/dashboard',
   sheetsRefractionsDashboard: '/sheets/refractions/dashboard',
   sheetsRefractions: '/sheets/refractions',
   sheetsAutorefsDashboard: '/sheets/autorefs/dashboard',
   sheetsAutorefs: '/sheets/autorefs',
   sheetsPrescriptionsDashboard: '/sheets/prescriptions/dashboard',
   sheetsPrescriptions: '/sheets/prescriptions',
   sheetsPentacamDetail: '/sheets/pentacam/:id',
   sheetsPentacam: '/sheets/pentacam',
   adminPentacamDetail: '/admin/pentacam/:id',
   adminPentacam: '/admin/pentacam',
   sheetsOperationDetail: '/sheets/operation/:id',
   refractionDetail: '/refraction/:id',
   refraction: '/refraction',
   ```
3. Keep `as const`
4. Run `pnpm check`

Do NOT change any existing constant values.
Report: keys added (count), pnpm check result.

---

## T005 — Add marketing + misc route constants to shared/routes.ts

Task: Add all remaining marketing and miscellaneous route constants to `shared/routes.ts`.

1. Read `shared/routes.ts`
2. Add the following keys:
   ```typescript
   marketing: '/marketing',
   marketingHistory: '/marketing/history',
   marketingDrafts: '/marketing/drafts',
   marketingBrand: '/marketing/brand',
   marketingSettings: '/marketing/settings',
   clinicsHub: '/clinics-hub',
   patientsHub: '/patients-hub',
   servicesHub: '/services-hub',
   quickEntry: '/quick-entry',
   quickEntryDetail: '/quick-entry/:id',
   newCases: '/new-cases',
   newCaseDetail: '/new-cases/:id',
   followupDetail: '/followup/:id',
   followups: '/followups',
   visitDetail: '/visits/:id',
   visits: '/visits',
   todayRoute: '/today',
   operations: '/operations',
   workflowHub: '/workflow-hub',
   medicalFileDetail: '/medicalfile/:id',
   medicalFile: '/medicalfile',
   medicalReportDetail: '/medical-reports/:id',
   medicalReports: '/medical-reports',
   patientSummaryDetail: '/patient-summary/:id',
   patientSummary: '/patient-summary',
   doctorPatientDetail: '/doctor/patient/:id',
   medicationsRegistry: '/medications/registry',
   externalDoctorsReferrals: '/external-doctors/referrals',
   externalDoctors: '/external-doctors',
   showcase: '/showcase',
   styleguide: '/styleguide',
   componentsGallery: '/components-gallery',
   prototypes: '/prototypes',
   documentation: '/documentation',
   ```
3. Keep `as const`
4. Run `pnpm check`

Do NOT change any existing constant values.
Report: keys added (count), pnpm check result.

---

## T007 — Replace raw /accounting/* path= strings in App.tsx

Task: Migrate all accounting path declarations in `client/src/App.tsx` to use `ROUTES.*`.

1. Read `client/src/App.tsx`
2. Find all `path={"/accounting..."}` declarations
3. Replace each with the corresponding `ROUTES.*` constant (e.g. `path={ROUTES.accountingReceipts}`)
4. Confirm `import { ROUTES } from '../../shared/routes'` is present — add if missing
5. Run `pnpm check`

Do NOT change any path values. Replace string literals with constants of the same value only.
Report: replacements made (count), pnpm check result.

---

## T008 — Replace raw admin + legacy path= strings in App.tsx

Task: Migrate all admin sub-path and legacy top-level admin path declarations in `client/src/App.tsx`.

1. Read `client/src/App.tsx`
2. Find all raw `/admin/*` declarations and legacy paths (`/users`, `/doctors`, `/permissions`, `/services`, `/medical-sheets`, `/sheet-designer`, `/system-status`, `/migrations`, `/api-tools`, `/admin-patients`)
3. Replace each with the corresponding `ROUTES.*` constant
4. Run `pnpm check`

Do NOT change any path values.
Report: replacements made (count), pnpm check result.

---

## T009 — Replace raw /sheets/* + /refraction* path= strings in App.tsx

Task: Migrate all sheets and refraction path declarations in `client/src/App.tsx`.

1. Read `client/src/App.tsx`
2. Find all raw `/sheets/*`, `/admin/pentacam*`, and `/refraction*` path declarations
3. Replace each with the corresponding `ROUTES.*` constant
4. Run `pnpm check`

Do NOT change any path values.
Report: replacements made (count), pnpm check result.

---

## T010 — Replace all remaining raw path= strings in App.tsx

Task: Migrate all remaining raw path declarations (marketing, misc, hubs, etc.) in `client/src/App.tsx`.

1. Read `client/src/App.tsx`
2. Run: `grep -n "path={\"/" client/src/App.tsx | grep -v ROUTES` to find what remains
3. Replace each remaining raw string with the corresponding `ROUTES.*` constant
4. Run `pnpm check`

Do NOT change any path values.
Report: replacements made (count, or "none remaining"), pnpm check result.
