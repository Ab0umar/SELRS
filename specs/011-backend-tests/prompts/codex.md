Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not start the next task until check passes.

---

## T001 — Create test infrastructure

Task: Create the backend test scaffolding under `server/tests/`.

1. Read `server/db.ts` and `server/_core/trpc.ts` to understand the DB connection and context shape
2. Create `server/tests/setup.ts`:
   ```typescript
   import { drizzle } from 'drizzle-orm/mysql2';
   import mysql from 'mysql2/promise';

   let connection: mysql.Connection | null = null;

   export async function getTestDb() {
     if (!connection) {
       connection = await mysql.createConnection(
         process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL!
       );
     }
     return drizzle(connection);
   }

   export async function cleanupTables(db: ReturnType<typeof drizzle>, ...tableNames: string[]) {
     for (const table of tableNames) {
       await db.execute(`DELETE FROM ${table} WHERE _test = 1`);
     }
   }
   ```
   Adjust the cleanup approach to match the project's actual drizzle/mysql setup — use `db.execute` with a test marker column if available, or truncate if the test DB is isolated.

3. Create `server/tests/helpers/auth.ts`:
   ```typescript
   // Returns a tRPC caller context with the given role mocked
   export function makeCallerAs(role: string) {
     return {
       user: { id: 'test-user-id', role, branchId: 1 },
       // add any other context fields the procedures expect
     };
   }
   ```
   Read `server/_core/context.ts` to match the exact shape of the context object.

4. Create `server/tests/helpers/db.ts` with seed helpers:
   ```typescript
   export async function seedEmployee(db: any, overrides: Record<string, any> = {}) {
     // insert a minimal employee record for tests
   }
   export async function seedKfPatient(db: any, overrides: Record<string, any> = {}) {
     // insert a minimal KF patient record
   }
   ```

5. Add to `package.json` scripts:
   ```json
   "test:backend": "vitest run server/tests"
   ```

6. Run `pnpm check`

Report: files created, pnpm check result.

---

## T002 — Write server/tests/auth.test.ts — role-based procedure protection

Task: Write tests that verify the permission system works correctly.

1. Read `server/_core/procedures.ts` and `server/_core/trpc.ts`
2. Read `server/routers/attendance-leaves.ts` and `server/routers/kf.ts` (or wherever KF procedures live) to find a protected write procedure in each domain
3. Write `server/tests/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { makeCallerAs } from './helpers/auth';
import { TRPCError } from '@trpc/server';

describe('Role-based procedure protection', () => {
  it('calling a protectedProcedure with no auth throws UNAUTHORIZED', async () => {
    // call a procedure with null/undefined user context
    // expect TRPCError with code UNAUTHORIZED
  });

  it('calling attendance write procedure as viewer role throws FORBIDDEN', async () => {
    // use makeCallerAs('viewer') and call createLeave or equivalent
    // expect TRPCError with code FORBIDDEN
  });

  it('calling KF write procedure without KF permission throws FORBIDDEN', async () => {
    // use makeCallerAs('receptionist') and call kfCreatePatient
    // expect TRPCError with code FORBIDDEN
  });

  it('calling admin procedure as non-admin throws FORBIDDEN', async () => {
    // use makeCallerAs('nurse') and call an admin-only procedure
    // expect TRPCError with code FORBIDDEN
  });

  it('calling with correct role succeeds', async () => {
    // use makeCallerAs('admin') and call a write procedure
    // expect no TRPCError (or a data error, not a permission error)
  });
});
```

Fill in the actual procedure calls using the project's tRPC caller pattern. Look at how existing tests call procedures if any exist.

4. Run `pnpm test:backend`

Report: test count, pass/fail, pnpm check result.

---

## T004 — Write server/tests/attendance.test.ts

Task: Write integration tests for attendance leave and permission mutations.

1. Read `server/routers/attendance-leaves.ts` fully
2. Read the drizzle schema for `attendance_leaves`, `attendance_permissions`, `attendance_holidays` tables
3. Write `server/tests/attendance.test.ts` with these test cases:
   - `createLeave` happy path — creates a leave record, returns success
   - `createLeave` with overlapping dates — returns validation error
   - `approveLeave` by authorized role — succeeds
   - `approveLeave` by unauthorized role — throws FORBIDDEN
   - `deleteLeave` — removes the record
   - `createPermission` happy path — creates permission record
   - `deletePermission` happy path — removes it
   - `addHoliday` — creates a holiday record
   - `deleteHoliday` — removes it

4. Each test: seeds required employee data before, cleans up after (use `getTestDb()` and `cleanupTables()`)
5. Do NOT mock the DB layer — use a real test DB connection
6. Run `pnpm test:backend`

Report: test count (must be 9), pass/fail, any setup issues.

---

## T006 — Write server/tests/kf.test.ts

Task: Write integration tests for KF patient/visit/exam/op/followup procedures.

1. Read the KF tRPC router (find it via `server/routers/index.ts`)
2. Read the drizzle schema for `kf_patients`, `kf_visits`, `kf_examinations`, `kf_operations`, `kf_followups`
3. Write `server/tests/kf.test.ts` with these test cases:
   - `kfCreatePatient` happy path — creates patient, returns id with KF-XXXX format code
   - `kfCreatePatient` duplicate NID — returns error
   - `kfCreateVisit` for existing patient — returns visit record
   - `kfCreateExamination` — returns examination record
   - `kfCreateOperation` — returns operation record
   - `kfCreateFollowup` — returns followup record
   - accountant role can create KF patient (admin bypass check)
   - unauthorized role (e.g. viewer) cannot create KF patient — throws FORBIDDEN

4. Use `seedKfPatient()` helper for tests that need an existing patient
5. Do NOT mock the DB layer
6. Run `pnpm test:backend`

Report: test count (must be 8), pass/fail.

---

## T008 — Write server/tests/medical.test.ts

Task: Write integration tests for patient service entries, queue, and status mutations.

1. Read `server/routers/medical-patient.ts` (or the relevant medical sub-router)
2. Read the drizzle schema for `patient_service_entries` and patient tables
3. Write `server/tests/medical.test.ts` with these test cases:
   - `createPatientServiceEntry` — creates an entry, returns id
   - `updatePatientServiceEntry` — updates fields correctly
   - `deletePatientServiceEntry` — removes the entry
   - `setPatientStatus` — changes patient status field
   - `setPatientQueue` — sets queue position
   - `getPatientServiceEntries` — returns correct entries for patient (not other patients)
   - unauthorized role cannot mutate patient service entries — throws FORBIDDEN

4. Seed a minimal patient record before tests; clean up after
5. Do NOT mock the DB layer
6. Run `pnpm test:backend`

Report: test count (must be 7), pass/fail.
