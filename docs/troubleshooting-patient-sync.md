# Troubleshooting: "My change doesn't stick" (patient sync & service type)

Symptom → cause → fix runbook for patient data that reverts, never updates, or filters wrongly.

## 1. serviceType / locationType reverts after a manual edit

- **Symptom:** Admin edits (bulk action, single-row save, MSSQL sync write) look saved, but the next patient list fetch shows the old value.
- **Cause:** `attachTreatingDoctor()` in `server/db.ts` (called by `getAllPatients()`) enriches every row and overwrote `serviceType`/`locationType` with values derived from the service code.
- **Rule:** The real `patients.serviceType` / `patients.locationType` DB column wins whenever it is non-blank. Service-code-derived classification is a fallback only for blank columns:

```ts
serviceType: (() => {
  const dbServiceType = String((patient as any).serviceType ?? "").trim();
  if (dbServiceType) return dbServiceType;  // DB column wins
  // ... service-code fallback only when blank
})(),
```

- **Fix:** Check the computed `serviceType` and `locationType` in `attachTreatingDoctor()`'s result map and restore the DB-first check. Confirm by reading the column directly in MySQL.

## 2. MSSQL sync "changes nothing"

- **Symptom:** Sync runs successfully, but doctor/service on a patient does not change.
- **Cause A – stale exam state:** The exam page-state JSON (`patientPageStates`) persists and overrides fresh sync data. For patients that are **not manually locked**, resolution chains must not use `latestExamDoctorByPatient`, `latestExamServiceCodeByPatient` or similar exam-state fields. Use only synced DB fields plus the official `patientServiceEntries` table. (`patientPageStates` is UI cache only; see `data-policy.md`.)
- **Cause B – doctor/service mismatch:** `doctorCode` and `serviceCode` must come from the **same `PAPAT_SRV` row**. Do not take `doctorCode` independently from `PAJRNRCVH.DRS_CD`. Priority: `SRV_BY1` from the service row first, `DRS_CD` only as fallback.
- **Fix:** Remove exam-state fields from the resolution chain for non-locked patients; derive both codes from one `PAPAT_SRV` row.

## 3. When to run `resetMssqlSyncCodes`, then a full sync

- **Use when:** Existing patients carry wrong or mismatched `doctorCode` / `serviceCode` from earlier buggy syncs and a normal sync does not repair them.
- **What it does:** `resetMssqlSyncCodes()` (`server/db.ts`) bulk-clears `doctorCode`, `doctorId`, `serviceCode` and deletes mssql-sourced `patientServiceEntries`. It is exposed as the admin-only tRPC mutation `resetMssqlSyncCodes` in `server/routers/medical-mssql.ts`.
- **Then:** Run a **full** MSSQL sync to repopulate. Do not stop after the reset, or patients stay without codes.
- **Caution:** It is bulk and destructive for synced codes; run it deliberately, not as a routine step.

## 4. Filter shows wrong / too few patients (exact-match serviceType)

- `getServiceTypeFilterVariants(serviceType)` in `shared/serviceType.ts` returns `[serviceType]`: exact match only. Backend (`buildPatientFilterClauses` in `db.ts`) and frontend (`sheetTypeMatchesFilter` in `adminPatientsShared.ts`) must both use it. Never blend several values into one filter; reclassify the data instead.
- The 12 valid values: `consultant`, `specialist`, `lasik`, `surgery`, `external`, `pentacam_c`, `pentacam_ex`, `pentacam_ex_c`, `surgery_external`, `surgery_center`, `pentacam_center`, `pentacam_external`.
- `locationType` is derived with `isExternalServiceType()`, true for: `external`, `pentacam_ex`, `pentacam_ex_c`, `pentacam_external`, `surgery_external`. Stats that count by `locationType` depend on it being set whenever `serviceType` changes.

## 5. Garbled Arabic text (mojibake)

- `server/db.ts` handles legacy encoding with `decodeMojibake()`, `encodeForLegacySearch()` and `decodePatientRow()`. Rows are decoded on read; searches encode the term for legacy-stored data.
- **Fix:** Do not remove or bypass these helpers. If new code reads patient text columns directly, route rows through `decodePatientRow()`; new search paths need `encodeForLegacySearch()`.

## 6. Drizzle migration fails or hangs

- Multiple statements in one migration file must be separated by the exact marker `--> statement-breakpoint` on its own line. Semicolons alone do not work with the migration runner.
- Never add `NOT NULL` in an `ALTER TABLE ... MODIFY COLUMN` if any existing row may hold NULL in that column; backfill first, or leave the column nullable.

```sql
ALTER TABLE `patients` ADD `exampleA` varchar(50);
--> statement-breakpoint
ALTER TABLE `patients` ADD `exampleB` varchar(50);
```
