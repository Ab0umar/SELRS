Follow the project Constitution and Project Principles strictly.
These are gate tasks — run them after each extraction phase completes.

---

## T005 — pnpm check gate after attendance + salary + KF extractions

Task: Run `pnpm check` after T002, T003, T004 (attendance, salary, KF route files) are complete.

1. Run `pnpm check`
2. If errors: read the relevant route file and App.tsx to find missing imports or JSX syntax issues
3. Confirm exit 0 before proceeding

Report: exit code, any errors found and fixed.

---

## T008 — pnpm check gate after accounting + admin extractions

Task: Run `pnpm check` after T006 and T007 (accounting, admin route files) are complete.

1. Run `pnpm check`
2. Fix any import/JSX errors found
3. Confirm exit 0

Report: exit code, any errors found and fixed.

---

## T012 — pnpm check gate after medical + marketing + misc extractions

Task: Run `pnpm check` after T009, T010, T011 (medical, marketing, misc route files) are complete.

1. Run `pnpm check`
2. Fix any import/JSX errors found
3. Confirm exit 0

Report: exit code, any errors found and fixed.

---

## T013 — Verify App.tsx line count + run pnpm check + pnpm test

Task: Verify App.tsx is within the target line count and all tests pass.

1. Run `pnpm check`
2. Run `pnpm test`
3. Run `(Get-Content client/src/App.tsx).Count` — must be ≤ 300
4. Run line counts for each domain route file — none must exceed 400 lines:
   ```
   (Get-Content client/src/routes/attendance-routes.tsx).Count
   (Get-Content client/src/routes/salary-routes.tsx).Count
   (Get-Content client/src/routes/kf-routes.tsx).Count
   (Get-Content client/src/routes/accounting-routes.tsx).Count
   (Get-Content client/src/routes/medical-routes.tsx).Count
   (Get-Content client/src/routes/admin-routes.tsx).Count
   (Get-Content client/src/routes/marketing-routes.tsx).Count
   (Get-Content client/src/routes/misc-routes.tsx).Count
   ```
5. Confirm all 8 domain route components are imported in `App.tsx`:
   `grep "Routes" client/src/App.tsx`

Report: check exit code, test results (X/Y pass), App.tsx line count, domain file line count table, import count (must be 8).

---

## T014 — pnpm build as final gate

Task: Run `pnpm build` as the final verification gate for plan 010.

1. Run `pnpm build`
2. If build errors: read the error, identify the file and line, fix the issue
3. Confirm exit 0

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: build exit code, any errors found and fixed.
