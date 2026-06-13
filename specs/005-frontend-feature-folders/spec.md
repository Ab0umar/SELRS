# Feature Specification: Frontend Feature Folders

**Feature Branch**: `20260613-frontend-feature-folders`
**Created**: 2026-06-12
**Status**: Draft
**Independent of**: `003` and `004` — can be worked in parallel

## Overview

`client/src/pages/` contains 95 files and `client/src/components/` contains 40 files — all flat, all co-mingled regardless of which domain they belong to. A developer working on KF has to mentally filter out 85 irrelevant page files. This feature moves files into feature-scoped folders so that everything related to a domain (pages, components, hooks) is co-located and easy to find.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Finds KF Files Instantly (Priority: P1)

A developer adding a new KF examination component opens `client/src/features/kf/` and sees every KF-related file. Today they open `client/src/pages/` and scroll past 85 irrelevant files.

**Why this priority**: KF is the newest module and has the most active development. It benefits most immediately from co-location.

**Independent Test**: `client/src/features/kf/` exists and contains all KF pages and KF-specific components. App.tsx lazy imports resolve. `pnpm check` passes.

**Acceptance Scenarios**:

1. **Given** the KF feature folder exists, **When** a developer looks at `features/kf/`, **Then** they find KfPatientList, KfPatientDetail, KfNewPatient, KfFollowups, KfOperations, and KF-specific components
2. **Given** files are moved, **When** `pnpm check` runs, **Then** zero import errors

---

### User Story 2 - Developer Finds Attendance Files (Priority: P2)

A developer adding an attendance report finds `client/src/features/attendance/` — all attendance pages and components together.

**Why this priority**: Attendance is a well-bounded module with clear page + component grouping.

**Independent Test**: `client/src/features/attendance/` exists; all attendance pages and components present; `pnpm check` passes.

**Acceptance Scenarios**:

1. **Given** attendance feature folder, **When** developer opens it, **Then** all attendance pages (live, my, employees, reports, settings, sync) and attendance-specific components are present

---

### User Story 3 - Developer Finds Salary/Accounting/Stockroom Files (Priority: P3)

Remaining bounded modules (salary, accounting, stockroom) each get their own feature folder.

**Why this priority**: Lower priority because these modules are more stable and have fewer active changes.

**Independent Test**: `features/salary/`, `features/accounting/`, `features/stockroom/` each exist with their respective pages. `pnpm check` passes.

**Acceptance Scenarios**:

1. **Given** feature folders for salary, accounting, stockroom, **When** `pnpm check` runs, **Then** zero import errors

---

### Edge Cases

- What about shared components used by multiple features? They stay in `client/src/components/` (now a smaller, genuinely-shared set). Only domain-specific components move.
- What about pages used across domains (Dashboard, Home, Profile)? They stay in `client/src/pages/` as the shared root.
- What about lazy imports in `App.tsx`? Moving a file changes its import path — `App.tsx` must be updated for every moved file. This is the bulk of the work.
- What about TypeScript path aliases? If `tsconfig.json` has path aliases for `@pages/`, they need updating or the feature folder structure uses relative paths.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `client/src/features/<domain>/` directories MUST exist for: `kf`, `attendance`, `salary`, `accounting`, `stockroom`
- **FR-002**: Each feature folder MUST contain all pages and domain-specific components for that module
- **FR-003**: Shared components (used by 2+ domains) MUST remain in `client/src/components/`
- **FR-004**: Cross-domain pages (Dashboard, Home, Profile, Login, NotFound) MUST remain in `client/src/pages/`
- **FR-005**: All lazy import paths in `client/src/App.tsx` MUST be updated to reflect new file locations
- **FR-006**: `pnpm check` MUST pass with zero new errors after each domain migration
- **FR-007**: No behavior changes — this is a pure file restructure

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `client/src/pages/` contains fewer than 20 files after migration (down from 95) — only shared/cross-domain pages remain
- **SC-002**: Each feature folder contains all files for that domain with zero files missed (verified by checking App.tsx import paths)
- **SC-003**: Static type check passes with zero new errors after migration
- **SC-004**: All 62 automated tests pass after migration
- **SC-005**: A developer can identify which feature folder to open for any domain page in under 10 seconds

---

## Assumptions

- `client/src/` uses relative imports, not absolute path aliases for these files — confirmed by checking `tsconfig.json`
- The medical module pages (ExaminationForm, PatientList, etc.) are intentionally left in `pages/` for this phase — the medical module is larger and more complex; it gets its own migration as a follow-up
- Admin pages (AdminUsers, AdminSettings, etc.) are moved to `features/admin/` as a bundle
- Doctor portal pages move to `features/doctor-portal/`
- Patient portal (`/my/*`) pages move to `features/patient-portal/`
