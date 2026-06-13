# Plan: MSSQL Push Tests

**Branch**: `013-mssql-push-tests`
**Depends on**: `012-queue-visit-hardening` merged

## Approach

Single test file: `server/tests/mssql-push.test.ts`

### Mock boundary

Mock at `server/integrations/mssqlPatients.ts` — the two exported functions that make the actual network call:

```typescript
vi.mock("../integrations/mssqlPatients", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../integrations/mssqlPatients")>();
  return {
    ...actual,
    insertPatientToMssql: vi.fn(),
    upsertPatientToMssql: vi.fn(),
  };
});
```

This intercepts at the MSSQL network boundary. Everything above (patientCode assembly, serviceCode resolution, `pushNewPatientToMssql` routing logic) runs for real.

### Permission setup

`createPatient` checks DB permissions for user id=123. Use `db.setUserPermissions(123, ["/quick-entry"])` in `beforeEach`, revoke in `afterEach`. Same pattern as the queue regression test in `medical.test.ts`.

`createPatientFromExamination` and `updatePatient` use role-based procedures — `makeCallerAs("reception")` is sufficient.

### Env flag test

For test 4 (disabled flag): set `process.env.MSSQL_PUSH_NEW_PATIENTS_ENABLED = "false"` before the call, restore after in `finally`.

### `canPushToMssql` guard

`updatePatient` checks `canPushToMssql(ctx.user)` before calling `upsertPatientToMssql`. This function queries the DB or checks env flags. Verify the test user passes this guard — seed if needed.

## Key rules

- Do NOT mock `pushNewPatientToMssql` — mock only `insertPatientToMssql` so the routing logic is exercised
- Run `pnpm test:backend` after writing — total must be previous count + 10
- Clean up `patients`, `visits`, `userPermissions` tables after each test
- Device-layer mocks (`vi.mock`) are explicitly permitted per plan 011 notes
