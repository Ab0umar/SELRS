# Accounting Data Boundary & MSSQL Sync Policy

## Executive Summary
Accounting data is **read-only from MSSQL**. SRV100 aggregates and reports financial data but never modifies source systems. This document locks accounting boundaries for production.

## Data Ownership

### MSSQL Tables (Authoritative, Read-Only)
All accounting source tables live in MSSQL and are **authoritative**:

| Table | Purpose | Key Fields | SRV100 Access |
|-------|---------|------------|---------------|
| `PAJRNRCVH` | Receipt headers | TR_NO, TR_DT, PAT_CD, TOTL, DISC, PA_VL, CNCL | Read-only |
| `PAPAT_SRV` | Service lines | SRV_CD, QTY, PRC, PA_VL, DISC_VL, CNCL | Read-only |
| `SRVCMF` | Service catalog | SRV_CD, SRV_NM_AR | Read-only reference |
| `MDTEAM` | Doctor catalog | DRS_CD, DRS_NM | Read-only reference |
| `DEPT` | Department codes | SEC_CD, SEC_NM | Read-only reference |

### MySQL Tables (Reporting Cache, Derived)
SRV100 aggregates accounting data into MySQL for reporting only:

| Table | Purpose | Derives From | Update Frequency | Retention |
|-------|---------|--------------|-----------------|-----------|
| `patientServiceEntries` | Service links | PAPAT_SRV | Per MSSQL sync | Indefinite |
| Report caches (if any) | Dashboard aggregates | PAJRNRCVH, PAPAT_SRV | Query-time | Session-only |

## SQL Query Rules

### Receipt Inquiry Query Pattern
**File:** `server/services/accounting/sqlBuilders.ts` → `buildReceiptsInquirySql()`

```sql
SELECT h.SEC_CD, h.TR_NO, h.TR_DT, h.PAT_CD, h.TOTL, h.DISC, h.PA_VL
FROM PAJRNRCVH h
LEFT JOIN PAPAT_SRV s ON h.SEC_CD = s.SEC_CD AND h.TR_TY = s.TR_TY AND h.TR_NO = s.TR_NO
WHERE ISNULL(h.CNCL, 0) = 0  -- Exclude cancelled transactions
```

### Daily Revenue Query Pattern
**File:** `server/services/accounting/sqlBuilders.ts` → `buildDailyRevenueSql()`

```sql
SELECT CAST(h.TR_DT AS date) AS trDate, COUNT(...) AS totalReceipts, SUM(...) AS totalGross
FROM PAJRNRCVH h
JOIN PAPAT_SRV s ON h.SEC_CD = s.SEC_CD AND h.TR_TY = s.TR_TY AND h.TR_NO = s.TR_NO
WHERE ISNULL(h.CNCL, 0) = 0 AND ISNULL(s.CNCL, 0) = 0  -- Exclude cancelled
```

### Service Revenue Query Pattern
**File:** `server/services/accounting/sqlBuilders.ts` → `buildServiceRevenueSql()`

```sql
SELECT s.SRV_CD, h.PAT_CD, ISNULL(s.QTY, 0) AS quantity, ISNULL(s.PRC, 0) AS price
FROM PAJRNRCVH h
JOIN PAPAT_SRV s ON h.SEC_CD = s.SEC_CD AND h.TR_TY = s.TR_TY AND h.TR_NO = s.TR_NO
LEFT JOIN SRVCMF c ON c.SRV_CD = s.SRV_CD
WHERE ISNULL(h.CNCL, 0) = 0 AND ISNULL(s.CNCL, 0) = 0  -- Exclude cancelled
```

## Cancelled Transaction Handling

### CNCL Filter Policy
**All accounting queries exclude cancelled transactions (CNCL IS NULL):**

- ✅ Daily Revenue: `ISNULL(h.CNCL, 0) = 0` (header level)
- ✅ Service Revenue: `ISNULL(s.CNCL, 0) = 0` (line level)
- ✅ Receipts Inquiry: `ISNULL(h.CNCL, 0) = 0` (header level)
- ✅ Dashboard Summary: `ISNULL(h.CNCL, 0) = 0` AND `ISNULL(s.CNCL, 0) = 0`

### Rationale
- Legacy OP excludes cancelled from all reports
- Cancelled = voided transactions, should not affect revenue totals
- Users can view original receipt but marked as cancelled in metadata
- Prevents double-counting or confusion in financial statements

### Special Case: Receipts Header-Only
Some receipts may have header (PAJRNRCVH) but no service lines (PAPAT_SRV):
- Still excluded if `h.CNCL = 1`
- Can appear in Receipts Inquiry if user explicitly searches by receipt number
- Totals aggregates ignore these (only count lines in revenue reports)

## Legacy Compatibility

### Parity with Original OP System
SRV100 accounting is designed to **match original OP behavior exactly**:

| Feature | Legacy OP | SRV100 | Status |
|---------|-----------|--------|--------|
| Exclude cancelled | Yes | Yes ✅ | Parity |
| Receipt header-only visible | Yes | Yes ✅ | Parity |
| Aggregate by date | Yes | Yes ✅ | Parity |
| Join PAJRNRCVH + PAPAT_SRV | Yes | Yes ✅ | Parity |
| Service code from PAPAT_SRV | Yes | Yes ✅ | Parity |
| Doctor code from PAPAT_SRV.SRV_BY1 | Yes | Yes ✅ | Parity |

### Known Legacy Issues (Not Fixed)
These legacy behaviors are preserved to maintain parity:
- ⚠️ CNCL might be NULL or 0/1 inconsistently (handled with ISNULL)
- ⚠️ Receipt totals (TOTL) may not match sum of lines (legacy calculation)
- ⚠️ Discount calculation (DISC_VL) varies by record type

## Query Optimization

### Performance Rules
1. Always filter by date range when available (avoids full table scans)
2. Use indexes on (SEC_CD, TR_TY, TR_NO) for PAPAT_SRV joins
3. Limit result sets with TOP clause (default: 500 rows)
4. Cache stable reference data (doctor, service, section codes)

### Batch Operations Limits
- Daily Revenue: No batch limit (one query per date)
- Service Revenue: No batch limit (one query per date/service)
- Receipts Inquiry: Limited to 500 results per page
- Dashboard: Summary only, no pagination

## Access Control

### Read-Only Boundary
- ✅ SRV100 can READ from PAJRNRCVH, PAPAT_SRV, reference tables
- ❌ SRV100 CANNOT write to MSSQL
- ❌ SRV100 CANNOT modify accounting transactions
- ❌ SRV100 CANNOT cancel/void transactions

### User Permissions
- `view_accounting` role: Can read all accounting reports
- `admin` role: Can access accounting diagnostics
- No user can write-back to MSSQL from SRV100

## Sync & Integration

### Patient Service Linking
- MSSQL PAPAT_SRV → MySQL `patientServiceEntries`
- Synced nightly alongside patient sync
- Used for: filtering patients by service in admin
- **Not** used for: revenue calculations (always query MSSQL directly)

### Doctor Service Matching
- MSSQL PAPAT_SRV.SRV_BY1 → MySQL `patients.doctorCode`
- Synced nightly
- Used for: display in admin patients list
- **Not** used for: accounting queries (use SRV_BY1 directly from MSSQL)

## Error Handling

### MSSQL Unavailable
- Daily Revenue: Fails with clear error message
- Receipts Inquiry: Fails with clear error message
- User is notified to retry later
- ✅ No data loss
- ✅ No partial results served

### Incomplete Sync
- If MSSQL sync fails: Use yesterday's data
- If today's data not synced yet: Show partial results
- Mark reports as "not yet updated" for current date

### Stale Data
- All accounting queries are direct (not cached)
- May be stale if MSSQL sync is behind
- Reports are intended to be run ~1 hour after EOD
- ✅ Not real-time, but complete after sync

## Testing & Validation

### Unit Tests
- [ ] CNCL filter applied to all revenue builders
- [ ] Header-only receipts visible in Receipts Inquiry
- [ ] Service lines excluded if line-level CNCL = 1
- [ ] Date range filtering works correctly

### Parity Tests
- [ ] Daily total matches legacy OP for same date
- [ ] Service revenue by code matches legacy
- [ ] Receipts list format matches legacy
- [ ] Discount calculation matches legacy

### Performance Tests
- [ ] Daily Revenue with 365-day range: <2 sec
- [ ] Service Revenue with 1000s of lines: <5 sec
- [ ] Receipts Inquiry with 500+ results: <3 sec

## Violations & Escalation

### Red Flags (Investigate Immediately)
- ❌ INSERT/UPDATE/DELETE query to MSSQL accounting tables
- ❌ Cached accounting aggregates served without timestamp
- ❌ Revenue report includes cancelled transactions
- ❌ Doctor code queried from wrong source (use SRV_BY1 from PAPAT_SRV)
- ❌ Service revenue doesn't match legacy OP

### Escalation Path
1. If query anomaly detected: Run native MSSQL query to compare
2. If parity broken: Compare with legacy OP directly
3. If data corruption: Alert admin, provide audit trail
4. If MSSQL unavailable: Fail safely, don't serve stale data

---

**Last Updated:** 2026-05-07
**Policy Status:** Locked for Phase 3 production
**Owner:** Finance & Architecture teams
