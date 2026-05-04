# /plan — SRV100 Accounting Module Phase 1 Implementation Plan

> Companions: `specs/CONSTITUTION.md`, `specs/PROJECT_PRINCIPLES.md`,
> `specs/specify.md`. This plan converts the spec into design artifacts.

---

## 0. Constitution Check

| Principle | Status |
|---|---|
| I. Strict Module Separation | PASS — Accounting is a new folder tree; no import into/from Medical. Bridge is `patientCode` only. |
| II. Service-Based Accounting | PASS — every revenue metric flows from `PAPAT_SRV`/`PAJRNRCVH`. |
| III. Read-Only Accounting APIs | PASS — all procedures are `protectedProcedure` queries. |
| IV. Use Existing DBs As-Is | PASS — reuse `createMssqlPool`; no new tables; no schema edits. |
| V. Legacy Output Parity | PASS — parity artifacts required per report (Task 16). |
| VI. Spec-Driven, Minimal-Diff | PASS — this plan + spec + tasks precede any implementation. |
| VII. Do Not Break Medical | PASS — only `server/routers/index.ts` and `client/src/App.tsx` edited in shared surfaces. |

## 1. Architecture Overview

```
+------------------------------- Browser --------------------------------+
|  Medical pages (existing)         Accounting pages (new)               |
|  client/src/pages/*               client/src/pages/accounting/*        |
|  ProtectedRoute (unchanged)                                            |
+------------------------------- tRPC ----------------------------------+
|   appRouter = { medical, patient, accounting(NEW) }                   |
+------------------------------- Server --------------------------------+
|  server/routers/medical.ts      server/routers/accounting.ts (NEW)    |
|  server/routers/patient.ts      server/services/accounting/* (NEW)    |
|  server/_core/procedures.ts     server/integrations/mssqlPatients.ts  |
|                                   (unchanged, reused)                 |
+------------------------------ Databases ------------------------------+
|  MySQL (selrs26) — Medical   <-- patientCode -->   MSSQL (op2026) —   |
|                                                    Accounting         |
+-----------------------------------------------------------------------+
```

**Data direction for Accounting:** Browser → tRPC query → accounting router
→ service → `createMssqlPool()` → MSSQL `SELECT` → service mapper → tRPC
response → React Query cache → UI.

## 2. Existing System Assumptions

- `server/integrations/mssqlPatients.ts` exposes `createMssqlPool()` at
  line 376 and this is the only sanctioned way to obtain an MSSQL pool.
- `server/_core/procedures.ts` already provides `protectedProcedure`,
  `managerProcedure`, `adminProcedure`. Accounting uses `managerProcedure`
  (which already allows `manager`, `admin`, `accountant`).
- `server/routers/index.ts` composes `appRouter`. Adding `accounting:
  accountingRouter` is a 2-line edit.
- `client/src/App.tsx` uses a lazy-route pattern. Accounting routes are
  added using the same pattern; no global reshuffle.
- `client/src/components/ProtectedRoute.tsx` is treated as a closed black
  box — we use its existing `requiredRole` / `allowedRoles` API.
- `client/src/pages/accounting/` is already scaffolded with placeholder
  files (AccountingHome, LasikReceipts, etc.) using prototype data. These
  files are the surface we wire to real tRPC calls.

## 3. Medical / Accounting Separation

### Code separation

- New folder: `server/services/accounting/` — isolated from any medical
  code; no import from `server/routers/medical.ts` or `server/db.ts`
  (except types, if strictly unavoidable, via `shared/`).
- New folder: `client/src/pages/accounting/` — no import from medical
  pages; shared UI primitives come from `client/src/components/ui/*` only.
- `shared/` types: if any shared DTO is needed, it goes to
  `shared/accounting/*.ts`, never into existing medical shared types.

### Data separation

- MSSQL pool access is localized to `server/services/accounting/mssqlAccounting.ts`.
- The accounting layer never calls `getDb()` (MySQL) for its own logic.
- The only MySQL touch point is **optional** descriptive display of the
  patient name for a given `patientCode`, loaded via an existing patient
  query exposed by `patientRouter`. If that exposure doesn't exist, we
  skip the enrichment and show the MSSQL `PAT_CD` / `NAM` only.

### UI separation

- Navigation: Accounting has its own top-level entry and its own
  `AccountingShell.tsx`. Medical sidebar/nav is not modified.
- Routes: all accounting routes live under `/accounting/*`.

## 4. Backend Strategy

### 4.1 Folder structure (final)

```
server/
  routers/
    accounting.ts                          (NEW — tRPC router)
  services/
    accounting/
      mssqlAccounting.ts                   (NEW — pool wrapper + query helper)
      lasikReceipts.service.ts             (NEW)
      lasikServices.service.ts             (NEW)
      lasikRevenue.service.ts              (NEW — grouping by doctor/service)
      lasikPatientAccounting.service.ts    (NEW)
      dailyRevenue.service.ts              (NEW)
      receiptsInquiry.service.ts           (NEW)
      dashboardSummary.service.ts          (NEW)
      sqlBuilders.ts                       (NEW — parameterized SQL fragments)
      mappers.ts                           (NEW — raw row → DTO)
      types.ts                             (NEW — internal types)
shared/
  accounting/
    contracts.ts                           (NEW — zod input/output schemas)
```

### 4.2 tRPC procedures

All procedures are `managerProcedure` (admin/manager/accountant),
`.query(...)`, zod-validated inputs, superjson-transformed outputs.

| Procedure | Input shape | Output shape |
|---|---|---|
| `accounting.dashboardSummary` | `{ sectionCode?: number }` | `DashboardSummaryDTO` |
| `accounting.dailyRevenue` | `{ fromDate, toDate, sectionCode?, doctorCode? }` | `DailyRevenueRow[]` + totals |
| `accounting.serviceRevenue` | `{ fromDate, toDate, sectionCode?, doctorCode?, serviceCode? }` | grouped by doctor/service |
| `accounting.receiptsInquiry` | `{ fromDate?, toDate?, patientCode?, doctorCode?, sectionCode?, trNo?, trTy?, limit? }` | `ReceiptHeaderDTO[]` |
| `accounting.receiptDetail` | `{ sectionCode, trTy, trNo }` | `{ header, lines[] }` |
| `accounting.lasikReceipts` | Lasik-pinned alias over receiptsInquiry (`sectionCode=15`) | `ReceiptHeaderDTO[]` |
| `accounting.lasikServices` | `{ fromDate?, toDate?, patientCode?, serviceCode?, doctorCode?, limit? }` | `ServiceRowDTO[]` |
| `accounting.lasikRevenueSummary` | `{ fromDate?, toDate?, doctorCode? }` | `RevenueSummaryDTO` |
| `accounting.patientLasikSummary` | `{ patientCode }` | `PatientSummaryDTO` |

### 4.3 Query rules

- All SQL uses **parameterized queries** via `mssql` Request.input(...).
  No string concatenation of user input.
- Lasik filter: default `SEC_CD = 15` unless overridden.
- Soft-cancel filter: `s.CNCL IS NULL` when legacy report does.
- Joins follow legacy keys: `(SEC_CD, TR_TY, TR_NO)` on
  `PAJRNRCVH`↔`PAPAT_SRV`; `SRV_BY1`↔`MDTEAM.CODE`; `SRV_CD`↔`SRVCMF.SRV_CD`.
- Zero write verbs: lint rule in Task 18 grep-asserts this.

### 4.4 Errors

- Pool errors → log + `TRPCError({ code: 'INTERNAL_SERVER_ERROR' })`.
- Empty results → empty array/zeroed totals, not an error.
- Validation errors → `TRPCError({ code: 'BAD_REQUEST' })` via zod.

## 5. MSSQL Read-Only Accounting Strategy

- Single shared pool via `createMssqlPool()` (existing). No new connection
  strings, no new env vars.
- Query helper in `mssqlAccounting.ts`:
  ```ts
  export async function mssqlQuery<T>(sql: string, params: Record<string, unknown>): Promise<T[]>
  ```
  Binds parameters safely, sets `request.arrayRowMode = false`, returns
  `recordset`.
- `sqlBuilders.ts` centralizes reusable WHERE fragments (date range,
  section code, doctor filter, patient filter, service filter) so every
  service composes the same proven logic.
- `mappers.ts` converts raw MSSQL rows (uppercase legacy names) to normalized
  camelCase DTOs. This is the single place where naming changes.
- `PAT_CD` is a string in legacy data (zero-padded); normalize to string
  everywhere in DTOs. Never coerce to number.
- Dates: keep raw `datetime` from MSSQL and convert to ISO strings at
  mapper boundary. UI formats for display.

## 6. Frontend Strategy

### 6.1 Routing

`client/src/App.tsx` adds lazy routes (pattern already in use):

```
/accounting                          → AccountingHome (inside AccountingShell)
/accounting/daily-revenue            → DailyRevenue
/accounting/service-revenue          → LasikRevenue
/accounting/receipts                 → ReceiptsInquiry
/accounting/receipts/:secCd/:trTy/:trNo → ReceiptDetail (opens PrintPreview)
/accounting/services                 → LasikServices
/accounting/patients                 → PatientsInquiry
/accounting/patient/:patientCode     → PatientAccount
/accounting/doctor/:doctorCode       → DoctorAccount
/accounting/print                    → PrintPreview (state-driven)
```

All routes wrapped by `ProtectedRoute` with `allowedRoles=['admin','manager','accountant']`.

### 6.2 Shell and navigation

- `AccountingShell.tsx` (exists, to be wired): top bar + secondary nav +
  outlet. Sub-nav items are strict to the list in the spec.
- Main app navigation adds one **Accounting** entry (role-gated) that
  links to `/accounting`. Existing medical nav untouched.

### 6.3 Data fetching

- React Query via tRPC client: `trpc.accounting.*.useQuery(input)`.
- All pages have: filter form, results table/grid, empty state, loading
  state, error state, print button (Daily Revenue, Service Revenue,
  Receipts, Patient Account).
- Inputs are URL-synced (query params) where it aids linking and print.

### 6.4 UI conventions

- Light mode only.
- Tables from `client/src/components/ui/table.tsx` (existing shadcn).
- Filters from existing form primitives (`Input`, `Select`, `DatePicker`).
- Arabic labels allowed in print preview to match OP; screen labels can
  be bilingual.
- Empty patient-link state (`0013`, `0699`): show "No medical record linked"
  pill, do not throw.

## 7. Report / Print Preview Strategy

- Single `PrintPreview.tsx` page. Accepts state via React Router `location.state`
  or a query id lookup (React Query cache key).
- Shape of payload:
  ```ts
  {
    title: string;
    meta: { clinicName: string; fromDate?: string; toDate?: string; filters?: Record<string,string> };
    columns: { key: string; label: string; align?: 'left'|'right'|'center' }[];
    rows: Record<string, unknown>[];
    groupBy?: { doctor?: boolean; service?: boolean };
    totals?: { label: string; values: Record<string, number> }[];
    footer?: string;
  }
  ```
- CSS: dedicated `@media print` rules in `PrintPreview.module.css` ensuring
  A4 portrait, black-on-white, readable borders.
- Print action: browser `window.print()` triggered on "Print" button.
- No PDF libs added in Phase 1.
- Layout parity targets: header/body/totals/footer match OP `.rtm` reports
  by structure (not pixel-perfect). Screenshot attached to Task 15.

## 8. Testing Strategy

| Level | Tooling | Files |
|---|---|---|
| Unit (service SQL builders + mappers) | Vitest | `tests/accounting/sqlBuilders.test.ts`, `tests/accounting/mappers.test.ts` |
| Integration (service → live MSSQL) | Vitest + `mssql` | `tests/accounting/lasikRevenue.int.test.ts` (marked `describe.skipIf(noMssql)`) |
| Router (tRPC caller) | Vitest | `tests/accounting/router.test.ts` |
| Frontend smoke | Playwright | `tests/ui/accounting.spec.ts` (login → each page → print preview opens) |
| Parity | Script | `scripts/accounting/parity-check.ts` comparing MSSQL totals to legacy CSV exports |

`pnpm test` must pass; Playwright tests are optional in CI but required
before merge of frontend tasks.

### 8.1 Test data

- Reference month: **2026-04** on `op2026` (production mirror in dev).
- Known patient codes: any valid code + edge codes `0013`, `0699`.
- SEC_CD: 15 (Lasik).

## 9. Deployment Considerations

- **Env**: no new env vars. Reuses `MSSQL_*` from `.env`.
- **DB**: no migrations — Phase 1 writes no schema.
- **Build**: `pnpm build` bundles the new pages; no changes to build
  config required.
- **Windows service / PM2**: `ecosystem.config.js` unchanged.
- **Rollback**: the branch `feature/accounting-module-readonly` is the
  unit of rollback. Reverting removes accounting entirely without
  affecting medical (no shared files modified beyond `index.ts` and
  `App.tsx`).
- **Feature flag** (optional): a simple role check is sufficient in
  Phase 1; no server-side flag needed.

## 10. Model / Tool Routing Strategy

Applied from `PROJECT_PRINCIPLES.md §4`:

| Phase of work | Owner Model | Backup | Tool |
|---|---|---|---|
| Specs, plan, tasks, prompts, reviews | Claude | — | Claude (direct) |
| Multi-file repo edits (backend + frontend wiring) | Cursor | Codex | Cursor |
| New implementation (services, router, pages) | Codex | Cursor | Codex CLI / Cursor |
| SQL design, query parity, report aggregation logic | GPT-5 | Claude | ChatGPT / Cursor |
| Bulk extraction (legacy `.rtm` fields, prototype data) | GPT-5 mini / GLM / Kimi | OpenRouter cheap | Cursor + cheap model |
| UI layout proposals and visual alternatives | Gemini | Cursor | Cursor + Gemini |
| Local lightweight edits when offline | Ollama / Continue | Cursor | Continue |

**Rules enforced by this plan:**

- Claude never implements.
- Cheap models never touch legacy parity checks (Task 16) without a
  Claude review pass.
- Cursor is the default execution surface inside the repo.
- Every task prompt ends with *"Follow the project Constitution and
  Project Principles strictly."*

---

**Plan version:** 1.0.0 — aligned with Constitution v1.0.0, Project
Principles v1.0.0, Spec v1.0.0.
