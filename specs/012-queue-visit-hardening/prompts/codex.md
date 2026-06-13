Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not start the next task until check passes.

---

## T001 — Add `hasVisitForDate` to `server/db.ts`

Task: Add a lightweight O(1) helper that checks whether a patient already has a visit on a given date.

1. Read `server/db.ts` — find `getVisitsByPatient` (around line 3182) as the insertion point
2. Insert the following function immediately after `getVisitsByPatient`:

```typescript
export async function hasVisitForDate(
  patientId: number,
  dateIso: string,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: visits.id })
    .from(visits)
    .where(and(eq(visits.patientId, patientId), sql`DATE(${visits.visitDate}) = ${dateIso}`))
    .limit(1);
  return rows.length > 0;
}
```

3. Verify `sql`, `and`, `eq` are already imported from `drizzle-orm` at the top of the file (they are — do not add duplicate imports)
4. Run `pnpm check`

Report: lines added, `pnpm check` result.

---

## T002 — Guard MSSQL sync visit creation

Task: Prevent duplicate visits when MSSQL syncs a patient that was already checked in via the web.

1. Read `server/integrations/mssqlPatients.ts` around line 5241 — find the comment `// Auto-create visit for the patient when synced`
2. The current code unconditionally calls `db.createVisit(...)`. Wrap it with a `hasVisitForDate` check:

```typescript
// Auto-create visit for the patient when synced
if (targetPatientId > 0) {
  const visitDateStr =
    examinationDate instanceof Date
      ? examinationDate.toISOString().split("T")[0]
      : String(examinationDate ?? "").split("T")[0];
  const alreadyHasVisit = await db
    .hasVisitForDate(targetPatientId, visitDateStr)
    .catch(() => false);
  if (!alreadyHasVisit) {
    await db
      .createVisit({
        patientId: targetPatientId,
        visitDate: examinationDate,
        visitType: "consultation",
        branch: createPayload.branch || "examinations",
        queueStatus: "checkedIn",
        checkedInAt: registrationDate,
        createdAt: registrationDate,
      })
      .catch(() => {
        // Silently fail if visit creation doesn't work - patient is still created
      });
  }
}
```

3. Do NOT change anything else in this file
4. Run `pnpm check`

Report: lines changed, `pnpm check` result.

---

## T003 — Replace O(n) scan in `createPatient` existing-patient branch

Task: Replace the `getVisitsByPatient` + `.some()` scan in `medical-patient.ts` with the new `hasVisitForDate` helper.

1. Read `server/routers/medical-patient.ts` — find the existing-patient branch (the block before `return { success: true, reused: true, ... }`)
2. Find the block that currently does:
   ```typescript
   const patientVisits = await db.getVisitsByPatient(existingId).catch(() => [] as any[]);
   const hasTodayVisit = (patientVisits as any[]).some((v: any) => { ... });
   ```
3. Replace it with:
   ```typescript
   const hasTodayVisit = await db
     .hasVisitForDate(existingId, new Date().toISOString().split("T")[0])
     .catch(() => false);
   ```
4. Remove the `patientVisits` variable and the `.some(...)` scan entirely
5. Do NOT change the `if (!hasTodayVisit) { await db.createVisit(...) }` block — keep it exactly as is
6. Run `pnpm check`

Report: lines removed, lines changed, `pnpm check` result.

---

## T005 — Add queue-fix regression test to `server/tests/medical.test.ts`

Task: Add one test that verifies `createPatient` produces a `checkedIn` queue entry for today.

1. Read `server/tests/medical.test.ts` fully
2. Read `server/tests/helpers/auth.ts` to understand `makeCallerAs`
3. Note that `createPatient` checks `db.getEffectiveUserPermissions` against the DB — in the test DB, test user id=123 has no permissions by default. Grant them before the call and revoke in `finally`.
4. Add this test inside the existing `describe.sequential` block, after the last test:

```typescript
it("createPatient creates a today visit so the patient appears in the checkedIn queue", async () => {
  await db.setUserPermissions(123, ["/quick-entry"]);
  try {
    const caller = appRouter.createCaller(makeCallerAs("reception"));
    const today = new Date().toISOString().split("T")[0];

    const result = await caller.medical.createPatient({
      fullName: "Queue Regression Patient",
      phone: "01099999901",
      branch: "examinations",
      serviceType: "consultant",
    });

    expect(result.patientId).toBeGreaterThan(0);

    const queue = await caller.medical.getTodayPatientsByQueueStatus({
      date: today,
      queueStatus: "checkedIn",
    });

    const found = (queue as any[]).find((p) => p.id === result.patientId);
    expect(found).toBeDefined();
    expect(found?.queueStatus).toBe("checkedIn");
  } finally {
    await db.setUserPermissions(123, []);
  }
});
```

5. `db` is already imported as `import * as db from "../db"` — do not add a duplicate import
6. Run `pnpm test:backend`

Report: test added, `pnpm test:backend` result (must show +1 test passing).
