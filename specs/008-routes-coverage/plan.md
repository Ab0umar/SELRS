# Routes Coverage — Plan

**Extends**: `specs/003-permission-typed-constants/`

## Approach

1. Audit `App.tsx` for all remaining raw path strings (T001)
2. Add missing constants to `shared/routes.ts` in parallel (T002–T005)
3. Migrate `App.tsx` `path=` declarations domain by domain (T007–T010)
4. Migrate internal navigation calls in feature components (T012–T014)
5. Final `pnpm check` + `pnpm build` gate (T015)

## Scope

| Domain | Raw strings in App.tsx | Internal nav to audit |
|---|---|---|
| attendance | ~8 | `client/src/features/attendance/` |
| salary | ~9 | `client/src/features/salary/` |
| KF sub-paths | ~6 | `client/src/features/kf/` |
| stockroom / admin / other | TBD from T001 audit | respective feature folders |

## Key Rules

- Do NOT change path values — only wrap in `ROUTES.*` constants
- `ROUTES` uses `as const` — TypeScript enforces literal types at all reference sites
- Route value changes belong to a future `00N-route-rename` plan

## Constitution Check

- **VI**: Spec-driven ✓
- **VII**: `pnpm check` mandatory after every phase touching `App.tsx` ✓
- No functional change — pure refactor to typed constants
