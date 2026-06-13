Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task.

**Hard prerequisite**: `003-permission-typed-constants` must be merged before starting any task here.

---

## T002 — Confirm 003 is merged

Task: Confirm `003-permission-typed-constants` is fully merged and `shared/routes.ts` has all required constants.

1. Read `shared/routes.ts`
2. Confirm these keys exist with correct values:
   - `txhub: "/txhub"` (will become `/treatment` in T003)
   - `today: "/today"` (will become `/bookings` in T009)
   - `adminHub: "/admin-hub"` (will become `/booking-triage` in T012)
   - `testsManagement` or similar (will become `/tests` in T007)
3. Confirm `client/src/components/ProtectedRoute.tsx` uses `ROUTES.*` constants — no raw path strings for these routes

Report: constants present (yes/no per key), ProtectedRoute migration confirmed.

---

## T005 — DB migration for /txhub → /treatment

Task: Create a Drizzle migration file for the `/txhub` → `/treatment` permission update.

**Prerequisite**: T001 audit confirmed rows for `/txhub`. T003 and T004 (code changes) complete.

1. Read `drizzle/migrations/` — find the most recent migration file to determine the naming convention
2. Create a new migration file: `drizzle/migrations/NNNN_rename_txhub_to_treatment.sql` (use next sequential number)
3. Migration SQL:
   ```sql
   -- Rename /txhub permission strings to /treatment
   -- Reverse: UPDATE user_permissions SET page_id = '/txhub' WHERE page_id = '/treatment';
   UPDATE user_permissions SET page_id = '/treatment' WHERE page_id = '/txhub';
   ```
4. The file must have the reverse SQL in a comment at the top

Report: file created, SQL verified, reverse SQL included.

---

## T008 — Verify US1 complete

Task: Run `pnpm check` + 62-test suite after all Phase 3 tasks (T003–T007) complete.

1. Run `pnpm check` — zero errors required
2. Run `python testsprite_tests/local_run.py` — 62/62 required
3. Confirm `/txhub` redirects to `/treatment` by checking the redirect route exists in App.tsx
4. Confirm `/tests-management` redirects to `/tests` by checking redirect route exists

Report: check result, test result (X/62), redirect routes confirmed.

---

## T011 — DB migration for /today → /bookings

Task: Create a Drizzle migration file for the `/today` → `/bookings` permission update.

**Prerequisite**: T009 (constant renamed) and T010 (redirect added) complete. This is a HIGH-RISK migration — users will lose access to the booking page if this fails.

1. Read `drizzle/migrations/` — find the next sequential number
2. Create migration file: `drizzle/migrations/NNNN_rename_today_to_bookings.sql`
3. SQL:
   ```sql
   -- Rename /today permission strings to /bookings
   -- Reverse: UPDATE user_permissions SET page_id = '/today' WHERE page_id = '/bookings';
   UPDATE user_permissions SET page_id = '/bookings' WHERE page_id = '/today';
   ```
4. Include reverse SQL in a comment

Report: file created, row count confirmed from T001 audit.

---

## T014 — DB migration for /admin-hub → /booking-triage

Task: Create a Drizzle migration file for the `/admin-hub` → `/booking-triage` permission update, including all sub-paths.

**Prerequisite**: T012 (constant renamed) and T013 (redirect added) complete.

1. Read `drizzle/migrations/` — find the next sequential number
2. Create migration file: `drizzle/migrations/NNNN_rename_adminhub_to_booking_triage.sql`
3. SQL (covers the parent path AND all sub-paths like `/admin-hub/something`):
   ```sql
   -- Rename /admin-hub permission strings to /booking-triage
   -- Reverse: UPDATE user_permissions SET page_id = REPLACE(page_id, '/booking-triage', '/admin-hub') WHERE page_id LIKE '/booking-triage%';
   UPDATE user_permissions SET page_id = REPLACE(page_id, '/admin-hub', '/booking-triage') WHERE page_id LIKE '/admin-hub%';
   ```
4. Include reverse SQL in a comment

Report: file created, handles sub-paths confirmed.

---

## T015 — Verify US3 complete

Task: Run `pnpm check` + 62-test suite after T009–T014 complete.

1. Run `pnpm check` — zero errors required
2. Run `python testsprite_tests/local_run.py` — 62/62 required
3. Verify redirects exist for `/today` → `/bookings` and `/admin-hub` → `/booking-triage`

Report: check result, test result (X/62), redirect routes confirmed.

---

## T016 — Final verification gate

Task: Final gate — run `pnpm check` + 62-test suite and confirm zero raw old-path strings remain in permission-sensitive code.

1. Run `pnpm check` — zero errors
2. Run `python testsprite_tests/local_run.py` — 62/62
3. Run grep: confirm none of `/txhub`, `/today`, `/admin-hub`, `/tests-management` appear as raw strings in `client/src/components/ProtectedRoute.tsx` or permission-grant UI components (redirects in App.tsx are fine)
4. List all files changed across the entire 004 feature

Report: check result, test result, grep results, changed files list.
