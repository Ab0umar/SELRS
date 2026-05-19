# SRV100 AI Context Document

> Single "read this first" file for any AI model (Cursor, Codex, Claude, GPT, Gemini, GLM, Kimi).
> Version: 1.0.0 — aligned with Constitution v1.0.0, Principles v1.0.0.

---

# SRV100 Overview

## What the Project Is

SELRS (Saadany Eye Laser & Refractive Surgery) Medical Center Platform. A monolithic web application serving two distinct domains:

1. **Medical Module** — patient registration, examination, operations scheduling, doctor workflows, Pentacam integration, OCR, FCM notifications
2. **Accounting Module** — financial reporting from legacy MSSQL accounting database, service-based revenue analysis, receipt inquiry, print-preview reports

## Main Goals

- Replace legacy desktop OP (accounting) application with web-based reports matching row-by-row output
- Modernize the medical workflow (registration, exam, operations) into a responsive web app
- Strict separation between Medical and Accounting: no cross-module imports, no shared mutations
- Service-based accounting only: all revenue derived from `PAPAT_SRV` service rows, never from patient/doctor/visit counts

## Medical vs Accounting Philosophy

| Aspect | Medical | Accounting |
|---|---|---|
| Database | MySQL (`selrs26`) | MSSQL (`op2026`) |
| Data direction | Read + Write | Read-Only (Phase 1) |
| Primary key | `patients.id` (auto-increment) | `PAT_CD` (string, zero-padded) |
| Access pattern | Full CRUD | SELECT only, parameterized |
| Bridge key | `patients.patientCode` = MSSQL `PAT_CD` (read-time only) | Same |
| Permission gate | Role-based (doctor, nurse, tech, reception, admin) | `accountingProcedure` (path-based `/accounting` permission) |
| UI language | Arabic + English | Arabic (Eastern Arabic-Indic digits for money) |
| State | Real-time WebSocket updates | Polling (60s auto-refresh) |

---

# Core Architecture

## Frontend Stack

- **React 19** + **Vite** + **Wouter** (router)
- **Tailwind CSS 4** + **shadcn/ui** components (`client/src/components/ui/`)
- **tRPC client** with React Query: `trpc.<router>.<procedure>.useQuery()`
- Lazy-loaded routes via `React.lazy()` in `client/src/App.tsx`
- Arabic RTL layout (`dir="rtl"`)
- `ProtectedRoute` component wraps role-gated routes

## Backend Stack

- **Express** + **tRPC** (superjson transformer)
- **Drizzle ORM** for MySQL access (`server/db.ts`)
- **mssql** package for MSSQL access via `createMssqlPool()` from `server/integrations/mssqlPatients.ts`
- **Zod** for input/output validation on all tRPC procedures
- WebSocket server for real-time medical updates

## Database Architecture

```
MySQL (selrs26)                    MSSQL (op2026)
├── patients                       ├── PAPATMF (patient master)
├── patient_service_entries        ├── MDTEAM (doctors)
├── users                          ├── SRVCMF (service catalog)
├── operations                     ├── PAJRNRCVH (receipt headers)
├── audit_logs                     ├── PAPAT_SRV (service lines)
├── branches                       ├── DEPT (departments)
└── ... (medical schema)           └── APPCODES, CMPMF (lookups)
```

**Connection:** MySQL via Drizzle in `server/db.ts`. MSSQL via `createMssqlPool()` in `server/integrations/mssqlPatients.ts`, wrapped by `mssqlQuery()` helper in `server/services/accounting/mssqlAccounting.ts`.

## Routing Architecture

- `client/src/App.tsx` — lazy routes with `ProtectedRoute` wrappers
- Medical routes: `/dashboard`, `/patients/*`, `/operations`, etc.
- Accounting routes: `/accounting/*` — all gated by `allowedRoles` or path-based permission
- Backend: `server/routers/index.ts` composes `appRouter = { medical, patient, accounting }`

## tRPC Structure

```
server/routers/
├── index.ts          → appRouter composition (ONLY allowed shared edit point)
├── medical.ts        → Medical CRUD (UNTOUCHABLE)
├── patient.ts        → Patient queries (UNTOUCHABLE)
└── accounting.ts     → Accounting read-only queries

server/_core/
├── procedures.ts     → Role-based procedure builders
├── trpc.ts           → tRPC init
├── context.ts        → Auth context
├── index.ts          → Express server bootstrap
└── env.ts            → Environment config
```

**Procedure hierarchy:**
- `publicProcedure` — no auth
- `protectedProcedure` — any authenticated user
- `doctorProcedure` — doctor, admin, manager
- `nurseProcedure` — nurse, admin, manager
- `technicianProcedure` — technician, admin, manager
- `receptionProcedure` — reception, admin, manager
- `managerProcedure` — manager, admin, accountant
- `accountingProcedure` — admin bypass OR path-based `/accounting` permission check
- `adminProcedure` — admin only
- `medicalStaffProcedure` — all medical roles + admin + manager

## React Structure

```
client/src/
├── App.tsx                    → Route definitions (lazy + ProtectedRoute)
├── pages/
│   ├── accounting/
│   │   ├── AccountingHome.tsx        → Dashboard + activity feed
│   │   ├── AccountingShell.tsx       → Layout shell with sub-nav
│   │   ├── DailyRevenue.tsx          → Daily revenue report
│   │   ├── LasikRevenue.tsx          → Service revenue (grouped)
│   │   ├── ReceiptsInquiry.tsx       → Receipt search
│   │   ├── AccountingPatientsInquiry.tsx → Patient/receipt cross-ref
│   │   ├── ReceiptDetail.tsx         → Single receipt + line items
│   │   ├── LasikServices.tsx         → Service lines list
│   │   ├── PatientAccount.tsx        → Patient financial summary
│   │   ├── DoctorAccount.tsx         → Doctor financial summary
│   │   ├── AccountingCashbook.tsx    → Cashbook (MySQL accLedger)
│   │   ├── AccountingLedger.tsx      → Ledger entries (MySQL)
│   │   ├── AccountingAdvances.tsx    → Employee advances
│   │   ├── AccountingLoans.tsx       → Loans tracking
│   │   ├── AccountingHomeFund.tsx    → Home fund balance
│   │   ├── AccountingInstapay.tsx    → Instapay balance
│   │   ├── AccountingDrSaadany.tsx   → Dr. Saadany account
│   │   ├── PrintPreview.tsx          → A4 printable reports
│   │   ├── accountingFormat.ts       → formatMoneyAr, formatCountAr, toArabicDigits
│   │   └── AccountingOpReport.module.css → Shared report table styles
│   ├── Dashboard.tsx           → Medical dashboard
│   ├── Operations.tsx          → Operations scheduling
│   ├── Patients.tsx            → Patient list
│   └── ...
├── components/
│   ├── ProtectedRoute.tsx      → Frontend auth gate (UNTOUCHABLE)
│   ├── ui/                     → shadcn/ui primitives
│   └── ...
├── hooks/                      → Auth hooks, data hooks
└── lib/
    ├── trpc.ts                 → tRPC client setup
    └── utils.ts                → cn() helper
```

## Print/Report System

- `PrintPreview.tsx` renders structured payload (title, meta, columns, rows, groupBy, totals, footer)
- CSS: `@media print` removes app chrome, A4 portrait, black-on-white
- `window.print()` for browser-native printing (no PDF libs in Phase 1)
- Reports must structurally match legacy OP `.rtm` layout (header / body / totals / footer)
- Arabic column names allowed in print preview to match legacy output

---

# Database Separation Rules

## MySQL (selrs26) — Medical Only

- **Owner:** Medical module (read + write via Drizzle ORM in `server/db.ts`)
- **Accounting access:** Read-only reference of `patients.patientCode` for display only
- **Forbidden for accounting:** Any write, any schema change, any new table
- **Tables:** `patients`, `users`, `operations`, `audit_logs`, `branches`, `patient_service_entries`, `permissions`, etc.

## MSSQL (op2026) — Accounting Source of Truth

- **Owner:** Accounting module (read-only via `mssqlQuery()` in `server/services/accounting/mssqlAccounting.ts`)
- **Access pattern:** Parameterized SELECT queries only
- **Forbidden:** INSERT, UPDATE, DELETE, EXEC, MERGE, any DDL, any new indexes/tables
- **Tables read:** `PAPATMF`, `MDTEAM`, `SRVCMF`, `PAJRNRCVH`, `PAPAT_SRV`, `DEPT`, `APPCODES`, `CMPMF`
- **Connection:** `createMssqlPool()` from `server/integrations/mssqlPatients.ts` (UNTOUCHABLE)

## Allowed Bridge

- `patients.patientCode` (MySQL) maps to `PAT_CD` (MSSQL)
- Used at read-time only for descriptive display (patient name enrichment)
- 1358 matched codes, 2 MSSQL-only codes (`0013`, `0699`) handled with "No medical record linked" placeholder
- **Never** used as a mutation path or shared key for writes

## Forbidden Operations

- Accounting code importing from medical modules (or vice versa)
- Shared mutation paths between modules
- Accounting writing to MySQL
- Medical writing to MSSQL accounting tables
- New MSSQL tables or schema changes
- Cross-module type imports (shared types go through `shared/` only)

## Why Separation Exists

1. Legacy accounting data has its own schema, encoding, and semantics that must not be altered
2. Medical workflows are critical patient-care operations that must never be disrupted by accounting changes
3. The MSSQL database (`op2026`) is a production mirror of a legacy desktop application; any write could corrupt financial records
4. Different access patterns: Medical is real-time CRUD; Accounting is batch reporting
5. Different permission models: Medical roles vs. path-based accounting permissions

---

# MySQL Workflow

## Main Tables

| Table | Purpose |
|---|---|
| `patients` | Patient records, demographics, `patientCode`, `id` |
| `users` | Staff accounts, roles, permissions |
| `operations` | Scheduled surgeries/procedures |
| `patient_service_entries` | Service entries synced from MSSQL |
| `audit_logs` | Action audit trail |
| `permissions` | Path-based permission assignments |
| `branches` | Clinic branch data |
| `card_visibility` | Dashboard card configuration per user |
| `accLedger` | Cashbook ledger (income/expense/balance) — MySQL-side accounting |
| `accCategories` | Cashbook categories |

## What Is Allowed

- Full CRUD via Drizzle ORM in medical router/services
- `patientCode` read from `patients` table for display in accounting UI
- Cashbook operations (`accLedger`, `accCategories`) are a MySQL-side sub-module for daily cash tracking

## What Is Forbidden

- Accounting services importing from `server/db.ts` for their own query logic
- Any schema change to existing tables without constitutional amendment
- Removing encoding/decoding helpers for legacy text data
- Dropping or renaming columns

## Typical Flow

1. Patient registers → `patients` table insert via `patientRouter`
2. MSSQL sync runs → pulls `PAT_CD` data, matches to `patientCode`
3. Doctor examines → `medicalRouter` creates/updates examination records
4. Operations scheduled → `operations` table via `medicalRouter`
5. Audit log entries created automatically for mutations

## Important Routes/Services/Components

- `server/routers/medical.ts` — core medical CRUD (UNTOUCHABLE)
- `server/routers/patient.ts` — patient queries (UNTOUCHABLE)
- `server/db.ts` — Drizzle MySQL access (UNTOUCHABLE)
- `client/src/components/ProtectedRoute.tsx` — auth gate (UNTOUCHABLE)
- `client/src/pages/Dashboard.tsx` — medical dashboard
- `client/src/pages/Operations.tsx` — operations scheduling
- `client/src/pages/Patients.tsx` — patient management

---

# MSSQL Workflow

## Main Accounting Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `PAPATMF` | Patient master | `PAT_CD`, `NAM` |
| `MDTEAM` | Doctor directory | `CODE`, `PHNM_AR` |
| `SRVCMF` | Service catalog | `SRV_CD`, `SRV_NM_AR` |
| `PAJRNRCVH` | Receipt headers | `SEC_CD`, `TR_TY`, `TR_NO`, `TR_DT`, `PAT_CD`, `TOTL`, `DISC`, `PA_VL`, `CNCL` |
| `PAPAT_SRV` | Service line items | `SEC_CD`, `TR_TY`, `TR_NO`, `SRV_CD`, `PRC`, `QTY`, `PA_VL`, `DISC_VL`, `SRV_BY1`, `CNCL` |

## Revenue Logic

- **All revenue** is service-based: derived from `PAPAT_SRV.QTY * PAPAT_SRV.PRC` joined with `PAJRNRCVH` headers
- Gross = `QTY * PRC` (line level)
- Discount = `DISC_VL` (line level) or `DISC` (header level)
- Paid = `PA_VL` (patient-paid value)
- Net = Gross - Discount
- Revenue is NEVER computed from patient counts, visit counts, or doctor counts

## Join Logic

```sql
-- Standard receipt + service join
FROM PAJRNRCVH h
JOIN PAPAT_SRV d ON h.SEC_CD = d.SEC_CD
                AND h.TR_TY = d.TR_TY
                AND h.TR_NO = d.TR_NO

-- Doctor join (priority: SRV_BY1 from service row, fallback DRS_CD from header)
LEFT JOIN MDTEAM dr ON d.SRV_BY1 = dr.CODE

-- Service catalog join
LEFT JOIN SRVCMF s ON d.SRV_CD = s.SRV_CD

-- Patient master join
LEFT JOIN PAPATMF p ON h.PAT_CD = p.PAT_CD
```

## SEC_CD Logic

- `SEC_CD = 15` = Lasik section (Phase 1 default)
- All Lasik endpoints default to `sectionCode: 15`
- Generic endpoints (`dailyRevenue`, `serviceRevenue`, `receiptsInquiry`) accept optional `sectionCode` override
- Group-by-section is supported in service revenue reports

## CNCL Logic

- Cancelled transactions have `CNCL` flag set (non-null value)
- All standard reports filter `CNCL IS NULL` on both `PAJRNRCVH` and `PAPAT_SRV` where applicable
- This matches legacy OP behavior: cancelled receipts excluded from all revenue/receipt reports
- CNCL filter is applied in `sqlBuilders.ts` WHERE clauses

## Reporting Logic

- **Daily Revenue:** Group by `TR_DT` date, sum per-day totals
- **Service Revenue:** Group by section → service (with optional doctor detail), accumulate row counts, gross, paid, discount
- **Receipts Inquiry:** Flat list of `PAJRNRCVH` headers with configurable filters
- **Patient Summary:** All receipts + services for a single `PAT_CD`, with totals
- **Doctor Summary:** Service revenue pinned to one doctor code
- All grouping and totalling done in `mappers.ts` (post-query aggregation)

## Read-Only Rules

- `mssqlQuery()` in `server/services/accounting/mssqlAccounting.ts` is SELECT-only
- `sqlBuilders.ts` produces parameterized queries — no string concatenation of user input
- `grep -iE "INSERT|UPDATE|DELETE|EXEC|MERGE"` on `server/services/accounting/` must return zero results
- No stored procedure calls, no dynamic SQL assembly

---

# Accounting Module

## Endpoints (tRPC Procedures)

All under `accountingRouter`, gated by `accountingProcedure`:

| Procedure | Input | Output | Purpose |
|---|---|---|---|
| `dashboardSummary` | `{ sectionCode?, date? }` | 4 KPI numbers | Today/month revenue + receipt counts |
| `transactions` | `{ sectionCode?, limit?, date? }` | `ReceiptHeader[]` | Today's receipt activity feed |
| `dailyRevenue` | `{ fromDate, toDate, sectionCode?, doctorCode? }` | Daily rows + totals | Per-day revenue breakdown |
| `serviceRevenue` | `{ fromDate, toDate, sectionCode?, doctorCode?, serviceCode? }` | Grouped sections + services | Service-based revenue report |
| `receiptsInquiry` | `{ fromDate?, toDate?, patientCode?, doctorCode?, sectionCode?, trNo?, trTy?, limit? }` | `ReceiptHeader[]` | Receipt search |
| `receiptDetail` | `{ sectionCode, trTy, trNo }` | `{ header, lines[] }` | Single receipt + line items |
| `lasikReceipts` | Lasik-pinned alias (SEC_CD=15) | `ReceiptHeader[]` | Lasik receipt list |
| `lasikServices` | `{ fromDate?, toDate?, patientCode?, serviceCode?, doctorCode?, limit? }` | `ServiceRow[]` | Lasik service lines |
| `lasikRevenueSummary` | `{ fromDate?, toDate?, doctorCode? }` | Revenue totals | Lasik revenue summary |
| `patientLasikSummary` | `{ patientCode }` | Patient financial summary | Patient account view |
| `patientLookup` | `{ patientCode }` | `{ patientCode, patientName }` | Patient name lookup |
| `doctorLookup` | `{ doctorCode }` | `{ doctorCode, doctorName }` | Doctor name lookup |
| `serviceLookup` | `{ serviceCode, sectionCode? }` | `{ serviceCode, serviceName }` | Service name lookup |
| `accLedgerSummary` | `{ dateFrom?, dateTo? }` | Income/expense/balance totals | Cashbook summary (MySQL) |
| `accLedger` | `{ dateFrom?, dateTo?, type?, page?, pageSize? }` | Paginated ledger rows | Cashbook entries (MySQL) |
| `accCategories` | — | Category list | Cashbook categories (MySQL) |
| `addAccEntry` | Entry fields | Mutation result | Add cashbook entry (MySQL, mutation) |
| `addPatientServices` | Patient + services | Mutation result | Add service entries (mutation) |
| `deleteReceipt` | Receipt key | Mutation result | Delete receipt (mutation, admin only) |
| `updateReceipt` | Receipt update fields | Mutation result | Update receipt (mutation) |
| `serviceEntryCatalog` | — | Services + doctors catalog | Service entry form data |
| `patientNameLookup` | `{ patientCode }` | Patient name | Quick name lookup |
| `triggerAccSync` | — | Sync result | Trigger Access DB sync (admin only) |

## Services

```
server/services/accounting/
├── mssqlAccounting.ts              → Pool wrapper + mssqlQuery<T>()
├── sqlBuilders.ts                  → Parameterized SQL builders per endpoint
├── mappers.ts                      → Raw row → DTO mapping (UPPERCASE → camelCase)
├── dashboardSummary.service.ts     → Dashboard KPI query
├── home.service.ts                 → Dashboard summary + today's transactions
├── dailyRevenue.service.ts         → Daily revenue query + mapping
├── lasikRevenue.service.ts         → Service revenue + revenue summary
├── lasikReceipts.service.ts        → Lasik receipt list
├── lasikServices.service.ts        → Lasik service lines
├── lasikPatientAccounting.service.ts → Patient financial summary
└── receiptsInquiry.service.ts      → Receipt search + detail
```

## Reports

| Report | Legacy Source | Page Component |
|---|---|---|
| Daily Revenue | `DAY_IN SQLSRV.txt`, `تقرير الرمد.rtm` | `DailyRevenue.tsx` |
| Service Revenue (Doctor→Service) | `اطباء.rtm`, `TRF_DRSRV1.RTM` | `LasikRevenue.tsx` |
| Receipts Inquiry | `تقرير الرمد.rtm` | `ReceiptsInquiry.tsx` |
| Patient Account | `PAPATMF.rtm` | `PatientAccount.tsx` |
| Doctor Account | `اطباء.rtm` | `DoctorAccount.tsx` |

## Print Workflow

1. Report page builds a `PrintPayload` object (title, meta, columns, rows, groupBy, totals, footer)
2. "Print" button navigates to `/accounting/print` with payload in `location.state`
3. `PrintPreview.tsx` renders A4-portrait layout with `@media print` CSS
4. `window.print()` triggers browser print dialog
5. Output must structurally match legacy OP `.rtm` reports

## Route Structure

```
/accounting                              → AccountingHome (dashboard + activity + quick links)
/accounting/daily-revenue                → DailyRevenue
/accounting/service-revenue              → LasikRevenue
/accounting/receipts                     → ReceiptsInquiry
/accounting/receipts/:secCd/:trTy/:trNo  → ReceiptDetail
/accounting/services                     → LasikServices
/accounting/patients                     → AccountingPatientsInquiry
/accounting/patient                      → PatientAccount
/accounting/doctor                       → DoctorAccount
/accounting/cashbook                     → AccountingCashbook
/accounting/ledger                       → AccountingLedger
/accounting/advances                     → AccountingAdvances
/accounting/loans                        → AccountingLoans
/accounting/home-fund                    → AccountingHomeFund
/accounting/instapay                     → AccountingInstapay
/accounting/dr-saadany                   → AccountingDrSaadany
/accounting/print                        → PrintPreview
```

## UI Structure

- `AccountingShell.tsx` wraps all accounting pages with a top bar and sub-navigation
- All pages use `dir="rtl"` for Arabic layout
- Money displayed using Eastern Arabic-Indic digits via `formatMoneyAr()` from `accountingFormat.ts`
- Counts displayed using `formatCountAr()`
- Status colors: emerald for paid-in-full, amber for partial payment
- All tables use `AccountingOpReport.module.css` for consistent report styling
- Filter pages URL-sync query parameters for shareable links
- Loading states: spinner + Arabic loading text
- Error states: inline error with retry button
- Empty states: icon + Arabic message + subtitle

## Performance Requirements

- NFR-1: Each report query returns within 2s for a 30-day window on `op2026` (~1.8k receipts, ~1.8k service rows)
- Auto-refresh: activity feed polls every 60s, dashboard refreshes on window focus
- Query timing logged at debug level (`ACCOUNTING_SQL_DEBUG=1`)
- No full-row payload logging (PII protection)

## Parity Requirements

- Every report MUST match legacy OP output for the same filter set
- Tolerance: ±0.01 currency unit for totals
- Receipt counts must match exactly
- Reference test month: **2026-04** on `op2026`
- Parity artifacts stored under `specs/parity/`
- Parity script: `scripts/accounting/parity-check.ts`

---

# Medical Module

## Patient Workflow

1. **Registration** → `patientRouter` creates patient in MySQL (`patients` table)
2. **MSSQL Sync** → background job syncs patient data from MSSQL `PAPATMF` to MySQL
3. **Examination** → doctor opens patient, examines, records findings in `medicalRouter`
4. **Operations** → scheduled via `medicalRouter`, tracked in `operations` table
5. **Follow-up** → post-op tracking, Pentacam integration, notifications

## Examination Workflow

- Doctor selects patient → opens medical file panel
- Records examination data (diagnosis, notes, measurements)
- Can trigger Pentacam device integration for corneal measurements
- State persisted in JSON fields (exam page state)

## Registration Flow

- Patient enters clinic → reception creates record in `patients` table
- `patientCode` assigned (maps to MSSQL `PAT_CD`)
- If patient exists in MSSQL but not MySQL, sync pulls data

## Operations Flow

- Doctor schedules operation → `operations` table via `medicalRouter`
- Operation type selected from pricing config (`operationsPricing.ts`)
- Day view with doctor pills (filter by doctor)
- Inline toolbar for quick actions (edit, delete, change status)

## Notifications Flow

- FCM (Firebase Cloud Messaging) for push notifications
- WebSocket for real-time in-app updates
- Notification triggers: patient arrival, operation status change, etc.

## What Must NEVER Break

- Patient registration and lookup
- Doctor examination flow
- Operation scheduling and status management
- MSSQL patient sync (`createMssqlPool`, sync scripts)
- Audit logging on all mutations
- Permission enforcement (ProtectedRoute + role-based procedures)
- Encoding/decoding of legacy Arabic text data

---

# Critical Rules

(From Constitution v1.0.0 — all NON-NEGOTIABLE)

## Principle I: Strict Module Separation

- Medical and Accounting code, types, queries MUST NOT cross-import
- Only bridge: `patientCode` = `PAT_CD` at read-time
- No shared mutation paths

## Principle II: Service-Based Accounting Only

- Revenue derived from `PAPAT_SRV`/`PAJRNRCVH` service rows only
- NEVER from patient count, doctor count, visit count, or medical-side computation

## Principle III: Read-Only Accounting APIs

- All accounting tRPC procedures MUST be queries (no mutations)
- Exception: MySQL-side cashbook operations and service entry additions (post-Phase 1 extensions)
- Any new mutation requires constitutional amendment

## Principle IV: Use Existing Databases As-Is

- No schema redesigns, no destructive migrations, no renamed columns
- No replacement of encoding/decoding helpers
- New tables allowed only when no existing table serves the need AND no legacy semantics are altered

## Principle V: Legacy Output Parity

- Every accounting report validated against legacy OP output
- Row-level or total-level comparison on representative date range required
- Parity artifact must exist before task is accepted

## Principle VI: Spec-Driven, Minimal-Diff Execution

- No implementation before `/specify`, `/plan`, `/tasks` exist
- Each task carries: Owner Model, Backup Model, Tool, Role, Input, Output, Prompt, Acceptance Criteria
- Smallest correct diff wins — out-of-scope refactors are FORBIDDEN

## Principle VII: Do Not Break Medical

- Any change preserves Medical module: routes, permissions, patient/doctor flows, MSSQL sync, audit logging
- Tasks touching shared infrastructure MUST run `pnpm check` minimum

## Doctor/Service Matching (Critical Pattern)

- Both `doctorCode` and `serviceCode` must come from the **same `PAPAT_SRV` row**
- Priority: `SRV_BY1` (from service row) first, `DRS_CD` fallback only
- NEVER pick `doctorCode` from `PAJRNRCVH.DRS_CD` independently

## Stale Exam State

- For non-manually-locked patients, exclude `latestExamDoctorByPatient`, `latestExamServiceCodeByPatient` from resolution chains
- Use ONLY synced DB fields + official entries table
- Exam page state JSON persists and overrides fresh MSSQL sync data

---

# Protected Files

These files should almost NEVER be modified:

| File | Reason |
|---|---|
| `server/routers/medical.ts` | Core medical business logic |
| `server/routers/patient.ts` | Patient CRUD API |
| `server/db.ts` | Database + legacy text handling |
| `server/integrations/mssqlPatients.ts` | MSSQL pool + sync logic |
| `client/src/components/ProtectedRoute.tsx` | Auth gate for all pages |
| `server/_core/procedures.ts` | Role-based procedure definitions |
| `server/_core/context.ts` | Auth context |
| `server/_core/trpc.ts` | tRPC initialization |
| `server/_core/env.ts` | Environment configuration |
| `ecosystem.config.js` | PM2 process config |
| `shared/types.ts` | Medical shared types |
| `shared/const.ts` | Shared constants |
| `drizzle/schema.ts` | MySQL schema definition |

---

# Allowed Shared Edit Points

Only these shared files may be edited when adding accounting features:

1. **`server/routers/index.ts`** — to register new routers (2-line edit)
2. **`client/src/App.tsx`** — to add lazy routes with ProtectedRoute wrappers
3. **`shared/accounting/contracts.ts`** — accounting-specific zod schemas and types
4. **`server/_core/procedures.ts`** — only if a new procedure type is genuinely needed (requires review)

---

# Performance Rules

- NFR-1: Report queries ≤2s for 30-day window on `op2026`
- Query timing at debug level only (never log full rows or PII)
- Frontend: React Query caching, `refetchOnWindowFocus` for dashboard, 60s polling for activity feed
- No new heavy dependencies (reuse `mssql`, `zod`, tRPC, React Query)
- Larger date windows paginate via `limit`/`offset` or date chunking
- Index creation on MSSQL is out of scope — only semantics-preserving query rewrites

---

# Print & Report Rules

- Reports use `AccountingOpReport.module.css` for consistent table styling
- Print layout: `@media print` removes nav, chrome, colored banners
- A4 portrait, black-on-white, readable borders
- Arabic column names allowed in print to match legacy OP
- `window.print()` only (no PDF libs)
- Structure: header / body / totals / footer matching OP `.rtm` layout
- Formatting: `formatMoneyAr()` for money, `formatCountAr()` for counts, `toArabicDigits()` for all Arabic digit display
- Date format: `formatDateAr()` produces YYYY-MM-DD with Arabic digits
- Truncation warnings when results hit `limit` cap (e.g., ≥500 rows)

---

# Development Workflow

## Spec-Driven Pipeline

```
Constitution → Principles → /specify → /clarify → /plan → /tasks → Execute → Review
```

1. **Constitution** — established once; amendments require justification + user approval
2. **Project Principles** — operating model (how to produce Constitution-consistent work)
3. **`/specify`** — feature spec: problem, scope, in/out, success criteria
4. **`/clarify`** — targeted questions if scope is ambiguous
5. **`/plan`** — architecture, data flow, contracts, Constitution Check
6. **`/tasks`** — dependency-ordered, model-routed task list
7. **Execution** — implement per task (Cursor/Codex/etc.)
8. **Review** — Claude reviews each task against acceptance criteria

## Validation Discipline

- Per task: `pnpm check` → `pnpm test` → `pnpm smoke` → `pnpm build` (smallest relevant first)
- Auth/routing/permissions/shared types touched: `pnpm check` mandatory
- Shipped behavior changed: `pnpm build` mandatory
- Reports: legacy-output parity check mandatory

## Task Reporting Format

Every completed task reports:
- Changed files
- What changed
- Checks run
- Checks skipped (with reason)

---

# Model Routing

| Task Type | Best Model | Backup | Notes |
|---|---|---|---|
| Specs, plan, tasks, review | Claude | — | Leader/planner/reviewer only |
| Multi-file edits inside repo | Cursor | Codex | Default execution surface |
| Implementation / refactor / bugfix | Codex | Cursor | Backend + frontend wiring |
| SQL design, report logic, complex reasoning | GPT-5 | Claude | Query parity, aggregation |
| Bulk extraction, legacy summaries | GPT-5 mini / GLM / Kimi | OpenRouter | Cheap long-form work |
| UI layout / visual variants | Gemini | Cursor | Design alternatives |
| Local lightweight edits | Ollama / Continue | Cursor | Offline mode |

**Key rules:**
- Never use Claude for heavy implementation
- Never use cheap models for legacy parity checks without Claude review
- Every task prompt ends with: "Follow the project Constitution and Project Principles strictly."

---

# Common Mistakes To Avoid

1. **Cross-importing between Medical and Accounting modules** — violates Principle I
2. **Deriving revenue from patient/doctor/visit counts** — violates Principle II
3. **Adding INSERT/UPDATE/DELETE to accounting SQL** — violates Principle III
4. **Creating new MSSQL tables or renaming columns** — violates Principle IV
5. **Shipping reports without legacy parity artifacts** — violates Principle V
6. **Implementing before spec/plan/tasks exist** — violates Principle VI
7. **Breaking Medical module behavior** — violates Principle VII
8. **Using `DRS_CD` from `PAJRNRCVH` instead of `SRV_BY1` from `PAPAT_SRV`** — creates doctor/service mismatches
9. **Coercing `PAT_CD` to number** — must stay string (zero-padded codes like "0013")
10. **Removing encoding/decoding helpers** — breaks legacy Arabic text display
11. **Widening access by renaming routes** — must preserve permission enforcement
12. **Using raw `fetch()` instead of tRPC hooks** — all data through `trpc.*.useQuery()`
13. **Skipping `pnpm check` after shared file edits** — mandatory for auth/routing/types
14. **Logging full row payloads** — PII risk; only log timing at debug level
15. **Crashing on MSSQL-only patient codes (0013, 0699)** — must show graceful placeholder

---

# Safe Execution Checklist

Before editing any code, verify:

- [ ] Task exists in `specs/tasks.md` with full schema
- [ ] Dependencies are completed and reviewed
- [ ] Files to edit are listed in task Output
- [ ] No file in the Protected Files list is being modified (unless explicitly authorized)
- [ ] Constitution Check passes for all 7 principles
- [ ] SQL is parameterized (no string concatenation of user input)
- [ ] No cross-module imports introduced
- [ ] Revenue logic traces to `PAPAT_SRV`/`PAJRNRCVH` service rows
- [ ] `PAT_CD` treated as string, never number
- [ ] CNCL filter applied where legacy excludes cancelled
- [ ] Doctor code sourced from `SRV_BY1` (service row), not `DRS_CD` (header)
- [ ] Arabic RTL layout preserved (`dir="rtl"`)
- [ ] Arabic digit formatting via `formatMoneyAr()`/`formatCountAr()`
- [ ] Loading/error/empty states implemented
- [ ] `pnpm check` will be run if shared infrastructure touched
- [ ] No PII in logs (timing only at debug level)
- [ ] Task prompt ends with: "Follow the project Constitution and Project Principles strictly."

After editing:

- [ ] Run smallest relevant check (`pnpm check` / `pnpm test` / `pnpm build`)
- [ ] Verify zero changes to protected files (`git diff --stat`)
- [ ] Verify no mutating SQL verbs in accounting files (`grep -iE "INSERT|UPDATE|DELETE|EXEC|MERGE"`)
- [ ] Report: changed files, what changed, checks run, checks skipped

---

**Document version:** 1.0.0 — generated 2026-05-18
**Aligned with:** Constitution v1.0.0, Project Principles v1.0.0, Spec v1.0.0, Plan v1.0.0, Tasks v1.0.0
