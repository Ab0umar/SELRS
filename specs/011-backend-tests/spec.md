# Spec: Backend Integration Tests

## Problem

All 105 existing tests are frontend vitest unit tests. The backend tRPC procedures — including attendance mutations, KF clinical flows, medical sync, and patient operations — have zero automated coverage.

`pnpm check` catches type errors. `pnpm test` only exercises the frontend. A broken attendance mutation or a bad KF procedure can pass all checks and ship silently.

High-risk procedures that currently have no test coverage:
- Attendance: `createLeave`, `approveLeave`, `deleteLeave`, `createPermission`, `syncNow`, `addHoliday`
- KF: `kfCreatePatient`, `kfCreateVisit`, `kfCreateExamination`, `kfCreateOperation`, `kfCreateFollowup`
- Medical/patient: `createPatientServiceEntry`, `setPatientStatus`, `setPatientQueue`
- Auth: token validation, role-based procedure protection

## Goal

Add a backend test suite using vitest (matching the existing frontend test stack) that covers the critical mutation paths. Tests should hit a real test database, not mocks.

Target: ≥ 30 backend integration tests covering the highest-risk procedures across attendance, KF, and medical domains. Each test should verify the happy path and at least one permission/validation failure.

## Success Criteria

- `pnpm test:backend` (new script) passes with ≥ 30 tests
- Tests hit a real DB (no mocking of db.ts or drizzle queries)
- Role-based access: each protected procedure tested with both authorized and unauthorized caller
- CI can run tests without hardware (no ZKTeco/FK device required — mock only the device layer, not the DB)
- `pnpm check` still passes

## Constraint

Do not change production code to make tests pass. Tests adapt to the code, not the reverse.
