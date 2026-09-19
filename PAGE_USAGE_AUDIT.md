# تدقيق استخدام الصفحات (Page Usage Audit)

تاريخ التدقيق: 2026-09-11

منهجية التحقق: تم فحص `shared/routes.ts` (302 سطر) ومطابقته مع كل ملف توجيه تحت `client/src/routes/*.tsx` (accounting/admin/attendance/kf/marketing/medical/misc/salary + guards.tsx) لمعرفة أي مكوّن lazy-imported يقابل كل مفتاح ROUTES. تم أيضاً فحص hub shells (`AdminHubShell.tsx`, `PatientHubShell.tsx`, `PatientsHubShell.tsx`, `ServicesHubShell.tsx`) لإيجاد الصفحات التي تُعرض كـ tabs داخلية بدلاً من route مباشر. تم تشغيل `git log -1` لكل ملف صفحة للتحقق من حداثة آخر تعديل حقيقي (ليس مجرد commit جماعي شامل). معظم الملفات ظهرت بتواريخ حديثة جداً (2026-06 إلى 2026-09) ضمن commits حقيقية مثل `unidesign4all`، `design.tabs`، `SRV100,PROJECT_REVIEW_PLAN.md`، وليست commits ضخمة عشوائية.

ملاحظة أمانة: التحقق من "الوصول عبر التنقل" (nav reachability) تم بعمق كامل فقط لـ AdminHubShell وملفات dev/prototype ولصفحات KF/Attendance/Salary/Stockroom الأساسية عبر ملفات التوجيه ووجود شيلات (Shell/Layout/Hub) مخصصة لكل قسم. لم يتم فتح كل رابط داخل كل hub شل يدوياً (راجع قسم "خلاصة" أدناه للصفحات غير المؤكدة).

---

## الرئيسية / الهيكل العام

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/pages/Home.tsx` | `/login` | direct URL / login flow | 2026-08-30 | ACTIVE |
| `client/src/pages/MainHome.tsx` | `/home`, `/` (redirect) | primary landing page after login | 2026-09-07 | ACTIVE |
| `client/src/pages/Dashboard.tsx` | `/dashboard` (via guards.tsx `DashboardRouteGate`) | nav / role-based landing | 2026-09-11 | ACTIVE |
| `client/src/pages/Profile.tsx` | `/profile` | top nav user menu | 2026-09-07 | ACTIVE |
| `client/src/pages/AccountPage.tsx` | `/account`, `/account/*` | user menu | 2026-09-07 | ACTIVE |
| `client/src/pages/ForcePasswordChange.tsx` | `/force-password-change` | forced redirect after login when required | 2026-09-07 | ACTIVE |
| `client/src/pages/PrivacyPolicy.tsx` | `/privacy` | footer/legal link (typical) | 2026-06-09 | LIVE-BUT-STALE |
| `client/src/pages/NotFound.tsx` | `/404` (catch-all) | fallback route | 2026-09-07 | ACTIVE |
| `client/src/pages/ComponentShowcase.tsx` | `/components-gallery` | no nav link found | 2026-08-30 | UNREACHABLE (dev tool, direct URL only) |
| `client/src/pages/WorkflowHub.tsx` | `/workflow-hub` | workflow card / nav | 2026-09-11 | ACTIVE |
| `client/src/pages/WorkflowPrototype.tsx` | `/workflow-prototype` (redirects to `/workflow`) | none — pure redirect shim | 2026-08-16 | UNREACHABLE (redirect-only stub) |
| `client/src/pages/WorkflowPrototypeLive.tsx` | routed within misc-routes (`workflow` path serves live prototype component) | reached via `/workflow` | 2026-09-11 | ACTIVE |
| `client/src/pages/dev/Styleguide.tsx` (re-exports `PortalStyleguide`) | `/styleguide` | no nav link found | 2026-05-01 | UNREACHABLE (dev tool, direct URL only) |
| `client/src/pages/dev/Documentation.tsx` (re-exports `PortalDocumentation`) | `/documentation` | no nav link found | 2026-05-01 | UNREACHABLE (dev tool, direct URL only) |
| `client/src/pages/dev/ComponentsGallery.tsx` (re-exports `PortalComponentsGallery`) | `/components-gallery` (duplicate path with `ComponentShowcase`?) | no nav link found | 2026-05-01 | UNCERTAIN — two different components (`ComponentShowcase.tsx` and `dev/ComponentsGallery.tsx`) both map near `componentsGallery`/`showcase` routes; needs owner clarification on which is canonical |
| `client/src/pages/PortalStyleguide.tsx` | embedded impl behind `dev/Styleguide.tsx` | via `/styleguide` | 2026-06-09 | EMBED-ONLY |
| `client/src/pages/PortalDocumentation.tsx` | embedded impl behind `dev/Documentation.tsx` | via `/documentation` | 2026-06-09 | EMBED-ONLY |
| `client/src/pages/PortalComponentsGallery.tsx` | embedded impl behind `dev/ComponentsGallery.tsx` | via `/components-gallery` | 2026-06-09 | EMBED-ONLY |

---

## المرضى

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/pages/Patients.tsx` | `/patients` | nav / patients list | 2026-09-05 | ACTIVE |
| `client/src/pages/PatientDetails.tsx` | `/patients/:id` | patients list rows | 2026-07-22 | ACTIVE |
| `client/src/pages/NewCases.tsx` | `/new-cases`, `/new-cases/:id` | opened to ALL roles per `VISIBILITY_AND_PERMISSIONS_REPORT.md` (2026-03-29); linked in `AppTopNav.tsx`/`AppBottomNav.tsx` | 2026-07-07 | ACTIVE (previously mis-flagged as unused — confirmed live) |
| `client/src/pages/QuickPatientEntry.tsx` | `/quick-entry`, `/quick-entry/:id` | quick entry flow from nav | 2026-06-09 | ACTIVE |
| `client/src/pages/PatientSummary.tsx` | `/patient-summary`, `/patient-summary/:id` | patient detail links | 2026-09-07 | ACTIVE |
| `client/src/pages/DoctorPatientView.tsx` | `/doctor/patient/:id` | opened to ALL roles per visibility report; linked in top/bottom nav | 2026-06-09 | ACTIVE (previously mis-flagged as unused — confirmed live) |
| `client/src/pages/PatientHubShell.tsx` | `/patient-hub/*?` | patient-hub nav entry | 2026-09-07 | ACTIVE |
| `client/src/pages/PatientHubHome.tsx` | embedded default tab of `PatientHubShell` | via `/patient-hub` | 2026-06-18 | EMBED-ONLY |
| `client/src/pages/ClinicsHubShell.tsx` | `/clinics-hub`, `/clinics-hub/*` | clinics hub nav entry; substantive feature commit 2026-09-05 confirms active development (not superseded, contra old report) | 2026-09-05 | ACTIVE |
| `client/src/pages/PatientsHubShell.tsx` | `/patients-hub`, `/patients-hub/*` | patients hub nav entry; substantive permission-logic commit 2026-08-30 confirms active development (not superseded, contra old report) | 2026-08-30 | ACTIVE |
| `client/src/pages/PatientsHubList.tsx` | embedded tab of `PatientsHubShell` (`/patients-hub/list`) | via `PatientsHubShell` | 2026-07-21 | EMBED-ONLY |
| `client/src/pages/ServicesHubShell.tsx` | `/services-hub`, `/services-hub/*` | services hub nav entry | 2026-09-05 | ACTIVE |
| `client/src/pages/EgyptianDrugReferencePage.tsx` | embedded tab of `ServicesHubShell` | via `/services-hub` | 2026-09-07 | EMBED-ONLY |
| `client/src/features/doctor-portal/*` (DoctorDashboard, DoctorLayout, DoctorLogin, DoctorPatientImages) | `/doctor-portal/*` | doctor portal login flow (separate role) | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/*` (PatientBook, PatientBookings, PatientFile, PatientGuestBook, PatientLayout, PatientLogin, PatientPrescription, PatientRefraction, PatientScans) | `/my/*`, `/patient-portal/*` | patient portal login flow (separate role) | 2026-09-07 | ACTIVE |

---

## الجداول / الشيتات

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/pages/ConsultantSheet.tsx` | `/sheets/consultant/:id` | sheets list/patient flow | 2026-07-05 | ACTIVE |
| `client/src/pages/ConsultantFollowupPage.tsx` | `/sheets/consultant/:id/followup` | consultant sheet flow | 2026-09-07 | ACTIVE |
| `client/src/pages/SpecialistSheet.tsx` | `/sheets/specialist/:id` | sheets flow | 2026-09-07 | ACTIVE |
| `client/src/pages/LasikExamSheet.tsx` | `/sheets/lasik/:id` | sheets flow | 2026-09-07 | ACTIVE |
| `client/src/pages/LasikFollowupPage.tsx` | `/sheets/lasik/:id/followup` | lasik sheet flow | 2026-09-07 | ACTIVE |
| `client/src/pages/PentacamSheet.tsx` | `/sheets/pentacam/:id` | pentacam sheet flow | 2026-09-05 | ACTIVE |
| `client/src/pages/PentacamPage.tsx` | `/pentacam`, admin pentacam routes | pentacam nav; embeds `AdminPentacamDuplicates` | 2026-09-07 | ACTIVE |
| `client/src/pages/ExternalOperationSheet.tsx` | `/sheets/operation/:id` | operations sheet flow | 2026-07-05 | ACTIVE |
| `client/src/pages/SheetsPage.tsx` | `/sheets` | sheets index nav | 2026-09-05 | ACTIVE |
| `client/src/pages/AutorefsDashboard.tsx` | `/sheets/autorefs`, `/sheets/autorefs/dashboard` | sheets nav | 2026-09-05 | ACTIVE |
| `client/src/pages/RefractionPage.tsx` | `/refraction`, `/refraction/:id` | sheets/examination flow | 2026-08-16 | ACTIVE |
| `client/src/pages/RefractionsDashboard.tsx` | `/sheets/refractions`, `/sheets/refractions/dashboard` | sheets nav | 2026-09-05 | ACTIVE |
| `client/src/pages/PrescriptionsDashboard.tsx` | `/sheets/prescriptions`, `/sheets/prescriptions/dashboard` | sheets nav | 2026-06-11 | ACTIVE |
| `client/src/pages/PrescriptionsList.tsx` | `/prescriptions`, `/prescriptions/:id` | nav | 2026-09-07 | ACTIVE |
| `client/src/pages/WritePrescription.tsx` | `/prescription`, `/prescription/:id`, `/kf/prescription[/:id]` | prescriptions flow (shared with KF) | 2026-09-07 | ACTIVE |
| `client/src/pages/RequestTests.tsx` | `/request-tests[/:id]`, `/kf/request-tests[/:id]` | tests flow (shared with KF) | 2026-09-07 | ACTIVE |
| `client/src/pages/ExaminationForm.tsx` | `/examination[/:id]` | examination flow entry | 2026-06-20 | ACTIVE |
| `client/src/pages/ExaminationsCatalogPage.tsx` | `/examinations/catalog` (embeds `TestsCatalogDashboard` with mode="examinations") | catalog nav | 2026-05-01 | ACTIVE |
| `client/src/pages/TestsCatalogDashboard.tsx` | embedded by `ExaminationsCatalogPage` and `TxHubPage` | via those routes | 2026-09-05 | EMBED-ONLY |
| `client/src/pages/TxHubPage.tsx` | `/treatment`, `/txhub` (redirect) | treatment hub nav | 2026-05-01 | ACTIVE |
| `client/src/pages/FollowupForm.tsx` | `/followup/:id` | followups flow | 2026-07-07 | ACTIVE |
| `client/src/pages/Followups.tsx` | `/followups` | nav | 2026-09-07 | ACTIVE |
| `client/src/pages/Visits.tsx` | `/visits`, `/visits/:id` | nav | 2026-08-30 | ACTIVE |
| `client/src/pages/TodayPatients.tsx` | `/today`, `/today-patients` (via guard redirect logic in `guards.tsx`) | bookings/today nav | 2026-09-11 | ACTIVE |
| `client/src/pages/Operations.tsx` | `/operations` | nav | 2026-09-07 | ACTIVE |
| `client/src/pages/ReferralLetter.tsx` | `/sheets/referral`, `/sheets/referral/:id` | referrals flow | 2026-07-18 | ACTIVE |
| `client/src/pages/ExternalDoctors.tsx` | `/external-doctors`; also embedded in `AdminHubShell` | external doctors nav + admin hub | 2026-09-07 | ACTIVE |
| `client/src/pages/ExternalDoctorReferrals.tsx` | `/external-doctors/referrals`; also embedded in `AdminHubShell` | external doctors nav + admin hub | 2026-09-07 | ACTIVE |

---

## السجلات

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/pages/PatientsRecordsPage.tsx` | `/records/patients`; also embedded in `AdminHubShell` | records nav + admin hub | 2026-09-05 | ACTIVE |
| `client/src/pages/MedicalRecordsPage.tsx` | `/records/medical` | records nav | 2026-09-05 | ACTIVE |
| `client/src/pages/ArchivePage.tsx` | `/archive` | nav | 2026-09-05 | ACTIVE |
| `client/src/pages/ClinicalReportsPage.tsx` | via medical-routes | reports nav | 2026-09-05 | ACTIVE |
| `client/src/pages/ClinicalReport.tsx` | `/clinical-report`, `/clinical-report/:id` | reports flow | 2026-09-07 | ACTIVE |
| `client/src/pages/ClinicalPortal.tsx` | mounted in medical-routes | clinical portal nav | 2026-07-18 | ACTIVE |
| `client/src/pages/MedicalReports.tsx` | `/medical-reports[/:id]` | reports nav | 2026-09-07 | ACTIVE |
| `client/src/pages/MedicalReference.tsx` | `/medical-reference` | reference nav | 2026-09-05 | ACTIVE |
| `client/src/pages/MedicalConditionReport.tsx` | `/medical-condition-report[/:id]` | reports flow | 2026-08-16 | ACTIVE |
| `client/src/pages/PrePostOpReport.tsx` | `/pre-post-op-report[/:id]` | reports flow | 2026-08-16 | ACTIVE |
| `client/src/pages/PostOpOffdays.tsx` | `/post-op-offdays[/:id]` | reports flow | 2026-09-09 | ACTIVE |
| `client/src/pages/PostOpOffdaysEnglish.tsx` | `/post-op-offdays-en[/:id]` | reports flow (English variant) | 2026-07-18 | ACTIVE |
| `client/src/pages/PentacamResultsDashboard.tsx` | mounted in medical-routes | pentacam results nav | 2026-09-07 | ACTIVE |
| `client/src/pages/MedicationsCatalogPage.tsx` | `/medications`, `/medications/registry` | medications nav | 2026-09-05 | ACTIVE |
| `client/src/pages/MedicationsManagement.tsx` | mounted in medical-routes | admin/medications nav | 2026-09-05 | ACTIVE |
| `client/src/pages/MedicationsTestsManagement.tsx` | `/medications-tests` | nav | 2026-08-23 | ACTIVE |
| `client/src/pages/TestsManagement.tsx` | `/tests-management`, `/admin/tests`; also embedded in `AdminHubShell` | tests nav + admin hub | 2026-09-07 | ACTIVE |

---

## الحسابات

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/accounting/AccountingHome.tsx` | `/accounting` | accounting hub nav | 2026-09-07 | ACTIVE |
| `client/src/features/accounting/AccountingShell.tsx` | shell wrapper for accounting routes | accounting nav | 2026-09-07 | ACTIVE |
| `client/src/features/accounting/AccountingPrototypes.tsx` | `/accounting/prototypes` | no nav link found | 2026-06-18 | UNREACHABLE (dev tool, direct URL only) |
| `client/src/features/accounting/DailyRevenue.tsx` | `/accounting/daily-revenue`, `/kf/accounting/daily-revenue` (KF variant separate file) | accounting nav | 2026-06-19 | ACTIVE |
| `client/src/features/accounting/LasikRevenue.tsx` | `/accounting/service-revenue` | accounting nav | 2026-08-16 | ACTIVE |
| `client/src/features/accounting/LasikCost.tsx` | `/accounting/lasik-cost` | accounting nav | 2026-09-07 | ACTIVE |
| `client/src/features/accounting/LasikServices.tsx` | `/accounting/services` | accounting nav | 2026-06-18 | ACTIVE |
| `client/src/features/accounting/AccountingPatientsInquiry.tsx` | `/accounting/patients-inquiry` | accounting nav | 2026-06-18 | ACTIVE |
| `client/src/features/accounting/PatientAccount.tsx` | `/accounting/patients`, `/accounting/patient[/:patientCode]` | accounting nav | 2026-06-18 | ACTIVE |
| `client/src/features/accounting/DoctorAccount.tsx` | `/accounting/doctor[-account][/:doctorCode]` | accounting nav | 2026-06-18 | ACTIVE |
| `client/src/features/accounting/AccountingCashbook.tsx` | `/accounting/cashbook` | accounting nav | 2026-06-29 | ACTIVE |
| `client/src/features/accounting/AccountingLedger.tsx` | `/accounting/ledger`; separate KF variant `KfLedger.tsx` at `/kf/accounting/ledger` | accounting nav | 2026-06-29 | ACTIVE |
| `client/src/features/accounting/AccountingAdvances.tsx` | `/accounting/advances` | accounting nav | 2026-08-26 | ACTIVE |
| `client/src/features/accounting/AccountingLoans.tsx` | `/accounting/loans` | accounting nav | 2026-06-29 | ACTIVE |
| `client/src/features/accounting/AccountingHomeFund.tsx` | `/accounting/home-fund` | accounting nav | 2026-06-29 | ACTIVE |
| `client/src/features/accounting/AccountingInstapay.tsx` | `/accounting/instapay` | accounting nav | 2026-08-30 | ACTIVE |
| `client/src/features/accounting/AccountingDrSaadany.tsx` | `/accounting/dr-saadany` | accounting nav | 2026-06-29 | ACTIVE |
| `client/src/features/accounting/PrintPreview.tsx` | `/accounting/print` | print flow | 2026-06-13 | ACTIVE |
| `client/src/features/accounting/ReceiptsInquiry.tsx` | `/accounting/receipts` | accounting nav | 2026-06-18 | ACTIVE |
| `client/src/features/accounting/ReceiptDetail.tsx` | `/accounting/receipts/:secCd/:trTy/:trNo` | receipts list rows | 2026-07-14 | ACTIVE |
| `client/src/features/accounting/AccEntryDrawer.tsx`, `AccLoanDrawer.tsx` | drawer components, not routed | used inside AccountingLedger/AccountingLoans | 2026-06-16 | EMBED-ONLY |
| `client/src/features/accounting/AccountingPagePrimitives.tsx` | shared UI primitives, not routed | used across accounting feature files | 2026-06-29 | EMBED-ONLY (utility, not a screen — borderline, listed per instruction) |
| `client/src/features/kf/KfAccounting.tsx`, `KfDailyRevenue.tsx`, `KfServiceRevenue.tsx`, `KfReceipts.tsx`, `KfLedger.tsx` | `/kf/accounting*` routes | KF accounting nav | 2026-08-26 to 2026-09-07 | ACTIVE |

---

## الحضور والانصراف

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/attendance/AttendanceHome.tsx` | `/attendance` | attendance nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/AttendanceLayout.tsx` | wraps all `/attendance/*` routes | attendance nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/LiveBoard.tsx` | `/attendance/live` | attendance nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/MyAttendanceProfile.tsx` | `/attendance/my` | attendance nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/EmployeeDetail.tsx` | `/attendance/employees/:empCd` | employees list rows | 2026-08-30 | ACTIVE |
| `client/src/features/attendance/EmployeesHub.tsx` | `/attendance/employees` (hub with tabs) | attendance nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/EmployeesList.tsx` | embedded tab inside `EmployeesHub` | via `/attendance/employees` | 2026-09-05 | EMBED-ONLY |
| `client/src/features/attendance/ReportsHub.tsx` | `/attendance/reports` (hub with tabs) | attendance nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/DailyView.tsx`, `Reports.tsx`, `LeaveBalanceReport.tsx`, `PermissionReport.tsx`, `RawLogs.tsx`, `MonthlyFingerprints.tsx` | embedded tabs inside `ReportsHub` | via `/attendance/reports` | 2026-09-05/07 | EMBED-ONLY |
| `client/src/features/attendance/SettingsHub.tsx` | `/attendance/settings` (hub with tabs) | attendance nav | 2026-09-05 | ACTIVE |
| `client/src/features/attendance/Holidays.tsx`, `LeaveManagement.tsx`, `Permissions.tsx`, `ScheduleSwap.tsx`, `ShiftAssignments.tsx`, `ShiftManagement.tsx`, `UserMappings.tsx`, `ManualPunches.tsx`, `Settings.tsx` | embedded tabs inside `SettingsHub`/`EmployeesHub` (exact tab mapping not individually re-verified) | via hub tabs | 2026-06 to 2026-09 | UNCERTAIN (very likely EMBED-ONLY, but exact tab wiring inside SettingsHub not traced line-by-line) |
| `client/src/features/attendance/admin/AdminDashboard.tsx` | `/attendance/admin/console` | attendance admin nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/admin/DeviceSettings.tsx` | `/attendance/admin/device` | attendance admin nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/admin/SyncStatus.tsx` | `/attendance/admin/sync` | attendance admin nav | 2026-09-07 | ACTIVE |
| `client/src/features/attendance/admin/DeviceConsole.tsx`, `EmpSync.tsx` | embedded inside admin dashboard/sync pages | via admin sub-pages | 2026-07-13 / 2026-09-07 | EMBED-ONLY |
| `client/src/features/salary/ShiftSchedule.tsx` | `/attendance/shift-schedule` | attendance nav | 2026-09-05 | ACTIVE |

---

## الرواتب

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/salary/SalaryDashboard.redesigned.tsx` | `/salary` | salary nav | 2026-09-07 | ACTIVE |
| `client/src/features/salary/SalaryLayout.redesigned.tsx` | wraps `/salary/*` routes | salary nav | 2026-09-07 | ACTIVE |
| `client/src/features/salary/SalaryBasics.tsx` | mounted within salary dashboard/layout | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/SalaryPenalties.tsx` | `/salary/penalties` | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/CommissionPools.tsx` | `/salary/pools` | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/EmployeeFunds.tsx` | `/salary/funds` | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/PayrollReport.tsx` | `/salary/payroll` | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/SalarySettings.tsx` | `/salary/settings` | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/ShiftStaff.tsx` | `/salary/shift-staff` | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/ShiftPayroll.tsx` | `/salary/shift-payroll` | salary nav | 2026-09-05 | ACTIVE |
| `client/src/features/salary/AbsentReport.tsx` | `/salary/absent-report` | salary nav | 2026-09-07 | ACTIVE |
| `client/src/features/salary/CurrentSalaryData.redesigned.tsx` | `/salary/current-data` | salary nav | 2026-08-30 | ACTIVE |
| `client/src/features/salary/ShiftHub.tsx` | not matched to a distinct ROUTES key in salary-routes.tsx during this pass | UNCERTAIN | 2026-09-05 | UNCERTAIN — likely embedded inside shift-related tabs; not individually traced |

---

## المخزن

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/stockroom/StockroomShell.tsx` | `/stockroom`, `/stockroom/*` | stockroom nav | 2026-09-07 | ACTIVE |
| `client/src/features/stockroom/StockroomCategory.tsx` | `/stockroom/:category` (and named routes: extra, eye-drops, office, op-room, surgical) | stockroom nav | 2026-08-23 | ACTIVE |
| `client/src/features/stockroom/StockroomDashboard.redesigned.tsx` | embedded default view inside `StockroomShell` | via `/stockroom` | 2026-06-29 | EMBED-ONLY |
| `client/src/features/stockroom/StockroomReports.redesigned.tsx` | `/stockroom/reports` | stockroom nav | 2026-08-16 | ACTIVE |

---

## KF

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/kf/KfShell.tsx` | wraps `/kf/*` | KF nav entry | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfHome.tsx` | `/kf` | KF nav | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfPatients.tsx` | `/kf/patients` | KF nav | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfPatientForm.tsx` | `/kf/patients/new`, `/kf/patients/:kfPatientId/edit` | KF patients flow | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfPatientDetail.tsx` | `/kf/patients/:kfPatientId[/history]` | KF patients list rows | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfWorkflow.tsx` | mounted for KF workflow sub-routes | KF nav | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfVisitForm.tsx` | `/kf/patients/:kfPatientId/visits/new` | KF patient detail flow | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfExaminationForm.tsx` | `/kf/patients/:kfPatientId/examinations/new` | KF patient detail flow | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfOperationForm.tsx` | `/kf/patients/:kfPatientId/operations/new` | KF patient detail flow | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfFollowupForm.tsx` | `/kf/patients/:kfPatientId/followups/new` | KF patient detail flow | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfOperations.tsx` | `/kf/operations` | KF nav | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfFollowups.tsx` | `/kf/followups` | KF nav | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfBookings.tsx` | `/kf/bookings` | KF nav | 2026-09-07 | ACTIVE |
| `client/src/features/kf/KfConsultantSheet.tsx` | `/kf/sheets/consultant/:kfPatientId` | KF sheets flow | 2026-08-30 | ACTIVE |
| `client/src/features/kf/KfConsultantFollowupSheet.tsx` | `/kf/sheets/consultant/:kfPatientId/followup` | KF sheets flow | 2026-07-01 | ACTIVE |
| `client/src/features/kf/KfAccounting.tsx`, `KfDailyRevenue.tsx`, `KfServiceRevenue.tsx`, `KfReceipts.tsx`, `KfLedger.tsx` | `/kf/accounting*` | KF accounting nav | 2026-08-26 to 2026-09-07 | ACTIVE (also listed above under Accounting) |

---

## التسويق

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/pages/marketing/MarketingLayout.tsx` | wraps `/marketing/*` | marketing nav | 2026-06-29 | ACTIVE |
| `client/src/pages/marketing/MarketingDashboard.tsx` | `/marketing` | marketing nav | 2026-06-20 | ACTIVE |
| `client/src/pages/marketing/PostHistory.tsx` | `/marketing/history` | marketing nav | 2026-06-21 | ACTIVE |
| `client/src/pages/marketing/DraftPosts.tsx` | `/marketing/drafts` | marketing nav | 2026-06-21 | ACTIVE |
| `client/src/pages/marketing/BrandLibrary.tsx` | `/marketing/brand` | marketing nav | 2026-06-20 | ACTIVE |
| `client/src/pages/marketing/MarketingSettings.tsx` | `/marketing/settings` | marketing nav | 2026-06-20 | ACTIVE |

---

## الإدارة

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/admin/AdminHubShell.tsx` | `/admin-hub`, `/admin-hub/*`, `/booking-triage` (legacy alias) | admin nav | 2026-09-07 | ACTIVE |
| `client/src/features/admin/AdminUsers.tsx`, `AdminMigrations.tsx`, `AdminApiTools.tsx`, `AdminStatus.tsx`, `AdminSettings.tsx`, `AdminPermissions.tsx`, `AdminSheets.tsx`, `AdminSheetDesigner.tsx`, `AdminDoctors.tsx`, `AdminPentacamFailed.tsx`, `AdminServices.tsx`, `AdminCardVisibility.tsx`, `AdminDataSourceAudit.tsx`, `AdminNotificationSettings.tsx`, `AdminPatients.tsx`, `AdminPortalBookings.tsx`, `AdminLegacyPatients.tsx`, `OpHistory.tsx`, `AdminWhatsAppInbox.tsx` | all embedded as tabs inside `AdminHubShell` (old direct `/admin/*` routes now 301-style redirect to `/admin-hub/*` per `admin-routes.tsx`) | via `AdminHubShell` tabs | 2026-08-30 to 2026-09-07 | ACTIVE (reached only through the hub, not standalone routes — legitimate pattern) |
| `client/src/features/admin/AdminPentacamLinking.tsx` | `/admin/pentacam[/:id]` direct route (medical-routes.tsx) + embedded in `AdminHubShell` | pentacam admin nav + hub | 2026-09-07 | ACTIVE |
| `client/src/features/admin/AdminPentacamDuplicates.tsx` | embedded inside `AdminPentacamFailed.tsx`, `PentacamPage.tsx`, and `AdminHubShell.tsx` | via those pages | 2026-08-30 | EMBED-ONLY |
| `client/src/features/admin/AdminDiagnostics.tsx` | not matched to a direct ROUTES key; imported into `AdminHubShell` | likely embedded diagnostics tab | 2026-08-30 | UNCERTAIN — imported but exact tab-trigger not individually confirmed |

---

## بوابة الطبيب

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/doctor-portal/DoctorLogin.tsx` | `/doctor-portal/login` | doctor portal entry | 2026-09-07 | ACTIVE |
| `client/src/features/doctor-portal/DoctorDashboard.tsx` | `/doctor-portal/dashboard` | after doctor login | 2026-09-07 | ACTIVE |
| `client/src/features/doctor-portal/DoctorPatientImages.tsx` | `/doctor-portal/patient/:patientCode` | doctor dashboard patient rows | 2026-09-07 | ACTIVE |
| `client/src/features/doctor-portal/DoctorLayout.tsx` | wraps `/doctor-portal/*` | doctor portal shell | 2026-09-07 | ACTIVE |

---

## بوابة المريض

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/features/patient-portal/PatientLogin.tsx` | `/my/login`, `/patient-portal/login` | patient portal entry | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientGuestBook.tsx` | `/my/book-guest` | patient portal booking | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientFile.tsx` | `/my/file` | patient portal after login | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientRefraction.tsx` | `/my/refraction` | patient file nav | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientPrescription.tsx` | `/my/prescription` | patient file nav | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientScans.tsx` | `/my/scans` | patient file nav | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientBook.tsx` | `/my/book` | patient portal booking | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientBookings.tsx` | `/my/bookings` | patient portal nav | 2026-09-07 | ACTIVE |
| `client/src/features/patient-portal/PatientLayout.tsx` | wraps `/my/*`, `/patient-portal/*` | patient portal shell | 2026-09-07 | ACTIVE |

---

## تطوير / نماذج أولية

| File | Route(s) | Reachable From | Last Real Commit | Verdict |
|---|---|---|---|---|
| `client/src/pages/ComponentShowcase.tsx` | `/components-gallery` (possible path collision, see above) | no nav link | 2026-08-30 | UNREACHABLE (intentional dev tool) |
| `client/src/pages/dev/Styleguide.tsx` / `PortalStyleguide.tsx` | `/styleguide` | no nav link | 2026-05-01 / 2026-06-09 | UNREACHABLE / EMBED-ONLY (dev tool) |
| `client/src/pages/dev/Documentation.tsx` / `PortalDocumentation.tsx` | `/documentation` | no nav link | 2026-05-01 / 2026-06-09 | UNREACHABLE / EMBED-ONLY (dev tool) |
| `client/src/pages/dev/ComponentsGallery.tsx` / `PortalComponentsGallery.tsx` | `/components-gallery` | no nav link | 2026-05-01 / 2026-06-09 | UNREACHABLE / EMBED-ONLY (dev tool) |
| `client/src/pages/WorkflowPrototype.tsx` | `/workflow-prototype` → redirects to `/workflow` | none, pure redirect stub | 2026-08-16 | UNREACHABLE (redirect-only stub, superseded by `WorkflowPrototypeLive`) |
| `client/src/features/accounting/AccountingPrototypes.tsx` | `/accounting/prototypes` | no nav link | 2026-06-18 | UNREACHABLE (dev tool) |

---

## خلاصة

**Counts by verdict** (approximate — a handful of files appear in more than one section because they are shared between areas, e.g. KF accounting screens are listed once under KF and referenced again under Accounting):

- ACTIVE: ~150
- EMBED-ONLY: ~20
- UNREACHABLE: 6 (all are intentional dev/prototype/redirect-stub pages: `ComponentShowcase.tsx`, `dev/Styleguide.tsx`, `dev/Documentation.tsx`, `dev/ComponentsGallery.tsx`, `WorkflowPrototype.tsx`, `AccountingPrototypes.tsx`)
- LIVE-BUT-STALE: 1 (`PrivacyPolicy.tsx`, last touched 2026-06-09, no recent nav-visible change but still legally required and routed)
- UNCERTAIN: 5 (`client/src/pages/dev/ComponentsGallery.tsx` path collision with `ComponentShowcase.tsx` at `/components-gallery`; `client/src/features/attendance/Holidays.tsx`, `LeaveManagement.tsx`, `Permissions.tsx`, `ScheduleSwap.tsx`, `ShiftAssignments.tsx`, `ShiftManagement.tsx`, `UserMappings.tsx`, `ManualPunches.tsx`, `Settings.tsx` — exact tab wiring inside `SettingsHub`/`EmployeesHub` not traced line-by-line; `client/src/features/salary/ShiftHub.tsx` — no direct ROUTES key found in this pass; `client/src/features/admin/AdminDiagnostics.tsx` — imported into `AdminHubShell` but exact trigger tab not confirmed)

**(1) Conflicts with the old orphan report:** No separate old "orphan screens" report file was found in the repo root — only `VISIBILITY_AND_PERMISSIONS_REPORT.md` exists, and it documents the deliberate 2026-03-29 change that this audit relied on to confirm `/new-cases` and `/doctor/patient/:id` are ACTIVE (not orphaned). This audit independently reconfirms that both `ClinicsHubShell.tsx` and `PatientsHubShell.tsx` received substantive, non-bulk feature commits in the past two weeks (2026-09-05 and 2026-08-30 respectively) and are routed + nav-reachable — consistent with the correction already given in the task context. No new conflicts with the old claims were found; if the original "orphan screens" report still exists elsewhere (not in repo root), it was not located and could not be cross-checked directly.

**(2) Screens needing real usage knowledge from the user:**
- `client/src/pages/ComponentShowcase.tsx` vs `client/src/pages/dev/ComponentsGallery.tsx` — both are near-duplicates targeting a components-gallery concept at overlapping route names; worth confirming which one is the maintained/canonical dev tool and whether the other should be removed.
- `client/src/pages/WorkflowPrototype.tsx` — a pure redirect stub to `/workflow`; likely safe to delete/simplify, but confirm nothing external still links to `/workflow-prototype`.
- Attendance settings/employees sub-tab files (Holidays, LeaveManagement, Permissions, ScheduleSwap, ShiftAssignments, ShiftManagement, UserMappings, ManualPunches, Settings) — high confidence they are embed-only tabs inside `SettingsHub`/`EmployeesHub`, but this was not verified tab-by-tab; worth a quick manual click-through if precision matters.
- `client/src/features/salary/ShiftHub.tsx` and `client/src/features/admin/AdminDiagnostics.tsx` — imported/present in the codebase but this pass could not pin down their exact route or tab trigger with full confidence.
