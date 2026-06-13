# Spec: Routes Full Coverage

## Problem

Plan 008 migrated `attendance`, `salary`, `KF`, and `stockroom` path strings in `App.tsx` to `ROUTES.*` constants. Approximately 110 raw path strings remain across other domains:

- Accounting: ~22 paths
- Admin sub-paths: ~18 paths
- Sheets: ~20 paths
- Marketing: ~5 paths
- Misc (hubs, visits, operations, medicalfile, etc.): ~25 paths

A raw string in `App.tsx` means a route rename produces a silent runtime 404 instead of a compile error. The remaining domains have the same risk as the ones fixed in 008.

## Goal

Every `path=` declaration in `App.tsx` uses `ROUTES.*`. Zero raw path strings remain for any domain.

After this plan: renaming any route in the app requires updating exactly one place (`shared/routes.ts`) and TypeScript surfaces every stale reference at compile time.

## Success Criteria

- `grep -c "path={'" client/src/App.tsx` returns 0 (all remaining raw strings migrated)
- `pnpm check` passes
- `pnpm build` passes
- `pnpm test` passes (105/105)

## Scope

Domains targeted (plan 008 already done — do not re-touch):
- Accounting sub-paths
- Admin sub-paths
- Sheets sub-paths
- Marketing sub-paths
- Misc: hubs, visits, operations, medicalfile, medical-reports, patient-summary, doctor routes, refraction, medications, external-doctors, quick-entry, new-cases, followups, admin-hub, etc.

Out of scope: doctor-portal, patient-portal, `/my/*` paths (these are isolated portal routes — separate concern).
