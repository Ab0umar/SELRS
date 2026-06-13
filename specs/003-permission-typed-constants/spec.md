# Feature Specification: Permission Typed Route Constants

**Feature Branch**: `20260611-permission-typed-constants`
**Created**: 2026-06-12
**Status**: Draft

## Overview

Route paths are currently stored and compared as raw string literals scattered across `ProtectedRoute.tsx`, `App.tsx`, and the database. When a route is renamed, the developer must find and update every string manually — a miss silently breaks access control or navigation. This feature introduces a single typed constant registry for all route paths, so a rename becomes a compile-time error at every reference site.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Renames a Route Safely (Priority: P1)

A developer renames `/txhub` to `/treatment-hub`. With typed constants, the TypeScript compiler immediately surfaces every reference. Without them, the rename silently misses permission checks and the page becomes inaccessible to users who had it granted.

**Why this priority**: Core safety property. Everything downstream (route cleanup in `004`) depends on this being in place first.

**Independent Test**: Introduce a deliberate typo in a route constant and confirm `pnpm check` fails at every reference site.

**Acceptance Scenarios**:

1. **Given** a route constant `ROUTES.txhub = "/txhub"`, **When** the value is changed to `"/treatment-hub"`, **Then** `pnpm check` reports errors at every location that still reads the old string directly
2. **Given** `ProtectedRoute.tsx` uses `ROUTES.kf` instead of `"/kf"`, **When** `ROUTES.kf` is renamed, **Then** the compiler flags the missing key
3. **Given** all permission checks use constants, **When** `pnpm check` passes, **Then** no raw path strings exist in permission-sensitive code

---

### User Story 2 - Permission Grants Use Constants at Write Time (Priority: P2)

When an admin grants a user access to `/salary`, the value written to the database comes from a constant, not a hardcoded string in a UI component. Future route renames update the constant and the grant payload together.

**Why this priority**: Closes the second half of the fragility — the stored permission strings. Lower priority because runtime values in the DB require a migration; the compile-time safety of US1 is the prerequisite.

**Independent Test**: Trace `setUserPermissions` call in the admin UI; confirm the path value originates from a constant, not a string literal.

**Acceptance Scenarios**:

1. **Given** admin grants `/attendance` access to a user, **When** the payload is sent, **Then** the path value comes from `ROUTES.attendance` (typed constant), not a raw string
2. **Given** `ROUTES.attendance` is changed, **When** `pnpm check` runs, **Then** the permissions UI component fails to compile if it uses the old value

---

### Edge Cases

- What happens to permission strings already stored in the database? They remain as raw strings — the constants govern new writes and frontend checks only. A follow-up migration in `004` can backfill stored values after renames.
- What happens if a route has a dynamic segment like `/:id`? Constants represent the base path; dynamic segments are appended at call sites as template literals.
- What happens to routes that are compared with `.startsWith()`? The constant is the base path string; `.startsWith(constant + "/")` pattern still works and is now safe.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: A single source-of-truth file MUST define typed constants for every route path that appears in permission checks or navigation guards in `ProtectedRoute.tsx`
- **FR-002**: `ProtectedRoute.tsx` MUST use constants from FR-001 for all path comparisons — no raw string literals for routes that are permission-gated
- **FR-003**: `App.tsx` route declarations MUST use the same constants for their `path` props — the constant is declared once, used in both the routing declaration and the permission check
- **FR-004**: The constants file MUST be in `shared/` so both frontend and any future backend references can import it
- **FR-005**: `pnpm check` MUST pass with zero new errors after the migration

### Key Entities

- **Route constant**: A typed string constant with a meaningful name (e.g., `ROUTES.salary`, `ROUTES.kf`, `ROUTES.txhub`). Value is the URL path string.
- **Permission string**: A path stored in the database granting a user access to a route. Must match a route constant value exactly.
- **Permission check**: A comparison in `ProtectedRoute.tsx` between the current browser path and the user's allowed paths. Must use route constants.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero raw path string literals remain in `ProtectedRoute.tsx` for any route that is permission-gated (verified by code search)
- **SC-002**: Static type check completes with zero new errors after the migration
- **SC-003**: All existing permission-gated routes continue to work correctly — no access regressions (verified by full 62-test suite passing)
- **SC-004**: A developer can rename any route constant and immediately see every affected location flagged by the type checker, with no manual search required

---

## Assumptions

- Route constants are defined in `shared/routes.ts` (new file); this path is importable by both `client/src` and `server/` if needed
- Dynamic route segments (`:id`, `:patientCode`, etc.) are not part of the constant — constants represent base paths only
- Database-stored permission strings are not migrated in this feature; migration is deferred to `004` (route rename cleanup) where the stored values actually change
- The number of distinct permission-gated paths in `ProtectedRoute.tsx` is approximately 20–25 (confirmed by code analysis)
- No changes to backend procedures or database schema in this feature
