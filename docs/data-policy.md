# Data Ownership and Cache Policy

Where each kind of data lives, which fields may be cached, and when caches are cleared.
Accounting-specific rules are in `accounting-boundary.md`.

## Ownership

- **MySQL (`selrs26`)** is the source of truth for medical records.
- **MSSQL (`opYYYY`, السنة تُختار عند الدخول)** is the source of truth for accounting receipts and service lines.
- Patient/service fields are refreshed from MSSQL into MySQL by the sync, and
  registration/patient-update workflows push their designated fields to MSSQL through the
  established helper (`pushNewPatientToMssql()`). Do not create ad hoc direct MSSQL
  writes, and keep field mapping, patient-code identity and error handling intact.

### Authoritative medical tables (MySQL)

`examinations`, `examination_checklist_items`, `autorefractometryData`,
`pentacamResults`, `glassesRecords`, `prescriptions`, `prescriptionItems`,
`doctorReports`, `medicalHistoryChecklist`, `postOpFollowups`, `consentForms`,
`surgeries`. Display layers read these tables only, never a cached copy.

### Synced fields

| Field | Source | Rule |
| --- | --- | --- |
| `doctorCode`, `doctorId`, `treatingDoctor` | `PAPAT_SRV.SRV_BY1` / `doctorsLookup` | Never cache |
| `serviceCode`, `serviceType`, `locationType` | `PAPAT_SRV.SRV_CD` / service catalog | Never cache |

`doctorCode` and `serviceCode` must come from the same `PAPAT_SRV` row, and
`attachTreatingDoctor()` must not overwrite a non-blank `patients.serviceType` or
`locationType` (see `CLAUDE.md`).

### Sync flows

- **MSSQL to MySQL:** reads `PAJRNRCVH`, `PAPAT_SRV`, `MDTEAM`, `SRVCMF`; writes
  `patients` and `patientServiceEntries`; runs nightly (configurable) and maps MSSQL
  codes to MySQL ids.
- **MySQL to MSSQL:** medical patient registration and applicable edits only.
- If MSSQL is unavailable, keep existing MySQL data and follow the existing sync/push
  error path; do not substitute an unapproved write or a stale cross-store update.

## `patientPageStates` cache

`patientPageStates` is a UI workflow cache, not a medical source of truth. One row per
patient and page (`examination`, `quick-entry`, `medical-file`), JSON `data`, saved
through `medical.savePatientPageState` (debounced 800 ms, disabled for the exam) and read
through `medical.getPatientPageState`.

**Allowed in the cache:** `sheetSelection`, `visitDate`, `isFollowup`, `activeTab`,
`unsavedDraft`.

**Forbidden in the cache:** `doctorCode`, `doctorId`, `doctorName`, `serviceCode`,
`serviceName`, `serviceType`, `serviceQty`, `servicePrice`, `discountValue`,
`mssqlBackfill`, `syncLockManual`, any examination result, checklist state or
prescription data. A cache miss means a fresh query, never stale data.

The save procedure validates `data` with a Zod schema of the allowed fields, and the
notification doctor name is read fresh from the patient row
(`readFreshDoctorNameForPatient`), never from the cache.

### When caches are cleared

| Trigger | Mechanism |
| --- | --- |
| After a successful MSSQL sync, for patients whose `doctorCode` or `serviceCode` changed | `invalidatePatientPageStateCache()` in `server/integrations/mssqlPatients.ts` |
| After a successful examination save | `medical-examinations.ts` calls `invalidatePatientPageStateCache()` |
| Patient switch | `deletePatientCachePages()` in `useExaminationForm.ts` |
| Logout | `clearAllPatientCaches()` in `useAuth.ts` |
| Admin "Reset MSSQL Sync" | `resetMssqlSyncCodes()` clears sync codes and all caches, then a full sync repopulates |

Clinical checklist source of truth is `examination_checklist_items` and demographics
are `patients`. `scripts/backfill-examination-checklist.ts` backfills the checklist table
from old JSON; run and verify it before ever deleting `patientPageStates` rows.

Helpers live in `client/src/lib/patientCacheCleanup.ts` and `server/db.ts`. Invalidation
failures are logged and never block a sync or an exam save; the next sync or an admin
reset recovers. Users can recover by reopening the page, switching patients, or logging
out and in.

### Red flags

- Doctor or service values, or any exam result, found in `patientPageStates` JSON.
- A display falling back to JSON when a MySQL table is empty.
- Repeated cleanup failures (more than 3 per hour) or any attempted stale hydration.

### Verification ideas

Sync changes `doctorCode` then the cache invalidates and a fresh load shows the new
doctor; saving an exam then reopening shows fresh checklist data; switching patients
and logging out leave no cache behind.
