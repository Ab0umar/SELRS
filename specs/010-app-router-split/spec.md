# Spec: App.tsx Router Split

## Problem

`client/src/App.tsx` is ~2,000+ lines and contains every route declaration for the entire application. This is the same problem that medical.ts (10,444 lines) and attendance.ts (3,864 lines) had — a single file accumulates all concerns over time.

Current pain points:
- Any route addition touches the same file, creating merge conflicts
- Hard to see at a glance which routes belong to which domain
- Lazy imports, ProtectedRoute wrappers, and route declarations are all interleaved
- No clear ownership boundary between modules

## Goal

Split `App.tsx` route declarations into domain-specific route files. `App.tsx` becomes a thin composition layer that imports and renders domain route blocks.

Target structure:
```
client/src/routes/
  attendance-routes.tsx
  salary-routes.tsx
  kf-routes.tsx
  accounting-routes.tsx
  medical-routes.tsx
  admin-routes.tsx
  sheets-routes.tsx
  marketing-routes.tsx
  index.tsx   ← re-exports all for App.tsx to consume
```

`App.tsx` drops from ~2,000 lines to ~200 lines (imports + Switch wrapper + catch-all).

## Success Criteria

- `App.tsx` ≤ 300 lines after split
- Each domain route file ≤ 400 lines
- No route is duplicated or dropped (same route tree before and after)
- `pnpm check` passes
- `pnpm build` passes
- `pnpm test` passes

## Constraint

Route paths and components must not change — this is a structural extraction only.
