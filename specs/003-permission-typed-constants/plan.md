# Implementation Plan: Permission Typed Route Constants

**Branch**: `20260611-permission-typed-constants` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

## Summary

Create `shared/routes.ts` defining typed constants for all permission-gated routes. Migrate `ProtectedRoute.tsx` and `App.tsx` to use these constants instead of raw strings. No backend, no DB, no schema changes.

---

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: None new — TypeScript const assertion (`as const`)
**Storage**: N/A
**Testing**: `pnpm check` (TypeScript), 62-test Playwright suite
**Target Platform**: Web browser (frontend only)
**Project Type**: Frontend refactor
**Performance Goals**: Zero runtime impact — constants are compile-time only
**Constraints**: Zero behavior changes; zero permission regressions; all 62 tests must continue to pass
**Scale/Scope**: ~25 raw path strings in `ProtectedRoute.tsx`; ~100+ route declarations in `App.tsx`

---

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| I. Strict Module Separation | PASS | `shared/routes.ts` is neutral — no medical/accounting cross-import |
| IV. Use Existing Databases As-Is | PASS | No DB changes |
| VI. Spec-Driven, Minimal-Diff | PASS | Minimal: new file + search-replace in two files |
| VII. Do Not Break Medical | PASS | `ProtectedRoute.tsx` behavior is unchanged — only raw strings replaced with constants of the same value |

---

## Project Structure

### Documentation (this feature)
```text
specs/003-permission-typed-constants/
├── plan.md
├── research.md
├── data-model.md
└── tasks.md
```

### Source Code changes
```text
shared/
└── routes.ts          ← NEW: all route path constants

client/src/
├── components/
│   └── ProtectedRoute.tsx   ← migrate ~25 raw strings to constants
└── App.tsx                  ← migrate path= props to constants (permission-gated routes first)
```

---

## Route Constant Inventory

All paths appearing in `ProtectedRoute.tsx` permission checks (confirmed by code analysis):

```typescript
export const ROUTES = {
  // Always-allowed (no permission check, but referenced)
  profile: "/profile",
  forcePasswordChange: "/force-password-change",
  dashboard: "/dashboard",

  // Self-service (role-based, not permission-gated)
  attendanceMy: "/attendance/my",
  attendanceShiftSchedule: "/attendance/shift-schedule",

  // Permission-gated routes (core migration targets)
  adminSettingsPricingRules: "/admin/settings/pricing-rules",
  adminHubSettingsPricingRules: "/admin-hub/settings/pricing-rules",
  kf: "/kf",
  kfSheetsConsultant: "/kf/sheets/consultant", // post-002 canonical path
  examinationsCatalog: "/examinations/catalog",
  txhub: "/txhub",
  patientFile: "/patient-file",
  patients: "/patients",
  patientsById: "/patients/:id",
  patientHub: "/patient-hub",
  prescriptions: "/prescriptions",
  prescriptionsById: "/prescriptions/:id",
  examination: "/examination",
  accounting: "/accounting",
  salary: "/salary",
  attendance: "/attendance",
  stockroom: "/stockroom",
  today: "/today",
  adminHub: "/admin-hub",
  kfAccounting: "/kf/accounting",
} as const;

export type RoutePath = typeof ROUTES[keyof typeof ROUTES];
```

**Note**: This inventory is a starting point based on static analysis of `ProtectedRoute.tsx`. The implementing agent must verify the complete list by reading the file and adding any missed paths.

---

## Implementation Order

1. Create `shared/routes.ts` with full constant inventory
2. Migrate `ProtectedRoute.tsx` — replace raw strings with `ROUTES.*`
3. Migrate `App.tsx` — replace `path=` string literals with `ROUTES.*` for permission-gated routes
4. Run `pnpm check` → must pass clean
5. Run 62-test suite → must pass clean

**Note on App.tsx scope**: Full migration of all ~100+ route `path=` props in App.tsx is large. Priority is routes that also appear in permission checks. Routes that are purely navigational (no permission gate) can be migrated in a follow-up pass within this feature or deferred to `004`.

---

## Complexity Tracking

> No constitution violations.
