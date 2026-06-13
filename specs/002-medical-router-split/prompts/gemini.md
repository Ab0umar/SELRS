Follow the project Constitution and Project Principles strictly.
Run these IN ORDER. Do not start the next task until `pnpm check` passes for the current one.

---

## T014 — Fix /kf route target

Task: Fix the `/kf` route in `client/src/App.tsx` — it currently renders Global Search instead of the KF patient list.

**Context**: `client/src/App.tsx` contains a route for `/kf` that renders the wrong component. The correct component is `KfPatientList` (lazy-imported from `./pages/KfPatientList` or similar).

1. Read `client/src/App.tsx`, specifically around the `/kf` route definition
2. Find the route rendering the wrong component
3. Change it to render `KfPatientList` (use the same lazy-import pattern as nearby routes)
4. Also check `client/src/components/ProtectedRoute.tsx` — line 237 has a fallback to `/kf`; confirm it is correct
5. Run `pnpm check`

Do NOT rename any route paths. Do NOT change any other routes.
Report: exact lines changed, component name before/after, pnpm check result.

---

## T015 — Rename /KFsheets references to /kf/sheets

Task: Rename `/KFsheets` to `/kf/sheets` throughout the codebase for consistency with the `/kf/*` prefix convention.

**Context**: The route `/KFsheets` uses inconsistent casing and prefix vs. all other KF routes (`/kf/*`). This task renames it while adding a redirect from the old path.

1. Read `client/src/App.tsx` — find all `/KFsheets` and `/KFsheets/*` route definitions (lines 1048–1064 approximately)
2. Read `client/src/components/ProtectedRoute.tsx` — find lines 80–87 (the `/KFsheets/consultant` special-case check)
3. Changes to make:
   a. In `App.tsx`: rename route path `/KFsheets` → `/kf/sheets`; add a redirect `<Route path="/KFsheets/:rest*">` → `/kf/sheets/:rest*`
   b. In `ProtectedRoute.tsx`: update the path check from `/KFsheets/consultant` → `/kf/sheets/consultant`
4. Run `pnpm check`

**IMPORTANT**: The stored permission string in the DB for KFsheets users is `/kf` (the parent), NOT `/KFsheets`. Do NOT add a DB migration — the permission gating uses `/kf`, not the full sub-path. Only update the two frontend files listed above.

Report: files changed, lines changed, pnpm check result.
