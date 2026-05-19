# Implementation Plan: SRV100 Attendance & Fingerprint Module

**Branch**: `001-attendance-fingerprint` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-attendance-fingerprint/spec.md`

## Summary

Add a **third isolated module** (Attendance) to SRV100 beside Medical and Accounting. Phase 1 ingests fingerprint attendance from the existing Tararus-managed Access (`.mdb`) database into a new MySQL `attendance_*` schema, computes a processed daily attendance table via a deterministic rules engine, and exposes dashboards, raw logs, employee/daily views, basic shift/leave/holiday settings, and three printable reports (Late, Absence, Overtime). Direct TCP device communication is **not** implemented; ingestion sits behind an `AttendanceSource` adapter interface so a Phase 3 `tcpDeviceAdapter` can replace or coexist with the Access adapter without changes to the rules engine, processed table, or UI.

Technical approach: a new tRPC router (`server/routers/attendance.ts`) over a new service layer (`server/services/attendance/*`) using existing `drizzle-orm` against MySQL via the existing `server/db.ts` helpers. New pages live under `client/src/pages/attendance/*` behind the existing `ProtectedRoute`. Background sync runs on a two-tier schedule (every 2 min business hours / every 15 min off-hours) with a MySQL named advisory lock preventing overlap. Dashboard freshness is polling-based (30 s refetch).

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js (existing SRV100 runtime), React 19
**Primary Dependencies**: Express 5, tRPC 11 (`@trpc/server`, `@trpc/client`, `@trpc/react-query`), Drizzle ORM 0.45 + `drizzle-kit`, MySQL2 3.22, Zod 4, Wouter 3.9 (frontend routing), Vite 8, Vitest 4. New dependency: `mdb-reader` (pure-Node Access reader, no driver install). ODBC fallback (`odbc` package) is deferred — added only if `mdb-reader` cannot open the production file.
**Storage**: Existing MySQL instance (via `server/db.ts`). New `attendance_*` tables only; no edits to existing tables. Source: Tararus Access file (`.mdb`), read-only, path from env. No changes to MSSQL.
**Testing**: Vitest for unit (rules engine) + service-layer tests; existing `pnpm check` + `pnpm test` gates. No new e2e harness in Phase 1.
**Target Platform**: Existing SRV100 deployment (Windows server, single-instance); same browser support as Medical/Accounting modules.
**Project Type**: Web application — Express+tRPC backend, React+Vite frontend, shared types under `shared/`.
**Performance Goals**: Dashboard renders in ≤5 s at Phase 1 sizing (≤200 employees, ≤1,000 punches/day, 2 years history ≈ 730k raw rows). Background sync tick completes in ≤30 s under normal conditions; manual `Sync now` round-trip ≤10 s for a typical incremental window.
**Constraints**: Constitution Principle I (strict module separation — no cross-module imports), IV (no edits to existing schemas), VI (smallest correct diff), VII (Medical untouched, `pnpm check` mandatory). No writes to Access. No realtime/WS dependency in Phase 1. English UI; Arabic only inside printable report bodies (headers, column labels, totals).
**Scale/Scope**: 9 new MySQL tables, ~17 tRPC procedures, ~13 frontend routes, ~6 dashboard widgets. New code only — no rewrites.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked at end of Phase 1.*

| Principle | Status | How this plan complies |
|---|---|---|
| **I. Strict Module Separation** | ✅ Pass | `server/routers/attendance.ts` MUST NOT import from `medical.ts`/`accounting.ts`; `client/src/pages/attendance/*` MUST NOT import from Medical or Accounting page trees. Only `routers/index.ts` and `client/src/App.tsx` are edited (allowed registration points). Attendance never reads `PAT_CD` or any MSSQL accounting data. |
| **II. Service-Based Accounting Only** | ✅ N/A | Attendance does not derive any revenue/expense; this principle governs Accounting and remains untouched. |
| **III. Read-Only Accounting APIs** | ✅ N/A | No Accounting procedures added or modified. |
| **IV. Use Existing Databases As-Is** | ✅ Pass | Only **new** `attendance_*` tables are added. No existing column renamed, dropped, or repurposed. No edits to `drizzle/schema.ts` rows for medical/patient/accounting; only additions. Drizzle migration created additively. |
| **V. Legacy Output Parity** | ✅ Documented exception | Principle V is mandated for Accounting reports; the spec's Assumptions explicitly note that Attendance Phase 1 does **not** require legacy parity (Tararus reports may differ in rounding/policy). A reconciliation pass is deferred to a later phase. No constitutional amendment needed because Principle V's text scopes itself to "every Accounting report". |
| **VI. Spec-Driven, Minimal-Diff Execution** | ✅ Pass | `/specify` (spec.md) and `/clarify` complete; this `/plan` runs before any code. Each `/tasks` row will carry the mandatory schema (Owner/Backup/Tool/Role/Inputs/Outputs/Prompt/Acceptance/Deps/Constitution Refs). No refactors outside Attendance scope. |
| **VII. Do Not Break Medical** | ✅ Pass | No edits to `server/routers/medical.ts`, `server/_core/procedures.ts` semantics (only **additive** new procedure factories), `client/src/components/ProtectedRoute.tsx`, `server/db.ts`, or MSSQL patient sync. `pnpm check` mandatory before sign-off. |

**Gate result**: PASS. No violations to track in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-attendance-fingerprint/
├── plan.md              # This file
├── spec.md              # Feature spec (already written, includes Clarifications)
├── research.md          # Phase 0 output — decisions for unknowns
├── data-model.md        # Phase 1 output — entities + MySQL schema sketch
├── quickstart.md        # Phase 1 output — how to bring up the module locally
├── contracts/
│   ├── trpc-attendance.md          # tRPC procedure contracts (input/output Zod shapes)
│   ├── attendance-source.md        # AttendanceSource adapter interface
│   └── rules-engine.md             # Pure-function contracts for the rules engine
├── checklists/
│   └── requirements.md  # Spec quality checklist (already passing)
└── tasks.md             # Phase 2 output (created by /speckit-tasks, NOT here)
```

### Source Code (repository root)

Existing structure (untouched by this plan unless explicitly listed):

```text
client/
├── src/
│   ├── App.tsx                            ← EDITED (one-time: register lazy /attendance routes)
│   ├── components/
│   │   ├── ProtectedRoute.tsx             ← unchanged
│   │   └── attendance/                    ← NEW
│   │       ├── widgets/                       (dashboard cards)
│   │       ├── ShiftEditor.tsx
│   │       ├── PunchAdjustDialog.tsx
│   │       └── UnknownEmployeesPanel.tsx
│   ├── hooks/
│   │   └── attendance/                    ← NEW (trpc + polling hooks)
│   └── pages/
│       ├── accounting/                    ← unchanged
│       ├── (medical pages)                ← unchanged
│       └── attendance/                    ← NEW
│           ├── AttendanceHome.tsx
│           ├── LiveBoard.tsx
│           ├── DailyView.tsx
│           ├── EmployeesList.tsx
│           ├── EmployeeDetail.tsx
│           ├── RawLogs.tsx
│           ├── Reports.tsx                    (index for Late/Absence/Overtime sub-pages)
│           ├── reports/
│           │   ├── LateReport.tsx
│           │   ├── AbsenceReport.tsx
│           │   └── OvertimeReport.tsx
│           ├── Settings.tsx                   (shifts / assignments / leaves / holidays)
│           └── admin/
│               ├── SyncStatus.tsx
│               └── DeviceSettings.tsx         (Phase 3 placeholder)

server/
├── _core/
│   ├── procedures.ts                      ← EDITED additively: new procedure factories
│   │                                         (attendanceViewerProcedure, attendanceManagerProcedure,
│   │                                         attendanceAdminProcedure). Existing factories untouched.
│   ├── ws.ts                              ← unchanged (no WS in Phase 1)
│   └── env.ts                             ← EDITED additively: ATTENDANCE_* env validators
├── routers/
│   ├── index.ts                           ← EDITED (one-time: register attendanceRouter)
│   ├── medical.ts                         ← unchanged
│   ├── accounting.ts                      ← unchanged
│   ├── patient.ts                         ← unchanged
│   ├── stockroom.ts                       ← unchanged
│   └── attendance.ts                      ← NEW (tRPC router)
├── services/
│   ├── accounting/                        ← unchanged
│   └── attendance/                        ← NEW
│       ├── sources/
│       │   ├── AttendanceSource.ts            (interface)
│       │   ├── accessDbAdapter.ts             (Phase 1 — mdb-reader)
│       │   ├── tcpDeviceAdapter.ts            (Phase 3 placeholder — not shipped)
│       │   └── sourceFactory.ts               (picks adapter from env)
│       ├── syncEngine.ts                      (advisory lock, HWM, run logging)
│       ├── rulesEngine.ts                     (pure functions; no DB)
│       ├── dailyMaterializer.ts               (writes attendance_daily)
│       ├── employees.service.ts
│       ├── punches.service.ts
│       ├── shifts.service.ts
│       ├── leaves.service.ts
│       ├── holidays.service.ts
│       ├── reports.service.ts
│       └── __tests__/
│           ├── rulesEngine.test.ts
│           ├── syncEngine.test.ts
│           └── dailyMaterializer.test.ts
├── jobs/                                  ← NEW (or co-located under services/attendance if jobs/ doesn't exist; see research.md)
│   └── attendance/
│       ├── syncCron.ts
│       └── recomputeCron.ts
└── db.ts                                  ← unchanged

drizzle/
└── 00XX_add_attendance_tables.sql         ← NEW additive migration

shared/
└── attendance/                            ← NEW (small — only types crossing the wire)
    └── types.ts
```

**Structure Decision**: SRV100 already uses a single-repo Express+tRPC+React layout (Option 2 — Web application). Attendance is a third isolated branch within that layout, following the exact same shape as Accounting (`server/routers/accounting.ts` + `server/services/accounting/` + `client/src/pages/accounting/`). No new top-level project. Only two **registration** files are edited (`server/routers/index.ts`, `client/src/App.tsx`) and two additive `_core` files (`procedures.ts`, `env.ts`) — all four are explicitly allowed by the Constitution as registration/wiring points and contain only additions, not changes to existing exports.

## Phase 0 — Research

See [`research.md`](./research.md) for resolved decisions on:
1. Access reader: `mdb-reader` vs ODBC vs copy-first.
2. Job scheduler: dedicated package vs Node `setInterval` vs existing scheduler.
3. Advisory-lock primitive in MySQL.
4. Punch direction inference when source `direction` is unknown.
5. Frontend polling: `@tanstack/react-query` refetch interval vs custom hook.
6. Print/export strategy for Arabic-headed reports (browser print CSS vs SSR PDF).
7. Time zones and DST handling.
8. Dedup hashing key shape.

**Result**: All `NEEDS CLARIFICATION` items resolved. No new items raised.

## Phase 1 — Design & Contracts

Artifacts produced in this phase:

- [`data-model.md`](./data-model.md) — 9 new MySQL tables (Drizzle definitions sketch), indexes, FKs, retention notes, rebuild semantics for `attendance_daily`.
- [`contracts/trpc-attendance.md`](./contracts/trpc-attendance.md) — every procedure (input Zod shape, output shape, required role, side effects, idempotency notes).
- [`contracts/attendance-source.md`](./contracts/attendance-source.md) — the `AttendanceSource` interface + `RawPunch` / `RawEmployee` DTOs that both Phase 1 and Phase 3 adapters must satisfy.
- [`contracts/rules-engine.md`](./contracts/rules-engine.md) — pure-function contracts: `resolveShift`, `pairPunches`, `computeDay`. Each lists pre/post-conditions and the exact edge cases it covers.
- [`quickstart.md`](./quickstart.md) — local bring-up: env vars, sample `.mdb`, first sync, first dashboard load, how to recompute a range.

### Constitution re-check after Phase 1 design

| Principle | Re-check |
|---|---|
| I — Module separation | Reaffirmed. No artifact above references Medical or Accounting code paths. |
| IV — Existing DBs as-is | Reaffirmed. `data-model.md` only adds tables; migration is additive. |
| VI — Minimal diff | Reaffirmed. Registration edits are the absolute minimum; no refactors. |
| VII — Don't break Medical | Reaffirmed. New procedure factories are added beside existing ones; existing signatures unchanged. |

**Re-gate**: PASS. No new violations surfaced by the design.

### Agent context update

`CLAUDE.md` lines 97–100 (the `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` block) will be updated to point to `specs/001-attendance-fingerprint/plan.md` as the active plan.

## Complexity Tracking

No Constitution Check violations. Table omitted intentionally.

## Next Step

This command ends here. Run `/speckit-tasks` to generate the dependency-ordered, model-routed `tasks.md`.
