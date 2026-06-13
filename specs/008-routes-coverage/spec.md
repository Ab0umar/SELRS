# Routes Coverage — Spec

**Depends on**: `003-permission-typed-constants` (provides `shared/routes.ts` and `ROUTES.*` pattern)

## Problem

Plan 003 migrated all permission-gated path strings in `ProtectedRoute.tsx`. However, `client/src/App.tsx` still has raw path strings for domains added after plan 003 was scoped: attendance (~8 raw strings), salary (~9 raw strings), KF (remaining sub-paths), and others. Internal `navigate()` / `<Link>` calls in feature pages also use raw strings.

A route rename in any of these domains would require grep-and-replace instead of producing a compile error.

## Goal

Extend `shared/routes.ts` with all missing constants and migrate every raw path string in `App.tsx` and feature page components to use `ROUTES.*`.

## Success Criteria

- `grep -n 'path={"/' client/src/App.tsx` returns zero matches for attendance, salary, KF, stockroom routes
- `pnpm check` passes; all tests pass; `pnpm build` succeeds
- No route path values changed — only string literals replaced with typed constants
