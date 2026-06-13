# Implementation Plan: Route Rename Cleanup

**Branch**: `20260612-route-rename-cleanup` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)
**Hard Dependency**: `003-permission-typed-constants` must be merged before this branch starts

## Summary

Update `shared/routes.ts` constants to new names, add redirect routes in `App.tsx` for old paths, run a one-time database migration for permission strings that were stored as old route paths. Because `003` ensures all references go through typed constants, each rename is a single constant change that the compiler verifies.

---

## Technical Context

**Language/Version**: TypeScript 5.x, SQL (MySQL migration)
**Primary Dependencies**: `shared/routes.ts` from `003`; Drizzle ORM for migration
**Storage**: MySQL — `userPermissions` table (pageId column)
**Testing**: `pnpm check`, 62-test Playwright suite
**Target Platform**: Web browser + MySQL
**Constraints**: No user loses access; old URLs keep working via redirects; migration must be reversible

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| IV. Use Existing Databases As-Is | CONDITIONAL PASS | Writing a migration that updates string values in `userPermissions` is a data migration, not a schema change. Allowed under Principle IV since no columns are renamed/dropped. |
| VI. Spec-Driven, Minimal-Diff | PASS | Each rename is one constant update + one redirect route + one migration line |
| VII. Do Not Break Medical | PASS | Route changes are frontend-only; medical backend procedures untouched |

---

## Project Structure

```text
specs/004-route-rename-cleanup/
├── plan.md
├── research.md
└── tasks.md

shared/
└── routes.ts              ← update constant values (from 003)

client/src/
└── App.tsx                ← add redirect routes; update path= props via constants

drizzle/
└── migrations/
    └── 000XX_rename_permission_routes.sql   ← new migration for stored permission strings
```

---

## Rename Map

| Old path | New path | DB migration needed | Redirect needed |
|---|---|---|---|
| `/txhub` | `/treatment` | Yes (if stored in permissions) | Yes |
| `/prescription/:id` | `/prescriptions/:id` | No (redirect only, no permission grant) | Yes — already partial at App.tsx line 408 |
| `/tests-management` | `/tests` | Yes (if stored) | Yes |
| `/today` | `/bookings` | Yes — high likelihood stored | Yes |
| `/admin-hub` | `/booking-triage` | Yes — high likelihood stored | Yes |
| `/admin-hub/*` sub-routes | `/booking-triage/*` | Yes | Yes |

---

## Implementation Order

1. Audit `userPermissions` table for stored old-path values (count affected rows before migrating)
2. Update `shared/routes.ts` constants — one at a time, run `pnpm check` after each
3. Add redirect routes in `App.tsx` for each old path
4. Run DB migration for each renamed route
5. Full `pnpm check` + 62-test suite

**Order within each rename**: constant update → redirect route → DB migration → `pnpm check`

---

## Complexity Tracking

> No constitution violations. The DB migration is a data update, not a schema change.
