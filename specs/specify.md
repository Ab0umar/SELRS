# /specify — SRV100 Accounting Module (Phase 1: Read-Only, Lasik)

> Companions: `specs/CONSTITUTION.md`, `specs/PROJECT_PRINCIPLES.md`.
> This spec describes the Accounting module to be added beside the existing
> Medical module inside the single SRV100 web app. It covers Phase 1 only
> (read-only, Lasik `SEC_CD = 15`). Phases 2+ are explicitly out of scope here.

---

## 1. Goal

Add a read-only **Accounting module** inside the existing SRV100 web app that:

- Surfaces the legacy OP accounting data already living in MSSQL (`op2026`).
- Matches the output of the legacy OP reports row-by-row and total-by-total
  for the same filter set.
- Ships beside the existing Medical module with strict module separation and
  no change to medical data flow, MySQL writes, or existing routes.
- Starts with Lasik only (`SEC_CD = 15`) before generalizing to other sections.

## 2. Scope (IN)

1. New backend tRPC router `accountingRouter` under `server/routers/accounting.ts`.
2. New backend service layer under `server/services/accounting/`:
   - `mssqlAccounting.ts` (wraps `createMssqlPool` from `server/integrations/mssqlPatients.ts`)
   - `lasikReceipts.service.ts`
   - `lasikServices.service.ts`
   - `lasikRevenue.service.ts`
   - `lasikPatientAccounting.service.ts`
   - `dailyRevenue.service.ts`
   - `receiptsInquiry.service.ts`
3. Accounting tRPC procedures (all `protectedProcedure`, read-only):
   - `accounting.dashboardSummary`
   - `accounting.dailyRevenue`
   - `accounting.serviceRevenue`
   - `accounting.receiptsInquiry`
   - `accounting.receiptDetail`
   - `accounting.lasikReceipts`
   - `accounting.lasikServices`
   - `accounting.lasikRevenueSummary`
   - `accounting.patientLasikSummary`
4. Frontend navigation separation: Medical menu untouched; an **Accounting**
   entry exists and opens a parallel area under `/accounting/*`.
5. Frontend pages (light mode, web style) under `client/src/pages/accounting/`:
   - `AccountingHome.tsx` (dashboard cards)
   - `DailyRevenue.tsx`
   - `LasikRevenue.tsx` (service-based revenue report)
   - `LasikServices.tsx`
   - `LasikReceipts.tsx`
   - `ReceiptsInquiry.tsx` / `PatientsInquiry.tsx`
   - `PatientAccount.tsx`, `DoctorAccount.tsx`
   - `PrintPreview.tsx`
6. Print preview for each report producing layout that matches OP `.rtm`
   output (header / body / totals), printable via the browser.
7. Route registration in `client/src/App.tsx` (lazy routes only) and backend
   registration in `server/routers/index.ts`. Those two files are the only
   allowed edit points inside the untouchable list.
8. Integration tests validating accounting outputs against legacy OP reports
   for defined date ranges (row-level or total-level parity).

## 3. Non-scope (OUT)

- **No writes** to MSSQL accounting (no INSERT/UPDATE/DELETE of receipts,
  services, patients, GL, etc.). Any such proposal needs a constitutional
  amendment.
- **No changes** to Medical module routes, queries, MySQL schema, or
  `server/routers/medical.ts` (except the allowed registration exceptions
  in `server/routers/index.ts`).
- **No rewrite** of `server/integrations/mssqlPatients.ts`,
  `server/db.ts`, or `client/src/components/ProtectedRoute.tsx`.
- **No DB redesign**, no new MSSQL tables, no renamed columns.
- **No multi-year DB switching logic** yet (stay on `MSSQL_DATABASE` from
  `.env`; multi-year is Phase 2+).
- **No OneDrive**, no mobile-first redesign of accounting screens.
- **No merging** of Medical and Accounting patient creation logic.
- **No cross-module mutation path**: Accounting UI never creates a patient.
- **No direct SQL from the frontend** — everything via tRPC.

## 4. Users & Modules

### Users / Roles

| Role | Access |
|---|---|
| `admin` | Full Accounting read (all screens, all filters, all totals). |
| `manager` | Full Accounting read (all screens, all filters, all totals). |
| `accountant` | Full Accounting read. |
| `doctor`, `nurse`, `technician`, `reception` | No access to Accounting module in Phase 1. |

Backend enforcement: `managerProcedure` (already allows `manager`, `admin`,
`accountant`) for accounting procedures. Frontend enforcement: `ProtectedRoute`
with the matching allowed roles. No changes to `ProtectedRoute` component;
use its existing role/permission API.

### Modules Touched

| Module | Change |
|---|---|
| Medical | **None** — routes and behavior preserved exactly. |
| Patient (MySQL) | **Read-only** reference via `patientCode` (= MSSQL `PAT_CD`). No schema change. |
| Accounting (new) | Full implementation of Phase 1 read-only. |
| Shared auth/permissions | Reuse existing `protectedProcedure` / `managerProcedure`; reuse `ProtectedRoute`. |

## 5. System Rules

1. Service-based accounting (Principle II): every revenue figure is derived
   from `PAPAT_SRV` service rows joined to `PAJRNRCVH` receipt headers. No
   revenue figure is derived from patient count, doctor count, or medical
   visit count.
2. Strict module separation (Principle I): Accounting code, types, and
   queries MUST NOT import from medical modules, and vice versa. Cross-
   module linkage uses `patientCode` = `PAT_CD` at read-time only.
3. Read-only (Principle III): all accounting tRPC procedures are queries; no
   mutation surface exists.
4. Use existing DBs as-is (Principle IV): reuse `createMssqlPool`; do not
   introduce a second connection stack; do not add MSSQL tables.
5. Lasik first: default filter `SEC_CD = 15` for all Lasik-labeled endpoints.
   Generic `dailyRevenue` / `serviceRevenue` / `receiptsInquiry` endpoints
   accept an optional `sectionCode` filter (default `15`).
6. Legacy parity (Principle V): every report has a corresponding legacy OP
   report and a parity check artifact for at least one representative date
   range.
7. Spec-driven, minimal-diff (Principle VI): no implementation before this
   spec, `plan.md`, and `tasks.md` are reviewed. Each task ships the
   smallest correct diff.
8. Do not break Medical (Principle VII): `pnpm check` is mandatory for any
   task that touches shared infrastructure (`App.tsx`, `routers/index.ts`,
   `ProtectedRoute.tsx` if ever justified, shared types).

## 6. Functional Requirements

### FR-1 Dashboard (`AccountingHome.tsx`)

- Cards: `totalReceiptsToday`, `totalRevenueToday`, `totalReceiptsThisMonth`,
  `totalRevenueThisMonth`, plus quick links to Daily Revenue, Service
  Revenue, Receipts Inquiry, Patients Inquiry.
- Data source: `accounting.dashboardSummary` (MSSQL read-only).

### FR-2 Daily Revenue (`DailyRevenue.tsx`)

- Filters: `fromDate`, `toDate`, optional `sectionCode` (default 15),
  optional `doctorCode`.
- Output: per-day rows with `totalReceipts`, `totalGross`, `totalDiscount`,
  `totalCash`, `totalPaid`, `netAfterDiscount`.
- Grand totals row at the bottom.
- Export/print: opens Print Preview with OP-matching layout.

### FR-3 Service Revenue (`LasikRevenue.tsx`)

- Filters: `fromDate`, `toDate`, optional `doctorCode`, optional `serviceCode`,
  optional `sectionCode` (default 15).
- Grouping: **Doctor → Service** (per legacy `اطباء.rtm` / `TRF_DRSRV1.RTM`).
- Per-service subtotal: row count, sum of `QTY * PRC` (gross), sum of
  `PA_VL`, sum of `DISC_VL`.
- Per-doctor subtotal: same aggregates summed across services.
- Grand total at the end.

### FR-4 Receipts Inquiry (`LasikReceipts.tsx` / `ReceiptsInquiry.tsx`)

- Filters: `fromDate`, `toDate`, `patientCode`, `doctorCode`, `sectionCode`
  (default 15), `trNo`, `trTy`.
- Output: list of receipt headers (`PAJRNRCVH`) with columns
  `SEC_CD, TR_TY, TR_NO, TR_DT, PAT_CD, NAM, TOTL, DISC, PA_VL, ENTEREDBY`.
- Row click → `accounting.receiptDetail({ sectionCode, trTy, trNo })` returns
  header + detail lines (`PAPAT_SRV`) and opens Print Preview.

### FR-5 Lasik Services (`LasikServices.tsx`)

- Filters: `fromDate`, `toDate`, `patientCode`, `serviceCode`, `doctorCode`,
  `limit`.
- Output: flat list of `PAPAT_SRV` rows for `SEC_CD = 15` with the legacy
  columns (`PAT_CD, VST_NO, TR_NO, SRV_CD, PRC, DISC_VL, PA_VL, ENTRYDATE`,
  plus `SRV_BY1`/`CUR_SRV_BY`).

### FR-6 Patient Account (`PatientAccount.tsx`)

- Input: `patientCode` (from URL or inquiry).
- Output: patient receipts from `PAJRNRCVH`, services from `PAPAT_SRV`,
  totals (`totalReceipts, totalServices, totalGross, totalDiscount,
  totalPaid, lastTransactionDate`). Uses `accounting.patientLasikSummary`.
- No MySQL write; no cross-module mutation.

### FR-7 Doctor Account (`DoctorAccount.tsx`)

- Input: `doctorCode` (= MSSQL `MDTEAM.CODE`).
- Output: doctor-grouped service revenue; same grouping as FR-3 but pinned
  to one doctor. Reuses `accounting.serviceRevenue`.

### FR-8 Print Preview (`PrintPreview.tsx`)

- Accepts a payload describing `title`, `header`, `columns`, `rows`,
  `totals`, and `meta` (date range, filters).
- Renders a printable page (A4 portrait by default) matching OP `.rtm`
  layout: clinic/report header, table, totals row, footer.
- Uses browser `window.print()`. No PDF generation libs added in Phase 1.

### FR-9 Navigation Separation

- Main nav gains a single **Accounting** entry (guarded by allowed roles).
- Accounting pages render inside `AccountingShell.tsx` with its own sub-nav:
  Dashboard · Daily Revenue · Service Revenue · Receipts · Services ·
  Patient Account · Doctor Account.
- Medical nav and routes are not reshuffled.

## 7. Non-Functional Requirements

1. **Performance**: each report query must return within 2s for a 30-day
   window on the reference dataset (`op2026`, ~1.8k receipts, ~1.8k service
   rows). Larger windows paginate via `limit`/`offset` or date chunking.
2. **Security**: all endpoints `protectedProcedure` with `managerProcedure`
   gate; no secrets leak to the frontend; connection config stays in `.env`.
3. **Stability**: do not regress `pnpm check` or existing medical tests.
4. **Compatibility**: stay on Node/TypeScript versions used by `package.json`;
   no new heavy dependencies. Reuse `mssql`, `zod`, tRPC, React Query.
5. **UI**: light mode, web style (not mobile-first for accounting). Arabic
   column names allowed in print preview to match OP.
6. **Observability**: log query timing at debug level; never log full row
   payloads or PII.
7. **Resilience**: missing `patientCode` in MySQL for codes present in MSSQL
   (known: `0013`, `0699`) must not crash the UI — show "No medical record
   linked" placeholder.

## 8. Data Boundaries

### MySQL (selrs26) — medical only, read-only for Accounting

- `patients.patientCode` is the only field read by accounting code, and only
  for descriptive display (patient name, etc., if linked).
- `patients.id` is NEVER used as a link key in accounting.
- Accounting code MUST NOT write MySQL tables.

### MSSQL (op2026) — accounting source of truth

- Tables read: `PAPATMF`, `MDTEAM`, `SRVCMF`, `PAJRNRCVH`, `PAPAT_SRV`.
- Lookup tables permitted: `DEPT`, `APPCODES`, `CMPMF` (read-only, only for
  display names in reports).
- Filter: `SEC_CD = 15` for Lasik endpoints; `sectionCode` parameter for
  generic endpoints.
- Joins follow the legacy pattern:
  `PAJRNRCVH h JOIN PAPAT_SRV d ON h.SEC_CD=d.SEC_CD AND h.TR_TY=d.TR_TY AND h.TR_NO=d.TR_NO`.
- Soft-cancel filter: `PAPAT_SRV.CNCL IS NULL` when legacy report does so.

### Bridge

- Only `patients.patientCode` (MySQL) ↔ `PAT_CD` (MSSQL). Verified:
  1358 matches, 2 MSSQL-only codes (`0013`, `0699`) handled as graceful
  "no medical link".

## 9. Legacy Matching Requirements

For each report, there MUST exist an attached parity artifact:

| Report | Legacy source | Parity artifact |
|---|---|---|
| Daily Revenue | `D:\OP\Views\DAY_IN  SQLSRV.txt`, `D:\OP\تقرير الرمد.rtm` | CSV diff for a representative date range |
| Service Revenue (Doctor→Service) | `D:\OP\اطباء.rtm`, `D:\OP\REPORTS\TRF_DRSRV1.RTM` | Row counts + per-doctor totals match |
| Receipts Inquiry | `D:\OP\تقرير الرمد.rtm` | One-receipt round-trip: header+lines identical |
| Service Revenue (by service) | `D:\OP\اطباء.rtm` | Per-service totals match |
| Patient Account | `D:\OP\طباعة الأدلة\PAPATMF.rtm` | Patient receipts + services totals match OP patient history |

Parity check must be runnable via `scripts/accounting/parity-check.ts` (added
in Task 16). Default comparison range: a full month on `op2026`.

## 10. Acceptance Criteria (Phase 1 DoD)

1. `pnpm check` passes; `pnpm test` passes (new vitest files for accounting
   services).
2. `server/routers/index.ts` registers `accounting` and nothing else changed.
3. `server/routers/medical.ts`, `server/db.ts`,
   `server/integrations/mssqlPatients.ts`, and
   `client/src/components/ProtectedRoute.tsx` have **zero diffs** since
   the Phase 1 branch point.
4. All 9 accounting procedures load through `appRouter.accounting.*`.
5. Each FR-1..FR-9 page renders without console errors on fresh login with a
   `manager` user, returns expected data for a known date range, and does not
   crash when `patientCode` in MSSQL has no MySQL match (`0013`, `0699`).
6. Parity artifacts exist under `specs/parity/` for at least one
   representative date range per report.
7. No INSERT/UPDATE/DELETE or any mutating SQL verbs appear in any file
   under `server/services/accounting/` or `server/routers/accounting.ts`.
8. Print Preview produces a page that matches the OP layout structurally
   (header/body/totals/footer), verified by a screenshot attached to the
   task.
9. Navigation clearly separates Medical and Accounting; Medical pages still
   behave exactly as on the branch point.
10. Tasks document which checks were run and which were skipped and why.

---

**Spec version:** 1.0.0 — aligned with Constitution v1.0.0 and Project
Principles v1.0.0.
