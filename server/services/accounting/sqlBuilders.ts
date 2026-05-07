/**
 * Accounting SQL Builders
 *
 * CNCL Filter Policy:
 * - Daily Revenue, Service Revenue, Dashboard Summary, Receipts Inquiry all exclude cancelled (CNCL IS NULL)
 * - This matches legacy OP behavior of excluding cancelled transactions from all reports
 * - CNCL filters applied to both PAJRNRCVH headers and PAPAT_SRV lines where applicable
 */
export type SqlBuild = {
  sql: string;
  params: Record<string, unknown>;
};

type SectionInput = {
  sectionCode?: number;
};

type DateRangeInput = SectionInput & {
  fromDate: string;
  toDate: string;
};

type OptionalDateRangeInput = SectionInput & {
  fromDate?: string;
  toDate?: string;
};

type DoctorInput = {
  doctorCode?: string;
};

type PatientInput = {
  patientCode?: string;
  patientName?: string;
};

type ServiceInput = {
  serviceCode?: string;
};

type LimitInput = {
  limit?: number;
};

export type DashboardSummarySqlInput = SectionInput;

export type DailyRevenueSqlInput = DateRangeInput & DoctorInput & { shiftCode?: string };

export type ServiceRevenueSqlInput = DateRangeInput & DoctorInput & ServiceInput;

export type ReceiptsInquirySqlInput = OptionalDateRangeInput &
  PatientInput &
  DoctorInput &
  LimitInput & {
    trNo?: string;
    trTy?: number;
  };

export type ReceiptDetailSqlInput = {
  sectionCode: number;
  trTy: number;
  trNo: string;
};

export type LasikReceiptsSqlInput = Omit<ReceiptsInquirySqlInput, "sectionCode">;

export type LasikServicesSqlInput = OptionalDateRangeInput &
  PatientInput &
  DoctorInput &
  ServiceInput &
  LimitInput;

export type LasikRevenueSummarySqlInput = OptionalDateRangeInput & DoctorInput;

export type PatientLasikSummarySqlInput = {
  patientCode?: string;
  patientName?: string;
  fromDate?: string;
  toDate?: string;
  sectionCode?: number;
};

const LASIK_SECTION_CODE = 15;

function cleanParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );
}

function dateRangeWhere(
  input: OptionalDateRangeInput,
  params: Record<string, unknown>,
): string[] {
  const where: string[] = [];

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

function sectionWhere(
  sectionCode: number | undefined,
  params: Record<string, unknown>,
): string[] {
  params.secCd = sectionCode ?? LASIK_SECTION_CODE;
  return ["h.SEC_CD = @secCd"];
}

function doctorWhere(
  doctorCode: string | undefined,
  params: Record<string, unknown>,
): string[] {
  const code = typeof doctorCode === "string" ? doctorCode.trim() : "";
  if (!code) {
    return [];
  }

  params.doctorCode = code;
  return ["s.SRV_BY1 = @doctorCode"];
}

/** Normalize MSSQL-bound patient codes as strings (ASCII trim only — preserves leading zeros). */
function normalizePatientCodeFilter(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function patientWhere(
  patientCode: string | undefined,
  params: Record<string, unknown>,
): string[] {
  const code = normalizePatientCodeFilter(patientCode);
  if (!code) {
    return [];
  }

  params.patientCode = code;
  return [
    "RTRIM(LTRIM(CONVERT(VARCHAR(40), h.PAT_CD))) = RTRIM(LTRIM(CONVERT(VARCHAR(40), @patientCode)))",
  ];
}

function patientNameWhere(
  patientName: string | undefined,
  params: Record<string, unknown>,
): string[] {
  const name = patientName?.trim();
  if (!name) {
    return [];
  }

  params.patientName = `%${name}%`;
  return ["h.NAM LIKE @patientName"];
}

function shiftWhere(
  shiftCode: string | undefined,
  params: Record<string, unknown>,
): string[] {
  if (!shiftCode) {
    return [];
  }

  params.shiftCode = shiftCode;
  return ["h.SHFT = @shiftCode"];
}

function serviceWhere(
  serviceCode: string | undefined,
  params: Record<string, unknown>,
): string[] {
  if (!serviceCode) {
    return [];
  }

  params.serviceCode = serviceCode;
  return ["s.SRV_CD = @serviceCode"];
}

function topClause(limit: number | undefined, params: Record<string, unknown>): string {
  if (!limit) {
    return "";
  }

  params.limit = limit;
  return "TOP (@limit) ";
}

function joinedTables(): string {
  return `FROM PAJRNRCVH h
JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO`;
}

/** Patient ledger: include receipt headers even when no matching PAPAT_SRV rows (MSSQL-only / header-only). */
function patientLasikSummaryTables(): string {
  return `FROM PAJRNRCVH h
LEFT JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO`;
}

/**
 * Receipts inquiry only: when the caller filters by `patientCode`, use LEFT JOIN so
 * header-only receipts (PAJRNRCVH rows with no PAPAT_SRV lines) remain visible.
 * All service/revenue builders keep INNER JOIN via {@link joinedTables}.
 */
function receiptsInquiryTables(patientFiltered: boolean): string {
  if (patientFiltered) {
    return `FROM PAJRNRCVH h
LEFT JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO`;
  }
  return joinedTables();
}

function andWhere(where: string[]): string {
  return where.length > 0 ? `WHERE ${where.join("\n  AND ")}` : "";
}

export function buildDashboardSummarySql(
  input: DashboardSummarySqlInput = {},
): SqlBuild {
  const params = cleanParams({
    secCd: input.sectionCode ?? LASIK_SECTION_CODE,
  });

  const sql = `
WITH base_rows AS (
  SELECT
    h.TR_TY,
    h.TR_NO,
    h.TR_DT,
    ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS gross_value
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
  END) AS totalRevenueThisMonth
FROM base_rows`.trim();

  return { sql, params };
}

export function buildDailyRevenueSql(input: DailyRevenueSqlInput): SqlBuild {
  const params: Record<string, unknown> = {};
  const where = [
    ...dateRangeWhere(input, params),
    ...sectionWhere(input.sectionCode, params),
    ...doctorWhere(input.doctorCode, params),
    ...shiftWhere(input.shiftCode, params),
    "ISNULL(h.CNCL, 0) = 0",
    "ISNULL(s.CNCL, 0) = 0",
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

export function buildServiceRevenueSql(input: ServiceRevenueSqlInput): SqlBuild {
  const params: Record<string, unknown> = {};
  const where = [
    ...dateRangeWhere(input, params),
    ...sectionWhere(input.sectionCode, params),
    ...doctorWhere(input.doctorCode, params),
    ...serviceWhere(input.serviceCode, params),
    "ISNULL(s.CNCL, 0) = 0",
    "ISNULL(h.CNCL, 0) = 0",
  ];

  const sql = `
SELECT
  h.SEC_CD AS sectionCode,
  h.SEC_CD AS sectionName, -- Placeholder for now, can join DEPT if needed
  ISNULL(s.SRV_CD, '') AS serviceCode,
  ISNULL(c.SRV_NM_AR, '') AS serviceName,
  h.TR_NO AS trNo,
  h.TR_DT AS trDate,
  RTRIM(LTRIM(CONVERT(VARCHAR(40), h.PAT_CD))) AS patientCode,
  h.NAM AS patientName,
  ISNULL(s.QTY, 0) AS quantity,
  ISNULL(s.PRC, 0) AS price,
  ISNULL(s.PA_VL, 0) AS patientShare,
  ISNULL(s.DISC_VL, 0) AS discount,
  ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS lineGross,
  ISNULL(s.CA_VL, 0) AS companyValue
FROM PAJRNRCVH h
JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO
LEFT JOIN SRVCMF c
  ON c.SRV_CD = s.SRV_CD
${andWhere(where)}
ORDER BY
  h.SEC_CD,
  ISNULL(s.SRV_CD, ''),
  h.TR_DT,
  h.TR_NO`.trim();

  return { sql, params: cleanParams(params) };
}

export function buildReceiptsInquirySql(input: ReceiptsInquirySqlInput): SqlBuild {
  const params: Record<string, unknown> = {};
  const patientFiltered =
    typeof input.patientCode === "string" && input.patientCode.trim().length > 0;
  const where = [
    ...dateRangeWhere(input, params),
    ...sectionWhere(input.sectionCode, params),
    ...patientWhere(input.patientCode, params),
    ...doctorWhere(input.doctorCode, params),
    "ISNULL(h.CNCL, 0) = 0",
  ];

  const trNoTrimmed =
    typeof input.trNo === "string"
      ? input.trNo.trim()
      : input.trNo != null
        ? String(input.trNo).trim()
        : "";
  if (trNoTrimmed !== "") {
    where.push(
      "RTRIM(LTRIM(CONVERT(VARCHAR(40), h.TR_NO))) = RTRIM(LTRIM(CONVERT(VARCHAR(40), @trNo)))",
    );
    params.trNo = trNoTrimmed;
  }

  if (input.trTy !== undefined && Number.isFinite(input.trTy)) {
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
  RTRIM(LTRIM(CONVERT(VARCHAR(40), h.PAT_CD))) AS patientCode,
  h.NAM AS patientName,
  h.TOTL AS totalValue,
  h.DISC AS discountValue,
  h.PA_VL AS paidValue,
  h.ENTEREDBY AS enteredBy
${receiptsInquiryTables(patientFiltered)}
${andWhere(where)}
ORDER BY h.TR_DT DESC, h.TR_NO DESC`.trim();

  return { sql, params: cleanParams(params) };
}

export function buildReceiptDetailSql(input: ReceiptDetailSqlInput): SqlBuild {
  const params = cleanParams({
    secCd: input.sectionCode,
    trTy: input.trTy,
    trNo: input.trNo,
  });

  const sql = `
SELECT
  1 AS grp,
  h.SEC_CD AS secCd,
  RTRIM(LTRIM(CONVERT(VARCHAR(40), h.PAT_CD))) AS patientCode,
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

export function buildLasikReceiptsSql(input: LasikReceiptsSqlInput): SqlBuild {
  return buildReceiptsInquirySql({
    ...input,
    sectionCode: LASIK_SECTION_CODE,
  });
}

export function buildLasikServicesSql(input: LasikServicesSqlInput = {}): SqlBuild {
  const params: Record<string, unknown> = { secCd: LASIK_SECTION_CODE };
  const where = [
    ...dateRangeWhere(input, params),
    "s.SEC_CD = @secCd",
    ...patientWhere(input.patientCode, params),
    ...doctorWhere(input.doctorCode, params),
    ...serviceWhere(input.serviceCode, params),
    "s.CNCL IS NULL",
  ];

  const top = topClause(input.limit, params);
  const sql = `
SELECT ${top}
  RTRIM(LTRIM(CONVERT(VARCHAR(40), s.PAT_CD))) AS patientCode,
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
FROM PAPAT_SRV s
JOIN PAJRNRCVH h
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO
LEFT JOIN SRVCMF c
  ON c.SRV_CD = s.SRV_CD
${andWhere(where)}
ORDER BY h.TR_DT DESC, s.TR_NO DESC, s.SRV_CD`.trim();

  return { sql, params: cleanParams(params) };
}

export function buildLasikRevenueSummarySql(
  input: LasikRevenueSummarySqlInput = {},
): SqlBuild {
  const params: Record<string, unknown> = {};
  const where = [
    ...dateRangeWhere(input, params),
    ...sectionWhere(LASIK_SECTION_CODE, params),
    ...doctorWhere(input.doctorCode, params),
    "ISNULL(s.SRV_BY1, '') <> ''",
    "s.CNCL IS NULL",
  ];

  const sql = `
SELECT
  COUNT_BIG(*) AS [row_count],
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

export function buildPatientLasikSummarySql(
  input: PatientLasikSummarySqlInput,
): SqlBuild {
  const params: Record<string, unknown> = {};
  const where = [
    ...dateRangeWhere(input, params),
    ...sectionWhere(input.sectionCode, params),
    ...patientWhere(input.patientCode, params),
    ...patientNameWhere(input.patientName, params),
    "h.CNCL IS NULL",
    "(s.SRV_CD IS NULL OR s.CNCL IS NULL)",
  ];

  const sql = `
SELECT
  h.SEC_CD AS secCd,
  h.TR_TY AS trTy,
  h.TR_NO AS trNo,
  h.TR_DT AS trDate,
  RTRIM(LTRIM(CONVERT(VARCHAR(40), h.PAT_CD))) AS patientCode,
  h.NAM AS patientName,
  h.TOTL AS receiptTotal,
  h.DISC AS receiptDiscount,
  h.PA_VL AS receiptPaid,
  s.SRV_CD AS serviceCode,
  c.SRV_NM_AR AS serviceName,
  s.QTY AS quantity,
  s.PRC AS price,
  s.DISC_VL AS lineDiscount,
  s.PA_VL AS linePaid,
  s.CA_VL AS companyValue,
  s.SRV_BY1 AS doctorCode,
  s.CUR_SRV_BY AS currentDoctorCode,
  ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0) AS lineGross
${patientLasikSummaryTables()}
LEFT JOIN SRVCMF c
  ON c.SRV_CD = s.SRV_CD
${andWhere(where)}
ORDER BY h.TR_DT DESC, h.TR_NO DESC, s.SRV_CD`.trim();

  return { sql, params: cleanParams(params) };
}
