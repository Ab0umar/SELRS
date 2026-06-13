Follow the project Constitution and Project Principles strictly.
These are gate tasks — run after T001 completes.

---

## T002 — pnpm check + pnpm test:backend gate

Task: Verify TypeScript is clean and all MSSQL push tests pass.

1. Run `pnpm check`
2. Run `pnpm test:backend`
3. Backend test count must be previous (30) + 10 = 40
4. If any of the 10 new tests fail: report the test name and failure message — do not fix production code

Report: check exit code, test results (X pass / Y fail), breakdown by file.

---

## T003 — Full suite gate

Task: Final verification that nothing was broken.

1. Run `pnpm check`
2. Run `pnpm test` (frontend — must still be 105/105)
3. Run `pnpm test:backend` (must be ≥ 40, all passing)

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: all three exit codes, frontend count (must be 105), backend count + breakdown by file.
