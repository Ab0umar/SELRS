# Spec: App.tsx Cleanup

## Problem

Plan 010 extracted all route declarations into domain files but App.tsx remains at 986 lines. The remaining content is not route declarations — it is App-level logic that was never touched by the split:

- `TRACKED_ROUTES` array (~20 lines) — path-prefix-to-label mapping for analytics/breadcrumbs
- Redirect guards — URL pattern matching and `<Redirect>` logic (~80 lines)
- Auth context setup and provider wrapping (~100 lines)
- Miscellaneous utility logic (~200 lines)

These concerns belong in dedicated files, not inline in the router.

## Goal

Reduce `App.tsx` to ≤ 300 lines: imports, `<Switch>`, top-level providers, and the 8 domain `<XxxRoutes />` calls. All non-route logic extracted into focused files.

## Target Extractions

| Extract to | What moves there |
|-----------|-----------------|
| `client/src/routes/tracked-routes.ts` | `TRACKED_ROUTES` array + any related helpers |
| `client/src/routes/guards.tsx` | Redirect guard components and URL-matching logic |

## Success Criteria

- `App.tsx` ≤ 300 lines
- `pnpm check` passes
- `pnpm build` passes
- `pnpm test` passes (105/105)
- No route behavior changes
