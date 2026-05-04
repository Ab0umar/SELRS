# Receipts Inquiry Parity — 2026-04

**Reference period:** 2026-04-01 to 2026-04-30 | SEC_CD=15
**Source:** SQL fixture (`secCd` header) from `buildReceiptsInquirySql`, or legacy OP Arabic CSV.

## Row Count (EXACT match required)

| Metric | Legacy | API | Delta | Status |
|--------|--------|-----|-------|--------|
| rowCount | 547 | 547 | 0 | PASS |

## Totals

| Metric | Legacy | API | Delta | Status |
|--------|--------|-----|-------|--------|
| total | 627,250.00 | 627,250.00 | 0.0000 | PASS |
| discount | 29,690.00 | 29,690.00 | 0.0000 | PASS |
| paidValue | 643,325.00 | 643,325.00 | 0.0000 | PASS |

## Notes

- **Total** column = receipt header **`h.TOTL`** (`total` / `totalValue`), not `PA_VL`.
- **paidValue** = **`h.PA_VL`** on the header row.
- **Header-only receipts** (no `PAPAT_SRV` lines) are excluded from the JOIN — same as API.
- Arabic OP exports: only rows with حالة الايصال = سارى; dates parsed as DD/MM/YYYY (not string-sorted).

**Verdict: PASS**

---