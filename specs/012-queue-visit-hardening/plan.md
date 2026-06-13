# Plan: Queue Visit Hardening

**Branch**: `012-queue-visit-hardening`
**Depends on**: `011-backend-tests` merged

## Approach

Three targeted edits + one new test. No schema changes, no new tables.

### T001 — Add `hasVisitForDate` to `server/db.ts`

Insert after `getVisitsByPatient` (line ~3182). Single `SELECT id LIMIT 1` filtered by `patientId` and `DATE(visitDate) = dateIso`. Returns `boolean`.

Imports needed: `sql` and `and` are already imported in `db.ts`.

### T002 — Guard MSSQL sync visit creation

In `server/integrations/mssqlPatients.ts` around line 5242, wrap the `createVisit` call:

```
if (!await db.hasVisitForDate(targetPatientId, visitDateStr)) {
  await db.createVisit({ ... })
}
```

`visitDateStr` is derived from `examinationDate` — convert to ISO date string (`YYYY-MM-DD`).

### T003 — Replace O(n) scan in `createPatient` existing-patient branch

In `server/routers/medical-patient.ts`, the existing-patient branch (around line 270) currently calls `db.getVisitsByPatient(existingId)` and scans for today. Replace with:

```
const hasTodayVisit = await db.hasVisitForDate(existingId, todayStr);
```

Delete the `getVisitsByPatient` call and the `.some(...)` scan entirely.

### T004 — Backend integration test for queue fix

Add one test case to `server/tests/medical.test.ts`:

- Grant test user (id=123) the `/quick-entry` permission via `db.setUserPermissions` before calling (createPatient checks DB permissions, not just role)
- Call `createPatient` via tRPC caller
- Call `getTodayPatientsByQueueStatus({ date: today, queueStatus: "checkedIn" })`
- Assert the new patient is in the result
- Cleanup: revoke the permission in `finally`

## Key Rules

- `hasVisitForDate` must not throw if DB is unavailable — return `false` so callers fall through to `createVisit` (existing catch handles it)
- Do not change any queue card UI or other callers of `createVisit`
- Run `pnpm check` after T001–T003, `pnpm test:backend` after T004
