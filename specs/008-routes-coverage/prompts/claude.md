Follow the project Constitution and Project Principles strictly.
These are audit and gate tasks — run them at the designated checkpoints.

---

## T001 — Audit raw path strings in App.tsx

Task: Produce a complete inventory of every raw path string in `client/src/App.tsx` that is NOT already using `ROUTES.*`.

1. Read `client/src/App.tsx`
2. Run:
   ```
   grep -n "path={'" client/src/App.tsx
   grep -n 'path={"/' client/src/App.tsx
   ```
3. For each match, note: line number, raw string value, domain (attendance / salary / KF / stockroom / admin / other)
4. Also check `navigate(` and `<Link to=` calls for raw strings
5. Count how many raw strings already use `ROUTES.*` (grep for `ROUTES\.`)
6. Output a table:

   | Domain | Raw path string | Line # |
   |--------|----------------|--------|

Report: table with all raw strings grouped by domain; total raw string count; total ROUTES.* count already present.

---

## T006 — pnpm check gate after constants additions

Task: Run `pnpm check` after T002–T005 (all new constants added to `shared/routes.ts`) are complete.

1. Run `pnpm check`
2. If any errors: read `shared/routes.ts`, find any syntax issues (missing commas, mismatched braces, broken `as const`)
3. Confirm zero TypeScript errors before proceeding

Report: exit code, any errors found and fixed.

---

## T011 — pnpm check + grep confirm after App.tsx migrations

Task: Run `pnpm check` and confirm zero raw path strings remain in `App.tsx` after T007–T010.

1. Run `pnpm check`
2. Run `pnpm test`
3. Run these grep checks — each should return zero results:
   ```
   grep -n "path={'/attendance" client/src/App.tsx
   grep -n "path={'/salary" client/src/App.tsx
   grep -n 'path=.*"/kf' client/src/App.tsx
   grep -n 'path=.*"/stockroom' client/src/App.tsx
   ```
4. Report count of remaining raw strings (target: 0 for all migrated domains)

Report: check exit code, test results, zero-result confirmation for each domain.

---

## T015 — Final gate: pnpm check + pnpm build + pnpm test

Task: Run the full verification suite after all navigation strings are migrated (T001–T014).

1. Run `pnpm check` — zero errors required
2. Run `pnpm test` — all tests must pass
3. Run `pnpm build` — zero errors required
4. Confirm zero raw path strings remain in `client/src/App.tsx` for migrated domains:
   ```
   grep -c "path={'" client/src/App.tsx
   ```
5. Confirm zero raw navigation strings in `client/src/features/`:
   ```
   grep -rn "navigate('/attendance\|navigate('/salary\|navigate('/kf\|navigate('/stockroom" client/src/features/
   ```

Produce the standard task report: changed files / what changed / checks run / checks skipped.

Report: all three exit codes, test count, zero-string confirmations.
