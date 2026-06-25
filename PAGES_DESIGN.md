# SELRS — Pages Design Reference

Brief per-page notes to help design each screen: layout type, key UI elements, primary actions, and notable design considerations.

> RTL layout throughout. Mixed Arabic/English UI. Role-based visibility — some pages are admin-only.

---

## Core / Auth

### `/login`
Login screen. Centered card, logo at top, username + password fields, submit button. Clean, minimal. No nav sidebar.

### `/force-password-change`
Full-page form forcing a password reset on first login. Single card with current password, new password, confirm fields.

### `/dashboard`
Main landing after login. Summary tiles/cards (patient counts, today's queue stats, quick links). Sidebar nav visible.

### `/profile`
User profile page. Shows name, role, branch, and allows password change.

---

## Medical Module

### `/bookings` (Today's Patients)
Queue board for today's walk-in and booked patients. Dense table/list with patient name, service type, doctor, status chips. Primary actions: open exam, assign doctor, change status. Filter by service type tabs.

### `/workflow-hub`
Admin triage hub. Table of all patients across branches with status overview. Bulk actions, search/filter bar. Wide layout.

### `/patients`
Full patient list. Search bar, filters (branch, service type, date), paginated table with patient code, name, doctor, date. Click row → patient detail.

### `/patients/:id`
Patient detail view. Two panels: left = patient info card (name, code, DOB, contact, insurance), right = visit/exam history timeline. Edit button opens inline form.

### `/patient-file` / `/patient-file/:id`
Full medical file for a patient. Tabbed layout: examinations, refractions, prescriptions, Pentacam scans, operations, notes. Dense data display.

### `/patient-summary/:id`
Read-only summary card for a patient. Compact: diagnosis, last exam date, current prescription, doctor. Printable.

### `/examination` / `/examination/:id`
Examination entry form. Large structured form — patient selector, service type, doctor, chief complaint, clinical findings, IOP, diagnosis, plan. Sidebar shows patient history summary.

### `/quick-entry` / `/quick-entry/:id`
Fast registration form for new patients at reception. Minimal fields: name, phone, gender, DOB, service type, branch. Quick-save flow.

### `/new-cases` / `/new-cases/:id`
New case entry — slightly more detailed than quick-entry. Adds insurance, referral source, and notes.

### `/followups` — Followup list
List of scheduled followup appointments. Filter by date range and doctor. Table: patient name, date, doctor, status.

### `/followup/:id`
Followup form for a specific visit. Fields: subjective complaints, objective findings, assessment, plan. Pre-filled from previous exam data.

### `/visits` / `/visits/:id`
General visit log per patient or all visits list. Table view with visit date, type, doctor, outcome.

### `/operations`
Operations list. Table: patient, operation type, date, surgeon, anesthesia, status. Filter by date and surgeon.

### `/medical-reports` / `/medical-reports/:id`
Medical report generator. Select patient → fills report template (consultant letter, referral, sick leave). Preview + print/PDF.

### `/medicalfile/:id`
Alias for patient file — same layout as `/patient-file/:id`.

---

## Examination Sheets

### `/sheets/consultant/:id`
Consultant examination sheet. Structured single-page form: BCVA, UCVA, IOP, slit-lamp findings, fundus, diagnosis, plan. Doctor-signed layout, printable.

### `/sheets/consultant/:id/followup`
Consultant followup sheet. Similar to consultant sheet but pre-filled from previous visit; delta fields highlighted.

### `/sheets/specialist/:id`
Specialist examination sheet. Similar to consultant but with specialist-specific fields (e.g., retina, cornea subspecialty).

### `/sheets/lasik/:id`
LASIK pre-op examination sheet. Sections: refraction, topography, pachymetry, eligibility checklist. Decision: fit/unfit for LASIK.

### `/sheets/lasik/:id/followup`
LASIK post-op followup sheet. Timeline of recovery milestones: day 1, week 1, month 1, etc.

### `/sheets/pentacam/:id`
Pentacam scan viewer. Displays uploaded/linked Pentacam images alongside key indices (Kmax, ISV, IHD). Side-by-side OD/OS layout.

### `/sheets/pentacam/dashboard`
Pentacam overview dashboard. Grid of recent scans with status (normal/suspicious/abnormal) chips.

### `/sheets/refractions/dashboard`
Refractions overview. Charts and table of refraction history for a patient or across patients.

### `/sheets/refractions`
Refraction entry/list. Table of refraction records: SPH, CYL, AXIS per eye; VA with/without correction.

### `/sheets/autorefs/dashboard`
Auto-refractor readings dashboard. Raw autoref data ingested from device, organized by date.

### `/sheets/prescriptions/dashboard`
Prescriptions overview. Patient prescription history in a card grid or timeline.

### `/sheets/prescriptions`
Prescription list. Table of issued prescriptions with date, doctor, drug list.

### `/sheets/external/:id`
External operation record sheet. Details of operation performed at external facility: referring doctor, procedure, outcome.

### `/sheets/operation/:id`
Operation sheet (in-clinic). Surgical notes: pre-op diagnosis, procedure steps, intraocular lens details, post-op instructions.

### `/refraction` / `/refraction/:id`
Refraction entry form. Fields: SPH, CYL, AXIS, add, VA (monocular/binocular). Usually embedded in exam flow.

### `/pentacam`
Pentacam management page. Upload/link Pentacam result files; associate with patient. Table of pending and linked scans.

---

## Treatment & Prescriptions

### `/treatment` (TxHub)
Treatment hub. Central point for writing and reviewing treatment plans, prescriptions, and test requests for a patient visit.

### `/prescription` / `/prescription/:id`
Prescription writer. Drug selector (with catalog search), dosage, frequency, duration. Preview strip for printing.

### `/prescriptions` / `/prescriptions/:id`
Prescriptions list for a patient or globally. Filter by doctor/date. Each row: drug name, dosage, date issued.

### `/request-tests` / `/request-tests/:id`
Lab/investigation request form. Checklist of tests (blood, imaging, etc.) with optional notes per test.

### `/tests`
Tests results viewer. Shows ordered tests and their result status (pending/received). Attach result file.

### `/tests-management`
Admin management of available test types. CRUD list of test names and categories.

### `/medications`
Medications catalog search page. Search bar, results list with drug name, category, notes. Used when looking up drugs during prescription.

### `/medications/registry`
Full medications registry management. CRUD for drug entries: name, generic name, category, notes.

### `/medications-tests`
Combined management page for medications and tests catalog (admin tool).

### `/examinations/catalog`
Catalog of examination types / findings templates. Admin can add/edit predefined text blocks used in exam forms.

---

## External Doctors

### `/external-doctors`
List of external referring doctors. Table: name, specialty, hospital, phone. Add/edit/delete actions.

### `/external-doctors/referrals`
Referral log from external doctors. Table: patient, referring doctor, date, service requested, status.

---

## Doctor Portal (separate login)

### `/doctor-portal/login`
Doctor-only login screen. Simpler than main login — just credentials, no branch selector.

### `/doctor-portal/dashboard`
Doctor's personal dashboard. Shows today's patient list, recent exam sheets, pending followups.

### `/doctor-portal/patient/:patientCode`
Doctor's view of a single patient. Read-only medical file with exam history, prescriptions, scans.

### `/doctor/patient/:id`
Alternative doctor patient view route. Same layout as doctor portal patient.

---

## Patient Portal (public-facing)

### `/my/login`
Patient self-service login. Clean public-facing page — phone number + OTP or password.

### `/my/book`
Patient booking form. Select clinic, service type, date/time slot, doctor preference. Confirmation step.

### `/my/book-guest`
Guest booking (no login required). Same as book but collects patient details inline.

### `/my/bookings`
Patient's appointment list. Card list of upcoming and past bookings with status badges.

### `/my/file`
Patient's own medical file viewer. Read-only summary of diagnoses, prescriptions, scan results.

### `/my/prescription`
View and print a specific prescription. Clean printable layout.

### `/my/refraction`
Patient's refraction history. Timeline of refraction records per eye.

### `/my/scans`
Patient's Pentacam/imaging scans. Thumbnail gallery with view/download option.

### `/patient-portal/login`
Alias for patient portal login.

---

## Attendance Module

All pages use `AttendanceLayout` — left sidebar with module nav links.

### `/attendance`
Attendance home. Summary cards: present today, absent, late, on leave. Quick links to sub-pages. Date picker to view any day.

### `/attendance/live`
Live attendance board. Real-time table of all employees: who's in, who's out, last punch time. Auto-refreshes.

### `/attendance/my`
My personal attendance profile. Calendar view of own punches, leave days, overtime. No sidebar — standalone page.

### `/attendance/employees`
Employee list hub. Table of all employees with attendance summary stats (this month: present days, late, absent). Click row → employee detail.

### `/attendance/employees/:empCd`
Employee detail. Punch log for selected employee across date range. Filter by month. Shows daily in/out times, duration, status (on time / late / absent).

### `/attendance/reports`
Reports hub. Generate attendance reports: monthly summary, tardiness report, absence report. Date range picker + employee/department filter. Export button.

### `/attendance/settings`
Attendance settings hub. Configure work hours, grace period, overtime rules, shift defaults.

### `/attendance/shift-schedule`
Shift schedule editor. Calendar/grid view for assigning shifts to employees by week/month. Drag-and-drop friendly layout.

### `/attendance/admin/device`
ZKTeco device settings (admin). Connect/sync the biometric device: IP, port, push interval, device code. Shows last sync time and push status.

### `/attendance/admin/sync`
ADMS sync status log. Table of sync events: timestamp, records received, errors. Manual trigger sync button.

---

## Salary Module

All pages use `SalaryLayout` — left sidebar with module nav links.

### `/salary`
Salary basics. Table of employee base salary records: employee, basic salary, transport allowance, housing, working days. Edit inline per row.

### `/salary/penalties`
Salary penalties & bonuses. Two tabs: Penalties (جزاءات) | Bonuses (مكافآت). Each tab: month/year picker + employee filter, table of entries, add form in sidebar/sheet. Penalties support amount or days mode. Pencil to edit, trash to delete.

### `/salary/pools`
Commission pools management. Define commission pools by service type, set percentages per doctor or share formula. Monthly pool summary.

### `/salary/payroll`
Payroll report. Month/year picker → computed payroll table per employee: base, allowances, penalties, bonuses, commissions, net. Export to Excel/print.

### `/salary/settings`
Salary module settings. Configure: working days per month, default allowances, payroll computation rules.

### `/salary/shift-staff`
Shift staff assignment. Assign employees to shift types (morning/evening/night) with effective date. Table view.

### `/salary/shift-payroll`
Shift-based payroll report. Like payroll but broken down by shift, showing per-shift earnings.

### `/salary/absent-report`
Absence deduction report. Lists absences that result in salary deductions for the selected month.

### `/salary/current-data`
Current month salary data snapshot. Read-only table of current computed values used for this month's payroll.

---

## Accounting Module

### `/accounting`
Accounting home / hub. Quick links to sub-sections: receipts, cashbook, ledger, doctor accounts, patient accounts, services, advances.

### `/accounting/daily-revenue`
Daily revenue summary. Date picker → breakdown of revenue by service type and payment method. Chart + table.

### `/accounting/service-revenue`
Service-wise revenue report. Period picker → revenue per service code/type. Grouped table with totals.

### `/accounting/receipts`
Receipts list. Search/filter: date range, patient code, receipt number. Table: receipt no, patient, amount, date, status. Click → detail.

### `/accounting/receipts/:secCd/:trTy/:trNo`
Receipt detail. Full receipt breakdown: services, fees, discounts, VAT, net paid. Printable.

### `/accounting/patients`
Patient accounts list. Search patient → shows all financial transactions for that patient.

### `/accounting/patient/:patientCode`
Patient financial account detail. Timeline of charges and payments, outstanding balance.

### `/accounting/patient-account`
Generic patient account lookup (without pre-selected patient).

### `/accounting/patients-inquiry`
Patient financial inquiry search page. Quick balance/transaction lookup by patient code or name.

### `/accounting/doctor`
Doctor accounts list. Shows all doctors with pending and settled commissions.

### `/accounting/doctor/:doctorCode`
Doctor financial account detail. Commission history, payment records, balance.

### `/accounting/doctor-account`
Generic doctor account lookup.

### `/accounting/cashbook`
Cashbook (صندوق). Daily cash in/out ledger. Add cash transactions, view running balance. Filter by date.

### `/accounting/ledger`
General ledger. Full transaction log across all accounts. Filter by date, type, account code.

### `/accounting/advances`
Salary advances management. List of advance requests/payments per employee. Add advance, mark as deducted.

### `/accounting/loans`
Staff loans management. Similar to advances but for larger long-term loans with installment tracking.

### `/accounting/home-fund`
Home/petty cash fund (صندوق البيت). Small expenses log for petty cash disbursements.

### `/accounting/instapay`
InstaPay transactions log. Digital payment records from InstaPay transfers.

### `/accounting/dr-saadany`
Dr. Saadany-specific account view (custom account page for a specific doctor/partner).

### `/accounting/services`
Services catalog with pricing. CRUD: service name, code, default price, category. Used as lookup in receipts.

### `/accounting/prototypes`
Prototype/template receipts. Define reusable receipt templates for common service bundles.

### `/accounting/print`
Print queue / print center for accounting documents.

### `/booking-triage`
Admin hub for managing incoming portal bookings. Table of pending bookings with approve/reject/reassign actions.

### `/booking-triage/portal-bookings`
Portal bookings sub-page within admin hub.

### `/booking-triage/settings/pricing-rules`
Pricing rules configuration for the booking/triage system.

### `/admin/settings/pricing-rules`
Admin pricing rules (same as above, different path access).

---

## KF Branch Module

### `/kf`
KF branch home. Dashboard with patient count, today's revenue, quick links to KF-specific sub-pages.

### `/kf/patients`
KF patient list. Same layout as main patients list but scoped to KF branch.

### `/kf/patients/new`
New KF patient registration form.

### `/kf/patients/:kfPatientId`
KF patient detail page. Medical history, visit log, financial summary — KF-specific layout.

### `/kf/patients/:kfPatientId/edit`
Edit KF patient data.

### `/kf/patients/:kfPatientId/visits/new`
Record a new visit for KF patient.

### `/kf/patients/:kfPatientId/examinations/new`
New examination entry for KF patient.

### `/kf/patients/:kfPatientId/operations/new`
New operation record for KF patient.

### `/kf/patients/:kfPatientId/followups/new`
New followup for KF patient.

### `/kf/operations`
KF operations log. List of operations performed at KF branch.

### `/kf/followups`
KF followups list.

### `/kf/sheets/consultant`
KF consultant sheets list — same sheet format as main but filtered to KF patients.

### `/kf/sheets/consultant/:kfPatientId`
Consultant sheet for a specific KF patient.

### `/kf/sheets/consultant/:kfPatientId/followup`
Consultant followup sheet for KF patient.

### `/kf/accounting`
KF accounting hub. Revenue/financial overview for KF branch.

### `/kf/accounting/daily-revenue`
KF daily revenue breakdown.

### `/kf/accounting/service-revenue`
KF service-wise revenue.

### `/kf/accounting/receipts`
KF receipts list.

### `/kf/accounting/ledger`
KF ledger.

---

## Admin Module

### `/admin/users` / `/users`
User management. Table of system users: name, role, branch, active status. Add/edit user form (role selector, branch selector, password reset). Admin only.

### `/admin/doctors` / `/doctors`
Doctors management. CRUD for doctor records: name, specialty, code, branch assignment, commission rate.

### `/admin/permissions` / `/permissions`
Access permissions configuration. Role-to-page permission matrix. Toggle switches per role per page/feature.

### `/admin/services` / `/services`
Services management. CRUD: service name, code, type, default pricing, branch availability.

### `/admin/settings`
System-wide settings page. Configure: clinic name, working hours, notification preferences, feature flags.

### `/admin/migrations` / `/migrations`
Database migrations status. List of applied and pending migrations. Run pending migrations button (admin/superadmin only).

### `/admin/api-tools` / `/api-tools`
API diagnostic tools. Test endpoints, view raw tRPC responses, trigger manual sync jobs. Developer tool.

### `/admin/status` / `/system-status`
System status dashboard. Shows health of: DB connection, MSSQL sync, ZKTeco device, FCM push, S3 storage.

### `/admin/sheets`
Medical sheet templates management. List of available sheet types with edit/clone actions.

### `/admin/sheet-designer`
Visual sheet designer. Drag-and-drop form builder for medical examination sheets. Field types: text, select, checkbox, measurement.

### `/admin/sheet-copies`
Sheet copy management. Assign sheet template copies/versions to branches or service types.

### `/admin/forms`
Custom forms management. Create/edit intake and consent forms.

### `/admin/pentacam`
Pentacam data management. Link unmatched Pentacam uploads to patients. List of all Pentacam records.

### `/admin/pentacam-failed`
Failed Pentacam links. Table of scans that couldn't be auto-matched, with manual matching UI.

### `/admin/pentacam/:id`
Single Pentacam record detail and patient matching interface.

### `/admin/patients`
Admin patient management. Bulk actions on patient records: merge duplicates, change service type, reassign doctor.

### `/admin/tests`
Lab tests management. CRUD for test catalog entries.

### `/admin/card-visibility`
Configure which cards/sections are visible to which roles on dashboard and patient pages.

### `/admin/notification-settings`
Configure push notification templates and triggers (FCM).

### `/admin/data-source-audit`
Data source audit log. Trace which MSSQL or manual entries sourced each patient record field.

### `/admin-patients`
Quick admin patient list (alternative path, same page as `/admin/patients`).

---

## Marketing Module

### `/marketing`
Marketing hub home. Overview of campaigns, draft counts, send history summary.

### `/marketing/brand`
Brand settings for marketing. Logo, colors, sender name, clinic contact info used in messages.

### `/marketing/drafts`
Message drafts. List of unsent message campaigns. Edit, preview, schedule/send.

### `/marketing/history`
Sent messages history. Table: campaign name, date sent, recipient count, channel (SMS/WhatsApp), status.

### `/marketing/settings`
Marketing channel settings. Configure SMS gateway, WhatsApp API credentials, sending limits.

---

## Stockroom Module

### `/stockroom`
Stockroom home. Category tiles: Eye Drops, Surgical Supplies, Office Supplies, Op Room Supplies, Extra.

### `/stockroom/:category`
Category-specific inventory list. Table: item name, quantity, unit, reorder threshold, last updated. Add/edit quantity actions.

### `/stockroom/reports`
Stockroom usage reports. Consumption over date range per category. Export option.

---

## Ops / Misc

### `/ops/mssql-add`
Manual MSSQL patient add tool. Form to manually push a patient record into MSSQL (for edge-case sync correction).

### `/components-gallery` / `/showcase` / `/styleguide` / `/prototypes`
Developer/design UI component gallery. Shows all UI components with examples. Not shown to end users.

### `/documentation`
Internal documentation viewer. Markdown docs for developers/admins.

### `/404`
Not-found page. Clean error page with back-to-home link.

---

## Clinics Hub / Services Hub / Patients Hub

### `/clinics-hub/*`
Multi-clinic overview hub. Branch-level dashboard for clinic managers overseeing multiple locations.

### `/services-hub/*`
Services overview across branches.

### `/patients-hub/*`
Cross-branch patient overview.

---

## Design Patterns (applies to all pages)

- **Layout**: RTL (`dir="rtl"`), sidebar nav on left (collapses to icon-only on small screens), content area fills right.
- **Typography**: Arabic labels for all user-facing strings; English for technical fields (codes, dates in ISO format).
- **Date inputs**: Always `dd/MM/yyyy` display (via `DateInput` component), stored as `yyyy-MM-dd`.
- **Tables**: Sticky header, alternating row shading, action buttons (pencil + trash) on right side of each row.
- **Forms**: Inline validation, Arabic error messages, `DateInput` for all date fields.
- **Modals/Sheets**: Add/edit forms open as slide-in sheet from right side or dialog modal; not full-page navigation.
- **Status chips**: Color-coded badges for patient status, payment status, device status.
- **Role gating**: Certain buttons/tabs hidden or disabled based on user role — design should account for empty states.
- **Print views**: Several pages have printable/PDF output — these should have a clean `@media print` layout stripping nav.
