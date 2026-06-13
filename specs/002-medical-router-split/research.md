# Research: Medical Router Split

**Date**: 2026-06-12
**Status**: Complete — all unknowns resolved

---

## Decision 1: Router Composition Pattern

**Decision**: Export plain procedure objects from sub-router files; spread them into the top-level `medicalRouter` in `medical.ts`.

**Rationale**: tRPC's `router()` creates a typed object. If sub-routers are created as `router({...})` instances and merged with `.merge()`, the resulting namespace changes (e.g., `trpc.medical.pentacam.getFiles` instead of `trpc.medical.getPentacamFilesByPatient`). Since FR-002 and FR-003 require the procedure namespace to be unchanged, spreading plain objects is the correct approach. It keeps all procedures flat under `trpc.medical.*`.

**Alternatives considered**:
- `router().merge()`: changes namespace — rejected
- Nested routers (`trpc.medical.pentacam.*`): requires frontend changes everywhere — rejected
- Keep monolith: does not solve the problem — rejected

---

## Decision 2: Shared Helpers Location

**Decision**: `server/routers/_medical/` directory with three files: `pentacam-helpers.ts`, `patient-helpers.ts`, `service-helpers.ts`.

**Rationale**: The underscore prefix signals these are internal to the medical domain and not public router files. Grouping by concern (pentacam, patient, service) matches the domain split. A single `_medical/helpers.ts` would still be large; three files keeps each under 500 lines.

**Alternatives considered**:
- Single `medical-helpers.ts` in routers root: still large, pollutes the routers directory
- Move to `server/lib/`: signals reuse across domains — wrong signal, these are medical-specific
- Keep helpers in `medical.ts`: does not solve the problem

---

## Decision 3: KFsheets Permission Handling

**Decision**: After adding `/KFsheets` redirects, update `ProtectedRoute.tsx` to check `/kf/sheets/consultant` instead of `/KFsheets/consultant`. No database permission string migration needed.

**Rationale**: User permissions are stored as `/kf` (the KF module grant). ProtectedRoute.tsx has a special case at lines 80-87 that accepts `/KFsheets/consultant` as covered by the `/kf` permission. Once the browser always navigates to `/kf/sheets/...` (via redirect), the `/KFsheets` path will never reach that check — but the check should still be updated to the canonical path for clarity and future correctness.

No stored permission strings contain `/KFsheets` — confirmed by grep across `server/routers/medical.ts` and `server/db.ts`. The special case is only in the frontend permission-check logic.

---

## Decision 4: /kf Route Target

**Decision**: Make `/kf` render the same component as `/kf/patients`. Both paths are valid entry points to the KF patient list.

**Rationale**: From App.tsx analysis, `/kf` and `/kf/patients` are two separate routes. The `/kf` route currently shows Global Search (a different component). The fix is to point `/kf` at the KF patient list component. `/kf/patients` stays as-is. No redirect between them needed — both render the same page.

**Alternatives considered**:
- Redirect `/kf` → `/kf/patients`: would change the URL in the address bar on first click, which is unnecessary friction. Rendering the same component at both paths is cleaner.

---

## Finding: Procedure Domain Boundaries

Exact line ranges and procedure assignments confirmed by static analysis of `medical.ts`:

| Domain | File | Procedures | Helper dependency |
|---|---|---|---|
| Patient core | `medical.ts` | 15 | patient-helpers.ts, service-helpers.ts |
| Pentacam | `medical-pentacam.ts` | 21 | pentacam-helpers.ts |
| Examinations/Visits | `medical-examinations.ts` | 32 | service-helpers.ts |
| MSSQL Sync | `medical-mssql.ts` | 19 | patient-helpers.ts, service-helpers.ts |
| Catalog | `medical-catalog.ts` | 38 | (self-contained) |
| Ops/Admin | `medical-ops.ts` | 31 | patient-helpers.ts |
| Reports/Directory | stays in `medical-ops.ts` | 40 | service-helpers.ts |

Total: 195 procedures (matches grep count).

---

## Finding: Imports Required by Each Sub-Router

All sub-routers will need:
- `router`, `protectedProcedure`, etc. from `../_core/procedures`
- Relevant Drizzle schema tables from `../../drizzle/schema`
- `* as db` from `../db`
- `eq`, `and`, etc. from `drizzle-orm`
- Domain-specific service imports (S3, FCM, MSSQL, etc.) only in the files that use them

`medical.ts` currently imports everything at the top. Each sub-router file will import only what it actually uses, which will also surface any currently-hidden dead imports.
