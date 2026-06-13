# Plan: App.tsx Cleanup

**Branch**: `010b-app-cleanup`
**Hard Dependency**: `010-app-router-split` merged

## Approach

Read App.tsx in full. Identify every non-route block. Extract each to the appropriate file. Import back.

Two extractions:
1. `TRACKED_ROUTES` + related helpers → `client/src/routes/tracked-routes.ts`
2. Redirect guards and URL-matching logic → `client/src/routes/guards.tsx`

After both extractions App.tsx should contain only:
- Imports
- Top-level providers / context setup
- `<Switch>` with 8 domain `<XxxRoutes />` calls + catch-all 404

## Key Rules

- No behavior changes — extraction only
- Do not rename any exported symbols
- Run `pnpm check` after each extraction
- `pnpm check` + `pnpm build` + `pnpm test` as final gate
