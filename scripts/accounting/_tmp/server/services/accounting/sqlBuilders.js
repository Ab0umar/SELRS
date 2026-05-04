"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDashboardSummarySql = buildDashboardSummarySql;
exports.buildDailyRevenueSql = buildDailyRevenueSql;
exports.buildServiceRevenueSql = buildServiceRevenueSql;
exports.buildReceiptsInquirySql = buildReceiptsInquirySql;
exports.buildReceiptDetailSql = buildReceiptDetailSql;
exports.buildLasikReceiptsSql = buildLasikReceiptsSql;
exports.buildLasikServicesSql = buildLasikServicesSql;
exports.buildLasikRevenueSummarySql = buildLasikRevenueSummarySql;
exports.buildPatientLasikSummarySql = buildPatientLasikSummarySql;
const LASIK_SECTION_CODE = 15;
function cleanParams(params) {
    return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}
function dateRangeWhere(input, params) {
    const where = [];
    if (input.fromDate) {
        where.push("h.TR_DT >= @fromDate");
        params.fromDate = input.fromDate;
    }
    if (input.toDate) {
        where.push("h.TR_DT < DATEADD(day, 1, @toDate)");
        params.toDate = input.toDate;
    }
    return where;
}
function sectionWhere(sectionCode, params) {
    params.secCd = sectionCode ?? LASIK_SECTION_CODE;
    return ["h.SEC_CD = @secCd"];
}
function doctorWhere(doctorCode, params) {
    if (!doctorCode) {
        return [];
    }
    params.doctorCode = doctorCode;
    return ["s.SRV_BY1 = @doctorCode"];
}
function patientWhere(patientCode, params) {
    if (!patientCode) {
        return [];
    }
    params.patientCode = patientCode;
    return ["h.PAT_CD = @patientCode"];
}
function serviceWhere(serviceCode, params) {
    if (!serviceCode) {
        return [];
    }
    params.serviceCode = serviceCode;
    return ["s.SRV_CD = @serviceCode"];
}
function topClause(limit, params) {
    if (!limit) {
        return "";
    }
    params.limit = limit;
    return "TOP (@limit) ";
}
function joinedTables() {
    return `FROM PAJRNRCVH h
JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO`;
}
function andWhere(where) {
    return where.length > 0 ? `WHERE ${where.join("\n  AND ")}` : "";
}
function buildDashboardSummarySql(input = {}) {
    const params = cleanParams({
        secCd: input.sectionCode ?? LASIK_SECTION_CODE,
    });
    const sql = `
WITH base_rows AS (
  SELECT
    h.TR_TY,
    h.TR_NO,
    h.TR_DT,
    ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS gross_value,
    ISNULL(s.PA_VL, 0) AS paid_value
  ${joinedTables()}
  WHERE h.SEC_CD = @secCd
    AND h.CNCL IS NULL
    AND s.CNCL IS NULL
)
SELECT
  COUNT(DISTINCT CASE
    WHEN CONVERT(date, TR_DT) = CONVERT(date, GETDATE())
    THEN CONCAT(TR_TY, ':', TR_NO)
  END) AS totalReceiptsToday,
  SUM(CASE
    WHEN CONVERT(date, TR_DT) = CONVERT(date, GETDATE())
    THEN gross_value
    ELSE 0
  END) AS totalRevenueToday,
  COUNT(DISTINCT CASE
    WHEN TR_DT >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
     AND TR_DT < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    THEN CONCAT(TR_TY, ':', TR_NO)
  END) AS totalReceiptsThisMonth,
  SUM(CASE
    WHEN TR_DT >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
     AND TR_DT < DATEADD(month, 1, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    THEN gross_value
    ELSE 0
  END) AS totalRevenueThisMonth,
  SUM(paid_value) AS totalPaidInSection
FROM base_rows`.trim();
    return { sql, params };
}
function buildDailyRevenueSql(input) {
    const params = {};
    const where = [
        ...dateRangeWhere(input, params),
        ...sectionWhere(input.sectionCode, params),
        ...doctorWhere(input.doctorCode, params),
        "h.CNCL IS NULL",
        "s.CNCL IS NULL",
    ];
    const sql = `
SELECT
  CAST(h.TR_DT AS date) AS trDate,
  COUNT(DISTINCT CONCAT(h.TR_TY, ':', h.TR_NO)) AS totalReceipts,
  SUM(ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0)) AS totalGross,
  SUM(ISNULL(s.DISC_VL, 0)) AS totalDiscount,
  SUM(CASE WHEN h.TR_TY = 1 THEN ISNULL(s.PA_VL, 0) ELSE 0 END) AS totalCash,
  SUM(ISNULL(s.PA_VL, 0)) AS totalPaid,
  SUM(ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0)) - SUM(ISNULL(s.DISC_VL, 0)) AS netAfterDiscount
${joinedTables()}
${andWhere(where)}
GROUP BY CAST(h.TR_DT AS date)
ORDER BY trDate`.trim();
    return { sql, params: cleanParams(params) };
}
function buildServiceRevenueSql(input) {
    const params = {};
    const where = [
        ...dateRangeWhere(input, params),
        ...sectionWhere(input.sectionCode, params),
        ...doctorWhere(input.doctorCode, params),
        ...serviceWhere(input.serviceCode, params),
        "s.CNCL IS NULL",
        "h.CNCL IS NULL",
    ];
    // Always include date range to prevent table scans
    if (!params.fromDate)
        params.fromDate = '2024-01-01';
    if (!params.toDate)
        params.toDate = '2024-01-31';
    const sql = `
SELECT
  ISNULL(s.SRV_BY1, '') AS doctorCode,
  ISNULL(m.PHNM_AR, '') AS doctorName,
  ISNULL(s.SRV_CD, '') AS serviceCode,
  ISNULL(c.SRV_NM_AR, '') AS serviceName,
  COUNT_BIG(*) AS rowCount,
  SUM(ISNULL(s.QTY, 0)) AS totalQty,
  SUM(ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0)) AS totalGross,
  SUM(ISNULL(s.PA_VL, 0)) AS totalPaid,
  SUM(ISNULL(s.DISC_VL, 0)) AS totalDiscount
FROM PAJRNRCVH h
JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO
LEFT JOIN MDTEAM m
  ON m.CODE = s.SRV_BY1
LEFT JOIN SRVCMF c
  ON c.SRV_CD = s.SRV_CD
${andWhere(where)}
ORDER BY
  ISNULL(s.SRV_BY1, ''),
  ISNULL(c.SRV_NM_AR, ''),
  ISNULL(s.SRV_CD, '')`.trim();
    return { sql, params: cleanParams(params) };
}
function buildReceiptsInquirySql(input) {
    const params = {};
    const where = [
        ...dateRangeWhere(input, params),
        ...sectionWhere(input.sectionCode, params),
        ...patientWhere(input.patientCode, params),
        ...doctorWhere(input.doctorCode, params),
    ];
    if (input.trNo !== undefined) {
        where.push("h.TR_NO = @trNo");
        params.trNo = input.trNo;
    }
    if (input.trTy !== undefined) {
        where.push("h.TR_TY = @trTy");
        params.trTy = input.trTy;
    }
    const top = topClause(input.limit, params);
    const sql = `
SELECT DISTINCT ${top}
  h.SEC_CD AS secCd,
  h.TR_TY AS trTy,
  h.TR_NO AS trNo,
  h.TR_DT AS trDate,
  h.PAT_CD AS patientCode,
  h.NAM AS patientName,
  h.TOTL AS totalValue,
  h.DISC AS discountValue,
  h.PA_VL AS paidValue,
  h.ENTEREDBY AS enteredBy
${joinedTables()}
${andWhere(where)}
ORDER BY h.TR_DT DESC, h.TR_NO DESC`.trim();
    return { sql, params: cleanParams(params) };
}
function buildReceiptDetailSql(input) {
    const params = cleanParams({
        secCd: input.sectionCode,
        trTy: input.trTy,
        trNo: input.trNo,
    });
    const sql = `
SELECT
  1 AS grp,
  h.SEC_CD AS secCd,
  h.PAT_CD AS patientCode,
  h.NAM AS patientName,
  h.TR_NO AS trNo,
  h.TR_DT AS trDate,
  h.TR_TY AS trTy,
  h.SHFT AS shiftCode,
  s.CA_CD AS companyCode,
  s.DISC_VL AS lineDiscount,
  s.SRV_CD AS serviceCode,
  s.SRV_BY1 AS doctorCode,
  s.QTY AS quantity,
  s.PRC AS price,
  h.TOTL AS receiptTotal,
  ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS lineGross,
  ISNULL(s.PA_VL, 0) - ISNULL(s.DISC_VL, 0) AS linePaid,
  ISNULL(s.CA_VL, 0) - ISNULL(s.DISC_CA, 0) AS companyValue,
  h.ENTEREDBY AS enteredBy,
  d.DPT_NM_AR AS departmentName,
  c.SRV_NM_AR AS serviceName,
  p.CA_NM_AR AS companyName,
  a.DSCR_AR AS shiftName,
  CASE h.TR_TY
    WHEN 1 THEN N'نقدى'
    WHEN 5 THEN N'آجل'
    WHEN 6 THEN N'نزلاء'
    WHEN 8 THEN N'مسترد'
  END AS receiptTypeName
${joinedTables()}
LEFT JOIN DEPT d
  ON d.DPT_NO = s.SEC_CD
LEFT JOIN SRVCMF c
  ON c.SRV_CD = s.SRV_CD
LEFT JOIN CMPMF p
  ON p.CA_CD = s.CA_CD
LEFT JOIN APPCODES a
  ON a.ID = 1015
 AND a.SEQ = h.SHFT
WHERE h.SEC_CD = @secCd
  AND h.TR_TY = @trTy
  AND h.TR_NO = @trNo
ORDER BY s.SRV_CD`.trim();
    return { sql, params };
}
function buildLasikReceiptsSql(input) {
    return buildReceiptsInquirySql({
        ...input,
        sectionCode: LASIK_SECTION_CODE,
    });
}
function buildLasikServicesSql(input = {}) {
    const params = {};
    const where = [
        ...dateRangeWhere(input, params),
        ...sectionWhere(LASIK_SECTION_CODE, params),
        ...patientWhere(input.patientCode, params),
        ...doctorWhere(input.doctorCode, params),
        ...serviceWhere(input.serviceCode, params),
        "s.CNCL IS NULL",
    ];
    const top = topClause(input.limit, params);
    const sql = `
SELECT ${top}
  s.PAT_CD AS patientCode,
  s.PAT_NM_AR AS patientName,
  s.VST_NO AS visitNo,
  s.TR_NO AS trNo,
  s.TR_TY AS trTy,
  s.SEC_CD AS secCd,
  s.SRV_CD AS serviceCode,
  c.SRV_NM_AR AS serviceName,
  s.PRC AS price,
  s.QTY AS quantity,
  s.DISC_VL AS discountValue,
  s.PA_VL AS paidValue,
  s.CA_VL AS companyValue,
  s.ENTRYDATE AS entryDate,
  s.SRV_BY1 AS doctorCode,
  s.CUR_SRV_BY AS currentDoctorCode,
  h.TR_DT AS receiptDate
${joinedTables()}
LEFT JOIN SRVCMF c
  ON c.SRV_CD = s.SRV_CD
${andWhere(where)}
ORDER BY h.TR_DT DESC, s.TR_NO DESC, s.SRV_CD`.trim();
    return { sql, params: cleanParams(params) };
}
function buildLasikRevenueSummarySql(input = {}) {
    const params = {};
    const where = [
        ...dateRangeWhere(input, params),
        ...sectionWhere(LASIK_SECTION_CODE, params),
        ...doctorWhere(input.doctorCode, params),
        "ISNULL(s.SRV_BY1, '') <> ''",
        "s.CNCL IS NULL",
    ];
    const sql = `
SELECT
  COUNT_BIG(*) AS rowCount,
  COUNT(DISTINCT s.SRV_BY1) AS doctorCount,
  COUNT(DISTINCT s.SRV_CD) AS serviceCount,
  SUM(ISNULL(s.QTY, 0)) AS totalQty,
  SUM(ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0)) AS totalGross,
  SUM(ISNULL(s.PA_VL, 0)) AS totalPaid,
  SUM(ISNULL(s.DISC_VL, 0)) AS totalDiscount
${joinedTables()}
${andWhere(where)}`.trim();
    return { sql, params: cleanParams(params) };
}
function buildPatientLasikSummarySql(input) {
    const params = cleanParams({
        secCd: LASIK_SECTION_CODE,
        patientCode: input.patientCode,
    });
    const sql = `
SELECT
  h.SEC_CD AS secCd,
  h.TR_TY AS trTy,
  h.TR_NO AS trNo,
  h.TR_DT AS trDate,
  h.TOTL AS receiptTotal,
  h.DISC AS receiptDiscount,
  h.PA_VL AS receiptPaid,
  s.SRV_CD AS serviceCode,
  c.SRV_NM_AR AS serviceName,
  s.QTY AS quantity,
  s.PRC AS price,
  s.DISC_VL AS lineDiscount,
  s.PA_VL AS linePaid,
  ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS lineGross
${joinedTables()}
LEFT JOIN SRVCMF c
  ON c.SRV_CD = s.SRV_CD
WHERE h.SEC_CD = @secCd
  AND h.PAT_CD = @patientCode
  AND h.CNCL IS NULL
  AND s.CNCL IS NULL
ORDER BY h.TR_DT DESC, h.TR_NO DESC, s.SRV_CD`.trim();
    return { sql, params };
}
