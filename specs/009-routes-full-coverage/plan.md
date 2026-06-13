# Plan: Routes Full Coverage

**Branch**: `009-routes-full-coverage`
**Hard Dependency**: `008-routes-coverage` merged (provides attendance/salary/KF/stockroom constants)

## Approach

Identical to plan 008 — add `ROUTES.*` constants then migrate `path=` declarations. Two phases:

1. Add missing constants to `shared/routes.ts` by domain
2. Replace raw strings in `App.tsx` by domain

## Domain Map (remaining after plan 008)

| Domain | Approx paths | Key examples |
|--------|-------------|--------------|
| Accounting | 22 | `/accounting/receipts`, `/accounting/doctor/:code` |
| Admin sub-paths | 18 | `/admin/settings`, `/admin/permissions`, `/admin/users` |
| Sheets | 20 | `/sheets/consultant/:id`, `/sheets/pentacam/:id` |
| Marketing | 5 | `/marketing`, `/marketing/history` |
| Misc | ~25 | `/visits`, `/operations`, `/medicalfile`, `/followups` |

## Key Rules

- Do NOT change any existing `ROUTES.*` constant values
- Do NOT rename or move any route components
- `as const` must be preserved on the `ROUTES` object after every addition
- Wildcard routes (`/stockroom/*`, `/clinics-hub/*`) keep their raw form — `ROUTES` stores prefix only
- Run `pnpm check` after every phase

## Constitution Check

- No new abstractions introduced
- No route paths changed
- Smallest correct diff — constants only
- `pnpm check` + `pnpm build` + `pnpm test` as final gate
