# Spec: Queue Visit Hardening

**Branch**: `012-queue-visit-hardening`
**Depends on**: `011-backend-tests` merged

## Problem

Three defects exist in the web patient check-in flow introduced by the `createPatient` queue fix:

1. **Duplicate visit risk** — `createPatient` now creates a today's visit with `queueStatus = "checkedIn"`. When MSSQL syncs the same patient back, `mssqlPatients.ts` unconditionally creates a second visit for the same date. The queue UI deduplicates by `patientId`, so display is correct, but the DB accumulates extra rows.

2. **O(n) visit scan in existing-patient check-in** — When `createPatient` finds an existing patient by name/phone match, it guards against double check-in by calling `db.getVisitsByPatient(id)` (loads every historical visit) then scanning for today. For long-tenured patients this is unnecessary I/O.

3. **No regression test for the queue fix** — The queue bug fix ("web patients don't appear in queue cards") has no test coverage. A future refactor could silently re-introduce the bug.

## Goal

- Add a `hasVisitForDate(patientId, dateIso)` helper to `server/db.ts` — a single `COUNT` query, O(1)
- Use it in the MSSQL sync path to skip visit creation when one already exists
- Use it in the existing-patient branch of `createPatient` to replace the O(n) scan
- Add a backend integration test that calls `createPatient` and asserts the patient appears in `getTodayPatientsByQueueStatus("checkedIn")`

## Out of Scope

- Changes to queue card UI
- Other createPatient flows (new patient path already creates the first visit; no dedup needed there)
- Migration or backfill of existing duplicate visit rows
