# Feature Specification: Medical Router Split and Route Cleanup

**Feature Branch**: `20260610-medical-router-split`
**Created**: 2026-06-12
**Status**: Draft

## Overview

`server/routers/medical.ts` has grown to 10,444 lines and contains 195 procedures across 8 unrelated domains. This makes it hard to navigate, increases merge conflict risk, and has caused bugs where changes in one domain inadvertently affected another. This feature splits the file into focused domain sub-routers and fixes four specific route inconsistencies in the frontend that cause confusion or silent misbehavior.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Navigates to Domain Logic (Priority: P1)

A developer working on Pentacam file import needs to find the relevant backend procedures. Today they must scroll through 10,444 lines or search blindly. After the split, they open `server/routers/pentacam.ts` directly.

**Why this priority**: Highest daily-friction item. Every backend change today requires orienting inside a monolith. This delivers immediate value and is the core of the feature.

**Independent Test**: Can be verified by confirming `server/routers/pentacam.ts` exists, contains all Pentacam procedures, and `pnpm check` passes with no new errors.

**Acceptance Scenarios**:

1. **Given** a developer is working on Pentacam file matching logic, **When** they open `server/routers/pentacam.ts`, **Then** they find all ~25 Pentacam-related procedures and no unrelated ones
2. **Given** all sub-routers exist, **When** `pnpm check` runs, **Then** it completes with zero TypeScript errors
3. **Given** the split is complete, **When** a frontend component calls `trpc.medical.getPentacamFilesByPatient`, **Then** the call resolves identically to before the split

---

### User Story 2 - Developer Splits MSSQL Sync Logic (Priority: P1)

The MSSQL sync domain caused repeated bugs because its logic was interleaved with patient management and examination state. After the split, a developer fixing a sync bug opens `server/routers/mssql-sync.ts` and sees only sync-related procedures.

**Why this priority**: The MSSQL sync domain is the highest-bug-density area in the codebase. Isolating it reduces the risk of future regressions.

**Independent Test**: `server/routers/mssql-sync.ts` exists, contains all sync procedures, and the sync-related procedures are not present in `medical.ts`.

**Acceptance Scenarios**:

1. **Given** the split is complete, **When** a developer searches for `syncPatientsFromMssql`, **Then** it is found in `server/routers/mssql-sync.ts` and nowhere else in the routers directory
2. **Given** the split is complete, **When** `resetMssqlSyncCodes` is called via the admin UI, **Then** it executes correctly

---

### User Story 3 - Staff Navigates to KF Module (Priority: P2)

A KF staff member clicks the KF link in the sidebar. Today `/kf` silently redirects to Global Search instead of the KF patient list. After the fix, clicking the KF link takes them to the KF patient list.

**Why this priority**: Active UX confusion — the wrong page loads on first click. Straightforward fix with no permission risk.

**Independent Test**: Navigate to `/kf` while authenticated as a KF user; confirm the KF patient table is visible, not Global Search.

**Acceptance Scenarios**:

1. **Given** a logged-in KF staff member, **When** they navigate to `/kf`, **Then** the KF patient list is shown (not Global Search)
2. **Given** a logged-in KF staff member, **When** they navigate to `/kf/patients`, **Then** the same KF patient list is shown (both paths work)

---

### User Story 4 - Developer Uses Consistent KF Sheet Routes (Priority: P2)

A developer building a new KF sheet link uses `/kf/sheets/...` following the lowercase `/kf/*` convention. Today `/KFsheets/...` (capital K, capital F) is the actual path — inconsistent with every other KF route. After cleanup, `/kf/sheets/...` works and `/KFsheets/...` redirects to it.

**Why this priority**: Casing inconsistency makes the route unpredictable and causes bugs when developers follow the established `/kf/*` pattern.

**Independent Test**: Navigate to `/KFsheets/consultant/:id`; confirm it redirects to `/kf/sheets/consultant/:id`. Navigate to the new path directly; confirm the sheet loads.

**Acceptance Scenarios**:

1. **Given** a user visiting `/KFsheets/consultant/:kfPatientId`, **When** the page loads, **Then** they are redirected to `/kf/sheets/consultant/:kfPatientId`
2. **Given** a user visiting `/kf/sheets/consultant/:kfPatientId`, **When** the page loads, **Then** the sheet renders without redirect

---

### Edge Cases

- What happens when a frontend component uses `trpc.medical.*` and the procedure has moved to a sub-router but `medicalRouter` re-exports it? Verify re-export is transparent to callers.
- What happens if a procedure references a helper function defined earlier in `medical.ts`? Shared helpers must move to a common location or be imported by each sub-router.
- What happens with existing saved bookmarks or external links to `/KFsheets/*`? The redirect handles this — old links continue to work.
- What happens if a permission string references `/KFsheets` explicitly? Audit permission strings in `ProtectedRoute.tsx` and `db.ts` before removing the old path.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `medical.ts` MUST be split into at minimum 6 domain sub-router files: `pentacam.ts`, `examinations.ts`, `mssql-sync.ts`, `catalog.ts`, `ops.ts`, and the remaining core patient procedures stay in `medical.ts`
- **FR-002**: All existing tRPC procedure names MUST remain unchanged after the split — no renaming, no namespace changes visible to callers
- **FR-003**: `medicalRouter` in `server/routers/index.ts` MUST expose the same procedure surface as before — callers use `trpc.medical.*` throughout, this MUST NOT change
- **FR-004**: No file in `server/routers/` MUST exceed 2,500 lines after the split
- **FR-005**: The `/kf` route MUST render the KF patient list (same content as `/kf/patients`), not Global Search
- **FR-006**: `/kf/patients` MUST continue to work as a direct route
- **FR-007**: `/KFsheets/consultant/:kfPatientId` and `/KFsheets/consultant/:kfPatientId/followup` MUST redirect to their `/kf/sheets/...` equivalents
- **FR-008**: `/kf/sheets/consultant/:kfPatientId` and `/kf/sheets/consultant/:kfPatientId/followup` MUST render the same components currently rendered at the `/KFsheets/...` paths
- **FR-009**: Permission strings referencing `/KFsheets` MUST be audited and updated to reference `/kf/sheets` before the old routes are removed
- **FR-010**: `pnpm check` MUST pass with zero new TypeScript errors after all changes

### Key Entities

- **Sub-router**: A focused tRPC router file containing procedures for one domain. Merged into `medicalRouter` via router composition so the external procedure namespace is unchanged.
- **Shared helper**: A utility function used by more than one sub-router. Must be extracted to a shared location rather than duplicated.
- **Permission string**: A route path stored in the database as a user or team permission grant. Changing a route path requires updating stored strings or adding an alias.
- **Route redirect**: A React component that silently forwards an old path to a new one, preserving backward compatibility for bookmarks and external links.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: No single backend router file exceeds 2,500 lines after the split
- **SC-002**: All existing automated frontend tests pass after changes, with zero new failures introduced
- **SC-003**: Static type analysis completes with zero new errors introduced by this change
- **SC-004**: A developer can locate any backend procedure by domain name in under 30 seconds without full-text search
- **SC-005**: Navigating to `/kf` while authenticated renders the KF patient table on first load, with no intermediate redirect to Global Search visible to the user
- **SC-006**: No existing `/KFsheets/*` link breaks — all resolve to the correct page via redirect

---

## Assumptions

- The split uses tRPC router composition: sub-routers are created independently and merged into `medicalRouter` via `router({ ...subRouter1, ...subRouter2 })` or equivalent, keeping the `trpc.medical.*` namespace intact for all callers
- Shared helper functions (Pentacam matching algorithms, MSSQL normalizers, etc.) will be extracted to `server/routers/_helpers/` or equivalent, not duplicated
- The `/kf` fix does not affect the global search feature itself — global search remains accessible via its own route or UI entry point
- Permission strings in the database for `/KFsheets/*` are rare or nonexistent (KF is a newer module); if found, a migration will update them
- The `patient.ts` router is not merged into this effort — its boundary with `medical.ts` is a separate concern
- No frontend component directly constructs tRPC procedure paths as strings; all calls go through the typed tRPC client
