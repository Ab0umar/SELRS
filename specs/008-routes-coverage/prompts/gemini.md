Follow the project Constitution and Project Principles strictly.
These tasks migrate navigation strings inside feature component files. Run `pnpm check` after each task.

---

## T012 — Audit navigation call sites in attendance + KF feature pages

Task: Produce a complete inventory of raw navigation strings in attendance and KF feature components.

1. Run the following grep commands:
   ```
   grep -rn "navigate('/attendance" client/src/features/
   grep -rn 'navigate("/attendance' client/src/features/
   grep -rn "navigate('/kf" client/src/features/
   grep -rn 'navigate("/kf' client/src/features/
   grep -rn "to='/attendance" client/src/features/
   grep -rn 'to="/attendance' client/src/features/
   grep -rn "to='/kf" client/src/features/
   grep -rn 'to="/kf' client/src/features/
   grep -rn "href='/attendance\|href=\"/attendance\|href='/kf\|href=\"/kf" client/src/features/
   ```
2. Output the results as a table:

   | File | Line | Raw string |
   |------|------|------------|

Report: complete table; total match count.

---

## T013 — Replace raw navigation strings in attendance + KF feature pages

Task: Migrate raw `/attendance/*` and `/kf/*` navigation strings in feature components to use `ROUTES.*`.

1. Read the files identified in T012
2. For each file with matches:
   - Replace each raw `/attendance/*` navigation string with the corresponding `ROUTES.*` constant
   - Replace each raw `/kf/*` navigation string with the corresponding `ROUTES.*` constant
   - Add `import { ROUTES } from '../../../shared/routes'` (or the correct relative path) to any file that uses `ROUTES.*` but doesn't already import it
3. Run `pnpm check`

Do NOT change any path values. Replace string literals with constants of the same value only.
Do NOT add `ROUTES` imports to files that don't need them.

Report: files modified (list), replacements per file, pnpm check result.

---

## T014 — Replace raw navigation strings in salary + stockroom feature pages

Task: Migrate raw `/salary/*` and `/stockroom/*` navigation strings in feature components to use `ROUTES.*`.

1. Run:
   ```
   grep -rn "navigate('/salary\|navigate(\"/salary\|to='/salary\|to=\"/salary" client/src/features/
   grep -rn "navigate('/stockroom\|navigate(\"/stockroom\|to='/stockroom\|to=\"/stockroom" client/src/features/
   ```
2. For each match:
   - Replace the raw string with the corresponding `ROUTES.*` constant
   - Add `import { ROUTES } from '...'` (correct relative path) if not already present
3. Run `pnpm check`

Do NOT change any path values.
Report: files modified (list), replacements per file (or "none found"), pnpm check result.
