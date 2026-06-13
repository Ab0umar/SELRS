# Tasks: Backend Integration Tests

**Branch**: `011-backend-tests`
**Hard Dependency**: none (independent)
**Input**: `specs/011-backend-tests/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup

- [x] T001 Create test infrastructure: `server/tests/` directory + setup file + scripts
  - **Owner**: Codex | **Tool**: Write
  - **Prompt**: "Create `server/tests/setup.ts` that: (1) reads `DATABASE_TEST_URL` env var (fallback to `DATABASE_URL`), (2) exports `getTestDb()` returning a drizzle connection to the test DB, (3) exports `cleanupTables(...tableNames)` that truncates the given tables after each test. Create `server/tests/helpers/auth.ts` that exports `makeCallerAs(role: string)` — a helper that creates a tRPC caller with a mocked user context for the given role. Create `server/tests/helpers/db.ts` that exports `seedEmployee(db, overrides?)` and `seedKfPatient(db, overrides?)` seed helpers. Add `\"test:backend\": \"vitest run server/tests\"` to `package.json` scripts. Run `pnpm check`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: Files created; `pnpm check` passes

**Checkpoint**: Test infrastructure ready.

---

## Phase 2: Auth Tests (P0 — must pass before other test files)

- [x] T002 Write `server/tests/auth.test.ts` — role-based procedure protection
  - **Owner**: Codex | **Tool**: Write
  - **Input**: `server/_core/procedures.ts`, `server/_core/trpc.ts`
  - **Prompt**: "Read `server/_core/procedures.ts` and `server/_core/trpc.ts`. Write `server/tests/auth.test.ts` using vitest. Test cases: (1) calling a `protectedProcedure` with no auth context throws UNAUTHORIZED, (2) calling an attendance write procedure as a viewer role throws FORBIDDEN, (3) calling a KF write procedure as a role without KF permission throws FORBIDDEN, (4) calling an admin procedure as a non-admin throws FORBIDDEN, (5) calling with the correct role succeeds (returns data, not an error). Use `makeCallerAs()` from helpers/auth.ts. Run `pnpm test:backend`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: All 5 tests pass

- [x] T003 Run `pnpm check` + `pnpm test:backend`
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Both exit 0

**Checkpoint**: Permission system verified.

---

## Phase 3: Attendance Tests

- [x] T004 Write `server/tests/attendance.test.ts` — leave and permission mutations
  - **Owner**: Codex | **Tool**: Write
  - **Input**: `server/routers/attendance-leaves.ts`
  - **Prompt**: "Read `server/routers/attendance-leaves.ts`. Write `server/tests/attendance.test.ts` using vitest. Test cases: (1) `createLeave` happy path — creates a leave record, returns success; (2) `createLeave` with overlapping dates returns an error; (3) `approveLeave` by authorized role succeeds; (4) `approveLeave` by unauthorized role throws FORBIDDEN; (5) `deleteLeave` removes the record; (6) `createPermission` happy path; (7) `deletePermission` happy path; (8) `addHoliday` creates a holiday record; (9) `deleteHoliday` removes it. Use `getTestDb()` and `cleanupTables()` from helpers. Seed required employee data before each test. Do not mock the DB layer. Run `pnpm test:backend`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: All 9 tests pass

- [x] T005 Run `pnpm check` + `pnpm test:backend`
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Both exit 0; test count ≥ 14 (T002 + T004)

---

## Phase 4: KF Tests

- [x] T006 Write `server/tests/kf.test.ts` — KF patient/visit/exam/op/followup
  - **Owner**: Codex | **Tool**: Write
  - **Input**: `server/routers/kf.ts` (or wherever KF procedures live)
  - **Prompt**: "Read the KF tRPC router. Write `server/tests/kf.test.ts` using vitest. Test cases: (1) `kfCreatePatient` happy path — creates patient, returns id with KF-XXXX code; (2) `kfCreatePatient` duplicate NID returns error; (3) `kfCreateVisit` for existing patient returns visit record; (4) `kfCreateExamination` returns examination record; (5) `kfCreateOperation` returns operation record; (6) `kfCreateFollowup` returns followup record; (7) accountant role can create KF patient (bypass check); (8) unauthorized role cannot create KF patient. Use `getTestDb()` and `seedKfPatient()` helpers. Do not mock the DB layer. Run `pnpm test:backend`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: All 8 tests pass

- [x] T007 Run `pnpm check` + `pnpm test:backend`
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Both exit 0; test count ≥ 22

---

## Phase 5: Medical Tests

- [x] T008 Write `server/tests/medical.test.ts` — patient service entries + queue + status
  - **Owner**: Codex | **Tool**: Write
  - **Input**: `server/routers/medical-patient.ts` (or equivalent)
  - **Prompt**: "Read the medical patient tRPC procedures. Write `server/tests/medical.test.ts` using vitest. Test cases: (1) `createPatientServiceEntry` creates an entry; (2) `updatePatientServiceEntry` updates correctly; (3) `deletePatientServiceEntry` removes entry; (4) `setPatientStatus` changes status; (5) `setPatientQueue` sets queue position; (6) `getPatientServiceEntries` returns correct entries for patient; (7) unauthorized role cannot mutate patient service entries. Use `getTestDb()` and seed helpers. Do not mock the DB layer. Run `pnpm test:backend`. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: All 7 tests pass

- [x] T009 Run `pnpm check` + `pnpm test:backend`
  - **Owner**: Claude | **Tool**: Bash
  - **Acceptance**: Both exit 0; test count ≥ 29

---

## Final Phase: Verification

- [x] T010 Run full verification suite
  - **Owner**: Claude | **Tool**: Bash
  - **Prompt**: "Run `pnpm check`, then `pnpm test` (frontend), then `pnpm test:backend`. Report all three exit codes, frontend test count, backend test count (must be ≥ 30). Produce standard task report: changed files / what changed / checks run / checks skipped. Follow the project Constitution and Project Principles strictly."
  - **Acceptance**: All three pass; backend test count ≥ 30

---

## Dependencies & Execution Order

```
T001 → T002 → T003
T003 → T004 → T005
T005 → T006 → T007
T007 → T008 → T009 → T010
```

## Notes

- T002 (auth tests) is a hard prerequisite — if role protection is broken, other tests give false results
- Device-layer mocks (`vi.mock('...FKDeviceSyncService')`) are permitted — only DB layer must be real
- Tests run against `DATABASE_TEST_URL` — never the dev or production DB
- `pnpm test` (frontend) must still pass — backend tests are additive only
