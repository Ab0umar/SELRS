Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task. Do NOT batch rename tasks — one rename at a time.

**Hard prerequisite**: `003-permission-typed-constants` must be merged before starting any task here.

---

## T001 — Audit stored permission strings in DB

Task: Query the `userPermissions` table and count rows for each old path that will be renamed.

**Context**: Permission strings are stored as raw path strings in the DB. Before any rename, we need to know exactly how many rows need migrating.

1. Read `server/routers/medical.ts` or `server/routers/medical-ops.ts` — find the `getTeamPermissions` procedure
2. The procedure reads from a `userPermissions` (or `user_permissions`) table with a `pageId` (or `page_id`) column
3. Using the tRPC procedure or by reading the DB schema in `drizzle/schema.ts`, construct a SQL query to count rows matching each old path:
   - `/txhub`
   - `/today`
   - `/admin-hub`
   - `/tests-management`
4. Do NOT execute against the production DB. Output the SQL queries so the user can run them.

Output the exact SQL:
```sql
SELECT page_id, COUNT(*) as row_count FROM user_permissions WHERE page_id IN ('/txhub', '/today', '/admin-hub', '/tests-management') GROUP BY page_id;
```

Report: SQL queries ready, DB schema location confirmed.

---

## T003 — Rename ROUTES.txhub to /treatment

Task: Change the value of `ROUTES.txhub` in `shared/routes.ts` from `"/txhub"` to `"/treatment"`.

**Prerequisite**: T002 (003 merged, shared/routes.ts exists).

1. Read `shared/routes.ts`
2. Change: `txhub: "/txhub"` → `txhub: "/treatment"`
3. Run `pnpm check` — TypeScript will surface every file using `ROUTES.txhub`; they all update automatically because they use the constant
4. Confirm zero errors

Do NOT manually update any other file — the constant reference means all callers update automatically via the type system.
Report: line changed, pnpm check result, any files that had type errors (should be zero if 003 is complete).

---

## T004 — Add /txhub redirect in App.tsx

Task: Add a backwards-compatibility redirect from `/txhub` to `/treatment` in `client/src/App.tsx`.

**Context**: Users may have bookmarks or links to `/txhub`. The redirect preserves them.

1. Read `client/src/App.tsx` — find the `/treatment` (formerly `/txhub`) route definition
2. Add a redirect route immediately BEFORE the `/treatment` route:
   ```tsx
   <Route path="/txhub" component={() => <Redirect to={ROUTES.txhub} />} />
   ```
   Use the same `Redirect` import pattern as other redirects in the file.
3. Run `pnpm check`

Report: line inserted, pnpm check result.

---

## T006 — Formalize /prescription/:id redirect

Task: Ensure the `/prescription/:id` → `/prescriptions/:id` redirect is correctly implemented in `client/src/App.tsx`.

**Context**: Line ~408 of App.tsx has partial handling for this redirect. Ensure it uses `ROUTES.prescriptionsById` (or similar constant from `shared/routes.ts`) and not a raw string.

1. Read `client/src/App.tsx` around line 408
2. If the redirect uses a raw string `/prescriptions/:id`, replace it with the constant from `ROUTES`
3. If no constant exists in `shared/routes.ts` for this, add one: `prescriptionsById: "/prescriptions/:id"`
4. Run `pnpm check`

Report: line content before/after, pnpm check result.

---

## T007 — Rename /tests-management to /tests

Task: Rename `ROUTES.testsManagement` (or equivalent key) in `shared/routes.ts` from `"/tests-management"` to `"/tests"`. Add redirect.

**Prerequisite**: T001 confirmed rows for `/tests-management` exist (or confirmed none exist).

1. Read `shared/routes.ts` — find the tests-management constant
2. Change value to `"/tests"`
3. Add redirect in `App.tsx`: `/tests-management` → `/tests`
4. If T001 found DB rows for `/tests-management`, add a Drizzle migration file in `drizzle/migrations/` with:
   ```sql
   UPDATE user_permissions SET page_id = '/tests' WHERE page_id = '/tests-management';
   ```
5. Run `pnpm check`

Report: constant changed, redirect added, migration file (if created), pnpm check result.

---

## T009 — Rename ROUTES.today to /bookings

Task: Change the value of `ROUTES.today` in `shared/routes.ts` from `"/today"` to `"/bookings"`.

**Prerequisite**: T008 (US1 verification) complete. This is a HIGH-RISK rename — users have stored `/today` permissions.

1. Read `shared/routes.ts`
2. Change: `today: "/today"` → `today: "/bookings"`
3. Run `pnpm check`

Report: line changed, pnpm check result, zero errors confirmed.

---

## T010 — Add /today redirect in App.tsx

Task: Add redirect from `/today` to `/bookings` in `client/src/App.tsx`.

1. Read `client/src/App.tsx` — find the bookings route
2. Add: `<Route path="/today" component={() => <Redirect to={ROUTES.today} />} />`
3. Run `pnpm check`

Report: line inserted, pnpm check result.

---

## T012 — Rename ROUTES.adminHub to /booking-triage

Task: Change the value of `ROUTES.adminHub` in `shared/routes.ts` from `"/admin-hub"` to `"/booking-triage"`.

**Prerequisite**: T011 (DB migration for /today) complete.

1. Read `shared/routes.ts`
2. Change: `adminHub: "/admin-hub"` → `adminHub: "/booking-triage"`
3. Run `pnpm check`

Report: line changed, pnpm check result.

---

## T013 — Add /admin-hub redirect in App.tsx

Task: Add redirects from `/admin-hub` and `/admin-hub/*` sub-paths to `/booking-triage` in `client/src/App.tsx`.

1. Read `client/src/App.tsx` — find the booking-triage route
2. Add two redirects:
   - `/admin-hub` → `/booking-triage`
   - `/admin-hub/:rest*` → `/booking-triage/:rest*` (preserve sub-paths)
3. Use the same redirect pattern as other redirects in the file
4. Run `pnpm check`

Report: lines inserted, pnpm check result.
