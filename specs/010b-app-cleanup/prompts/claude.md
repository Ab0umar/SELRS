Follow the project Constitution and Project Principles strictly.
These are gate tasks — run after each extraction completes.

---

## T002 — pnpm check gate after TRACKED_ROUTES extraction

Task: Run `pnpm check` after T001 (TRACKED_ROUTES moved to tracked-routes.ts) is complete.

1. Run `pnpm check`
2. If errors: read `client/src/routes/tracked-routes.ts` and App.tsx to find missing imports or broken references
3. Confirm exit 0

Report: exit code, any errors found and fixed.

---

## T004 — pnpm check gate after redirect guard extraction

Task: Run `pnpm check` after T003 (guard logic moved to guards.tsx) is complete.

1. Run `pnpm check`
2. If errors: read `client/src/routes/guards.tsx` and App.tsx to find missing imports
3. Confirm exit 0

Report: exit code, any errors found and fixed.

---

## T005 — Verify App.tsx line count + pnpm check + pnpm test

Task: Confirm App.tsx is within target and all tests pass.

1. Run `pnpm check`
2. Run `pnpm test`
3. Run `(Get-Content client/src/App.tsx).Count` — must be ≤ 300

Report: check exit code, test results (X/Y pass), App.tsx line count.

---

## T006 — pnpm build as final gate

Task: Run `pnpm build` as the final verification gate for plan 010b.

1. Run `pnpm build`
2. If errors: identify file and line, fix the issue
3. Confirm exit 0

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: build exit code, any errors found and fixed.
