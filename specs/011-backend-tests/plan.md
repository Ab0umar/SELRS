# Plan: Backend Integration Tests

**Branch**: `011-backend-tests`
**Hard Dependency**: none (independent of plans 009/010)

## Approach

Add a vitest backend test suite under `server/tests/`. Each test file covers one router domain. Tests use a real MySQL test database (separate from dev DB), isolated per test run via transaction rollback or table truncation.

## Test Stack

- **Runner**: vitest (matches existing frontend stack — no new tooling)
- **DB**: real MySQL test DB (env var `DATABASE_TEST_URL`) — no mocking of drizzle/db.ts
- **Device mocking**: ZKTeco/FK device calls mocked at the service boundary only (not DB)
- **Auth**: helper that creates a real JWT/session token for a given role

## File Map

```
server/tests/
  setup.ts              ← test DB connection + teardown helpers
  helpers/
    auth.ts             ← makeCallerAs(role) helper
    db.ts               ← seedEmployee(), seedPatient(), cleanup()
  attendance.test.ts    ← leave, permission, holiday mutations
  kf.test.ts            ← kf patient/visit/exam/op/followup
  medical.test.ts       ← patient service entries, queue, status
  auth.test.ts          ← role protection: unauthorized callers get FORBIDDEN
```

## Priority Order

1. `auth.test.ts` — verifies the permission system works; all other tests depend on this being correct
2. `attendance.test.ts` — highest mutation risk (leave/permission approval chains)
3. `kf.test.ts` — isolated MySQL-only module, easiest to test independently
4. `medical.test.ts` — most complex but highest business value

## Key Rules

- No production code changes to make tests pass
- Each test is self-contained: seeds its own data, cleans up after
- Device-layer mocks (`vi.mock`) only — never mock DB layer
- `pnpm test:backend` added to `package.json` scripts
- Tests must pass in CI without hardware

## Constitution Check

- No changes to production code
- New `pnpm test:backend` script is additive
- `pnpm check` still passes (server/tests/ included in tsconfig)
