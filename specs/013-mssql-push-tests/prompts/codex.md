Follow the project Constitution and Project Principles strictly.
Run `pnpm test:backend` at the end. All 10 tests must pass.

---

## T001 — Write `server/tests/mssql-push.test.ts`

Task: Write a backend integration test file that confirms all MSSQL push wiring across 3 procedures, using vitest mocks at the MSSQL network boundary.

### Before writing

1. Read `server/routers/medical-patient.ts` fully — understand `createPatient`, `createPatientFromExamination`, `updatePatient`
2. Read `server/integrations/mssqlPatients.ts` lines 2056–2070 — understand `insertPatientToMssql` signature and the `MSSQL_PUSH_NEW_PATIENTS_ENABLED` flag
3. Read `server/integrations/mssqlPatients.ts` lines 2616–2650 — understand `upsertPatientToMssql` signature
4. Read `server/routers/_medical/patient-helpers.ts` lines 200–246 — understand `pushNewPatientToMssql` (this is the function that calls `insertPatientToMssql`)
5. Read `server/tests/medical.test.ts` — follow the same structure (describe.sequential, beforeEach/afterEach cleanup, makeCallerAs, getTestDb)
6. Read `server/tests/helpers/auth.ts` — understand makeCallerAs

### Mock setup

Mock at the MSSQL network boundary — `insertPatientToMssql` and `upsertPatientToMssql` inside `server/integrations/mssqlPatients.ts`:

```typescript
import * as mssqlPatients from "../integrations/mssqlPatients";

vi.mock("../integrations/mssqlPatients", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../integrations/mssqlPatients")>();
  return {
    ...actual,
    insertPatientToMssql: vi.fn(),
    upsertPatientToMssql: vi.fn(),
  };
});
```

**Do NOT mock `pushNewPatientToMssql`** — it lives in `server/routers/_medical/patient-helpers.ts` and calls `insertPatientToMssql`. Mocking only `insertPatientToMssql` ensures the routing logic in `pushNewPatientToMssql` is exercised.

In `beforeEach`, reset mocks and set default return value:
```typescript
beforeEach(async () => {
  vi.mocked(mssqlPatients.insertPatientToMssql).mockResolvedValue({ inserted: true, trNo: 9001 });
  vi.mocked(mssqlPatients.upsertPatientToMssql).mockResolvedValue({ updated: true });
  await resetTables();
  await db.setUserPermissions(123, ["/quick-entry"]);
});

afterEach(async () => {
  await db.setUserPermissions(123, []);
  await resetTables();
  vi.restoreAllMocks();
});
```

`resetTables` should truncate `patients`, `visits`, `patientServiceEntries`, `userPermissions` in the test DB.

### 10 test cases

Write all tests inside `describe.sequential("MSSQL push wiring", () => { ... })`.

**Test 1** — `createPatient` new patient: push called with correct patientCode
```
- Call createPatient({ fullName, phone, branch: "examinations", serviceType: "consultant" })
- Assert insertPatientToMssql was called once
- Assert the call arg patientCode matches result.patientCode
- Assert result.mssqlLinked === true
```

**Test 2** — `createPatient` new patient: push failure does not break patient creation
```
- Mock insertPatientToMssql to throw new Error("MSSQL down")
- Call createPatient(...)
- Assert result.success === true and result.patientId > 0 (patient created in MySQL)
- Assert result.mssqlLinked === false
```

**Test 3** — `createPatient` existing patient: push called with existing patientCode
```
- Seed a patient directly in DB with a known fullName + phone
- Call createPatient with same fullName + phone (triggers existing-patient branch)
- Assert insertPatientToMssql called with the existing patient's patientCode
- Assert result.reused === true
```

**Test 4** — `createPatient` with MSSQL_PUSH_NEW_PATIENTS_ENABLED=false: push skipped
```
- Set process.env.MSSQL_PUSH_NEW_PATIENTS_ENABLED = "false" before call
- Call createPatient(...)
- Assert insertPatientToMssql was NOT called (or called but returned inserted: false)
- Assert result.mssqlLinked === false
- Restore env in finally
```

**Test 5** — `createPatientFromExamination` new patient, no services: push called once
```
- Call createPatientFromExamination({ fullName, phone, serviceType: "consultant", locationType: "center" })
- Assert insertPatientToMssql called exactly once
- Assert the patientCode arg is non-empty
```

**Test 6** — `createPatientFromExamination` new patient, with 2 services: push called twice
```
- Call createPatientFromExamination({ ..., services: [{ code: "S1", qty: 1, price: 100, discount: 0 }, { code: "S2", qty: 1, price: 200, discount: 0 }] })
- Assert insertPatientToMssql called exactly twice
- Assert first call serviceCode === "S1", second call serviceCode === "S2"
```

**Test 7** — `createPatientFromExamination` existing patient: push called with existing patientCode
```
- Seed a patient directly in DB
- Call createPatientFromExamination with same fullName + phone
- Assert insertPatientToMssql called with the existing patientCode
```

**Test 8** — `updatePatient`: upsertPatientToMssql called with correct patientCode and fullName
```
- Seed a patient in DB
- Call updatePatient({ patientId, updates: { fullName: "Updated Name" } })
- Assert upsertPatientToMssql called with patientCode matching the patient
- Assert upsertPatientToMssql arg fullName === "Updated Name"
- Assert result.success === true
```

**Test 9** — `updatePatient`: upsert failure is caught silently
```
- Mock upsertPatientToMssql to throw new Error("MSSQL down")
- Seed a patient, call updatePatient(...)
- Assert result.success === true (update succeeded despite MSSQL failure)
```

**Test 10** — `createPatient` with serviceCode: serviceCode forwarded to push
```
- Call createPatient({ ..., serviceCode: "SVC-001" })
- Assert insertPatientToMssql called with serviceCode === "SVC-001"
```

### Notes

- `createPatientFromExamination` uses `protectedProcedure` — `makeCallerAs("reception")` works
- `updatePatient` uses `receptionProcedure` — `makeCallerAs("reception")` works
- `createPatient` checks DB permissions for userId=123 — the `beforeEach` grants `/quick-entry`
- `updatePatient` checks `canPushToMssql(ctx.user)` before upsert — if this check blocks the push in tests, seed the necessary condition (check `canPushToMssql` implementation in `patient-helpers.ts`)
- Use unique phone numbers per test to avoid `findExistingPatientByNameOrPhone` cross-contamination

### After writing

Run `pnpm test:backend`. All 10 new tests must pass alongside the existing 30.

Report: test file written, `pnpm test:backend` result (must show 40 total passing).
