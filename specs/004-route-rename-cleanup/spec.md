# Feature Specification: Route Rename Cleanup

**Feature Branch**: `20260612-route-rename-cleanup`
**Created**: 2026-06-12
**Status**: Draft
**Depends on**: `003-permission-typed-constants` must be complete before this feature begins

## Overview

Several frontend routes have names that are opaque (`/txhub`, `/today`, `/admin-hub`) or duplicated (`/prescription/:id` and `/prescriptions/:id` doing the same thing). This feature renames them to predictable, consistent names and removes duplicates. Because `003` introduced typed route constants, every rename is a single constant update that the compiler verifies — no silent permission breakage.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Developer Navigates by Route Name (Priority: P1)

A developer needs to find the treatment workflow page. The current route is `/txhub` — nothing in the name indicates what it is. After the rename to `/treatment`, opening App.tsx and searching for `treatment` finds it immediately.

**Why this priority**: Directly improves developer navigation and reduces the risk of future bugs. All other stories depend on the same mechanism (`003` typed constants).

**Independent Test**: Open the renamed route in a browser; confirm the correct page loads. Run `pnpm check` — zero errors.

**Acceptance Scenarios**:

1. **Given** `/txhub` is renamed to `/treatment`, **When** a user with the permission visits `/treatment`, **Then** the treatment hub page loads
2. **Given** `/txhub` is renamed, **When** a user visits the old `/txhub` URL, **Then** they are redirected to `/treatment`
3. **Given** the rename is complete, **When** `pnpm check` runs, **Then** zero errors (all references updated via typed constants)

---

### User Story 2 - Duplicate Routes Resolved (Priority: P1)

`/prescription/:id` and `/prescriptions/:id` both exist and do the same thing. A developer linking to a prescription must guess which to use. After cleanup, one canonical path exists and the other redirects.

**Why this priority**: Active confusion source. Duplicates compound over time. Already partially handled in App.tsx (line 408 has a redirect) — this formalizes and completes it.

**Independent Test**: Navigate to both old paths; confirm one redirects to the other and both render the same page.

**Acceptance Scenarios**:

1. **Given** `/prescriptions/:id` is canonical, **When** a user visits `/prescription/:id`, **Then** they are redirected to `/prescriptions/:id`
2. **Given** the duplicate is removed, **When** `pnpm check` runs, **Then** zero errors

---

### User Story 3 - Booking/Visit Routes Have Clear Names (Priority: P2)

`/today` is the booking management workspace and `/admin-hub` is the booking triage area. Neither name communicates its purpose. After rename, new developers can predict what `/bookings` and `/booking-triage` contain.

**Why this priority**: P2 because these renames require updating stored permission strings in the database — a migration step that adds risk. Completing P1 stories first validates the rename mechanism.

**Independent Test**: Navigate to the new route names; pages load. Old routes redirect. Stored permission strings in the database updated. No user loses access.

**Acceptance Scenarios**:

1. **Given** `/today` is renamed to `/bookings`, **When** a user with the old `/today` permission visits `/bookings`, **Then** the page loads (permission strings migrated)
2. **Given** `/admin-hub` is renamed to `/booking-triage`, **When** a user visits the old `/admin-hub`, **Then** they are redirected to `/booking-triage`
3. **Given** the migration runs, **When** the admin checks user permissions, **Then** stored paths reflect the new names

---

### Edge Cases

- Users who have `/today` or `/admin-hub` stored in the database as permission grants: a one-time migration updates stored strings before the old routes are removed.
- Sidebar links, notification redirects, and any hardcoded URL in JS: typed constants catch these at compile time; any that use the constant are automatically updated.
- External links or bookmarks to old routes: redirect routes ensure they keep working.
- What if a rename conflicts with an existing route? Route constant uniqueness is enforced by TypeScript — duplicate values cause a type error.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `/txhub` MUST be renamed to `/treatment`; old path MUST redirect
- **FR-002**: `/prescription/:id` duplicate MUST be removed; `/prescriptions/:id` is canonical; old path MUST redirect
- **FR-003**: `/tests-management` MUST be consolidated with `/tests`; one canonical path, other redirects
- **FR-004**: `/today` MUST be renamed to `/bookings`; old path MUST redirect; stored permission strings MUST be migrated
- **FR-005**: `/admin-hub` MUST be renamed to `/booking-triage`; old path MUST redirect; stored permission strings MUST be migrated
- **FR-006**: All renames MUST go through the typed constants from `003` — no raw string literals introduced
- **FR-007**: A database migration MUST update stored permission strings for any renamed route that appears in the permissions table
- **FR-008**: `pnpm check` MUST pass with zero new errors after all renames
- **FR-009**: All existing user permissions MUST continue to grant the same access after migration

### Key Entities

- **Redirect route**: A React route that silently forwards an old path to the new canonical path. Preserves bookmarks and external links.
- **Permission migration**: A one-time database update that replaces old stored path strings with new ones in the `userPermissions` table.
- **Route constant update**: Changing the value of a constant in `shared/routes.ts` from the old path to the new path; TypeScript surfaces all reference sites.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero occurrences of `/txhub`, `/today`, `/admin-hub`, `/prescription/:id`, `/tests-management` as route declarations in App.tsx (only as redirect sources)
- **SC-002**: Static type check passes with zero new errors
- **SC-003**: All 62 automated frontend tests pass after changes
- **SC-004**: No user loses access to any page as a result of the migration — verified by checking that every renamed permission string is updated in the database before the old routes are removed
- **SC-005**: A developer visiting any old URL is redirected to the new URL within one navigation step

---

## Assumptions

- `003-permission-typed-constants` is complete before this feature begins — all permission checks already use `ROUTES.*` constants
- The permission migration is a simple string replacement in the `userPermissions` table: `UPDATE user_permissions SET page_id = '/bookings' WHERE page_id = '/today'`
- `/admin-hub/*` sub-routes (like `/admin-hub/settings/pricing-rules`) are also updated consistently
- The test suite covers the renamed routes via URL navigation (not hardcoded path strings in tests)
- No mobile app or third-party system has hardcoded references to the old route paths
