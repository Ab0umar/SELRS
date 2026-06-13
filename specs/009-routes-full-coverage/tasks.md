# Tasks: Routes Full Coverage

**Branch**: `009-routes-full-coverage`
**Hard Dependency**: `008-routes-coverage` merged
**Input**: `specs/009-routes-full-coverage/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Audit

- [x] T001 Audit remaining raw path strings in `client/src/App.tsx` after plan 008
  - **Owner**: Claude | **Tool**: Grep
  - **Prompt**: "Run `grep -n \"path={'\\//\" client/src/App.tsx` and group results by domain (accounting, admin, sheets, marketing, misc). Count raw strings per domain. Output a table: domain | raw path | line number. Follow the project Constitution and Project Principles strictly."
  - **Output**: Complete inventory table grouped by domain
  - **Acceptance**: Every remaining raw path listed

**Checkpoint**: Exact scope known.

---

## Phase 2: Add Constants

- [x] T002 Add accounting route constants to `shared/routes.ts`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `shared/routes.ts`. Add accounting sub-path constants: `accountingPrototypes`, `accountingDailyRevenue`, `accountingServiceRevenue`, `accountingReceiptDetail` (`/accounting/receipts/:secCd/:trTy/:trNo`), `accountingReceipts`, `accountingServices`, `accountingPatientsInquiry`, `accountingPatients`, `accountingPatientDetail` (`/accounting/patient/:patientCode`), `accountingPatient`, `accountingPatientAccount`, `accountingDoctor`, `accountingDoctorAccount`, `accountingDoctorDetail` (`/accounting/doctor/:doctorCode`), `accountingCashbook`, `accountingLedger`, `accountingAdvances`, `accountingLoans`, `accountingHomeFund`, `accountingInstapay`, `accountingDrSaadany`, `accountingPrint`. Keep `as const`. Do not change existing constants. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T003 [P] Add admin sub-path constants to `shared/routes.ts`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `shared/routes.ts`. Add admin sub-path constants: `adminUsers` (`/admin/users`), `adminMigrations` (`/admin/migrations`), `adminApiTools` (`/admin/api-tools`), `adminStatus` (`/admin/status`), `adminCardVisibility` (`/admin/card-visibility`), `adminSettings` (`/admin/settings`), `adminNotificationSettings` (`/admin/notification-settings`), `adminPermissions` (`/admin/permissions`), `adminPatients` (`/admin/patients`), `adminForms` (`/admin/forms`), `adminSheets` (`/admin/sheets`), `adminSheetDesigner` (`/admin/sheet-designer`), `adminSheetCopies` (`/admin/sheet-copies`), `adminDoctors` (`/admin/doctors`), `adminPentacamFailed` (`/admin/pentacam-failed`), `adminServices` (`/admin/services`), `adminTests` (`/admin/tests`), `adminDataSourceAudit` (`/admin/data-source-audit`). Also add top-level legacy paths: `users: '/users'`, `doctors: '/doctors'`, `permissions: '/permissions'`, `services: '/services'`, `medicalSheets: '/medical-sheets'`, `sheetDesigner: '/sheet-designer'`, `systemStatus: '/system-status'`, `migrations: '/migrations'`, `apiTools: '/api-tools'`, `adminPatientsList: '/admin-patients'`. Keep `as const`. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T004 [P] Add sheets route constants to `shared/routes.ts`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `shared/routes.ts`. Add sheets route constants: `sheetsConsultantDetail` (`/sheets/consultant/:id`), `sheetsConsultantFollowup` (`/sheets/consultant/:id/followup`), `sheetsSpecialistDetail` (`/sheets/specialist/:id`), `sheetsExternalDetail` (`/sheets/external/:id`), `sheetsLasikDetail` (`/sheets/lasik/:id`), `sheetsLasikFollowup` (`/sheets/lasik/:id/followup`), `sheetsPentacamDashboard` (`/sheets/pentacam/dashboard`), `sheetsRefractionsDashboard` (`/sheets/refractions/dashboard`), `sheetsRefractions` (`/sheets/refractions`), `sheetsAutorefsDashboard` (`/sheets/autorefs/dashboard`), `sheetsAutorefs` (`/sheets/autorefs`), `sheetsPrescriptionsDashboard` (`/sheets/prescriptions/dashboard`), `sheetsPrescriptions` (`/sheets/prescriptions`), `sheetsPentacamDetail` (`/sheets/pentacam/:id`), `sheetsPentacam` (`/sheets/pentacam`), `adminPentacamDetail` (`/admin/pentacam/:id`), `adminPentacam` (`/admin/pentacam`), `sheetsOperationDetail` (`/sheets/operation/:id`), `refractionDetail` (`/refraction/:id`), `refraction` (`/refraction`). Keep `as const`. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T005 [P] Add marketing + misc route constants to `shared/routes.ts`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `shared/routes.ts`. Add marketing constants: `marketing: '/marketing'`, `marketingHistory: '/marketing/history'`, `marketingDrafts: '/marketing/drafts'`, `marketingBrand: '/marketing/brand'`, `marketingSettings: '/marketing/settings'`. Add misc constants: `clinicsHub: '/clinics-hub'`, `patientsHub: '/patients-hub'`, `servicesHub: '/services-hub'`, `quickEntry: '/quick-entry'`, `quickEntryDetail: '/quick-entry/:id'`, `newCases: '/new-cases'`, `newCaseDetail: '/new-cases/:id'`, `followupDetail: '/followup/:id'`, `followups: '/followups'`, `visitDetail: '/visits/:id'`, `visits: '/visits'`, `todayRoute: '/today'`, `operations: '/operations'`, `workflowHub: '/workflow-hub'`, `medicalFileDetail: '/medicalfile/:id'`, `medicalFile: '/medicalfile'`, `medicalReportDetail: '/medical-reports/:id'`, `medicalReports: '/medical-reports'`, `patientSummaryDetail: '/patient-summary/:id'`, `patientSummary: '/patient-summary'`, `doctorPatientDetail: '/doctor/patient/:id'`, `medicationsRegistry: '/medications/registry'`, `externalDoctorsReferrals: '/external-doctors/referrals'`, `externalDoctors: '/external-doctors'`, `showcase: '/showcase'`, `styleguide: '/styleguide'`, `componentsGallery: '/components-gallery'`, `prototypes: '/prototypes'`, `documentation: '/documentation'`. Keep `as const`. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T006 Run `pnpm check` after T002–T005
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

**Checkpoint**: All constants exist. No App.tsx changes yet.

---

## Phase 3: Migrate App.tsx

- [x] T007 [P] Replace raw accounting path= strings in `client/src/App.tsx`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `client/src/App.tsx`. Replace all raw `/accounting/*` path string literals in `path=` declarations with the corresponding `ROUTES.*` constants from `shared/routes.ts`. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes; zero raw `/accounting` strings remain in `path=`

- [x] T008 [P] Replace raw admin sub-path strings in `client/src/App.tsx`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `client/src/App.tsx`. Replace all raw `/admin/*` and top-level legacy admin path strings (`/users`, `/doctors`, `/permissions`, `/services`, `/medical-sheets`, `/sheet-designer`, `/system-status`, `/migrations`, `/api-tools`, `/admin-patients`) in `path=` declarations with `ROUTES.*` constants. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T009 [P] Replace raw sheets + refraction path= strings in `client/src/App.tsx`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `client/src/App.tsx`. Replace all raw `/sheets/*`, `/admin/pentacam*`, and `/refraction*` path strings in `path=` declarations with `ROUTES.*` constants. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

- [x] T010 [P] Replace raw marketing + misc path= strings in `client/src/App.tsx`
  - **Owner**: Codex | **Tool**: Edit
  - **Prompt**: "Read `client/src/App.tsx`. Replace all remaining raw path strings in `path=` declarations (`/marketing/*`, `/clinics-hub`, `/patients-hub`, `/services-hub`, `/quick-entry*`, `/new-cases*`, `/followup*`, `/visits*`, `/today`, `/operations`, `/workflow-hub`, `/medicalfile*`, `/medical-reports*`, `/patient-summary*`, `/doctor/*`, `/medications/registry`, `/external-doctors*`, `/showcase`, `/styleguide`, `/components-gallery`, `/prototypes`, `/documentation`) with `ROUTES.*` constants. Do not change any path values. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: `pnpm check` passes

---

## Final Phase: Verification

- [x] T011 Run `pnpm check` + `pnpm test` + confirm zero raw strings remain
  - **Owner**: Claude | **Tool**: Bash
  - **Prompt**: "Run `pnpm check` then `pnpm test`. Run `grep -c \"path={'\" client/src/App.tsx` — must return 0. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Both pass; zero raw `path=` strings remain

- [x] T012 Run `pnpm build` as final gate
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Exit code 0

---

## Dependencies & Execution Order

```
T001 → T002 + T003 + T004 + T005 (parallel) → T006
T006 → T007 + T008 + T009 + T010 (parallel) → T011 → T012
```
