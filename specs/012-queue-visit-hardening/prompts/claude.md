Follow the project Constitution and Project Principles strictly.
These are gate tasks — run after each implementation phase completes.

---

## T004 — pnpm check gate after T001–T003

Task: Verify TypeScript is clean after `hasVisitForDate` is added and both call sites are updated.

1. Run `pnpm check`
2. If errors: read the error, identify which of the three files has the issue, report the file and line — do not fix
3. Confirm exit 0

Report: exit code, any errors found.

---

## T006 — pnpm check + pnpm test:backend gate after T005

Task: Verify the new queue regression test passes.

1. Run `pnpm check`
2. Run `pnpm test:backend`
3. Confirm total backend test count is previous count + 1 (was 29, must now be 30)
4. If the new test fails: report the failure message and the procedure name — do not fix production code

Report: check exit code, test results (X pass / Y fail), breakdown by file.

---

## T007 — Full suite gate

Task: Final verification that nothing was broken.

1. Run `pnpm check`
2. Run `pnpm test` (frontend — must still be 105/105)
3. Run `pnpm test:backend` (must be ≥ 30, all passing)

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: all three exit codes, frontend count, backend count + breakdown by file.
