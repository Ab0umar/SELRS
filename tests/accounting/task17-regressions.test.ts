import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  buildReceiptsInquirySql,
  buildServiceRevenueSql,
} from "../../server/services/accounting/sqlBuilders";
import {
  firstNumericColumnIndex,
  formatPrintCellValue,
  hasPrintableDateRange,
  sumNumericBlock,
  type PrintPayload,
} from "../../client/src/pages/accounting/printUtils";

const repo = basename(process.cwd()).toLowerCase() === "client"
  ? resolve(process.cwd(), "..")
  : process.cwd();
const read = (path: string) => readFileSync(resolve(repo, path), "utf8");

describe("Task 17 accounting SQL regressions", () => {
  it("builds service revenue detail SQL without reserved rowCount aliases", () => {
    const { sql, params } = buildServiceRevenueSql({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      sectionCode: 15,
      doctorCode: "D01",
    });

    expect(sql).not.toMatch(/\bAS\s+rowCount\b/i);
    expect(sql).toContain("s.SRV_BY1 = @doctorCode");
    expect(params).toMatchObject({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      secCd: 15,
      doctorCode: "D01",
    });
  });

  it("keeps receipts inquiry at one header row per receipt key", () => {
    const { sql } = buildReceiptsInquirySql({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      sectionCode: 15,
    });

    expect(sql).toMatch(/SELECT DISTINCT/i);
    expect(sql).toContain("h.SEC_CD AS secCd");
    expect(sql).toContain("h.TR_TY AS trTy");
    expect(sql).toContain("h.TR_NO AS trNo");
    expect(sql).not.toContain("s.SRV_CD AS serviceCode");
    expect(sql).toContain("JOIN PAPAT_SRV");
    expect(sql).not.toContain("LEFT JOIN PAPAT_SRV");
  });

  it("uses LEFT JOIN for receipts inquiry when patientCode is set (header-only receipts)", () => {
    const { sql } = buildReceiptsInquirySql({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      sectionCode: 15,
      patientCode: "0013",
    });

    expect(sql).toContain("LEFT JOIN PAPAT_SRV");
    expect(sql).toContain("@patientCode");
    expect(sql).toMatch(/CONVERT\s*\(\s*VARCHAR\s*\(\s*40\s*\)\s*,\s*h\.PAT_CD\s*\)/i);
  });

  it("matches receipt number with trimmed TR_NO compare", () => {
    const { sql, params } = buildReceiptsInquirySql({
      fromDate: "2026-04-01",
      toDate: "2026-04-30",
      sectionCode: 15,
      trNo: " 123 ",
    });

    expect(sql).toContain("h.TR_NO");
    expect(sql).toContain("@trNo");
    expect(params).toMatchObject({ trNo: "123" });
  });
});

describe("Task 17 accounting print regressions", () => {
  const columns: PrintPayload["columns"] = [
    { key: "label", label: "البيان" },
    { key: "quantity", label: "العدد", align: "right" },
    { key: "totalGross", label: "الإجمالي", align: "right" },
  ];

  it("formats print numbers and dates with Arabic digits", () => {
    expect(formatPrintCellValue("2026-04-30", { key: "date" })).toBe("٢٠٢٦-٠٤-٣٠");
    expect(formatPrintCellValue("1805", { key: "trNo" })).toBe("١٨٠٥");
    expect(formatPrintCellValue(12, { key: "rowCount", align: "right" })).toBe("١٢");
    // Money path uses formatMoneyAr: Arabic digits + fixed 2 decimals (see accountingFormat.ts).
    expect(formatPrintCellValue(1234.5, { key: "totalGross", align: "right" })).toBe("١٢٣٤.٥٠");
  });

  it("aligns subtotal labels before the first numeric column", () => {
    expect(firstNumericColumnIndex(columns)).toBe(1);
    expect(
      sumNumericBlock(
        [
          { label: "أ", quantity: 1, totalGross: 10 },
          { label: "ب", quantity: 2, totalGross: 15 },
        ],
        columns,
      ),
    ).toEqual({ quantity: 3, totalGross: 25 });
  });

  it("renders date range only when both endpoints exist", () => {
    expect(hasPrintableDateRange({ clinicName: "SRV100", fromDate: "2026-04-01", toDate: "2026-04-30" })).toBe(true);
    expect(hasPrintableDateRange({ clinicName: "SRV100", fromDate: "2026-04-01" })).toBe(false);
  });
});

describe("Task 17 accounting UI source invariants", () => {
  it("patient account shows search UI and Lasik summary query", () => {
    const source = read("client/src/pages/accounting/PatientAccount.tsx");

    expect(source).toContain("حساب مريض");
    expect(source).toContain("كود المريض");
    expect(source).toContain("من تاريخ");
    expect(source).toContain("إلى تاريخ");
    expect(source).toContain("كود القسم");
    expect(source).toContain("بحث");
    expect(source).toContain("ابحث عن مريض لعرض الحساب");
    expect(source).toContain("patientLasikSummary.useQuery");
    expect(source).toContain("/accounting/patient/:patientCode");
    expect(source).toContain("رقم الإيصال");
  });

  it("doctor account shows search UI and service revenue grouping", () => {
    const source = read("client/src/pages/accounting/DoctorAccount.tsx");

    expect(source).toContain("حساب طبيب");
    expect(source).toContain("كود الطبيب");
    expect(source).toContain("كود الخدمة");
    expect(source).toContain("بحث");
    expect(source).toContain("ابحث عن طبيب لعرض الحساب");
    expect(source).toContain("serviceRevenue.useQuery");
    expect(source).toContain("/accounting/doctor/:doctorCode");
    expect(source).toContain("إجمالي القسم");
  });

  it("service revenue does not render standalone totals tables outside its report table", () => {
    const source = read("client/src/pages/accounting/LasikRevenue.tsx");

    expect(source).not.toContain("styles.totalsTable");
    expect(source).not.toContain("styles.totalsArea");
    expect(source).not.toContain("styles.periodTotalWrap");
    expect(source).toContain("<tfoot>");
    expect(source).toContain("إجمالي القسم");
    expect(source).toContain("الإجمالي العام");
  });

  it("print preview header uses the real-logo chain and the official Arabic clinic name", () => {
    const source = read("client/src/pages/accounting/PrintPreview.tsx");

    expect(source).toContain("PRINT_LOGO_CHAIN = [BRAND_LOGO_URL, BRAND_LOGO_PNG_FALLBACK_URL]");
    expect(source).toContain("مركز عيون الشروق");
    expect(source).not.toContain("BRAND_LOGO_FALLBACK_URL");
  });
});
