Follow the project Constitution and Project Principles strictly.
These are audit and gate tasks — run at the designated checkpoints.

---

## T001 — Audit remaining raw path strings in App.tsx

Task: Produce a complete inventory of every raw `path=` string in `client/src/App.tsx` that is NOT yet using `ROUTES.*`, after plan 008.

1. Run: `grep -n 'path={"/' client/src/App.tsx | grep -v ROUTES`
2. For each match note: line number, raw string value, domain
3. Group by domain: accounting, admin, sheets, marketing, misc
4. Output a table:

   | Domain | Raw path string | Line # |
   |--------|----------------|--------|

Report: table with all raw strings grouped by domain; total count per domain.

---

## T006 — pnpm check gate after constants additions (T002–T005)

Task: Run `pnpm check` after all four constant-addition tasks complete.

1. Run `pnpm check`
2. If errors: read `shared/routes.ts`, find syntax issues (missing commas, broken `as const`, duplicate keys)
3. Fix any issues and confirm exit 0

Report: exit code, any errors found and fixed.

---

## T011 — pnpm check + pnpm test + confirm zero raw strings

Task: Run `pnpm check` and `pnpm test` after T007–T010 (all App.tsx migrations) complete. Confirm zero raw strings remain.

1. Run `pnpm check`
2. Run `pnpm test`
3. Run: `grep -c 'path={"/' client/src/App.tsx` — must return 0
4. Spot-check: `grep -n 'path={"/' client/src/App.tsx | grep -v ROUTES` — must return nothing

Report: check exit code, test results (X/Y pass), raw string count (must be 0).

---

## T012 — pnpm build as final gate

Task: Run `pnpm build` as the final verification gate for plan 009.

1. Run `pnpm build`
2. If build errors: read the error, identify the file and line, fix the issue
3. Confirm exit 0

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: build exit code, any errors found and fixed.
