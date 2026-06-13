# Spec: MSSQL Push Tests

**Branch**: `013-mssql-push-tests`
**Depends on**: `012-queue-visit-hardening` merged

## Problem

There are 7 MSSQL push call sites across 3 procedures with no test coverage. The pushes fire-and-forget with silent `.catch()`, so a wiring break would go undetected until a patient fails to appear in the MSSQL system. There is no way to confirm "the pushes are working" without a live MSSQL connection.

## Goal

Write a backend test suite that confirms all MSSQL push wiring — without requiring a live MSSQL connection — by mocking `insertPatientToMssql` and `upsertPatientToMssql` at the integration boundary.

## Push call sites (all 7)

| Procedure | Push fn | Trigger |
|---|---|---|
| `createPatient` | `pushNewPatientToMssql` | existing patient re-check-in |
| `createPatient` | `pushNewPatientToMssql` | new patient |
| `createPatientFromExamination` | `pushNewPatientToMssql` | existing patient, no services |
| `createPatientFromExamination` | `pushNewPatientToMssql` | existing patient, with services |
| `createPatientFromExamination` | `pushNewPatientToMssql` | new patient, no services |
| `createPatientFromExamination` | `pushNewPatientToMssql` | new patient, with services |
| `updatePatient` | `upsertPatientToMssql` | patient details edit |

## Test strategy

Mock `insertPatientToMssql` (the MSSQL network boundary inside `mssqlPatients.ts`) and `upsertPatientToMssql` using `vi.mock`. Each test:

1. Sets up mock to return `{ inserted: true, trNo: 9001 }`
2. Calls the tRPC procedure
3. Asserts the mock was called with the expected `patientCode`, `serviceCode`, `doctorCode`
4. For error path tests: sets mock to throw, asserts patient is still created and `mssqlLinked: false`
5. For disabled-flag tests: sets `MSSQL_PUSH_NEW_PATIENTS_ENABLED=false`, asserts push is skipped

## Test cases (10 total)

1. `createPatient` new patient — push called with correct patientCode
2. `createPatient` new patient — push failure does not break patient creation (`mssqlLinked: false`)
3. `createPatient` existing patient — push called with existing patientCode
4. `createPatient` with `MSSQL_PUSH_NEW_PATIENTS_ENABLED=false` — push skipped, `mssqlLinked: false`
5. `createPatientFromExamination` new patient, no services — push called once
6. `createPatientFromExamination` new patient, with 2 services — push called twice (once per service)
7. `createPatientFromExamination` existing patient — push called with existing patientCode
8. `updatePatient` — `upsertPatientToMssql` called with correct patientCode and fullName
9. `updatePatient` — upsert failure is caught silently, `{ success: true }` still returned
10. `createPatient` with serviceCode — push called with serviceCode forwarded correctly

## Out of Scope

- Testing actual MSSQL SQL queries (requires live MSSQL)
- Testing the sync-from-MSSQL path
- Dead import cleanup (6 files import `upsertPatientToMssql` but never call it — separate cleanup task)
