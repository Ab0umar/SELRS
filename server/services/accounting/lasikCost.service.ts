import { sql } from "drizzle-orm";
import type {
  LasikCostSummaryInput,
  LasikCostSummaryOutput,
} from "../../../shared/accounting/contracts";
import { getDb } from "../../db";
import { mssqlQuery } from "./mssqlAccounting";

type MssqlCostRow = {
  serviceRows?: number | string | null;
  operationCount?: number | string | null;
  totalGross?: number | string | null;
  totalDiscount?: number | string | null;
  totalPaid?: number | string | null;
};

const LASIK_SECTION_CODE = 15;
const DEFAULT_LASIK_DATA_START_DATE = "2026-01-01";

function lasikDataStartDate(): string {
  const configured = process.env.LASIK_COST_DATA_START_DATE?.trim();
  return configured && /^\d{4}-\d{2}-\d{2}$/.test(configured)
    ? configured
    : DEFAULT_LASIK_DATA_START_DATE;
}

function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function getLasikRevenueForCost(input: LasikCostSummaryInput) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [mappedCodesRes] = (await db.execute(
    sql.raw(
      `
SELECT code AS serviceCode
FROM services
WHERE isActive = 1
  AND code IS NOT NULL
  AND code <> ''
  AND (
    category = 'operations'
    OR category = 'عمليات'
    OR serviceType IN ('surgery_center', 'surgery_external', 'surgery')
  )
UNION
SELECT serviceCode
FROM serviceCodeOpTypeMap
WHERE NOT EXISTS (
  SELECT 1
  FROM services
  WHERE isActive = 1
    AND code IS NOT NULL
    AND code <> ''
    AND (
      category = 'operations'
      OR category = 'عمليات'
      OR serviceType IN ('surgery_center', 'surgery_external', 'surgery')
    )
)
  AND serviceCode IS NOT NULL
  AND serviceCode <> ''
      `.trim(),
    ),
  )) as any;
  const operationServiceCodes = ((mappedCodesRes as any[]) ?? [])
    .map((row: any) => String(row.serviceCode ?? "").trim())
    .filter(Boolean);

  const operationCodeParams = operationServiceCodes.reduce<
    Record<string, unknown>
  >((acc, code, index) => {
    acc[`opCode${index}`] = code;
    return acc;
  }, {});
  const operationCodeFilter = operationServiceCodes.length
    ? `s.SRV_CD IN (${operationServiceCodes
        .map((_, index) => `@opCode${index}`)
        .join(", ")})`
    : "1 = 0";

  const rows = await mssqlQuery<MssqlCostRow>(
    `
SELECT
  COUNT_BIG(CASE
    WHEN ${operationCodeFilter}
    THEN 1
  END) AS serviceRows,
  COUNT(DISTINCT CASE
    WHEN ${operationCodeFilter}
    THEN CONCAT(h.TR_TY, ':', h.TR_NO)
  END) AS operationCount,
  SUM(ISNULL(s.QTY, 0) * ISNULL(s.PRC, 0)) AS totalGross,
  SUM(ISNULL(s.DISC_VL, 0)) AS totalDiscount,
  SUM(ISNULL(s.PA_VL, 0)) AS totalPaid
FROM PAJRNRCVH h
JOIN PAPAT_SRV s
  ON h.SEC_CD = s.SEC_CD
 AND h.TR_TY = s.TR_TY
 AND h.TR_NO = s.TR_NO
WHERE h.SEC_CD = @secCd
  AND h.TR_DT >= @fromDate
  AND h.TR_DT < DATEADD(day, 1, @toDate)
  AND ISNULL(CONVERT(varchar(10), h.CNCL), '0') IN ('', '0')
  AND ISNULL(CONVERT(varchar(10), s.CNCL), '0') IN ('', '0')
  AND ISNULL(s.SRV_BY1, '') <> ''
    `.trim(),
    {
      secCd: LASIK_SECTION_CODE,
      fromDate: input.fromDate,
      toDate: input.toDate,
      ...operationCodeParams,
    },
  );

  const row = rows[0] ?? {};
  const totalGross = numberValue(row.totalGross);
  const totalDiscount = numberValue(row.totalDiscount);
  return {
    totalGross,
    totalDiscount,
    netAfterDiscount: totalGross - totalDiscount,
    totalPaid: numberValue(row.totalPaid),
    serviceRows: Math.trunc(numberValue(row.serviceRows)),
    operationCount: Math.trunc(numberValue(row.operationCount)),
  };
}

function excludedLedgerWhere(): string {
  const textRules = [
    "سلف",
    "سلفة",
    "انستا",
    "insta",
    "د السعدني",
    "د. السعدني",
    "دالسعدني",
    "السعدني",
    "سعدني",
    "غرابه",
    "البيت",
    "العيادة",
    "العياده",
    "الدكتورة",
    "الدكتوره",
    "ابو عمر",
    "أبو عمر",
    "ابوعمر",
    "أبوعمر",
    "ابو يوسف",
    "أبو يوسف",
    "ابويوسف",
    "أبويوسف",
    "البنات",
  ];
  const noteExpr = "LOWER(COALESCE(l.notes, ''))";
  const textSql = textRules
    .map(
      (word) => `${noteExpr} LIKE '%${escapeSqlLiteral(word.toLowerCase())}%'`,
    )
    .join(" OR ");

  return `(
    ${textSql}
    OR EXISTS (
      SELECT 1
      FROM accCategories c
      WHERE c.name IS NOT NULL
        AND c.entity IN ('سلف', 'insta', 'غرابه')
        AND ${noteExpr} LIKE CONCAT('%', LOWER(c.name), '%')
    )
  )`;
}

async function getCashbookExpensesForCost(input: LasikCostSummaryInput) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const excluded = excludedLedgerWhere();
  const [rowsRes] = (await db.execute(
    sql.raw(
      `
SELECT
  COALESCE(SUM(CASE WHEN NOT ${excluded} THEN COALESCE(l.expense, 0) ELSE 0 END), 0) AS cashbookExpense,
  COALESCE(SUM(CASE WHEN ${excluded} THEN COALESCE(l.expense, 0) ELSE 0 END), 0) AS excludedExpense,
  SUM(CASE WHEN NOT ${excluded} AND COALESCE(l.expense, 0) > 0 THEN 1 ELSE 0 END) AS includedRows,
  SUM(CASE WHEN ${excluded} AND COALESCE(l.expense, 0) > 0 THEN 1 ELSE 0 END) AS excludedRows
FROM accLedger l
WHERE l.txDate >= '${escapeSqlLiteral(input.fromDate)}'
  AND l.txDate <= '${escapeSqlLiteral(input.toDate)}'
  AND COALESCE(l.expense, 0) > 0
      `.trim(),
    ),
  )) as any;

  const row = ((rowsRes as any[])[0] ?? {}) as Record<string, unknown>;
  return {
    cashbookExpense: numberValue(row.cashbookExpense),
    excludedExpense: numberValue(row.excludedExpense),
    includedRows: Math.trunc(numberValue(row.includedRows)),
    excludedRows: Math.trunc(numberValue(row.excludedRows)),
  };
}

async function getCurrentStockValueForCost() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [rowsRes] = (await db.execute(
    sql.raw(
      `
SELECT
  COALESCE(SUM(COALESCE(i.quantity, 0) * COALESCE(p.lastUnitPrice, 0)), 0) AS stockValue,
  SUM(CASE WHEN COALESCE(i.quantity, 0) > 0 THEN 1 ELSE 0 END) AS itemCount,
  SUM(CASE WHEN COALESCE(i.quantity, 0) > 0 AND COALESCE(p.lastUnitPrice, 0) = 0 THEN 1 ELSE 0 END) AS unpricedItemCount
FROM stock_items i
LEFT JOIN (
  SELECT itemId, unitPrice AS lastUnitPrice
  FROM (
    SELECT
      itemId,
      CAST(unitPrice AS DECIMAL(15, 2)) AS unitPrice,
      ROW_NUMBER() OVER (
        PARTITION BY itemId
        ORDER BY COALESCE(transactionDate, createdAt) DESC, id DESC
      ) AS rn
    FROM stock_transactions
    WHERE type = 'add'
      AND unitPrice IS NOT NULL
      AND CAST(unitPrice AS DECIMAL(15, 2)) > 0
  ) priced
  WHERE rn = 1
) p ON p.itemId = i.id
      `.trim(),
    ),
  )) as any;

  const row = ((rowsRes as any[])[0] ?? {}) as Record<string, unknown>;
  return {
    stockValue: numberValue(row.stockValue),
    itemCount: Math.trunc(numberValue(row.itemCount)),
    unpricedItemCount: Math.trunc(numberValue(row.unpricedItemCount)),
  };
}

export async function getLasikCostSummary(
  input: LasikCostSummaryInput,
): Promise<LasikCostSummaryOutput> {
  const effectiveInput = {
    ...input,
    fromDate:
      input.fromDate < lasikDataStartDate()
        ? lasikDataStartDate()
        : input.fromDate,
  };
  const [revenue, expenses, stock] = await Promise.all([
    getLasikRevenueForCost(effectiveInput),
    getCashbookExpensesForCost(effectiveInput),
    getCurrentStockValueForCost(),
  ]);

  const totalCost = expenses.cashbookExpense - stock.stockValue;
  const operationCount = revenue.operationCount;
  const costPerOperation = operationCount > 0 ? totalCost / operationCount : 0;
  const profitOnPaid = revenue.totalPaid - totalCost;
  const profitPerOperation =
    operationCount > 0 ? profitOnPaid / operationCount : 0;

  return {
    period: input.period,
    fromDate: effectiveInput.fromDate,
    toDate: input.toDate,
    revenue,
    expenses,
    stock,
    cost: {
      totalCost,
      costPerOperation,
      profitOnPaid,
      profitPerOperation,
    },
  };
}
