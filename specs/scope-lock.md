# Scope Lock — SRV100 Accounting Module Phase 1

> **Status: FROZEN**
> Ratified: 2026-05-03 | Aligned with Constitution v1.0.0, Spec v1.0.0, Plan v1.0.0.
>
> Any executor who discovers a need not listed here **MUST STOP** and file a
> scope-change request. No implementation may proceed on unlisted items without
> an approved amendment to this file.

---

## 1. Frozen Endpoint List (exactly 9)

All procedures are `managerProcedure` (roles: `admin`, `manager`, `accountant`),
`.query(...)` (read-only), zod-validated inputs, registered under `appRouter.accounting.*`.

| # | Procedure | Allowed roles | Nature |
|---|---|---|---|
| 1 | `accounting.dashboardSummary` | admin, manager, accountant | Query |
| 2 | `accounting.dailyRevenue` | admin, manager, accountant | Query |
| 3 | `accounting.serviceRevenue` | admin, manager, accountant | Query |
| 4 | `accounting.receiptsInquiry` | admin, manager, accountant | Query |
| 5 | `accounting.receiptDetail` | admin, manager, accountant | Query |
| 6 | `accounting.lasikReceipts` | admin, manager, accountant | Query |
| 7 | `accounting.lasikServices` | admin, manager, accountant | Query |
| 8 | `accounting.lasikRevenueSummary` | admin, manager, accountant | Query |
| 9 | `accounting.patientLasikSummary` | admin, manager, accountant | Query |

Source references: `specs/specify.md §2` (item 3) and `specs/plan.md §4.2`.

---

## 2. Frozen Filter Parameters per Endpoint

The columns below list every accepted zod input field. No additional parameters
may be added to these inputs without a scope-change request.

### 2.1 `accounting.dashboardSummary`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `sectionCode` | `number` | No | `15` | Lasik section |

### 2.2 `accounting.dailyRevenue`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `fromDate` | ISO date string | **Yes** | — | |
| `toDate` | ISO date string | **Yes** | — | |
| `sectionCode` | `number` | No | `15` | |
| `doctorCode` | `string` | No | — | |

### 2.3 `accounting.serviceRevenue`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `fromDate` | ISO date string | **Yes** | — | |
| `toDate` | ISO date string | **Yes** | — | |
| `sectionCode` | `number` | No | `15` | |
| `doctorCode` | `string` | No | — | |
| `serviceCode` | `string` | No | — | |

### 2.4 `accounting.receiptsInquiry`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `fromDate` | ISO date string | No | — | |
| `toDate` | ISO date string | No | — | |
| `patientCode` | `string` | No | — | zero-padded string, never number |
| `doctorCode` | `string` | No | — | |
| `sectionCode` | `number` | No | `15` | |
| `trNo` | `string` | No | — | receipt number (string to preserve legacy zero-padding, e.g. "000123") |
| `trTy` | `number` | No | — | receipt type (1=cash, 5=credit, 6=resident, 8=refund) |
| `limit` | `number` | No | — | pagination |

### 2.5 `accounting.receiptDetail`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `sectionCode` | `number` | **Yes** | — | |
| `trTy` | `number` | **Yes** | — | |
| `trNo` | `string` | **Yes** | — | (string to preserve legacy zero-padding, e.g. "000123") |

### 2.6 `accounting.lasikReceipts`

Lasik-pinned alias over `receiptsInquiry` with `sectionCode` fixed to `15`.
Accepts the same optional filters minus `sectionCode`.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `fromDate` | ISO date string | No | — | |
| `toDate` | ISO date string | No | — | |
| `patientCode` | `string` | No | — | |
| `doctorCode` | `string` | No | — | |
| `trNo` | `string` | No | — | (string to preserve legacy zero-padding, e.g. "000123") |
| `trTy` | `number` | No | — | |
| `limit` | `number` | No | — | |

### 2.7 `accounting.lasikServices`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `fromDate` | ISO date string | No | — | |
| `toDate` | ISO date string | No | — | |
| `patientCode` | `string` | No | — | |
| `serviceCode` | `string` | No | — | |
| `doctorCode` | `string` | No | — | |
| `limit` | `number` | No | — | |

### 2.8 `accounting.lasikRevenueSummary`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `fromDate` | ISO date string | No | — | |
| `toDate` | ISO date string | No | — | |
| `doctorCode` | `string` | No | — | |

### 2.9 `accounting.patientLasikSummary`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `patientCode` | `string` | **Yes** | — | zero-padded string |

---

## 3. Frozen Page List

All pages live under `client/src/pages/accounting/`. Each page is a lazy-loaded
route registered in `client/src/App.tsx` and wrapped by `AccountingShell.tsx`.

| # | File | Route | FR | tRPC procedure(s) used |
|---|---|---|---|---|
| 1 | `AccountingHome.tsx` | `/accounting` | FR-1 | `accounting.dashboardSummary` |
| 2 | `DailyRevenue.tsx` | `/accounting/daily-revenue` | FR-2 | `accounting.dailyRevenue` |
| 3 | `LasikRevenue.tsx` | `/accounting/service-revenue` | FR-3 | `accounting.serviceRevenue` |
| 4 | `LasikReceipts.tsx` / `ReceiptsInquiry.tsx` | `/accounting/receipts` | FR-4 | `accounting.lasikReceipts` / `accounting.receiptsInquiry` |
| 5 | `LasikServices.tsx` | `/accounting/services` | FR-5 | `accounting.lasikServices` |
| 6 | `PatientsInquiry.tsx` | `/accounting/patients` | FR-4 (patients view) | `accounting.receiptsInquiry` |
| 7 | `PatientAccount.tsx` | `/accounting/patient/:patientCode` | FR-6 | `accounting.patientLasikSummary` |
| 8 | `DoctorAccount.tsx` | `/accounting/doctor/:doctorCode` | FR-7 | `accounting.serviceRevenue` |
| 9 | `PrintPreview.tsx` | `/accounting/print` | FR-8 | (state-driven; no dedicated query) |

Shell component (not a page, no standalone route):

- `AccountingShell.tsx` — wraps all accounting pages with top bar + sub-nav.

Receipt detail opens `PrintPreview.tsx` via:

- Route: `/accounting/receipts/:secCd/:trTy/:trNo` → `accounting.receiptDetail`

Source references: `specs/specify.md §2` (item 5) and `specs/plan.md §6.1`.

---

## 4. Frozen Route Table

| Route | Component | Guard |
|---|---|---|
| `/accounting` | `AccountingHome` inside `AccountingShell` | `ProtectedRoute allowedRoles=['admin','manager','accountant']` |
| `/accounting/daily-revenue` | `DailyRevenue` | same |
| `/accounting/service-revenue` | `LasikRevenue` | same |
| `/accounting/receipts` | `ReceiptsInquiry` | same |
| `/accounting/receipts/:secCd/:trTy/:trNo` | `PrintPreview` (receipt detail) | same |
| `/accounting/services` | `LasikServices` | same |
| `/accounting/patients` | `PatientsInquiry` | same |
| `/accounting/patient/:patientCode` | `PatientAccount` | same |
| `/accounting/doctor/:doctorCode` | `DoctorAccount` | same |
| `/accounting/print` | `PrintPreview` | same |

No other routes under `/accounting/*` are in scope.

---

## 5. Frozen Backend File List

Only the following new files may be created. No existing file outside this list
may be modified except the two allowed edit points.

### New files (all new — zero modifications to existing files)

```
server/
  routers/
    accounting.ts
  services/
    accounting/
      mssqlAccounting.ts
      lasikReceipts.service.ts
      lasikServices.service.ts
      lasikRevenue.service.ts
      lasikPatientAccounting.service.ts
      dailyRevenue.service.ts
      receiptsInquiry.service.ts
      dashboardSummary.service.ts
      sqlBuilders.ts
      mappers.ts
      types.ts
shared/
  accounting/
    contracts.ts
tests/
  accounting/
    sqlBuilders.test.ts
    mappers.test.ts
    lasikRevenue.int.test.ts
    router.test.ts
scripts/
  accounting/
    parity-check.ts
```

### Allowed edit points (2-line additions only)

- `server/routers/index.ts` — add `accounting: accountingRouter`
- `client/src/App.tsx` — add lazy routes for accounting pages

---

## 6. Explicit Out-of-Scope List

The following items are **explicitly forbidden** in Phase 1. Any discovery of a
need in one of these areas requires a formal scope-change request; no executor
may proceed silently.

### 6.1 Write Operations (FORBIDDEN — Constitution Principle III)

- Any `INSERT` into MSSQL accounting tables.
- Any `UPDATE` to MSSQL accounting tables.
- Any `DELETE` from MSSQL accounting tables.
- Any `MERGE`, `EXEC`, or stored-procedure call that mutates data.
- Any write to MySQL from accounting code.
- Any creation of receipts, services, GL entries, or patient records from the web app.

### 6.2 Schema Changes (FORBIDDEN — Constitution Principle IV)

- Adding new MSSQL tables.
- Renaming or altering existing MSSQL columns or tables.
- Adding new MySQL tables or columns.
- Running any migration against `op2026` or `selrs26`.
- Replacing or rewriting encoding/decoding helpers in existing files.

### 6.3 Multi-Year Database Switching (FORBIDDEN — Phase 2+)

- Any logic that switches between `op2026`, `op2025`, or any other year database.
- Any UI control, env var, or routing that selects the active accounting year.
- Any multi-year aggregation or cross-year reporting.

### 6.4 Medical Module Edits (FORBIDDEN — Constitution Principle VII)

- Any change to `server/routers/medical.ts`.
- Any change to `server/db.ts`.
- Any change to `server/integrations/mssqlPatients.ts`.
- Any change to `client/src/components/ProtectedRoute.tsx`.
- Any change to existing medical pages under `client/src/pages/` (non-accounting).
- Any import of accounting code from medical code or vice versa.
- Using `patients.id` (MySQL internal) as an accounting link key.

### 6.5 Mobile-First Redesign (FORBIDDEN)

- Rebuilding accounting screens as mobile-first layouts.
- Adding a dedicated mobile navigation shell for accounting.
- Adding responsive breakpoints that restructure the accounting grid (light
  web-style tables are fine; a full mobile-first rebuild is not).

### 6.6 OneDrive / External Storage (FORBIDDEN)

- Any OneDrive sync, file export, or cloud storage integration.
- Any PDF generation library in Phase 1 (browser `window.print()` only).
- Any export-to-Excel or export-to-CSV feature in Phase 1.

### 6.7 Cross-Module Mutations (FORBIDDEN — Constitution Principle I)

- Accounting UI creating a patient record in MySQL.
- Accounting UI merging Medical and Accounting patient creation flows.
- Any direct SQL executed from the frontend (all data access via tRPC).

### 6.8 New Dependencies (FORBIDDEN unless trivial)

- No new heavy npm packages.
- Reuse only: `mssql`, `zod`, tRPC, React Query, existing shadcn components.

---

## 7. Scope-Change Request Procedure

If an executor discovers a need outside this document:

1. **STOP** implementation of the unlisted item immediately.
2. Open a scope-change request describing: what was discovered, why it is
   needed, which spec section it would amend, and the estimated diff size.
3. Wait for Claude (Governance Lead) to evaluate and either approve an amendment
   or defer the item to Phase 2+.
4. Only after written approval may the item be implemented.

---

## 8. Verification Checklist

After Task 07–09 are delivered, the following grep commands confirm no scope
creep has occurred:

```bash
# Confirm exactly 9 accounting procedures exist
grep -c "accounting\." server/routers/accounting.ts

# Confirm zero write verbs in accounting code
grep -rE "INSERT|UPDATE|DELETE|MERGE|EXEC" server/services/accounting/ server/routers/accounting.ts

# Confirm medical router is untouched
git diff server/routers/medical.ts

# Confirm mssqlPatients.ts is untouched
git diff server/integrations/mssqlPatients.ts

# Confirm ProtectedRoute is untouched
git diff client/src/components/ProtectedRoute.tsx

# Confirm db.ts is untouched
git diff server/db.ts
```

---

**Scope Lock version:** 1.0.0 — aligned with Constitution v1.0.0,
Principles v1.0.0, Spec v1.0.0, Plan v1.0.0, Legacy Reports v1.0.0.
**Frozen:** 2026-05-03.
