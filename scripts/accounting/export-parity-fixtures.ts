/**
 * One-off / CI helper: dump MSSQL rows for accounting parity fixtures (2026-04, SEC_CD=15).
 * Does not modify API SQL — reuses buildServiceRevenueSql / buildReceiptsInquirySql.
 *
 * Usage: pnpm exec tsx scripts/accounting/export-parity-fixtures.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";

import { mssqlQuery } from "../../server/services/accounting/mssqlAccounting";
import {
  buildReceiptsInquirySql,
  buildServiceRevenueSql,
} from "../../server/services/accounting/sqlBuilders";

const FIXTURES_DIR = path.resolve("specs/parity/fixtures");

function escCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath: string, headers: string[], rows: Record<string, unknown>[]) {
  const lines = [headers.join(";"), ...rows.map((r) => headers.map((h) => escCell(r[h])).join(";"))];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

async function main() {
  const fromDate = "2026-04-01";
  const toDate = "2026-04-30";
  const sectionCode = 15;

  const sr = buildServiceRevenueSql({ fromDate, toDate, sectionCode });
  const serviceRows = await mssqlQuery<Record<string, unknown>>(sr.sql, sr.params);
  const srPath = path.join(FIXTURES_DIR, "service-revenue-2026-04.csv");
  const srHeaders = [
    "sectionCode",
    "sectionName",
    "serviceCode",
    "serviceName",
    "trNo",
    "trDate",
    "patientCode",
    "patientName",
    "quantity",
    "price",
    "patientShare",
    "discount",
    "lineGross",
    "companyValue",
  ];
  writeCsv(srPath, srHeaders, serviceRows);
  console.log(`Wrote ${serviceRows.length} rows → ${srPath}`);

  const ri = buildReceiptsInquirySql({ fromDate, toDate, sectionCode });
  const receiptRows = await mssqlQuery<Record<string, unknown>>(ri.sql, ri.params);
  const riPath = path.join(FIXTURES_DIR, "receipts-inquiry-2026-04.csv");
  const riHeaders = [
    "secCd",
    "trTy",
    "trNo",
    "trDate",
    "patientCode",
    "patientName",
    "totalValue",
    "discountValue",
    "paidValue",
    "enteredBy",
  ];
  writeCsv(riPath, riHeaders, receiptRows);
  console.log(`Wrote ${receiptRows.length} rows → ${riPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
