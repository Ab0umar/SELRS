# Tasks: Route Rename Cleanup

**Branch**: `20260612-route-rename-cleanup`
**Hard Dependency**: `003-permission-typed-constants` merged first
**Input**: `specs/004-route-rename-cleanup/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup — Audit Stored Permissions

**Purpose**: Know exactly which old path strings exist in the database before touching any code.

- [x] T001 Query the `userPermissions` table (via `trpc.medical.getTeamPermissions` or direct DB query) and list every distinct `pageId` value that matches an old path: `/txhub`, `/today`, `/admin-hub`, `/tests-management`
  - **Output**: Count of affected rows per path; confirm which need migration
  - **Acceptance**: Full inventory documented before any rename begins

**Checkpoint**: Know exactly what the DB migration needs to change.

---

## Phase 2: Foundational

- [x] T002 Confirm `003-permission-typed-constants` is merged and `shared/routes.ts` exists with all constants
  - **Acceptance**: `shared/routes.ts` importable; `ROUTES.txhub`, `ROUTES.today`, `ROUTES.adminHub` constants present

---

## Phase 3: US1 — Low-Risk Renames (P1)

**Goal**: Rename `/txhub` and resolve `/prescription/:id` duplicate. No stored permission strings for `/prescription/:id` (it has no permission gate).

**Independent Test**: Visit old URLs — they redirect. Visit new URLs — pages load. `pnpm check` passes.

- [x] T003 [US1] Rename `ROUTES.txhub` from `"/txhub"` to `"/treatment"` in `shared/routes.ts`
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: `shared/routes.ts`
  - **Output**: `ROUTES.txhub` value changed; `pnpm check` surfaces all reference sites automatically
  - **Acceptance**: `pnpm check` passes (all references already use the constant from 003)

- [x] T004 [US1] Add redirect route `<Route path="/txhub" component={() => <Redirect to={ROUTES.txhub} />} />` in `client/src/App.tsx` before the `/treatment` route
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Acceptance**: Visiting `/txhub` redirects to `/treatment`

- [x] T005 [US1] Run DB migration: `UPDATE user_permissions SET page_id = '/treatment' WHERE page_id = '/txhub'`
  - Add as a new Drizzle migration file in `drizzle/migrations/`
  - **Acceptance**: Migration runs; zero rows with `/txhub` remain in `userPermissions`

- [x] T006 [P] [US1] Formalize `/prescription/:id` → `/prescriptions/:id` redirect in `client/src/App.tsx` (line ~408 already has partial handling — ensure it uses `ROUTES.prescriptionsById`)
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Acceptance**: `/prescription/123` redirects to `/prescriptions/123`

- [x] T007 [P] [US1] Rename `/tests-management` to `/tests` in `shared/routes.ts`; add redirect route; run DB migration if rows found in T001
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Acceptance**: `/tests-management` redirects to `/tests`; `pnpm check` passes

- [x] T008 [US1] Run `pnpm check` + 62-test suite
  - **Acceptance**: Zero errors; 62/62 pass

**Checkpoint**: `/txhub` → `/treatment`, prescription duplicate resolved, `/tests-management` cleaned up.

---

## Phase 4: US2 — Duplicate Routes Resolved (P1) ✅

> Covered in Phase 3 (T006). Mark complete when T006 is done.

---

## Phase 5: US3 — Booking/Visit Routes Renamed (P2)

**Goal**: Rename `/today` → `/bookings` and `/admin-hub` → `/booking-triage`. Requires DB migration — highest-risk renames.

**Independent Test**: Users who had `/today` permission can access `/bookings`. Old URL redirects. Admin permission UI shows new path names.

- [x] T009 [US3] Rename `ROUTES.today` to `"/bookings"` in `shared/routes.ts`; run `pnpm check`
  - **Acceptance**: Zero errors; all references updated

- [x] T010 [US3] Add redirect `<Route path="/today" ... → /bookings />` in `client/src/App.tsx`
  - **Acceptance**: `/today` redirects to `/bookings`

- [x] T011 [US3] Run DB migration: `UPDATE user_permissions SET page_id = '/bookings' WHERE page_id = '/today'`
  - Add as Drizzle migration
  - **Acceptance**: Zero `/today` rows remain; users retain access

- [x] T012 [US3] Rename `ROUTES.adminHub` to `"/booking-triage"` in `shared/routes.ts`; run `pnpm check`
  - **Acceptance**: Zero errors

- [x] T013 [US3] Add redirect `<Route path="/admin-hub" ... → /booking-triage />` and `<Route path="/admin-hub/*" ...>` in `client/src/App.tsx`
  - **Acceptance**: `/admin-hub` and sub-routes redirect correctly

- [x] T014 [US3] Run DB migration: UPDATE `userPermissions` for `/admin-hub` → `/booking-triage` and all `/admin-hub/*` sub-paths
  - **Acceptance**: Zero `/admin-hub` rows remain; users retain access

- [x] T015 [US3] Run `pnpm check` + full 62-test suite
  - **Acceptance**: Zero errors; 62/62 pass; verify no user access regressions

**Checkpoint**: All renames complete. All old URLs redirect. DB permissions migrated.

---

## Final Phase: Verification

- [x] T016 Re-run `pnpm check` + 62-test suite as final gate
  - **Acceptance**: Zero errors; 62/62 pass; zero raw old-path strings in permission-sensitive code

---

## Dependencies & Execution Order

- T001 must complete before T005, T007, T011, T014 (DB migration scope depends on audit)
- T002 (003 merged) must complete before all rename tasks
- T003 → T004 → T005 → T006+T007 (parallel) → T008
- T009 → T010 → T011 → T012 → T013 → T014 → T015
- US3 tasks (T009–T015) only start after US1 (T008) passes

---

## Notes

- Execute renames one at a time with `pnpm check` after each — never batch multiple constant changes without verifying
- DB migrations must be reversible: keep reverse SQL in a comment at the top of each migration file
- Constitution Principle VII: any change that touches ProtectedRoute.tsx requires `pnpm check` at minimum
