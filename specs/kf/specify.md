# KF Module — Feature Specification

**Version:** 1.0.0
**Date:** 2026-06-09
**Status:** Draft — awaiting approval before implementation

---

## 1. Problem Statement

The SELRS platform currently manages one patient population (Saadany Eye Center). A second isolated clinical unit — KF — requires its own patient registry, visit/appointment tracking, examination records, operations log, and follow-up management. KF patients, workflows, and data must be fully isolated from the existing SELRS/Medical module. No MSSQL writes are ever permitted; no existing medical tables are used for KF writes.

---

## 2. Scope

### In Scope
- New MySQL-only tables prefixed `kf_` for all KF entities
- KF patient registration with isolated code generation (`KF-XXXXXX`)
- KF visit/appointment booking (MySQL-only)
- KF examination records (all-in-one, per patient/visit)
- KF operations log (scheduled procedures)
- KF follow-up tracking
- New tRPC router `kfRouter` under namespace `kf`
- New frontend module under `/kf/*` routes
- Role-gated access via new `kfProcedure` (path `/kf` permission, admin bypass)
- Read-only bridge: KF can lookup SELRS patients by code; SELRS can see KF patient count (no mutations cross the boundary)

### Out of Scope
- MSSQL reads or writes of any kind in the KF module
- Reusing `patients` table for KF patient writes
- Sharing examination, operation, or followup tables with the Medical module
- Any modification to `server/routers/medical.ts` or `server/routers/patient.ts`
- Financial/billing features (Phase 2)
- Pentacam integration for KF (Phase 2)
- FCM/WebSocket notifications for KF (Phase 2)

---

## 3. Success Criteria

1. KF patient can be created, viewed, and searched without touching the `patients` table
2. KF visit, examination, operation, and follow-up records save only to `kf_*` tables
3. No row ever written to MSSQL from any KF code path
4. `/kf/*` routes are inaccessible without `/kf` permission or admin role
5. Existing medical, accounting, and patient-portal flows are unaffected
6. `pnpm check` passes with zero errors after all tasks complete
7. `git diff --stat` shows zero changes to protected files (except `procedures.ts` one new export, `index.ts` one new line, `App.tsx` new lazy imports + routes, `drizzle/schema.ts` new KF tables appended)

---

## 4. Entities

### 4.1 kf_patients
Core patient record for the KF unit.

| Column | Type | Notes |
|--------|------|-------|
| `kf_id` | INT PK AUTO_INCREMENT | Internal ID |
| `kf_code` | VARCHAR(20) UNIQUE NOT NULL | Generated: `KF-0001` |
| `full_name` | VARCHAR(255) NOT NULL | |
| `date_of_birth` | DATE | |
| `age` | INT | |
| `gender` | ENUM('male','female') | |
| `national_id` | VARCHAR(20) | |
| `phone` | VARCHAR(20) | |
| `alternate_phone` | VARCHAR(20) | |
| `address` | TEXT | |
| `occupation` | VARCHAR(255) | |
| `medical_history` | TEXT | |
| `allergies` | TEXT | |
| `notes` | TEXT | |
| `selrs_patient_code` | VARCHAR(50) | Read-only bridge: optional link to SELRS `patientCode` |
| `created_by_user_id` | INT | FK users.id |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP ON UPDATE | |

### 4.2 kf_visits
Appointment/visit record linked to a KF patient.

| Column | Type | Notes |
|--------|------|-------|
| `kf_visit_id` | INT PK AUTO_INCREMENT | |
| `kf_patient_id` | INT NOT NULL | FK kf_patients.kf_id |
| `visit_date` | DATE NOT NULL | |
| `visit_type` | ENUM('consultation','examination','followup','operation') | |
| `doctor_name` | VARCHAR(255) | Free text (no FK to MSSQL) |
| `status` | ENUM('scheduled','arrived','in_progress','completed','cancelled') | |
| `notes` | TEXT | |
| `created_by_user_id` | INT | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP ON UPDATE | |

### 4.3 kf_examinations
All-in-one examination record.

| Column | Type | Notes |
|--------|------|-------|
| `kf_exam_id` | INT PK AUTO_INCREMENT | |
| `kf_patient_id` | INT NOT NULL | FK kf_patients.kf_id |
| `kf_visit_id` | INT | Optional FK kf_visits.kf_visit_id |
| `exam_date` | DATE NOT NULL | |
| `right_va` | VARCHAR(20) | Visual acuity right |
| `left_va` | VARCHAR(20) | Visual acuity left |
| `right_refraction` | JSON | Sphere/cylinder/axis |
| `left_refraction` | JSON | |
| `iop_right` | VARCHAR(20) | Intraocular pressure |
| `iop_left` | VARCHAR(20) | |
| `diagnosis` | TEXT | |
| `plan` | TEXT | |
| `notes` | TEXT | |
| `doctor_name` | VARCHAR(255) | |
| `examined_by_user_id` | INT | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP ON UPDATE | |

### 4.4 kf_operations
Scheduled operation/procedure.

| Column | Type | Notes |
|--------|------|-------|
| `kf_op_id` | INT PK AUTO_INCREMENT | |
| `kf_patient_id` | INT NOT NULL | FK kf_patients.kf_id |
| `kf_visit_id` | INT | Optional |
| `op_date` | DATE NOT NULL | |
| `op_type` | VARCHAR(255) NOT NULL | Free text |
| `eye` | ENUM('right','left','both') | |
| `doctor_name` | VARCHAR(255) | |
| `status` | ENUM('scheduled','completed','cancelled') | |
| `notes` | TEXT | |
| `created_by_user_id` | INT | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP ON UPDATE | |

### 4.5 kf_followups
Post-visit/post-op follow-up record.

| Column | Type | Notes |
|--------|------|-------|
| `kf_followup_id` | INT PK AUTO_INCREMENT | |
| `kf_patient_id` | INT NOT NULL | FK kf_patients.kf_id |
| `kf_visit_id` | INT | Optional |
| `kf_op_id` | INT | Optional link to operation |
| `followup_date` | DATE NOT NULL | |
| `notes` | TEXT | |
| `status` | ENUM('scheduled','completed','missed') | |
| `created_by_user_id` | INT | |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP ON UPDATE | |

---

## 5. Access Control

- All `/kf/*` routes are gated by `kfProcedure` (backend) and `ProtectedRoute allowedPaths="/kf"` (frontend)
- `kfProcedure`: admin or accountant bypass OR `/kf` path permission
- Roles that typically get `/kf` permission: doctor, nurse, reception, manager (assigned per user in permissions table)
- `accountant` role has same unconditional bypass as `admin`
- No KF procedure uses `publicProcedure`

---

## 6. Read-Only Bridge Rules

| Direction | What | How |
|-----------|------|-----|
| KF → SELRS | Look up a SELRS patient by `patientCode` to link via `selrs_patient_code` | `kfProcedure` query calling `db.getPatientByCode()` read-only |
| SELRS → KF | (Phase 2 — not in scope now) | — |

Bridge is **read-only lookup only**. No KF procedure writes to `patients` or any SELRS table.

---

## 7. MSSQL Guarantee

- No file under `server/routers/kf.ts` or `server/services/kf/` imports `createMssqlPool`, `mssqlQuery`, or any MSSQL integration
- Verification: `grep -rE "mssql|MSSQL|createMssqlPool|mssqlQuery" server/routers/kf.ts server/services/kf/` must return zero results

---

## 8. Risks & Safeguards

| Risk | Safeguard |
|------|-----------|
| KF code accidentally calling MSSQL | No MSSQL imports in kf router/services; grep verification in CI |
| KF writing to `patients` table | `kf.ts` never imports `insertPatient` or any write helper from `db.ts` for the `patients` table |
| Permission bypass | `kfProcedure` follows exact same pattern as `accountingProcedure` — tested |
| Breaking existing medical routes | KF is additive only; protected files listed receive minimal safe edits |
| `drizzle/schema.ts` conflict | KF tables appended at end of file; no existing table modified |
| Code collision on `kf_code` | Server generates code after insert using `kf_id`; `UPDATE kf_patients SET kf_code = ... WHERE kf_id = lastInsertId` — atomic within same request |
