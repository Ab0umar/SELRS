Follow the project Constitution and Project Principles strictly.
These are gate tasks — run after each test-writing phase completes.

---

## T003 — pnpm check + pnpm test:backend after auth tests

Task: Run `pnpm check` and `pnpm test:backend` after T001 (infrastructure) and T002 (auth tests) are complete.

1. Run `pnpm check` — zero TypeScript errors required (server/tests/ must be included in tsconfig)
2. Run `pnpm test:backend`
3. If check fails with "cannot find module" or tsconfig errors: read `tsconfig.json`, add `server/tests/**/*` to `include` if missing
4. Report test count from T002 (must be 5 auth tests passing)

Report: check exit code, test results (X pass / Y fail), any tsconfig fixes needed.

---

## T005 — pnpm check + pnpm test:backend after attendance tests

Task: Run `pnpm check` and `pnpm test:backend` after T004 (attendance tests) complete.

1. Run `pnpm check`
2. Run `pnpm test:backend`
3. Total test count must be ≥ 14 (5 auth + 9 attendance)
4. If any attendance tests fail: read `server/tests/attendance.test.ts` and `server/routers/attendance-leaves.ts` to identify the mismatch — report the failure, do not fix production code

Report: check exit code, total test count (X pass / Y fail), breakdown by file.

---

## T007 — pnpm check + pnpm test:backend after KF tests

Task: Run `pnpm check` and `pnpm test:backend` after T006 (KF tests) complete.

1. Run `pnpm check`
2. Run `pnpm test:backend`
3. Total test count must be ≥ 22 (14 previous + 8 KF)
4. If any KF tests fail: report the failure and the procedure name — do not fix production code

Report: check exit code, total test count (X pass / Y fail), breakdown by file.

---

## T009 — pnpm check + pnpm test:backend after medical tests

Task: Run `pnpm check` and `pnpm test:backend` after T008 (medical tests) complete.

1. Run `pnpm check`
2. Run `pnpm test:backend`
3. Total test count must be ≥ 29 (22 previous + 7 medical)

Report: check exit code, total test count (X pass / Y fail), breakdown by file.

---

## T010 — Final verification: pnpm check + pnpm test (frontend) + pnpm test:backend

Task: Run the full verification suite as the final gate for plan 011.

1. Run `pnpm check` — zero errors required
2. Run `pnpm test` — frontend tests must still pass (105/105)
3. Run `pnpm test:backend` — must be ≥ 30 tests, all passing
4. Confirm `pnpm test` (frontend) was NOT broken by the new backend test files

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: all three exit codes, frontend test count (must be 105), backend test count (must be ≥ 30), breakdown by backend test file.
