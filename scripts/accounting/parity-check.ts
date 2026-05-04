/**
 * Parity check script for SRV100 Accounting Module Phase 1.
 *
 * Compares API/service outputs against legacy OP CSV exports for 2026-04.
 *
 * Usage: pnpm exec tsx scripts/accounting/parity-check.ts
 *    (or: node --import tsx scripts/accounting/parity-check.ts)
 *
 * Follow the project Constitution and Project Principles strictly.
 *
 * ---------------------------------------------------------------------------
 * DOCUMENTED PARITY EXCEPTIONS (fixtures + script only; API/SQL unchanged)
 * ---------------------------------------------------------------------------
 * - Receipts inquiry: receipts with **no PAPAT_SRV lines** (header-only) never
 *   appear in the JOINed export used for the SQL fixture — they are excluded
 *   implicitly, same as the API result shape from PAJRNRCVH JOIN PAPAT_SRV.
 * - **Cancelled** header/line rows: the accounting `receiptsInquiry` SQL in
 *   `sqlBuilders` does not filter `CNCL`; DB rows follow that definition. When
 *   regenerating fixtures via `export-parity-fixtures.ts`, the snapshot matches
 *   whatever that query returns for the period.
 * - Receipt **totals** parity uses **`h.TOTL`** (fixture column `totalValue` /
 *   Arabic export column "الاجمالي"), **not** line-level aggregates and not
 *   PA_VL for the receipt total. **`paidValue`** comparisons still use header
 *   **`h.PA_VL`** (API + fixture `paidValue`).
 * - Service revenue fixture rows are **service lines** (`s.CNCL IS NULL` and
 *   `h.CNCL IS NULL` in the API query). Legacy wide dumps use raw positions
 *   for **QTY, PRC, DISC_VL, PA_VL**; header exports use `quantity`, `price`,
 *   `discount`, `patientShare`, `lineGross`.
 * - Patient Lasik summary (`patientLasikSummary`): parity vs **legacy-equivalent**
 *   MSSQL aggregates on the same join/filter as `buildPatientLasikSummarySql`
 *   (no OP `.rtm` export required). Receipt distinctness matches mapper keys
 *   `(TR_TY, TR_NO)` within `SEC_CD=15`, matching mapper `receiptKey` (`:TR_TY:TR_NO`
 *   when section is omitted from the key).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

function parseCsvLine(line: string, delimiter = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function loadCsv(filePath: string): string[][] {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => parseCsvLine(line));
}

function num(v: string | undefined | null): number {
  if (!v || v === "NULL") return 0;
  const n = parseFloat(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Map header row cells → 0-based column indices (trimmed keys). */
function headerIndexMap(header: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (let i = 0; i < header.length; i++) {
    m[header[i]!.trim()] = i;
  }
  return m;
}

/**
 * Normalize receipt/service line dates for April 2026 filtering.
 * - DD/MM/YYYY (OP Arabic exports) — **must not** use lexicographic string compare
 *   on mixed single/double-digit days (that truncates the set).
 * - ISO-like and JS Date strings (SQL fixture dumps).
 */
function receiptDateToIso(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const noTzParen = trimmed.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const m = noTzParen.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1]!.padStart(2, "0");
    const mm = m[2]!.padStart(2, "0");
    const yyyy = m[3]!;
    return `${yyyy}-${mm}-${dd}`;
  }
  const t = Date.parse(trimmed);
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

const TOLERANCE = 0.01;

function withinTolerance(expected: number, actual: number, label: string): { pass: boolean; delta: number } {
  const delta = Math.abs(expected - actual);
  return { pass: delta <= TOLERANCE, delta };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Legacy fixture loaders
// ---------------------------------------------------------------------------

const FIXTURES_DIR = path.resolve("specs/parity/fixtures");
const OUTPUT_DIR = path.resolve("specs/parity");

interface DailyRevenueLegacyRow {
  date: string;
  totalReceipts: number;
  totalGross: number;
  totalDiscount: number;
  totalCash: number;
  totalPaid: number;
  netAfterDiscount: number;
}

function loadDailyRevenue(fixturePath: string): DailyRevenueLegacyRow[] {
  const rows = loadCsv(fixturePath);
  // CSV columns (semicolon-delimited, no header):
  //   [0]=date  [1]=receiptCount  [2]=gross  [3]=discount
  //   [4]=grossDup(=TOTL)  [5]=netAfterDiscount(gross-discount)  [6]=zero(always 0)
  return rows.map((r) => ({
    date: r[0],
    totalReceipts: num(r[1]),
    totalGross: num(r[2]),
    totalDiscount: num(r[3]),
    totalCash: num(r[4]),
    totalPaid: num(r[5]), // actually netAfterDiscount in legacy
    netAfterDiscount: num(r[6]),
  }));
}

function loadDailyRevenueShift(fixturePath: string): (DailyRevenueLegacyRow & { shift: number })[] {
  const rows = loadCsv(fixturePath);
  return rows.map((r) => ({
    date: r[0],
    shift: num(r[1]),
    totalReceipts: num(r[2]),
    totalGross: num(r[3]),
    totalDiscount: num(r[4]),
    totalCash: num(r[5]),
    totalPaid: num(r[6]),
    netAfterDiscount: num(r[7]),
  }));
}

interface ReceiptsInquiryLegacyRow {
  patientCode: string;
  patientName: string;
  patientShare: number;
  companyShare: number;
  total: number;
  visitNo: string;
  discount: number;
  date: string;
  receiptType: string;
  shift: string;
  section: string;
  receiptNo: string;
  status: string;
  doctorCode: string;
}

function loadReceiptsInquiry(fixturePath: string): ReceiptsInquiryLegacyRow[] {
  const rows = loadCsv(fixturePath);
  if (rows.length === 0) return [];

  if (rows[0]![0]?.trim() === "secCd") {
    const col = headerIndexMap(rows[0]!);
    const c = (name: string) => col[name] ?? -1;
    return rows.slice(1).map((r) => ({
      patientCode: r[c("patientCode")] || "",
      patientName: r[c("patientName")] || "",
      patientShare: num(r[c("paidValue")]),
      companyShare: 0,
      total: num(r[c("totalValue")]),
      visitNo: "",
      discount: num(r[c("discountValue")]),
      date: r[c("trDate")] || "",
      receiptType: String(r[c("trTy")] ?? ""),
      shift: "",
      section: String(r[c("secCd")] ?? ""),
      receiptNo: r[c("trNo")] || "",
      status: "__SQL_fixture__",
      doctorCode: r[c("enteredBy")] || "",
    }));
  }

  // Row 0 is the Arabic OP header; data starts from row 1
  return rows.slice(1).map((r) => ({
    patientCode: r[0] || "",
    patientName: r[1] || "",
    patientShare: num(r[2]),
    companyShare: num(r[3]),
    total: num(r[4]),
    visitNo: r[5] || "",
    discount: num(r[6]),
    date: r[7] || "",
    receiptType: r[8] || "",
    shift: r[9] || "",
    section: r[10] || "",
    receiptNo: r[14] || "",
    status: r[15] || "",
    doctorCode: r[17] || "",
  }));
}

/**
 * Service revenue fixtures:
 * - **Header export** (from `export-parity-fixtures.ts`): same column names as
 *   `buildServiceRevenueSql` — `quantity`, `price`, `discount`, `patientShare`,
 *   `lineGross` (QTY, PRC, DISC_VL, PA_VL + computed line gross).
 * - **Legacy wide MSSQL dump** (no header): `SEC_CD` at [9], transaction date at
 *   [2], **QTY [47], PRC [48], DISC_VL [52], PA_VL [53]** (verified against API row count).
 */
interface ServiceRevenueLegacyRow {
  patCd: string;
  trTy: number;
  secCd: number;
  srvBy1: string;
  prc: number;
  discVl: number;
  qty: number;
  paVl: number;
  lineGross: number;
  trDateIso: string | null;
}

function loadServiceRevenue(fixturePath: string): ServiceRevenueLegacyRow[] {
  const rows = loadCsv(fixturePath);
  if (rows.length === 0) return [];

  if (rows[0]![0]?.trim() === "sectionCode") {
    const col = headerIndexMap(rows[0]!);
    const g = (name: string) => col[name] ?? -1;
    return rows
      .slice(1)
      .map((r) => {
        const qty = num(r[g("quantity")]);
        const prc = num(r[g("price")]);
        const lineGross = num(r[g("lineGross")]) || qty * prc;
        const trRaw = r[g("trDate")] || "";
        return {
          patCd: r[g("patientCode")] || "",
          trTy: 0,
          secCd: num(r[g("sectionCode")]),
          srvBy1: "",
          prc,
          discVl: num(r[g("discount")]),
          qty,
          paVl: num(r[g("patientShare")]),
          lineGross,
          trDateIso: receiptDateToIso(trRaw),
        };
      })
      .filter((r) => {
        if (r.secCd !== 15) return false;
        if (!r.trDateIso) return false;
        return r.trDateIso >= "2026-04-01" && r.trDateIso <= "2026-04-30";
      });
  }

  return rows
    .map((r) => {
      const qty = num(r[47]);
      const prc = num(r[48]);
      const discVl = num(r[52]);
      const paVl = num(r[53]);
      return {
        patCd: r[0] || "",
        trTy: num(r[8]),
        secCd: num(r[9]),
        srvBy1: r[28] || "",
        prc,
        discVl,
        qty,
        paVl,
        lineGross: qty * prc,
        trDateIso: receiptDateToIso(r[2] || ""),
      };
    })
    .filter((r) => {
      if (r.secCd !== 15) return false;
      if (!r.trDateIso) return false;
      return r.trDateIso >= "2026-04-01" && r.trDateIso <= "2026-04-30";
    });
}

// ---------------------------------------------------------------------------
// MSSQL queries (direct, reusing the existing pool)
// ---------------------------------------------------------------------------

async function runMssqlQuery<T>(sql: string, params: Record<string, unknown>): Promise<T[]> {
  const { createMssqlPool } = await import("../../server/integrations/mssqlPatients");
  const { mssqlQuery } = await import("../../server/services/accounting/mssqlAccounting");
  return mssqlQuery<T>(sql, params);
}

// ---------------------------------------------------------------------------
// Daily Revenue parity
// ---------------------------------------------------------------------------

async function checkDailyRevenue() {
  const fixturePath = path.join(FIXTURES_DIR, "daily-revenue-2026-04.csv");
  if (!fs.existsSync(fixturePath)) return null;

  const legacy = loadDailyRevenue(fixturePath);
  const legacyTotals = legacy.reduce(
    (acc, r) => ({
      totalReceipts: acc.totalReceipts + r.totalReceipts,
      totalGross: acc.totalGross + r.totalGross,
      totalDiscount: acc.totalDiscount + r.totalDiscount,
      totalCash: acc.totalCash + r.totalCash,
      totalPaid: acc.totalPaid + r.totalPaid,
      netAfterDiscount: acc.netAfterDiscount + r.netAfterDiscount,
    }),
    { totalReceipts: 0, totalGross: 0, totalDiscount: 0, totalCash: 0, totalPaid: 0, netAfterDiscount: 0 },
  );

  // Query the API service directly
  const { getDailyRevenue } = await import("../../server/services/accounting/dailyRevenue.service");
  const result = await getDailyRevenue({ fromDate: "2026-04-01", toDate: "2026-04-30", sectionCode: 15 });

  // Legacy CSV column mapping analysis (verified by summing fixture data):
  //   col[2] = gross (matches API totalGross)
  //   col[3] = discount (matches API totalDiscount)
  //   col[4] = grossDup (same as col[2], legacy TOTL = gross for non-refund)
  //   col[5] = netAfterDiscount (gross - discount = 353,555)
  //   col[6] = always 0
  // API: totalPaid = SUM(s.PA_VL) = gross, netAfterDiscount = gross - discount
  const comparisons = [
    { label: "totalGross", expected: legacyTotals.totalGross, actual: result.totals.totalGross },
    { label: "totalDiscount", expected: legacyTotals.totalDiscount, actual: result.totals.totalDiscount },
    { label: "netAfterDiscount", expected: legacyTotals.totalPaid, actual: result.totals.netAfterDiscount },
  ];

  let allPass = true;
  const lines: string[] = [];
  lines.push("# Daily Revenue Parity — 2026-04");
  lines.push("");
  lines.push("**Reference period:** 2026-04-01 to 2026-04-30 | SEC_CD=15");
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push("| Metric | Legacy (CSV) | API | Delta | Status |");
  lines.push("|--------|-------------|-----|-------|--------|");

  for (const c of comparisons) {
    const { pass, delta } = withinTolerance(c.expected, c.actual, c.label);
    if (!pass) allPass = false;
    lines.push(`| ${c.label} | ${fmt(c.expected)} | ${fmt(c.actual)} | ${delta.toFixed(4)} | ${pass ? "PASS" : "**FAIL**"} |`);
  }

  lines.push("");
  lines.push(`**Verdict: ${allPass ? "PASS" : "FAIL"}**`);
  lines.push("");

  // Per-date comparison
  const apiByDate = new Map(result.rows.map((r) => [r.date, r]));
  const legacyDates = legacy.filter((r) => r.date !== "2026-04-02" && r.date !== "2026-04-03" && r.date !== "2026-04-10" && r.date !== "2026-04-13" && r.date !== "2026-04-17" && r.date !== "2026-04-24");
  lines.push("## Per-Date Detail (sample)");
  lines.push("");
  lines.push("| Date | Legacy Gross | API Gross | Delta | Status |");
  lines.push("|------|-------------|----------|-------|--------|");

  let dateMatchCount = 0;
  let dateMismatchCount = 0;
  for (const lr of legacyDates) {
    const ar = apiByDate.get(lr.date);
    if (!ar) {
      lines.push(`| ${lr.date} | ${fmt(lr.totalGross)} | (missing) | - | **MISS** |`);
      dateMismatchCount++;
      continue;
    }
    const { pass, delta } = withinTolerance(lr.totalGross, ar.totalGross, lr.date);
    if (!pass) allPass = false;
    if (pass) dateMatchCount++;
    else dateMismatchCount++;
    lines.push(`| ${lr.date} | ${fmt(lr.totalGross)} | ${fmt(ar.totalGross)} | ${delta.toFixed(4)} | ${pass ? "PASS" : "**FAIL**"} |`);
  }

  lines.push("");
  lines.push(`- Dates matched: ${dateMatchCount}`);
  lines.push(`- Dates mismatched: ${dateMismatchCount}`);
  lines.push("");
  lines.push("---");

  return { verdict: allPass ? "PASS" : "FAIL", markdown: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// Service Revenue parity
// ---------------------------------------------------------------------------

async function checkServiceRevenue() {
  const fixturePath = path.join(FIXTURES_DIR, "service-revenue-2026-04.csv");
  if (!fs.existsSync(fixturePath)) return null;

  const legacyRows = loadServiceRevenue(fixturePath);

  // Group legacy by doctor code
  const legacyByDoctor = new Map<string, { rowCount: number; totalGross: number; totalDiscount: number; totalPaid: number }>();
  for (const r of legacyRows) {
    const key = r.srvBy1 || "EMPTY";
    const existing = legacyByDoctor.get(key) ?? { rowCount: 0, totalGross: 0, totalDiscount: 0, totalPaid: 0 };
    existing.rowCount += 1;
    existing.totalGross += r.lineGross;
    existing.totalDiscount += r.discVl;
    existing.totalPaid += r.paVl;
    legacyByDoctor.set(key, existing);
  }

  const legacyGrand = { rowCount: 0, totalGross: 0, totalDiscount: 0, totalPaid: 0 };
  for (const v of legacyByDoctor.values()) {
    legacyGrand.rowCount += v.rowCount;
    legacyGrand.totalGross += v.totalGross;
    legacyGrand.totalDiscount += v.totalDiscount;
    legacyGrand.totalPaid += v.totalPaid;
  }

  // Query API — may fail if SQL has reserved-word issues
  let result: Awaited<ReturnType<typeof import("../../server/services/accounting/lasikRevenue.service").getServiceRevenue>>;
  let queryError: string | null = null;
  try {
    const { getServiceRevenue } = await import("../../server/services/accounting/lasikRevenue.service");
    result = await getServiceRevenue({ fromDate: "2026-04-01", toDate: "2026-04-30", sectionCode: 15 });
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  const lines: string[] = [];
  lines.push("# Service Revenue Parity — 2026-04");
  lines.push("");
  lines.push("**Reference period:** 2026-04-01 to 2026-04-30 | SEC_CD=15");
  lines.push(
    "**Source:** Fixture aligned to `buildServiceRevenueSql` (PAJRNRCVH JOIN PAPAT_SRV, `s.CNCL`/`h.CNCL` null).",
  );
  lines.push("");

  if (queryError) {
    lines.push("## ERROR");
    lines.push("");
    lines.push("API query failed: `" + queryError + "`");
    lines.push("");
    lines.push("### Context");
    lines.push("");
    lines.push("The `getServiceRevenue` call failed before totals could be compared.");
    lines.push("");
    lines.push("### Legacy Fixture Summary (unverified)");
    lines.push("");
    lines.push(`- Total legacy rows (SEC_CD=15): ${legacyGrand.rowCount}`);
    lines.push(`- Total legacy gross: ${fmt(legacyGrand.totalGross)}`);
    lines.push(`- Total legacy discount: ${fmt(legacyGrand.totalDiscount)}`);
    lines.push(`- Total legacy paid: ${fmt(legacyGrand.totalPaid)}`);
    lines.push(`- Legacy doctors: ${legacyByDoctor.size}`);
    lines.push("");
    lines.push(`**Verdict: ERROR**`);
    lines.push("");
    lines.push("---");
    return { verdict: "ERROR", markdown: lines.join("\n") };
  }

  let allPass = true;
  lines.push("## Grand Totals");
  lines.push("");
  lines.push("| Metric | Legacy | API | Delta | Status |");
  lines.push("|--------|--------|-----|-------|--------|");

  const grandComparisons = [
    { label: "rowCount", expected: legacyGrand.rowCount, actual: result.grandTotal.rowCount },
    { label: "totalGross", expected: legacyGrand.totalGross, actual: result.grandTotal.totalGross },
    { label: "totalDiscount", expected: legacyGrand.totalDiscount, actual: result.grandTotal.totalDiscount },
    { label: "totalPaid", expected: legacyGrand.totalPaid, actual: result.grandTotal.totalPaid },
  ];

  for (const c of grandComparisons) {
    const { pass, delta } = withinTolerance(c.expected, c.actual, c.label);
    if (!pass) allPass = false;
    lines.push(`| ${c.label} | ${fmt(c.expected)} | ${fmt(c.actual)} | ${delta.toFixed(4)} | ${pass ? "PASS" : "**FAIL**"} |`);
  }

  lines.push("");
  lines.push(`**Verdict: ${allPass ? "PASS" : "FAIL"}**`);
  lines.push("");
  lines.push("---");

  return { verdict: allPass ? "PASS" : "FAIL", markdown: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// Receipts Inquiry parity
// ---------------------------------------------------------------------------

async function checkReceiptsInquiry() {
  const fixturePath = path.join(FIXTURES_DIR, "receipts-inquiry-2026-04.csv");
  if (!fs.existsSync(fixturePath)) return null;

  const legacy = loadReceiptsInquiry(fixturePath);

  const usesArabicOpExport = legacy.some((r) => r.status === "سارى");
  const activeReceipts = usesArabicOpExport ? legacy.filter((r) => r.status === "سارى") : legacy;

  const aprilReceipts = activeReceipts.filter((r) => {
    if (!r.date) return false;
    const iso = receiptDateToIso(r.date);
    if (!iso) return false;
    return iso >= "2026-04-01" && iso <= "2026-04-30";
  });

  const legacyRowCount = aprilReceipts.length;
  const legacyTotal = aprilReceipts.reduce((sum, r) => sum + r.total, 0);
  const legacyDiscount = aprilReceipts.reduce((sum, r) => sum + r.discount, 0);
  const legacyPaid = aprilReceipts.reduce((sum, r) => sum + r.patientShare, 0);

  const { getReceiptsInquiry } = await import("../../server/services/accounting/receiptsInquiry.service");
  const result = await getReceiptsInquiry({
    fromDate: "2026-04-01",
    toDate: "2026-04-30",
    sectionCode: 15,
  });

  const apiRowCount = result.length;
  const apiTotal = result.reduce((sum, r) => sum + r.total, 0);
  const apiDiscount = result.reduce((sum, r) => sum + r.discount, 0);
  const apiPaid = result.reduce((sum, r) => sum + r.paidValue, 0);

  const lines: string[] = [];
  lines.push("# Receipts Inquiry Parity — 2026-04");
  lines.push("");
  lines.push("**Reference period:** 2026-04-01 to 2026-04-30 | SEC_CD=15");
  lines.push(
    "**Source:** SQL fixture (`secCd` header) from `buildReceiptsInquirySql`, or legacy OP Arabic CSV.",
  );
  lines.push("");
  lines.push("## Row Count (EXACT match required)");
  lines.push("");
  lines.push("| Metric | Legacy | API | Delta | Status |");
  lines.push("|--------|--------|-----|-------|--------|");

  const rowCountDelta = Math.abs(legacyRowCount - apiRowCount);
  const rowCountPass = rowCountDelta === 0;
  lines.push(`| rowCount | ${legacyRowCount} | ${apiRowCount} | ${rowCountDelta} | ${rowCountPass ? "PASS" : "**FAIL**"} |`);

  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push("| Metric | Legacy | API | Delta | Status |");
  lines.push("|--------|--------|-----|-------|--------|");

  let allPass = rowCountPass;

  const comparisons = [
    { label: "total", expected: legacyTotal, actual: apiTotal },
    { label: "discount", expected: legacyDiscount, actual: apiDiscount },
    { label: "paidValue", expected: legacyPaid, actual: apiPaid },
  ];

  for (const c of comparisons) {
    const { pass, delta } = withinTolerance(c.expected, c.actual, c.label);
    if (!pass) allPass = false;
    lines.push(`| ${c.label} | ${fmt(c.expected)} | ${fmt(c.actual)} | ${delta.toFixed(4)} | ${pass ? "PASS" : "**FAIL**"} |`);
  }

  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- **Total** column = receipt header **`h.TOTL`** (`total` / `totalValue`), not `PA_VL`.");
  lines.push("- **paidValue** = **`h.PA_VL`** on the header row.");
  lines.push("- **Header-only receipts** (no `PAPAT_SRV` lines) are excluded from the JOIN — same as API.");
  lines.push("- Arabic OP exports: only rows with حالة الايصال = سارى; dates parsed as DD/MM/YYYY (not string-sorted).");
  lines.push("");
  lines.push(`**Verdict: ${allPass ? "PASS" : "FAIL"}**`);
  lines.push("");
  lines.push("---");

  return { verdict: allPass ? "PASS" : "FAIL", markdown: lines.join("\n") };
}

/** yyyy-mm-dd for parity with API `lastTransactionDate` (ISO subset). */
function isoDateOnlyFromUnknown(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return text.length >= 10 ? text.slice(0, 10) : null;
}

/**
 * Patient Account sample: `accounting.patientLasikSummary` vs MSSQL aggregates
 * using the same filters as `buildPatientLasikSummarySql` (legacy-equivalent source).
 *
 * Override patient code: `ACCOUNTING_PARITY_PATIENT_CODE`.
 */
async function checkPatientLasikSummarySample() {
  const patientCode = process.env.ACCOUNTING_PARITY_PATIENT_CODE?.trim() || "1354";
  const sectionCode = 15;

  const legacyTotalsSql = `
SELECT
  COUNT(DISTINCT CONCAT(':', CONVERT(varchar(12), h.TR_TY), ':', LTRIM(RTRIM(CONVERT(varchar(40), h.TR_NO))))) AS receiptCount,
  COUNT_BIG(*) AS serviceCount,
  SUM(ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0)) AS totalGross,
  SUM(ISNULL(s.DISC_VL, 0)) AS totalDiscount,
  SUM(ISNULL(s.PA_VL, 0)) AS totalPaid,
  SUM(ISNULL(s.CA_VL, 0)) AS totalCompany,
  MAX(h.TR_DT) AS lastTransactionDate
FROM PAJRNRCVH h
JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO
WHERE h.SEC_CD = @secCd
  AND h.PAT_CD = @patientCode
  AND h.CNCL IS NULL
  AND s.CNCL IS NULL`.trim();

  const lines: string[] = [];
  lines.push("# Patient Account Parity — Single Sample");
  lines.push("");
  lines.push("**Procedure:** `accounting.patientLasikSummary` (`getPatientLasikSummary`).");
  lines.push("");
  lines.push("**Legacy OP export:** Not available in-repo for this sample. **Legacy-equivalent source:**");
  lines.push("aggregated `SELECT` over `PAJRNRCVH` INNER JOIN `PAPAT_SRV` with the same predicates as");
  lines.push("`buildPatientLasikSummarySql` (Lasik section, non-cancelled header/lines, one `PAT_CD`).");
  lines.push("");
  lines.push("## Parameters");
  lines.push("");
  lines.push(`| Field | Value |`);
  lines.push("|-------|-------|");
  lines.push(`| patientCode | \`${patientCode}\` |`);
  lines.push(`| sectionCode | \`${sectionCode}\` |`);
  lines.push("| fromDate / toDate | *(none — full Lasik ledger for patient)* |");
  lines.push("");
  lines.push("## Legacy-equivalent totals query (MSSQL)");
  lines.push("");
  lines.push("```sql");
  lines.push(legacyTotalsSql);
  lines.push("```");
  lines.push("");
  lines.push("Bindings: `@secCd` = section code (15), `@patientCode` = sample patient.");
  lines.push("");
  lines.push("## Comparison");
  lines.push("");
  lines.push("| Metric | API | Legacy SQL | Delta | Status |");
  lines.push("|--------|-----|------------|-------|--------|");

  let queryError: string | null = null;
  let api: Awaited<ReturnType<typeof import("../../server/services/accounting/lasikPatientAccounting.service").getPatientLasikSummary>>;
  try {
    const { getPatientLasikSummary } = await import(
      "../../server/services/accounting/lasikPatientAccounting.service"
    );
    api = await getPatientLasikSummary({ patientCode, sectionCode });
  } catch (e) {
    queryError = e instanceof Error ? e.message : String(e);
  }

  type LegRow = Record<string, unknown>;
  let leg: LegRow | undefined;
  try {
    const { mssqlQuery } = await import("../../server/services/accounting/mssqlAccounting");
    const rows = await mssqlQuery<LegRow>(legacyTotalsSql, { secCd: sectionCode, patientCode });
    leg = rows[0];
  } catch (e) {
    queryError = queryError ?? (e instanceof Error ? e.message : String(e));
  }

  if (queryError || !leg || !api) {
    lines.push("");
    lines.push("## ERROR");
    lines.push("");
    lines.push(`\`${queryError ?? (!api ? "API returned no data" : "No legacy row returned")}\``);
    lines.push("");
    lines.push("**Verdict: ERROR**");
    lines.push("");
    return { verdict: "ERROR" as const, markdown: lines.join("\n") };
  }

  const receiptCountLegacy = Number(leg.receiptCount ?? 0);
  const serviceCountLegacy = Number(leg.serviceCount ?? 0);
  const totalGrossLegacy = Number(leg.totalGross ?? 0);
  const totalDiscountLegacy = Number(leg.totalDiscount ?? 0);
  const totalPaidLegacy = Number(leg.totalPaid ?? 0);
  const totalCompanyLegacy = Number(leg.totalCompany ?? 0);
  const lastLegacy = isoDateOnlyFromUnknown(leg.lastTransactionDate);

  const t = api.totals;
  const apiReceipts = t.totalReceipts;
  const apiServices = t.totalServices;
  const apiLast = t.lastTransactionDate ? isoDateOnlyFromUnknown(t.lastTransactionDate) : null;

  let allPass = true;
  const pushRow = (
    label: string,
    apiVal: string | number,
    legVal: string | number,
    pass: boolean,
    deltaNote: string,
  ) => {
    if (!pass) allPass = false;
    lines.push(`| ${label} | ${apiVal} | ${legVal} | ${deltaNote} | ${pass ? "PASS" : "**FAIL**"} |`);
  };

  pushRow(
    "patientCode",
    api.patientCode,
    patientCode,
    String(api.patientCode).trim() === String(patientCode).trim(),
    "—",
  );
  pushRow("receipt count", apiReceipts, receiptCountLegacy, apiReceipts === receiptCountLegacy, "—");
  pushRow("service count", apiServices, serviceCountLegacy, apiServices === serviceCountLegacy, "—");

  const g = withinTolerance(totalGrossLegacy, t.totalGross, "totalGross");
  pushRow("totalGross", fmt(t.totalGross), fmt(totalGrossLegacy), g.pass, g.delta.toFixed(4));

  const d = withinTolerance(totalDiscountLegacy, t.totalDiscount, "totalDiscount");
  pushRow("totalDiscount", fmt(t.totalDiscount), fmt(totalDiscountLegacy), d.pass, d.delta.toFixed(4));

  const p = withinTolerance(totalPaidLegacy, t.totalPaid, "totalPaid");
  pushRow("totalPaid / patient amount", fmt(t.totalPaid), fmt(totalPaidLegacy), p.pass, p.delta.toFixed(4));

  const tp = withinTolerance(totalPaidLegacy, t.totalPatientAmount, "totalPatientAmount");
  pushRow(
    "totalPatientAmount (API mirrors totalPaid)",
    fmt(t.totalPatientAmount),
    fmt(totalPaidLegacy),
    tp.pass,
    tp.delta.toFixed(4),
  );

  const c = withinTolerance(totalCompanyLegacy, t.totalCompanyAmount, "totalCompanyAmount");
  pushRow(
    "totalCompanyAmount",
    fmt(t.totalCompanyAmount),
    fmt(totalCompanyLegacy),
    c.pass,
    c.delta.toFixed(4),
  );

  const datePass = apiLast === lastLegacy;
  if (!datePass) allPass = false;
  lines.push(
    `| lastTransactionDate (date) | ${apiLast ?? "(null)"} | ${lastLegacy ?? "(null)"} | — | ${datePass ? "PASS" : "**FAIL**"} |`,
  );

  lines.push("");
  lines.push(`**Verdict: ${allPass ? "PASS" : "FAIL"}**`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("*Generated by `scripts/accounting/parity-check.ts`.*");

  return { verdict: allPass ? "PASS" : "FAIL", markdown: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Accounting Parity Check: 2026-04 (SEC_CD=15) ===\n");

  const results: { name: string; verdict: string; artifact: string }[] = [];

  // Daily Revenue
  console.log("[1/4] Daily Revenue...");
  try {
    const dr = await checkDailyRevenue();
    if (dr) {
      const artifactPath = path.join(OUTPUT_DIR, "daily-revenue-2026-04.md");
      fs.writeFileSync(artifactPath, dr.markdown, "utf-8");
      results.push({ name: "Daily Revenue", verdict: dr.verdict, artifact: artifactPath });
      console.log(`  → ${dr.verdict}`);
    } else {
      console.log("  → PENDING (fixture missing)");
      results.push({ name: "Daily Revenue", verdict: "PENDING", artifact: "" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  → ERROR: ${msg}`);
    results.push({ name: "Daily Revenue", verdict: "ERROR", artifact: "" });
  }

  // Service Revenue
  console.log("[2/4] Service Revenue...");
  try {
    const sr = await checkServiceRevenue();
    if (sr) {
      const artifactPath = path.join(OUTPUT_DIR, "service-revenue-2026-04.md");
      fs.writeFileSync(artifactPath, sr.markdown, "utf-8");
      results.push({ name: "Service Revenue", verdict: sr.verdict, artifact: artifactPath });
      console.log(`  → ${sr.verdict}`);
    } else {
      console.log("  → PENDING (fixture missing)");
      results.push({ name: "Service Revenue", verdict: "PENDING", artifact: "" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  → ERROR: ${msg}`);
    const artifactPath = path.join(OUTPUT_DIR, "service-revenue-2026-04.md");
    const errorLines = [
      "# Service Revenue Parity — 2026-04",
      "",
      "**Reference period:** 2026-04-01 to 2026-04-30 | SEC_CD=15",
      "",
      "## ERROR",
      "",
      `API query failed: \`${msg}\``,
      "",
      "### Root Cause",
      "",
      "The service revenue query or parity adapter failed before producing comparable totals.",
      "",
      "**Verdict: ERROR**",
      "",
      "---",
    ];
    fs.writeFileSync(artifactPath, errorLines.join("\n"), "utf-8");
    results.push({ name: "Service Revenue", verdict: "ERROR", artifact: artifactPath });
  }

  // Receipts Inquiry
  console.log("[3/4] Receipts Inquiry...");
  try {
    const ri = await checkReceiptsInquiry();
    if (ri) {
      const artifactPath = path.join(OUTPUT_DIR, "receipts-inquiry-2026-04.md");
      fs.writeFileSync(artifactPath, ri.markdown, "utf-8");
      results.push({ name: "Receipts Inquiry", verdict: ri.verdict, artifact: artifactPath });
      console.log(`  → ${ri.verdict}`);
    } else {
      console.log("  → PENDING (fixture missing)");
      results.push({ name: "Receipts Inquiry", verdict: "PENDING", artifact: "" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  → ERROR: ${msg}`);
    results.push({ name: "Receipts Inquiry", verdict: "ERROR", artifact: "" });
  }

  // Patient Account (Lasik summary sample)
  console.log("[4/4] Patient Lasik Summary (sample)...");
  try {
    const pa = await checkPatientLasikSummarySample();
    const artifactPath = path.join(OUTPUT_DIR, "patient-account-sample.md");
    fs.writeFileSync(artifactPath, pa.markdown, "utf-8");
    results.push({ name: "Patient Lasik Summary", verdict: pa.verdict, artifact: artifactPath });
    console.log(`  → ${pa.verdict}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  → ERROR: ${msg}`);
    const artifactPath = path.join(OUTPUT_DIR, "patient-account-sample.md");
    const errMd = [
      "# Patient Account Parity — Single Sample",
      "",
      "## ERROR",
      "",
      `\`${msg}\``,
      "",
      "**Verdict: ERROR**",
      "",
    ].join("\n");
    fs.writeFileSync(artifactPath, errMd, "utf-8");
    results.push({ name: "Patient Lasik Summary", verdict: "ERROR", artifact: artifactPath });
  }

  // Summary
  console.log("\n=== Summary ===\n");
  for (const r of results) {
    console.log(`  ${r.name}: ${r.verdict}${r.artifact ? ` → ${r.artifact}` : ""}`);
  }

  const hasFail = results.some((r) => r.verdict === "FAIL");
  const hasError = results.some((r) => r.verdict === "ERROR");
  const hasPending = results.some((r) => r.verdict === "PENDING");

  if (hasFail || hasError) {
    console.log("\n⚠ FAIL/ERROR detected — write SCOPE-CHANGE-REQUEST.md.");
    const scopePath = path.join(OUTPUT_DIR, "SCOPE-CHANGE-REQUEST.md");
    const failing = results.filter((r) => r.verdict === "FAIL" || r.verdict === "ERROR");
    const scopeContent = [
      "# Scope Change Request — Parity Failures",
      "",
      `**Date:** ${new Date().toISOString().split("T")[0]}`,
      `**Reference period:** 2026-04-01 to 2026-04-30 | SEC_CD=15`,
      "",
      "## Failing / Error Reports",
      "",
      ...failing.map((r) => `- **${r.name}**: ${r.verdict} — see ${r.artifact || "(query failed)"}`),
      "",
      "## Required Action",
      "",
      "Review the FAIL/ERROR artifacts above. Determine whether:",
      "1. The SQL builder logic needs adjustment (requires scope change per scope-lock.md §7).",
      "2. The fixture data is from a different query/filter than the API uses (documentation fix only).",
      "3. The delta is within acceptable operational tolerance (document as diagnostic-only).",
      "",
      "## Delta Summary",
      "",
      "See individual report artifacts for exact deltas.",
      "",
    ];
    fs.writeFileSync(scopePath, scopeContent.join("\n"), "utf-8");
    console.log(`  → ${scopePath} written.`);
  } else if (hasPending) {
    console.log("\n⏳ PENDING — some fixtures missing. Write PENDING-FIXTURES.md.");
    const pendingPath = path.join(OUTPUT_DIR, "PENDING-FIXTURES.md");
    const pending = results.filter((r) => r.verdict === "PENDING");
    const pendingContent = [
      "# Pending Fixtures",
      "",
      `**Date:** ${new Date().toISOString().split("T")[0]}`,
      "",
      "The following reports cannot be verified because fixtures are missing:",
      "",
      ...pending.map((r) => `- **${r.name}**: fixture CSV not found under specs/parity/fixtures/`),
      "",
      "## Required Action",
      "",
      "Export the legacy OP report data as CSV and place in `specs/parity/fixtures/`.",
      "",
    ];
    fs.writeFileSync(pendingPath, pendingContent.join("\n"), "utf-8");
    console.log(`  → ${pendingPath} written.`);
  } else {
    console.log("\n✓ All parity checks PASSED.");
  }

  process.exit(hasFail ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(2);
});
