# Tasks: KF Clinical Module

**Branch**: `20260609-kf-clinical`
**Input**: `specs/006-kf-clinical/` (migrated from `specs/kf/`)
**Status**: ✅ Complete — all tasks implemented on 2026-06-09

> Every task prompt must include: _"Follow the project Constitution and Project Principles strictly."_

---

## Phase 1: Setup

- [x] T001 Append `kf_*` tables to `drizzle/schema.ts` (5 tables: kf_patients, kf_visits, kf_examinations, kf_operations, kf_followups)

---

## Phase 2: Foundational

- [x] T002 SQL migration DDL — `drizzle/migrations/00030_kf_tables.sql`
- [x] T003 [P] Shared Zod contracts — `shared/kf/contracts.ts`
- [x] T004 [P] Add `kfProcedure` + `kfWriteProcedure` to `server/_core/procedures.ts`

**Checkpoint**: Schema, migration, contracts, and procedure builder exist. `pnpm check` green.

---

## Phase 3: US1 — KF Backend API (P1)

**Goal**: All 19 KF procedures accessible via `trpc.kf.*`.

- [x] T005 `server/routers/kf.ts` — all procedures (listPatients, getPatient, searchPatients, createPatient, updatePatient, bridgeLookupSelrsPatient, listVisits, createVisit, createExamination, listExaminations, createOperation, listOperations, createFollowup, listFollowups, deletePatient, deleteVisit, deleteExamination, deleteOperation, deleteFollowup)
- [x] T006 Register `kfRouter` in `server/routers/index.ts` (2-line edit)

**Checkpoint**: `pnpm check` green. All procedures callable.

---

## Phase 4: US2 — KF Frontend Shell + Patients (P2)

**Goal**: KF patients page accessible at `/kf/patients`, navigable from top nav.

- [x] T007 `KfShell.tsx` + `KfHome.tsx` — RTL layout, top navigation, patient count card
- [x] T008 `KfPatients.tsx` + `KfPatientForm.tsx` + `KfPatientDetail.tsx` — list, create, view
- [x] T009 Clinical form pages — `KfVisitForm.tsx`, `KfExaminationForm.tsx`, `KfOperationForm.tsx`, `KfOperations.tsx`, `KfFollowups.tsx`
- [x] T010 Lazy imports + routes in `client/src/App.tsx`; `ProtectedRoute` uses `ROUTES.kf`

**Checkpoint**: `/kf/patients` renders. SELRS bridge lookup works. `pnpm build` clean.

---

## Final Phase: Verification

- [x] T011 MSSQL safety audit — `grep -iE "mssql|createMssqlPool|mssqlQuery" server/routers/kf.ts` returns zero; protected files unchanged; `pnpm check` + `pnpm build` pass

---

## Dependencies & Execution Order

```
T001 → T002 + T003 + T004 (parallel) → T005 → T006 → T007 + T008 (parallel) → T009 → T010 → T011
```

## Notes

- KF is MySQL-only — no MSSQL access ever
- `kfProcedure` mirrors `accountingProcedure` pattern: accountant + admin bypass, or `/kf` path permission
- Code generation: `KF-XXXXXX` format via `CONCAT('KF-', LPAD(kf_id, 4, '0'))` after insert
- Original spec files: `specs/kf/specify.md`, `specs/kf/plan.md`, `specs/kf/tasks.md`
