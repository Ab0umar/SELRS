# Tasks: Frontend Feature Folders

**Branch**: `20260613-frontend-feature-folders`
**Input**: `specs/005-frontend-feature-folders/`

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup

- [x] T001 Create `client/src/features/` directory and subdirectories: `kf/`, `attendance/`, `salary/`, `accounting/`, `stockroom/`, `admin/`, `doctor-portal/`, `patient-portal/`
  - **Acceptance**: All 8 subdirectories exist; `pnpm check` still passes (no files moved yet)

---

## Phase 2: Foundational

- [x] T002 Read `client/src/App.tsx` and produce a complete map of every lazy-imported page file and its current path — this is the checklist for import path updates
  - **Output**: Full list of `() => import("...")` paths in App.tsx
  - **Acceptance**: Every lazily-imported page file is listed

---

## Phase 3: US1 — KF Feature Folder (P1)

**Goal**: All KF pages and KF-specific components in `client/src/features/kf/`.

**Independent Test**: `ls client/src/features/kf/` shows all KF files. `pnpm check` passes. Navigate to `/kf/patients` — page loads.

- [x] T003 [US1] Move all KF pages from `client/src/pages/` to `client/src/features/kf/`
  - **Owner**: claude-sonnet-4-6 | **Tool**: Bash (git mv) + Edit
  - **Input**: KF page file list from plan.md Domain File Assignment section
  - **Output**: Files moved; `client/src/App.tsx` import paths updated to `../features/kf/...`
  - **Acceptance**: `pnpm check` passes after move

- [x] T004 [P] [US1] Move KF-specific components from `client/src/components/` to `client/src/features/kf/`
  - **Output**: KF components moved; all import sites updated
  - **Acceptance**: `pnpm check` passes

**Checkpoint**: KF feature folder complete. All other domains untouched.

---

## Phase 4: US2 — Attendance Feature Folder (P2)

**Independent Test**: `ls client/src/features/attendance/` shows all attendance pages. `pnpm check` passes.

- [x] T005 [US2] Move all Attendance pages to `client/src/features/attendance/`; update App.tsx imports
  - **Owner**: claude-sonnet-4-6 | **Tool**: Bash (git mv) + Edit
  - **Acceptance**: `pnpm check` passes

- [x] T006 [P] [US2] Move Attendance-specific components to `client/src/features/attendance/`
  - **Acceptance**: `pnpm check` passes

**Checkpoint**: Attendance feature folder complete.

---

## Phase 5: US3 — Salary, Accounting, Stockroom Folders (P3)

- [x] T007 [P] [US3] Move Salary pages to `client/src/features/salary/`; update App.tsx imports
  - **Acceptance**: `pnpm check` passes

- [x] T008 [P] [US3] Move Accounting pages to `client/src/features/accounting/`; update App.tsx imports
  - **Acceptance**: `pnpm check` passes

- [x] T009 [P] [US3] Move Stockroom pages to `client/src/features/stockroom/`; update App.tsx imports
  - **Acceptance**: `pnpm check` passes

**Checkpoint**: Salary, accounting, stockroom folders complete. T007/T008/T009 can run in parallel (different files).

---

## Phase 6: Remaining Feature Folders

- [x] T010 [P] Move Admin pages to `client/src/features/admin/`; update App.tsx imports
  - **Acceptance**: `pnpm check` passes

- [x] T011 [P] Move Doctor portal pages to `client/src/features/doctor-portal/`; update App.tsx imports
  - **Acceptance**: `pnpm check` passes

- [x] T012 [P] Move Patient portal pages to `client/src/features/patient-portal/`; update App.tsx imports
  - **Acceptance**: `pnpm check` passes

**Checkpoint**: All 8 feature folders populated. T010/T011/T012 can run in parallel.

---

## Final Phase: Verification & Cleanup

- [x] T013 Verify `client/src/pages/` contains fewer than 20 files (shared pages only: Dashboard, Home, Login, Profile, NotFound, etc.)
  - **Acceptance**: Count confirmed; no domain-specific pages remain in root `pages/`

- [x] T014 Run `pnpm check` + `pnpm build` + 62-test suite
  - **Acceptance**: Zero errors; build succeeds; 62/62 tests pass

- [x] T015 [P] Remove any empty directories or `.gitkeep` files left behind
  - **Acceptance**: Clean directory tree

---

## Dependencies & Execution Order

- T001 → T002 → T003 + T004 (parallel) → T005 + T006 (parallel) → T007 + T008 + T009 (parallel) → T010 + T011 + T012 (parallel) → T013 → T014 → T015
- Each domain phase must have `pnpm check` passing before the next domain starts

---

## Notes

- Use `git mv` for all file moves to preserve git history
- Update import paths in App.tsx immediately after each `git mv` — never leave App.tsx with broken imports
- Shared components (`ProtectedRoute`, layout wrappers, shared UI primitives) stay in `components/` — do not move them
- Medical pages stay in `pages/` for now — they are not part of this feature's scope
- `pnpm check` after each domain is the Constitution VII gate
