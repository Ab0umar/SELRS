# KF Module — Implementation Plan

**Version:** 1.0.0
**Date:** 2026-06-09
**Prerequisite:** `specs/kf/specify.md` approved

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Strict Module Separation | ✅ PASS | KF router/services never import from medical/accounting modules |
| II — Service-Based Accounting | ✅ N/A | KF has no accounting/revenue logic |
| III — Read-Only Accounting APIs | ✅ N/A | KF has no accounting endpoints |
| IV — Use Existing DBs As-Is | ✅ PASS | New `kf_*` tables only; no existing table modified |
| V — Legacy Output Parity | ✅ N/A | No accounting reports |
| VI — Spec-Driven Execution | ✅ PASS | This plan follows specify.md |
| VII — Do Not Break Medical | ✅ PASS | Protected files receive only additive changes |

---

## Architecture Overview

```
MySQL (selrs26)
├── kf_patients          NEW — isolated KF patient registry
├── kf_visits            NEW — KF appointments/visits
├── kf_examinations      NEW — KF all-in-one exam records
├── kf_operations        NEW — KF operations/procedures
└── kf_followups         NEW — KF follow-up records

Backend
├── drizzle/schema.ts             APPEND kf_* table definitions
├── drizzle/migrations/00030_kf_tables.sql   NEW migration
├── server/_core/procedures.ts    ADD kfProcedure export (path-based /kf gate)
├── server/routers/kf.ts          NEW router (all kf_* CRUD)
├── server/routers/index.ts       ADD kf: kfRouter (1 import + 1 line)
└── shared/kf/contracts.ts        NEW shared Zod schemas + inferred types

Frontend
├── client/src/App.tsx            ADD lazy imports + /kf/* routes
└── client/src/pages/kf/
    ├── KfShell.tsx               Layout shell (sidebar nav)
    ├── KfHome.tsx                Dashboard (patient count, recent visits)
    ├── KfPatients.tsx            Patient list + search
    ├── KfPatientForm.tsx         Create / edit patient
    ├── KfPatientDetail.tsx       Patient detail + sub-tabs
    ├── KfVisitForm.tsx           Add visit to patient
    ├── KfExaminationForm.tsx     Add exam record
    ├── KfOperationForm.tsx       Add operation record
    ├── KfOperations.tsx          Operations list (all patients)
    └── KfFollowups.tsx           Follow-ups list (all patients)
```

---

## Data Flow

### Create KF Patient
```
UI (KfPatientForm) → trpc.kf.createPatient.mutate()
  → kfRouter.createPatient [kfProcedure]
    → db.insert(kfPatients) → get lastInsertId
    → db.update(kfPatients).set({ kfCode: `KF-${id.toString().padStart(4,'0')}` })
    → return { kfId, kfCode }
  No MSSQL touch. No patients table touch.
```

### Create KF Visit
```
UI (KfVisitForm) → trpc.kf.createVisit.mutate({ kfPatientId, ... })
  → kfRouter.createVisit [kfProcedure]
    → verify kf_patients.kf_id exists
    → db.insert(kfVisits)
    → return { kfVisitId }
```

### Read-Only Bridge (SELRS lookup)
```
UI (KfPatientForm) — optional link field → trpc.kf.bridgeLookupSelrsPatient.query({ code })
  → kfRouter.bridgeLookupSelrsPatient [kfProcedure]
    → db.select(patients).where(patients.patientCode = code)  ← READ ONLY
    → return { patientCode, fullName } | null
  No write to patients table.
```

---

## File Change Matrix

| File | Change Type | Protected? | Notes |
|------|-------------|------------|-------|
| `drizzle/schema.ts` | APPEND | ⚠️ Protected | Append only — 5 new table defs at end |
| `drizzle/migrations/00030_kf_tables.sql` | CREATE | — | DDL for all 5 kf_* tables |
| `server/_core/procedures.ts` | ADD export | ⚠️ Protected | One new `kfProcedure` export only |
| `server/routers/kf.ts` | CREATE | — | New isolated router |
| `server/routers/index.ts` | ADD 2 lines | Allowed | Import + register kfRouter |
| `shared/kf/contracts.ts` | CREATE | — | Zod schemas for KF DTOs |
| `client/src/App.tsx` | ADD routes | Allowed | Lazy imports + Route entries |
| `client/src/pages/kf/*.tsx` | CREATE | — | All new KF pages |

**Zero changes to:** `medical.ts`, `patient.ts`, `db.ts`, `mssqlPatients.ts`, `ProtectedRoute.tsx`, `context.ts`, `trpc.ts`, `env.ts`

---

## API Procedures (kfRouter)

### Queries
| Procedure | Procedure Type | Input | Output |
|-----------|---------------|-------|--------|
| `listPatients` | kfProcedure | `{ search?, page?, pageSize? }` | `{ patients[], total }` |
| `getPatient` | kfProcedure | `{ kfId }` | `KfPatient` |
| `searchPatients` | kfProcedure | `{ term }` | `KfPatient[]` |
| `listVisits` | kfProcedure | `{ kfPatientId }` | `KfVisit[]` |
| `listExaminations` | kfProcedure | `{ kfPatientId }` | `KfExamination[]` |
| `getExamination` | kfProcedure | `{ kfExamId }` | `KfExamination` |
| `listOperations` | kfProcedure | `{ kfPatientId?, date?, status? }` | `KfOperation[]` |
| `listFollowups` | kfProcedure | `{ kfPatientId?, date?, status? }` | `KfFollowup[]` |
| `bridgeLookupSelrsPatient` | kfProcedure | `{ code }` | `{ patientCode, fullName } \| null` |

### Mutations
| Procedure | Procedure Type | Input | Output |
|-----------|---------------|-------|--------|
| `createPatient` | kfProcedure | `KfCreatePatientInput` | `{ kfId, kfCode }` |
| `updatePatient` | kfProcedure | `{ kfId } & Partial<KfCreatePatientInput>` | `{ ok }` |
| `createVisit` | kfProcedure | `KfCreateVisitInput` | `{ kfVisitId }` |
| `updateVisit` | kfProcedure | `{ kfVisitId } & Partial<KfCreateVisitInput>` | `{ ok }` |
| `createExamination` | kfProcedure | `KfCreateExaminationInput` | `{ kfExamId }` |
| `updateExamination` | kfProcedure | `{ kfExamId } & Partial<KfCreateExaminationInput>` | `{ ok }` |
| `createOperation` | kfProcedure | `KfCreateOperationInput` | `{ kfOpId }` |
| `updateOperation` | kfProcedure | `{ kfOpId } & Partial<KfCreateOperationInput>` | `{ ok }` |
| `createFollowup` | kfProcedure | `KfCreateFollowupInput` | `{ kfFollowupId }` |
| `updateFollowup` | kfProcedure | `{ kfFollowupId } & Partial<KfCreateFollowupInput>` | `{ ok }` |

---

## Frontend Routes

```
/kf                                           → KfHome (dashboard)
/kf/patients                                  → KfPatients (list + search)
/kf/patients/new                              → KfPatientForm (create)
/kf/patients/:kfPatientId                     → KfPatientDetail (overview + tabs)
/kf/patients/:kfPatientId/edit                → KfPatientForm (edit)
/kf/patients/:kfPatientId/visits/new          → KfVisitForm
/kf/patients/:kfPatientId/examinations/new    → KfExaminationForm
/kf/patients/:kfPatientId/operations/new      → KfOperationForm
/kf/patients/:kfPatientId/followups/new       → KfFollowupForm (inline in KfPatientDetail)
/kf/operations                                → KfOperations (all patients)
/kf/followups                                 → KfFollowups (all patients)
```

All wrapped in `<ProtectedRoute allowedPaths={["/kf"]} />` in `App.tsx`.

---

## kfProcedure Design

Follows exact pattern of `accountingProcedure` in `procedures.ts`:

```typescript
export const kfProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", ... });
    if (ctx.user.role === "admin" || ctx.user.role === "accountant") return next({ ctx: { ...ctx, user: ctx.user } });
    const permissions = await db.getEffectiveUserPermissions(ctx.user.id, ctx.user.role ?? undefined);
    const canAccessKf = permissions.some((p) => {
      const clean = String(p ?? "").replace(/:r[w]?$/, "").trim();
      return clean === "/kf" || clean.startsWith("/kf/");
    });
    if (!canAccessKf) throw new TRPCError({ code: "FORBIDDEN", ... });
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
```

---

## Migration Strategy

File: `drizzle/migrations/00030_kf_tables.sql`

Plain SQL DDL — same pattern as all existing migrations. No Drizzle push; execute directly against `selrs26`.

Verification: `SHOW TABLES LIKE 'kf_%'` returns 5 tables.

---

## KF Code Generation

After `INSERT INTO kf_patients`, use returned `insertId` to:
```sql
UPDATE kf_patients SET kf_code = CONCAT('KF-', LPAD(kf_id, 4, '0')) WHERE kf_id = ?
```

This keeps the code stable (derived from PK), no sequence table needed.

---

## UI Patterns (follow existing conventions)

- `dir="rtl"` on all page roots
- shadcn/ui components only (`Button`, `Input`, `Select`, `Dialog`, `Table`, etc.)
- Arabic labels (mixed with English field names where convention exists)
- Loading/error/empty states on every query
- All data through `trpc.kf.*.useQuery()` / `useMutation()` — no raw fetch
- KfShell top navigation matches AccountingShell pattern
