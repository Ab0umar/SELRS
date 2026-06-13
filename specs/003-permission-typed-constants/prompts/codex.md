Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do not proceed to the next task if check fails.

---

## T001 — Audit raw path strings in ProtectedRoute.tsx

Task: Read `client/src/components/ProtectedRoute.tsx` in full and produce a complete inventory of every raw path string literal used in permission checks.

1. Read `client/src/components/ProtectedRoute.tsx` completely
2. List every path string literal (e.g., `"/today"`, `"/admin-hub"`, `"/kf"`) that appears in:
   - `allowedPaths` arrays
   - Direct path comparisons (`=== "/..."`)
   - `startsWith("/...")` checks
   - Any other permission-gating logic
3. Do NOT modify any file — this is a read-only audit task

Output format:
```
Line N: "/path-string" — context (allowedPaths / startsWith / direct compare)
```

Report: total count of distinct path strings found.

---

## T003 — Migrate ProtectedRoute.tsx to use ROUTES constants

Task: Replace all raw path string literals in `client/src/components/ProtectedRoute.tsx` with `ROUTES.*` constants from `shared/routes.ts`.

**Prerequisite**: T002 (shared/routes.ts) must be complete.

1. Read `shared/routes.ts` — know the available constants
2. Read `client/src/components/ProtectedRoute.tsx`
3. Replace every raw path string (from T001 inventory) with the corresponding `ROUTES.*` constant
4. Add `import { ROUTES } from "../../shared/routes";` at the top of the file (use the correct relative path)
5. Run `pnpm check`

Do NOT change any path values — only replace the string literal with the constant of the same value.
Do NOT move or restructure any logic.

Report: count of strings replaced, pnpm check result.

---

## T004 — Migrate App.tsx permission-gated route paths to ROUTES constants

Task: Replace permission-gated `path=` props in `client/src/App.tsx` with `ROUTES.*` constants from `shared/routes.ts`.

**Prerequisite**: T002 (shared/routes.ts) must be complete.

**Scope**: Only routes that also appear in `ProtectedRoute.tsx` permission checks. Do NOT replace every path in App.tsx — only the ones that have corresponding permission constants in `shared/routes.ts`.

1. Read `client/src/App.tsx` — identify routes whose paths match entries in `shared/routes.ts`
2. Replace those `path="..."` literals with `ROUTES.*` (or `{ROUTES.*}` depending on JSX syntax used in the file)
3. Add `import { ROUTES } from "../../shared/routes";` at the top (use correct relative path)
4. Run `pnpm check`

Report: count of paths replaced, pnpm check result.

---

## T005 — Verify US1 complete

Task: Run `pnpm check` + 62-test suite after T003 and T004 are both complete.

1. Run `pnpm check` — must pass with zero errors
2. Run the Playwright suite: `python testsprite_tests/local_run.py`
3. All 62 tests must pass

Report: check result, test results (X/62), any failures.

---

## T006 — Find permission-grant UI components with hardcoded paths

Task: Find all admin UI components that render permission toggles and pass hardcoded path strings to `setUserPermissions` or `setTeamPermissions`.

1. Grep for `setUserPermissions` and `setTeamPermissions` calls in `client/src/`
2. For each call site, check if the `pageId` or path argument is a raw string literal
3. List every file and line number where a hardcoded path string is passed to a permission mutation

Output format:
```
client/src/pages/AdminXxx.tsx:123 — "/hardcoded-path" passed to setUserPermissions
```

Report: total files, total hardcoded path instances.

---

## T007 — Replace hardcoded paths in permission-grant UI

Task: Replace hardcoded path strings in permission-grant admin UI components with `ROUTES.*` constants.

**Input**: Files identified in T006.

1. For each file from T006, replace the hardcoded path string with the corresponding `ROUTES.*` constant
2. Add `import { ROUTES } from "../../shared/routes";` to each modified file (adjust relative path as needed)
3. Run `pnpm check`

Do NOT change path values — only replace string literals with constants of the same value.

Report: files changed, replacements made, pnpm check result.
