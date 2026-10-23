import { describe, expect, it } from "vitest";
import {
  buildDailyRevenueSql,
  buildDashboardSummarySql,
  buildLasikReceiptsSql,
  buildLasikRevenueSummarySql,
  buildLasikServicesSql,
  buildPatientLasikSummarySql,
  buildReceiptDetailSql,
  buildReceiptsInquirySql,
  buildServiceRevenueSql,
} from "../services/accounting/sqlBuilders";
import {
  mapDailyRevenueRows,
  mapDashboardSummaryRow,
  mapLasikRevenueSummaryRow,
  mapPatientLasikSummaryRows,
  mapReceiptDetailRows,
  mapReceiptHeader,
  mapServiceRevenueRows,
  mapServiceRow,
} from "../services/accounting/mappers";
import { matchAdvanceEmployee } from "../services/accounting/advanceEmployee";

const CANCELLED_HEADER = "ISNULL(CONVERT(varchar(10), h.CNCL), '0') IN ('', '0')";
const CANCELLED_LINE = "ISNULL(CONVERT(varchar(10), s.CNCL), '0') IN ('', '0')";
const INJECTION = "x'; DROP TABLE PAJRNRCVH; --";

describe("accounting SQL builders: cancelled-transaction policy", () => {
  it("daily revenue excludes cancelled headers and lines", () => {
    const { sql } = buildDailyRevenueSql({ fromDate: "2026-03-01", toDate: "2026-03-31" });
    expect(sql).toContain(CANCELLED_HEADER);
    expect(sql).toContain(CANCELLED_LINE);
  });

  it("service revenue excludes cancelled headers and lines", () => {
    const { sql } = buildServiceRevenueSql({ fromDate: "2026-03-01", toDate: "2026-03-31" });
    expect(sql).toContain(CANCELLED_HEADER);
    expect(sql).toContain(CANCELLED_LINE);
  });

  it("dashboard summary excludes cancelled rows and unpriced lines", () => {
    const { sql } = buildDashboardSummarySql();
    expect(sql).toContain(CANCELLED_HEADER);
    expect(sql).toContain(CANCELLED_LINE);
    expect(sql).toContain("ISNULL(s.PRC, 0) > 0");
  });

  it("receipts inquiry excludes cancelled headers", () => {
    expect(buildReceiptsInquirySql({}).sql).toContain(CANCELLED_HEADER);
  });

  // PAJRNRCVH holds NULL (2372), '0' (2647) and '*' cancelled (6): the app
  // writes '0' on live receipts, so `IS NULL` would hide over half of them.
  it("patient LASIK summary keeps receipts and lines with CNCL '0' or empty", () => {
    const { sql } = buildPatientLasikSummarySql({ patientCode: "0012" });
    expect(sql).toContain(CANCELLED_HEADER);
    expect(sql).toContain(CANCELLED_LINE);
    expect(sql).not.toContain("h.CNCL IS NULL");
  });

  // PAPAT_SRV is almost all NULL (5005 NULL, 1 '', 3 '*'), so these two only
  // differ from the rule above on a single row; align them when touched.
  it.todo("LASIK services and revenue summary use the same line cancel rule as the others");
});

describe("accounting SQL builders: parameter binding", () => {
  it("never interpolates user input into the SQL text", () => {
    const builds = [
      buildDailyRevenueSql({
        fromDate: INJECTION,
        toDate: INJECTION,
        doctorCode: INJECTION,
        shiftCode: INJECTION,
      }),
      buildServiceRevenueSql({
        fromDate: INJECTION,
        toDate: INJECTION,
        doctorCodes: [INJECTION, `${INJECTION}2`],
        serviceCodes: [INJECTION, `${INJECTION}2`],
        shiftCode: INJECTION,
      }),
      buildReceiptsInquirySql({
        fromDate: INJECTION,
        patientCode: INJECTION,
        doctorCode: INJECTION,
        trNo: INJECTION,
      }),
      buildLasikServicesSql({
        patientCode: INJECTION,
        doctorCode: INJECTION,
        serviceCode: INJECTION,
      }),
      buildPatientLasikSummarySql({ patientCode: INJECTION, patientName: INJECTION }),
      buildReceiptDetailSql({ sectionCode: 15, trTy: 1, trNo: INJECTION }),
      buildDashboardSummarySql({ date: INJECTION }),
    ];
    for (const { sql, params } of builds) {
      expect(sql).not.toContain("DROP TABLE");
      expect(JSON.stringify(Object.values(params))).toContain("DROP TABLE");
    }
  });

  it("drops undefined params", () => {
    const { params } = buildDailyRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      shiftCode: undefined,
    });
    expect(Object.keys(params).sort()).toEqual(["fromDate", "toDate"]);
  });
});

describe("accounting SQL builders: filters", () => {
  it("covers the whole last day of the range", () => {
    const { sql, params } = buildDailyRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    });
    expect(sql).toContain("h.TR_DT >= @fromDate");
    expect(sql).toContain("h.TR_DT < DATEADD(day, 1, @toDate)");
    expect(params).toMatchObject({ fromDate: "2026-03-01", toDate: "2026-03-31" });
  });

  it("filters by section, doctor and shift, trimming the doctor code", () => {
    const { sql, params } = buildDailyRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      sectionCode: 15,
      doctorCode: " D1 ",
      shiftCode: "2",
    });
    expect(sql).toContain("h.SEC_CD = @secCd");
    expect(sql).toContain("s.SRV_BY1 = @doctorCode");
    expect(sql).toContain("h.SHFT = @shiftCode");
    expect(params).toMatchObject({ secCd: 15, doctorCode: "D1", shiftCode: "2" });
  });

  it.each([0, undefined])("applies no section filter for sectionCode %s", (sectionCode) => {
    const { sql, params } = buildDailyRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      sectionCode,
    });
    expect(sql).not.toContain("h.SEC_CD = @secCd");
    expect(params).not.toHaveProperty("secCd");
  });

  it("expands several doctors into an IN list, ignoring blanks", () => {
    const { sql, params } = buildServiceRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      doctorCodes: ["A", "  ", " B "],
    });
    expect(sql).toContain("s.SRV_BY1 IN (@doctorCode0, @doctorCode1)");
    expect(params).toMatchObject({ doctorCode0: "A", doctorCode1: "B" });
    expect(params).not.toHaveProperty("doctorCode");
  });

  it("treats the '*' service as no service filter", () => {
    const { sql, params } = buildServiceRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      serviceCodes: ["*"],
    });
    expect(sql).not.toContain("s.SRV_CD = @serviceCode0");
    expect(sql).not.toContain("s.SRV_CD IN");
    expect(params).not.toHaveProperty("serviceCode0");
  });

  it("filters one or several services", () => {
    const single = buildServiceRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      serviceCodes: ["101"],
    });
    expect(single.sql).toContain("s.SRV_CD = @serviceCode0");
    expect(single.params).toMatchObject({ serviceCode0: "101" });

    const multi = buildServiceRevenueSql({
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      serviceCodes: ["101", "102"],
    });
    expect(multi.sql).toContain("s.SRV_CD IN (@serviceCode0, @serviceCode1)");
  });
});

describe("receipts inquiry builder", () => {
  it("uses an inner join without a patient filter", () => {
    const { sql } = buildReceiptsInquirySql({});
    expect(sql).toMatch(/\nJOIN PAPAT_SRV s/);
    expect(sql).not.toContain("LEFT JOIN PAPAT_SRV");
  });

  it("left-joins and keeps leading zeros when filtering by patient code", () => {
    const { sql, params } = buildReceiptsInquirySql({ patientCode: " 0012 " });
    expect(sql).toContain("LEFT JOIN PAPAT_SRV");
    expect(params.patientCode).toBe("0012");
  });

  it("limits with TOP on the first page", () => {
    const { sql, params } = buildReceiptsInquirySql({ limit: 50 });
    expect(sql).toMatch(/SELECT DISTINCT TOP \(@limit\)/);
    expect(sql).not.toContain("OFFSET");
    expect(params.limit).toBe(50);
  });

  it("pages with OFFSET/FETCH after the first page, defaulting to 501 rows", () => {
    const paged = buildReceiptsInquirySql({ limit: 50, offset: 100 });
    expect(paged.sql).toContain("OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY");
    expect(paged.sql).not.toContain("TOP (@limit)");
    expect(paged.params).toMatchObject({ offset: 100, limit: 50 });

    expect(buildReceiptsInquirySql({ offset: 10 }).params.limit).toBe(501);
  });

  it("treats a negative offset as the first page", () => {
    const { sql } = buildReceiptsInquirySql({ limit: 10, offset: -5 });
    expect(sql).not.toContain("OFFSET");
  });

  it("filters by trimmed receipt number and a finite type only", () => {
    const withBoth = buildReceiptsInquirySql({ trNo: " 77 ", trTy: 1 });
    expect(withBoth.params).toMatchObject({ trNo: "77", trTy: 1 });
    expect(withBoth.sql).toContain("h.TR_TY = @trTy");

    const invalid = buildReceiptsInquirySql({ trNo: "   ", trTy: Number.NaN });
    expect(invalid.params).not.toHaveProperty("trNo");
    expect(invalid.params).not.toHaveProperty("trTy");
  });

  it("LASIK receipts always run against section 15", () => {
    const { params } = buildLasikReceiptsSql({ sectionCode: 99 } as any);
    expect(params.secCd).toBe(15);
  });
});

describe("other accounting builders", () => {
  it("dashboard summary defaults to LASIK section 15 and the current date", () => {
    const { sql, params } = buildDashboardSummarySql();
    expect(params).toEqual({ secCd: 15 });
    expect(sql).toContain("GETDATE()");
  });

  it("dashboard summary can target a section and a specific date", () => {
    const { sql, params } = buildDashboardSummarySql({
      sectionCode: 3,
      date: "2026-03-05",
    });
    expect(params).toEqual({ secCd: 3, viewDate: "2026-03-05" });
    expect(sql).not.toContain("GETDATE()");
  });

  it("receipt detail binds section, type and number", () => {
    const { params } = buildReceiptDetailSql({ sectionCode: 15, trTy: 1, trNo: "77" });
    expect(params).toEqual({ secCd: 15, trTy: 1, trNo: "77" });
  });

  it("LASIK services and summary always filter section 15", () => {
    expect(buildLasikServicesSql({}).params.secCd).toBe(15);
    expect(buildLasikRevenueSummarySql({}).params.secCd).toBe(15);
  });

  it("LASIK revenue summary only counts lines with a doctor", () => {
    expect(buildLasikRevenueSummarySql({}).sql).toContain("ISNULL(s.SRV_BY1, '') <> ''");
  });

  it("patient summary matches names with a contains pattern", () => {
    const { params } = buildPatientLasikSummarySql({ patientName: " Ali " });
    expect(params.patientName).toBe("%Ali%");
  });
});

describe("accounting mappers", () => {
  it("coerces numbers defensively", () => {
    expect(
      mapDashboardSummaryRow({
        totalReceiptsToday: "12",
        totalRevenueToday: 5n,
        totalReceiptsThisMonth: "abc",
        totalRevenueThisMonth: Number.NaN,
      }),
    ).toEqual({
      totalReceiptsToday: 12,
      totalRevenueToday: 5,
      totalReceiptsThisMonth: 0,
      totalRevenueThisMonth: 0,
    });
    expect(mapDashboardSummaryRow(undefined).totalRevenueToday).toBe(0);
  });

  it("maps a receipt header from either column alias and keeps patient code text", () => {
    const header = mapReceiptHeader({
      secCd: 15,
      trTy: 1,
      trNo: " 77 ",
      trDate: new Date(Date.UTC(2026, 2, 5, 14, 30, 0)),
      patientCode: "0012",
      patientName: "   ",
      totalValue: "100",
      discountValue: 10,
      paidValue: 90,
      enteredBy: "u1",
    });
    expect(header).toEqual({
      sectionCode: 15,
      trTy: 1,
      trNo: "77",
      transactionDate: "2026-03-05T14:30:00",
      patientCode: "0012",
      patientName: null,
      total: 100,
      discount: 10,
      paidValue: 90,
      enteredBy: "u1",
    });
  });

  it("keeps SQL Server wall-clock time instead of re-labelling it as UTC", () => {
    const { transactionDate } = mapReceiptHeader({
      trDate: new Date(Date.UTC(2026, 0, 1, 23, 59, 59)),
    });
    expect(transactionDate).toBe("2026-01-01T23:59:59");
    expect(transactionDate.endsWith("Z")).toBe(false);
  });

  it("truncates numeric patient codes and falls back when missing", () => {
    expect(mapReceiptHeader({ patientCode: 12.7 }).patientCode).toBe("12");
    expect(mapReceiptHeader({ patientCode: null }, "0099").patientCode).toBe("0099");
  });

  it("maps service rows with column fallbacks and optional values", () => {
    const row = mapServiceRow({
      secCd: 15,
      trTy: null,
      trNo: 5,
      serviceCode: "S1",
      quantity: "2",
      price: 150,
      lineDiscount: 10,
      linePaid: 140,
      companyValue: 0,
      receiptDate: new Date(Date.UTC(2026, 2, 2, 10, 0, 0)),
      serviceBy1: "D1",
      currentDoctorCode: "D2",
    });
    expect(row).toMatchObject({
      sectionCode: 15,
      trTy: null,
      trNo: "5",
      serviceCode: "S1",
      quantity: 2,
      discountValue: 10,
      paidValue: 140,
      entryDate: "2026-03-02T10:00:00",
      doctorCode: "D1",
      serviceBy1: "D1",
      currentServiceBy: "D2",
      lineNo: undefined,
    });
  });

  it("returns an empty receipt detail when there are no rows", () => {
    const detail = mapReceiptDetailRows([]);
    expect(detail.lines).toEqual([]);
    expect(detail.header).toMatchObject({ sectionCode: 0, trNo: "", total: 0 });
  });

  it("totals daily revenue across days", () => {
    const result = mapDailyRevenueRows([
      {
        date: new Date(Date.UTC(2026, 2, 5)),
        totalReceipts: 2,
        totalGross: 1000,
        totalDiscount: 100,
        totalCash: 600,
        totalPaid: 900,
        netAfterDiscount: 900,
      },
      {
        trDate: "2026-03-06",
        totalReceipts: 1,
        totalGross: 500,
        totalDiscount: 0,
        totalCash: 500,
        totalPaid: 500,
        netAfterDiscount: 500,
      },
    ]);
    expect(result.rows.map((row) => row.date)).toEqual(["2026-03-05", "2026-03-06"]);
    expect(result.totals).toEqual({
      totalReceipts: 3,
      totalGross: 1500,
      totalDiscount: 100,
      totalCash: 1100,
      totalPaid: 1400,
      netAfterDiscount: 1400,
    });
  });

  it("groups service revenue by section and service with subtotals", () => {
    const line = (
      sectionCode: number,
      serviceCode: string,
      lineGross: number,
      discount: number,
    ) => ({
      sectionCode,
      sectionName: sectionCode,
      serviceCode,
      serviceName: `svc ${serviceCode}`,
      trNo: `${sectionCode}-${serviceCode}`,
      trDate: new Date(Date.UTC(2026, 2, 1)),
      patientCode: "0001",
      patientName: "P",
      quantity: 1,
      price: lineGross,
      patientShare: lineGross,
      discount,
      lineGross,
      companyValue: 0,
    });
    const result = mapServiceRevenueRows([
      line(15, "10", 100, 10),
      line(15, "10", 200, 0),
      line(15, "9", 50, 5),
      line(3, "1", 70, 0),
    ]);

    expect(result.sections.map((section) => section.sectionCode)).toEqual([3, 15]);
    const lasik = result.sections[1];
    expect(lasik.sectionName).toBe("15");
    expect(lasik.services.map((service) => service.serviceCode)).toEqual(["9", "10"]);
    const ten = lasik.services[1];
    expect(ten).toMatchObject({
      rowCount: 2,
      totalGross: 300,
      totalDiscount: 10,
      totalPaid: 290,
    });
    expect(ten.details).toHaveLength(2);
    expect(lasik.subtotal).toEqual({
      rowCount: 3,
      totalGross: 350,
      totalDiscount: 15,
      totalPaid: 335,
    });
    expect(result.grandTotal).toEqual({
      rowCount: 4,
      totalGross: 420,
      totalDiscount: 15,
      totalPaid: 405,
    });
  });

  it("summarises LASIK revenue as gross minus discount", () => {
    const input = { fromDate: "2026-03-01", toDate: "2026-03-31" } as any;
    expect(
      mapLasikRevenueSummaryRow(
        { row_count: 4, totalGross: 1000, totalDiscount: 100, totalPaid: 800 },
        input,
      ),
    ).toEqual({
      sectionCode: 15,
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      doctorCode: null,
      totalServices: 4,
      totalGross: 1000,
      totalDiscount: 100,
      totalPaid: 800,
      netAfterDiscount: 900,
    });
    expect(mapLasikRevenueSummaryRow(undefined, input).totalGross).toBe(0);
  });

  it("builds the patient LASIK summary from receipt and service rows", () => {
    const receipt1 = {
      secCd: 15,
      trTy: 1,
      trNo: "1",
      trDate: new Date(Date.UTC(2026, 2, 2, 10, 0, 0)),
      patientCode: "0012",
      patientName: "Ali",
      receiptTotal: 300,
      receiptDiscount: 20,
      receiptPaid: 280,
      quantity: 1,
      price: 150,
      lineDiscount: 10,
      linePaid: 140,
      companyValue: 0,
      lineGross: 150,
    };
    const result = mapPatientLasikSummaryRows(
      [
        { ...receipt1, serviceCode: "S1" },
        { ...receipt1, serviceCode: "S2" },
        // Header-only receipt: no service line.
        {
          secCd: 15,
          trTy: 1,
          trNo: "2",
          trDate: new Date(Date.UTC(2026, 2, 1, 9, 0, 0)),
          patientCode: "0012",
          patientName: "Ali",
          serviceCode: null,
          lineGross: null,
        },
      ],
      "0012",
    );

    expect(result.patientCode).toBe("0012");
    expect(result.patientName).toBe("Ali");
    expect(result.receipts).toHaveLength(2);
    expect(result.services).toHaveLength(2);
    expect(result.totals).toEqual({
      totalReceipts: 2,
      totalServices: 2,
      totalGross: 300,
      totalDiscount: 20,
      totalPaid: 280,
      totalPatientAmount: 280,
      totalCompanyAmount: 0,
      lastTransactionDate: "2026-03-02T10:00:00",
    });
  });
});

describe("advance employee matching", () => {
  const employees = [
    { name: "أحمد محمد", empCd: "1" },
    { name: "احمد", empCd: "2" },
    { name: "فاطمة", empCd: "3" },
    { name: "علي", empCd: "4" },
  ];

  it("matches a full name and ignores a shorter alias inside it", () => {
    expect(matchAdvanceEmployee("سلفة احمد محمد", employees)?.empCd).toBe("1");
  });

  it("matches the short name when only it is present", () => {
    expect(matchAdvanceEmployee("سلفة احمد", employees)?.empCd).toBe("2");
  });

  it("normalises hamza, alef maqsura, teh marbuta and diacritics", () => {
    expect(matchAdvanceEmployee("سلفه فاطمه", employees)?.empCd).toBe("3");
    expect(matchAdvanceEmployee("سلفة أحمَد", employees)?.empCd).toBe("2");
    expect(matchAdvanceEmployee("سلفة عَلِى", employees)?.empCd).toBe("4");
  });

  it("matches a name attached with the Arabic 'and' prefix", () => {
    expect(matchAdvanceEmployee("سلفة وعلي", employees)?.empCd).toBe("4");
  });

  it("does not match inside another word", () => {
    expect(matchAdvanceEmployee("سلفة عليوة", employees)).toBeNull();
  });

  it("returns null when two different employees are mentioned", () => {
    expect(matchAdvanceEmployee("سلفة فاطمة وعلي", employees)).toBeNull();
  });

  it("returns null when the same name maps to different employee codes", () => {
    expect(
      matchAdvanceEmployee("سلفة منى", [
        { name: "منى", empCd: "10" },
        { name: "منى", empCd: "11" },
      ]),
    ).toBeNull();
  });

  it("returns null when nobody matches or the name is a single character", () => {
    expect(matchAdvanceEmployee("سلفة غير معروف", employees)).toBeNull();
    expect(matchAdvanceEmployee("سلفة س", [{ name: "س", empCd: "9" }])).toBeNull();
  });
});
