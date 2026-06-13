# Implementation Plan: Medical Router Split and Route Cleanup

**Branch**: `20260610-medical-router-split` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

## Summary

`server/routers/medical.ts` (10,444 lines, 195 procedures) is split into 6 focused domain sub-routers. The `medicalRouter` export remains the single composed surface — all callers continue using `trpc.medical.*` with no changes. In parallel, four route issues in App.tsx and ProtectedRoute.tsx are resolved: `/kf` redirecting to Global Search instead of the KF patient list, `/KFsheets` casing inconsistency, and permission string references to the old path.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js backend, React 19 frontend)
**Primary Dependencies**: tRPC v11, Express, Drizzle ORM, Wouter (routing)
**Storage**: MySQL via Drizzle (no schema changes)
**Testing**: Playwright (62-test local suite), `pnpm check` (TypeScript), `pnpm build`
**Target Platform**: Node.js server + web browser
**Project Type**: Full-stack web service
**Performance Goals**: No new endpoints; refactor must not introduce measurable latency regression
**Constraints**: Zero changes to tRPC procedure names, zero changes to exposed route paths (redirects preserve old paths), zero DB schema changes
**Scale/Scope**: 195 procedures redistributed across 6 files; 4 route patches in App.tsx and ProtectedRoute.tsx

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| I. Strict Module Separation | PASS | Split stays entirely within the medical domain. No new imports from accounting or KF. |
| II. Service-Based Accounting Only | N/A | No accounting changes. |
| III. Read-Only Accounting APIs | N/A | No accounting changes. |
| IV. Use Existing Databases As-Is | PASS | No schema changes, no migration, no encoding helper removal. |
| V. Legacy Output Parity | N/A | No accounting reports. |
| VI. Spec-Driven, Minimal-Diff Execution | PASS | Spec complete. Plan in progress. Tasks will be generated next. Each task must carry Owner Model, Backup Model, Tool, Role, Input, Output, Prompt, Acceptance Criteria. |
| VII. Do Not Break Medical | **CRITICAL** | This is the entire surface of the medical router. `pnpm check` + full 62-test suite required after every sub-router extracted. Split must be done incrementally, one domain at a time, with verification between each. |

**Post-design re-check**: No constitution violations introduced. The shared helpers extraction (Phase 1) creates new internal files — not new external interfaces — so Module Separation is not affected.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-medical-router-split/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── medical-router-surface.md  ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code changes

```text
server/
└── routers/
    ├── medical.ts              ← reduced to ~600 lines (patient core + router composition)
    ├── _medical/               ← NEW: shared helpers extracted from medical.ts
    │   ├── pentacam-helpers.ts ← Pentacam matching, file ops, normalizers (~900 lines)
    │   ├── patient-helpers.ts  ← Patient resolution, MSSQL push helpers, name normalizers (~400 lines)
    │   └── service-helpers.ts  ← Service type normalization, code lookups (~200 lines)
    ├── medical-pentacam.ts     ← NEW: ~21 procedures (all Pentacam procedures)
    ├── medical-examinations.ts ← NEW: ~32 procedures (visits, exams, refractions, sheets)
    ├── medical-mssql.ts        ← NEW: ~19 procedures (sync, registration catalog, MSSQL ops)
    ├── medical-catalog.ts      ← NEW: ~38 procedures (medications, tests, prescriptions, surgeries)
    ├── medical-ops.ts          ← NEW: ~31 procedures (users, permissions, admin tools, dashboard)
    └── index.ts                ← unchanged: medicalRouter import still works

client/
└── src/
    ├── App.tsx                 ← 3 changes: /kf route fix, /KFsheets redirects, /kf/sheets routes
    └── components/
        └── ProtectedRoute.tsx  ← 1 change: update /KFsheets permission path check to /kf/sheets
```

---

## Phase 0: Research

> All unknowns resolved from codebase analysis. No external research required.

**See**: [research.md](research.md)

---

## Phase 1: Design & Contracts

> **See**: [data-model.md](data-model.md), [contracts/medical-router-surface.md](contracts/medical-router-surface.md)

### Router Composition Pattern

tRPC's `router()` accepts an object of procedures. Sub-routers are spread into the top-level `medicalRouter`:

```typescript
// medical.ts (after split)
import { medicalPentacamRoutes } from "./medical-pentacam";
import { medicalExaminationsRoutes } from "./medical-examinations";
// ...

export const medicalRouter = router({
  // patient core procedures (remain here)
  createPatient: ...,
  searchPatients: ...,
  // ...

  // domain sub-routers spread in
  ...medicalPentacamRoutes,
  ...medicalExaminationsRoutes,
  ...medicalMssqlRoutes,
  ...medicalCatalogRoutes,
  ...medicalOpsRoutes,
});
```

Each sub-router file exports a plain object `{ procedureName: procedure, ... }` — **not** a `router()` instance — so the final namespace is flat and all callers see `trpc.medical.procedureName` unchanged.

### Shared Helpers Strategy

The top 2,235 lines of `medical.ts` are helper functions. They fall into three groups:

| Helper file | Contents | Used by |
|---|---|---|
| `_medical/pentacam-helpers.ts` | `buildPentacamPatientCandidates`, `resolvePatientForPentacamFileName`, `suggestPatientsForPentacamFileName`, `movePentacamObjectToPatient`, `listFailedPentacamRows`, `previewFailedPentacamRenameTargets`, `scanMismatchedLocalPentacamLinks`, and ~30 supporting functions | medical-pentacam.ts |
| `_medical/patient-helpers.ts` | `findExistingPatientByNameOrPhone`, `resolveServiceCodeForType`, `pushNewPatientToMssql`, `readFreshDoctorNameForPatient`, `resolveDoctoCodeById`, `resolveDoctoCodeByName`, `canPushToMssql`, `registrationPricingPayload` | medical.ts (patient core), medical-mssql.ts |
| `_medical/service-helpers.ts` | `inferSrvTyp`, `normalizeServiceDefaultSheet`, `serviceTypeFromSheetOrType`, `normalizeServiceCodeKey`, service type schemas and code sets (LASIK_CODES, CONSULTANT_CODES, etc.) | medical.ts, medical-catalog.ts, medical-mssql.ts |

Constants like `DEFAULT_MSSQL_SYNC_RUNTIME_CONFIG` and `getSystemSettingFallbackValue` move to `medical-mssql.ts` and `medical-ops.ts` respectively. `decodeMojibake` stays in `_medical/service-helpers.ts` as it's used broadly.

### Route Fixes

#### Fix 1: `/kf` renders KF patient list

In `App.tsx` around line 938, `/kf` currently renders a component that shows Global Search. Change to render the same component as `/kf/patients` (the KF patient list page). Both paths render the same page.

```tsx
// Before (approximate):
<Route path="/kf" component={KfGlobalSearchOrRedirect} />

// After:
<Route path="/kf" component={KfPatientListPage} />
<Route path="/kf/patients" component={KfPatientListPage} />
```

Exact component names must be confirmed by reading lines 938-1028 of App.tsx.

#### Fix 2: `/KFsheets` → `/kf/sheets` with redirect

In `App.tsx`, add redirect routes and register the new clean paths:

```tsx
// Redirects (keep old links working)
<Route path="/KFsheets/consultant/:kfPatientId/followup"
  component={() => <Redirect to={`/kf/sheets/consultant/${params.kfPatientId}/followup`} />} />
<Route path="/KFsheets/consultant/:kfPatientId"
  component={() => <Redirect to={`/kf/sheets/consultant/${params.kfPatientId}`} />} />

// New canonical paths (render same components as before)
<Route path="/kf/sheets/consultant/:kfPatientId/followup" component={KfFollowupSheet} />
<Route path="/kf/sheets/consultant/:kfPatientId" component={KfConsultantSheet} />
```

#### Fix 3: Update ProtectedRoute.tsx permission check

Lines 80-87 of `ProtectedRoute.tsx` check `cleanPath === "/KFsheets/consultant"` and `cleanPath.startsWith("/KFsheets/consultant/")`. After the redirect is in place, the browser path will always be `/kf/sheets/...`, so these checks must be updated to match the new path. The KF permission grant (`/kf` in user permissions) already covers `/kf/sheets/...` via the prefix check on line 76.

---

## Implementation Order

Tasks must be executed in this sequence to maintain a working system at every step:

1. **Extract shared helpers** (`_medical/` directory) — no behavior change, just moves code
2. **Extract medical-pentacam.ts** — highest isolation, fewest cross-references
3. **Extract medical-catalog.ts** — fully self-contained (medications, tests, prescriptions)
4. **Extract medical-mssql.ts** — sync domain; references patient-helpers
5. **Extract medical-examinations.ts** — largest domain; references service-helpers
6. **Extract medical-ops.ts** — admin/ops; references multiple helpers
7. **Reduce medical.ts** to patient core + router composition
8. **Run `pnpm check` + 62-test suite** — full verification gate
9. **Fix /kf route** in App.tsx — render KfPatientListPage at `/kf`
10. **Add /KFsheets redirects** in App.tsx — redirect to `/kf/sheets/...`
11. **Register /kf/sheets routes** in App.tsx — same components, new paths
12. **Update ProtectedRoute.tsx** — update permission path check
13. **Run `pnpm check` + 62-test suite** — final verification gate

Tasks 1–8 are backend-only. Tasks 9–13 are frontend-only. They can be assigned to separate agents if desired, but tasks 9–13 must run after 1–8 are complete.

---

## Complexity Tracking

> No constitution violations. No complexity justification required.
