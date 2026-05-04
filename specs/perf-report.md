# Task 18 — Accounting Performance Report (op2026)

**Environment:** Reference MSSQL database `op2026` via existing app `.env` (`createMssqlPool`).  
**NFR-1:** Each report endpoint ≤ **2s** for a **30-day** Lasik window (`SEC_CD = 15`).  
**Method:** Service-layer wall time using `scripts/accounting/perf-measure.ts`: preload accounting modules, prime pool with `SELECT 1`, then **median of 5 runs** (`ACCOUNTING_PERF_RUNS`, default 5). Timings approximate a warm Node/tRPC server (not first-hit TS compile).

---

## Measurement inputs

| Procedure | Input range / notes |
|-----------|---------------------|
| `accounting.dashboardSummary` | `sectionCode: 15`. No date inputs — aggregates **today**, **current calendar month**, and section-wide joined rows (same semantics as before optimization). |
| `accounting.dailyRevenue` | `fromDate: 2026-04-01`, `toDate: 2026-04-30`, `sectionCode: 15` |
| `accounting.serviceRevenue` | Same 30-day range, `sectionCode: 15` |
| `accounting.receiptsInquiry` | Same 30-day range, `sectionCode: 15` |
| `accounting.receiptDetail` | `sectionCode: 15`, `trTy: 1`, `trNo: "1812"` (fixture receipt from parity CSV) |
| `accounting.lasikReceipts` | Same 30-day range (Lasik section pinned in SQL) |
| `accounting.lasikServices` | Same 30-day range |
| `accounting.lasikRevenueSummary` | Same 30-day range |
| `accounting.patientLasikSummary` | `patientCode: "1354"`, `sectionCode: 15` (fixture patient) |

---

## Results (median of 5 warm runs)

| Endpoint (tRPC) | Input summary | Before (ms) | After (ms) | Code changed | NFR-1 |
|-----------------|---------------|------------:|-----------:|:-------------|:------|
| `dashboardSummary` | `sectionCode: 15` | 750.79 | 485.24 | Yes | PASS |
| `dailyRevenue` | 2026-04-01 … 2026-04-30, sec 15 | 770.81 | 471.29 | No | PASS |
| `serviceRevenue` | 30-day, sec 15 | 1073.37 | 779.60 | No | PASS |
| `receiptsInquiry` | 30-day, sec 15 | 949.49 | 654.92 | No | PASS |
| `receiptDetail` | sec 15 / ty 1 / no 1812 | 711.15 | 461.22 | No | PASS |
| `lasikReceipts` | 30-day | 816.06 | 666.89 | No | PASS |
| `lasikServices` | 30-day | **1928.37** | **955.53** | Yes | PASS |
| `lasikRevenueSummary` | 30-day | 585.71 | 471.60 | No | PASS |
| `patientLasikSummary` | patient `1354`, sec 15 | 757.75 | 462.51 | No | PASS |

**Cold-start note:** A single unprimed script run showed `dashboardSummary` wall time ~3031 ms while the logged MSSQL duration was ~711 ms — dominated by first-process import/pool setup, not steady-state query cost. Warm methodology aligns with a running API server.

---

## Changes applied (semantics-preserving)

1. **`buildDashboardSummarySql`** (`server/services/accounting/sqlBuilders.ts`): Removed unused `paid_value` column from the CTE and dropped `SUM(paid_value) AS totalPaidInSection` from the outer SELECT. The API mapper (`mapDashboardSummaryRow`) never exposed `totalPaidInSection`; behavior of returned fields is unchanged.
2. **`buildLasikServicesSql`** (`sqlBuilders.ts`): Drive the join from **`PAPAT_SRV s`** → **`PAJRNRCVH h`** (same inner join keys and predicates). Apply section filter as **`s.SEC_CD = @secCd`** instead of `h.SEC_CD` for planner friendliness — equivalent under the join.

No new MSSQL indexes, tables, or other DB objects.

---

## Parity check (Task 16 artifact)

Command:

```bash
node --import tsx scripts/accounting/parity-check.ts
```

Exit code: **0**

Summary:

```
=== Accounting Parity Check: 2026-04 (SEC_CD=15) ===
Daily Revenue     → PASS → specs/parity/daily-revenue-2026-04.md
Service Revenue   → PASS → specs/parity/service-revenue-2026-04.md
Receipts Inquiry  → PASS → specs/parity/receipts-inquiry-2026-04.md
✓ All parity checks PASSED.
```

---

## Files touched

| File | Purpose |
|------|---------|
| `server/services/accounting/mssqlAccounting.ts` | Optional third argument `debugLabel`; when `ACCOUNTING_SQL_DEBUG=1`, logs labeled durations only (no SQL/params). |
| `server/services/accounting/sqlBuilders.ts` | Dashboard unused aggregate removal; Lasik services join order / section predicate on `s`. |
| `scripts/accounting/perf-measure.ts` | Reproducible warm median timings for all nine endpoints. |
| `specs/perf-report.md` | This report. |

---

## Verification commands

| Command | Result |
|---------|--------|
| `pnpm check` | PASS |
| `pnpm test` | PASS (Vitest default project: 44 tests in client suite) |
| `node --import tsx scripts/accounting/parity-check.ts` | PASS (exit 0) |

---

**Task 18 conclusion:** After baseline measurement, SQL edits targeted **`dashboardSummary`** and **`lasikServices`** (the latter was closest to the 2 s budget under warm median). All nine endpoints are **≤ 2 s** under the measured methodology; parity remains green.
