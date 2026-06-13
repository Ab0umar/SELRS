# Tasks: Permission Typed Route Constants

**Branch**: `20260611-permission-typed-constants`
**Input**: `specs/003-permission-typed-constants/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup

- [x] T001 Read `client/src/components/ProtectedRoute.tsx` in full and produce a complete list of every raw path string literal used in permission checks — this is the canonical inventory for `shared/routes.ts`

---

## Phase 2: Foundational

- [x] T002 Create `shared/routes.ts` with all route path constants using `as const` pattern
  - **Owner**: claude-sonnet-4-6 | **Tool**: Write
  - **Input**: Path inventory from T001 + plan.md Route Constant Inventory section
  - **Output**: `shared/routes.ts` exporting `ROUTES` object and `RoutePath` type
  - **Acceptance**: File compiles; `pnpm check` passes

**Checkpoint**: Constants file exists. No files migrated yet.

---

## Phase 3: US1 — ProtectedRoute Uses Constants (P1)

**Goal**: Every permission check in `ProtectedRoute.tsx` uses `ROUTES.*` — no raw path strings remain.

**Independent Test**: `grep -n '"/[a-z]' client/src/components/ProtectedRoute.tsx` returns zero matches for permission-gated paths.

- [x] T003 [US1] Migrate all raw path string literals in `client/src/components/ProtectedRoute.tsx` to use `ROUTES.*` constants from `shared/routes.ts`
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: `client/src/components/ProtectedRoute.tsx`; `shared/routes.ts` from T002
  - **Output**: All ~25 permission-gated path strings replaced with `ROUTES.*`; import added at top of file
  - **Acceptance**: `pnpm check` passes; no raw path strings remain for permission-gated routes

- [x] T004 [P] [US1] Migrate `path=` props in `client/src/App.tsx` for all permission-gated routes to use `ROUTES.*` constants
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: `client/src/App.tsx`; routes that appear in both App.tsx and ProtectedRoute.tsx
  - **Output**: All permission-gated `path=` declarations use `ROUTES.*`; import added
  - **Acceptance**: `pnpm check` passes; routes still match their permission constants

- [x] T005 [US1] Run `pnpm check` + full 62-test suite
  - **Acceptance**: Zero new errors; 62/62 tests pass

**Checkpoint**: US1 complete. A route rename now produces compile errors at every reference site.

---

## Phase 4: US2 — Permission Grants Use Constants (P2)

**Goal**: The admin UI components that call `setUserPermissions` or `setTeamPermissions` use `ROUTES.*` for path values, not raw strings.

**Independent Test**: Grep permission-grant UI components for hardcoded path strings; zero matches.

- [x] T006 [US2] Find all admin UI components that render permission toggles or pass path strings to `setUserPermissions`/`setTeamPermissions`
  - **Output**: List of files and line numbers where path strings are hardcoded in permission-grant UI
  - **Acceptance**: Complete list identified

- [x] T007 [US2] Replace hardcoded path strings in permission-grant UI components with `ROUTES.*` constants
  - **Owner**: claude-sonnet-4-6 | **Tool**: Edit
  - **Input**: Files from T006; `shared/routes.ts`
  - **Output**: Permission-grant components import and use `ROUTES.*`
  - **Acceptance**: `pnpm check` passes

**Checkpoint**: Both read-side (ProtectedRoute) and write-side (permission grants) use constants.

---

## Final Phase: Verification

- [x] T008 Run `pnpm check` + full 62-test suite as final gate
  - **Acceptance**: Zero new errors; 62/62 pass; report changed files

---

## Dependencies & Execution Order

- T001 → T002 → T003 + T004 (parallel) → T005
- T005 → T006 → T007 → T008
- T003 and T004 can run in parallel (different files)

---

## Notes

- `ROUTES` uses `as const` so TypeScript infers literal types — any typo in a reference is a compile error
- Do not change any route path values in this feature — only replace strings with constants of the same value
- Actual route renames happen in `004-route-rename-cleanup` which depends on this feature being complete
