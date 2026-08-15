import { eq, or } from "drizzle-orm";
import { getDb } from "../../db";
import { salaryConfig } from "../../../drizzle/schema";
import { mssqlQuery } from "../accounting/mssqlAccounting";
import {
  XRAY_1502_PRICE_FALLBACK,
  XRAY_1600_PRICE_FALLBACK,
  XRAY_REMAINING_PRICE_FALLBACK,
  calcXray1502Pool,
  calcXray1600Pool,
  calcXrayRemainingPool,
} from "./xrayCommission";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// خدمات الكشف تُحسب بسعر الفئة (أخصائي/استشاري) المحدد في صفحة النسب.
// الأسعار ثابتة (قيم احتياطية) ويمكن تعديلها يدويًا من صفحة النسب — لا نعتمد على متوسط PRC
// الفعلي لأن نفس الخدمة ممكن تتسجل كسطر منفصل لكل عين، فيطلع المتوسط لكل عين مش لكل مريض.
const EXAM_SPECIALIST_CODES = ["1501", "1586", "1613"];
const EXAM_SPECIALIST_PRICE_FALLBACK = 215;
const EXAM_CONSULTANT_CODES = ["1522", "1589"];
const EXAM_CONSULTANT_PRICE_FALLBACK = 465;
const EXAM_COMMISSION_PER_UNIT = 75;
const XRAY_1600_CODE = "1600";
const XRAY_1502_CODE = "1502";
const XRAY_REMAINING_CODES = [
  "1572",
  "1590",
  "1615",
  "1616",
  "1524",
  "1562",
];

const EXAM_PRICE_SPECIALIST_CONFIG_KEY = "exam_price_specialist";
const EXAM_PRICE_CONSULTANT_CONFIG_KEY = "exam_price_consultant";
const EXAM_COMMISSION_PER_UNIT_CONFIG_KEY = "exam_commission_per_unit";
const EXAM_DOCTOR_PERCENT_CONFIG_KEY = "exam_doctor_percent";
const EXAM_EMPLOYEE_PERCENT_CONFIG_KEY = "exam_employee_percent";
const XRAY_DOCTOR_PERCENT_CONFIG_KEY = "xray_doctor_percent";
const XRAY_EMPLOYEE_PERCENT_CONFIG_KEY = "xray_employee_percent";
const XRAY_PRICE_1600_CONFIG_KEY = "xray_price_1600";
const XRAY_PRICE_REMAINING_CONFIG_KEY = "xray_price_remaining";
const XRAY_PRICE_1502_CONFIG_KEY = "xray_price_1502";
const COMMISSION_CALCULATION_MODE_CONFIG_KEY =
  "commission_calculation_mode_markaz";
export type CommissionCalculationMode = "legacy" | "fixed_percentage";

type ManualPoolField = "examPool" | "pentacamPool" | "pentacamDrPool";

function manualPoolKey(year: number, month: number, field: ManualPoolField): string {
  return `commission_manual_${year}_${String(month).padStart(2, "0")}_${field}`;
}

/** Manual override (salary_config) wins if set; else the hardcoded fallback. */
async function resolveFixedPrice(
  configKey: string,
  fallback: number,
  allowZero = false,
): Promise<number> {
  const db = await getDb();
  if (db) {
    const rows = await db
      .select()
      .from(salaryConfig)
      .where(eq(salaryConfig.key, configKey));
    const manual = Number(rows[0]?.value);
    if (Number.isFinite(manual) && (allowZero ? manual >= 0 : manual > 0)) return manual;
  }
  return fallback;
}

const PRICE_OVERRIDE_KEYS = {
  examSpecialist: EXAM_PRICE_SPECIALIST_CONFIG_KEY,
  examConsultant: EXAM_PRICE_CONSULTANT_CONFIG_KEY,
  examCommissionPerUnit: EXAM_COMMISSION_PER_UNIT_CONFIG_KEY,
  examDoctorPercent: EXAM_DOCTOR_PERCENT_CONFIG_KEY,
  examEmployeePercent: EXAM_EMPLOYEE_PERCENT_CONFIG_KEY,
  xrayDoctorPercent: XRAY_DOCTOR_PERCENT_CONFIG_KEY,
  xrayEmployeePercent: XRAY_EMPLOYEE_PERCENT_CONFIG_KEY,
  xray1600: XRAY_PRICE_1600_CONFIG_KEY,
  xrayRemaining: XRAY_PRICE_REMAINING_CONFIG_KEY,
  xray1502: XRAY_PRICE_1502_CONFIG_KEY,
} as const;

export async function getPriceOverrides(): Promise<
  Record<keyof typeof PRICE_OVERRIDE_KEYS, string | null> & {
    calculationMode: CommissionCalculationMode;
  }
> {
  const db = await getDb();
  const empty = {
    examSpecialist: null,
    examConsultant: null,
    examCommissionPerUnit: null,
    examDoctorPercent: null,
    examEmployeePercent: null,
    xrayDoctorPercent: null,
    xrayEmployeePercent: null,
    xray1600: null,
    xrayRemaining: null,
    xray1502: null,
    calculationMode: "legacy" as CommissionCalculationMode,
  };
  if (!db) return empty;
  const keys = [
    ...Object.values(PRICE_OVERRIDE_KEYS),
    COMMISSION_CALCULATION_MODE_CONFIG_KEY,
  ];
  const rows = await db
    .select()
    .from(salaryConfig)
    .where(or(...keys.map((k) => eq(salaryConfig.key, k))));
  const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  return {
    examSpecialist: map[EXAM_PRICE_SPECIALIST_CONFIG_KEY] ?? null,
    examConsultant: map[EXAM_PRICE_CONSULTANT_CONFIG_KEY] ?? null,
    examCommissionPerUnit: map[EXAM_COMMISSION_PER_UNIT_CONFIG_KEY] ?? null,
    examDoctorPercent: map[EXAM_DOCTOR_PERCENT_CONFIG_KEY] ?? null,
    examEmployeePercent: map[EXAM_EMPLOYEE_PERCENT_CONFIG_KEY] ?? null,
    xrayDoctorPercent: map[XRAY_DOCTOR_PERCENT_CONFIG_KEY] ?? null,
    xrayEmployeePercent: map[XRAY_EMPLOYEE_PERCENT_CONFIG_KEY] ?? null,
    xray1600: map[XRAY_PRICE_1600_CONFIG_KEY] ?? null,
    xrayRemaining: map[XRAY_PRICE_REMAINING_CONFIG_KEY] ?? null,
    xray1502: map[XRAY_PRICE_1502_CONFIG_KEY] ?? null,
    calculationMode:
      map[COMMISSION_CALCULATION_MODE_CONFIG_KEY] === "fixed_percentage"
        ? "fixed_percentage"
        : "legacy",
  };
}

export async function setPriceOverrides(
  input: Partial<Record<keyof typeof PRICE_OVERRIDE_KEYS, number | null>> & {
    calculationMode?: CommissionCalculationMode;
  },
): Promise<{ success: true }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const entries: { key: string; value: string | null }[] = [];
  for (const [field, key] of Object.entries(PRICE_OVERRIDE_KEYS)) {
    const value = (input as any)[field];
    if (value !== undefined) {
      entries.push({ key, value: value != null ? String(value) : null });
    }
  }
  for (const e of entries) {
    if (e.value === null) {
      await db.delete(salaryConfig).where(eq(salaryConfig.key, e.key));
      continue;
    }
    await db
      .insert(salaryConfig)
      .values({ key: e.key, value: e.value })
      .onDuplicateKeyUpdate({ set: { value: e.value } });
  }
  if (input.calculationMode !== undefined) {
    await db
      .insert(salaryConfig)
      .values({
        key: COMMISSION_CALCULATION_MODE_CONFIG_KEY,
        value: input.calculationMode,
      })
      .onDuplicateKeyUpdate({ set: { value: input.calculationMode } });
  }
  return { success: true };
}

function monthRange(year: number, month: number): [string, string] {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return [
    `${year}-${mm}-01`,
    `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  ];
}

interface MarkazRevenueRow {
  examSpecialistRevenue: number | null;
  examConsultantRevenue: number | null;
  xray1600Revenue: number | null;
  xray1502Revenue: number | null;
  xrayRemainingRevenue: number | null;
}

interface MarkazServiceRevenueRow {
  serviceCode: string | number | null;
  serviceName: string | null;
  quantity: number | null;
  revenue: number | null;
}

export interface CommissionIncludedService {
  serviceCode: string;
  serviceName: string;
  group:
    | "كشف أخصائي"
    | "كشف استشاري"
    | "أشعة 1600"
    | "أشعة 1502"
    | "باقي الأشعة";
  quantity: number;
  revenue: number;
}

export interface MarkazAutoPools {
  examPool: number;
  pentacamPool: number; // staff total
  pentacamDrPool: number; // doctor total
  breakdown: {
    examSpecialistRevenue: number;
    examSpecialistPrice: number;
    examSpecialistCount: number;
    examSpecialistPool: number;
    examConsultantRevenue: number;
    examConsultantPrice: number;
    examConsultantCount: number;
    examConsultantPool: number;
    examCommissionPerUnit: number;
    examDoctorPercent: number;
    examEmployeePercent: number;
    xrayDoctorPercent: number;
    xrayEmployeePercent: number;
    xray1600Revenue: number;
    xray1600Price: number;
    xray1600Pool: number;
    xray1502Revenue: number;
    xray1502Price: number;
    xray1502Pool: number;
    xrayRemainingRevenue: number;
    xrayRemainingPrice: number;
    xrayRemainingPool: number;
    includedServices: {
      exam: CommissionIncludedService[];
      xray: CommissionIncludedService[];
    };
  };
}

export interface MarkazEffectivePools extends MarkazAutoPools {
  source: "automatic" | "manual";
  automatic: Pick<MarkazAutoPools, "examPool" | "pentacamPool" | "pentacamDrPool">;
  manualOverrides: Record<ManualPoolField, number | null>;
}

export async function getMarkazManualPoolOverrides(
  year: number,
  month: number,
): Promise<Record<ManualPoolField, number | null>> {
  const db = await getDb();
  const empty = { examPool: null, pentacamPool: null, pentacamDrPool: null };
  if (!db) return empty;
  const fields: ManualPoolField[] = ["examPool", "pentacamPool", "pentacamDrPool"];
  const keys = fields.map((field) => manualPoolKey(year, month, field));
  const rows = await db
    .select()
    .from(salaryConfig)
    .where(or(...keys.map((key) => eq(salaryConfig.key, key))));
  const values = new Map(
    rows.map((row: { key: string; value: string }) => [row.key, Number(row.value)]),
  );
  return Object.fromEntries(
    fields.map((field) => {
      const value = values.get(manualPoolKey(year, month, field));
      return [field, Number.isFinite(value) ? value : null];
    }),
  ) as Record<ManualPoolField, number | null>;
}

export async function setMarkazManualPoolOverrides(
  year: number,
  month: number,
  values: Record<ManualPoolField, number | null>,
): Promise<{ success: true }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  for (const field of Object.keys(values) as ManualPoolField[]) {
    const key = manualPoolKey(year, month, field);
    const value = values[field];
    if (value === null) {
      await db.delete(salaryConfig).where(eq(salaryConfig.key, key));
      continue;
    }
    const normalized = String(round2(value));
    await db
      .insert(salaryConfig)
      .values({ key, value: normalized })
      .onDuplicateKeyUpdate({ set: { value: normalized } });
  }
  return { success: true };
}

export async function computeMarkazAutoPools(
  year: number,
  month: number,
): Promise<MarkazAutoPools> {
  const [fromDate, toDate] = monthRange(year, month);

  const inList = (codes: string[]) =>
    codes.map((c) => `'${c}'`).join(",");

  const sqlText = `
    SELECT
      SUM(CASE WHEN s.SRV_CD IN (${inList(EXAM_SPECIALIST_CODES)})
        THEN ISNULL(s.QTY,0) * ISNULL(s.PRC,0) - ISNULL(s.DISC_VL,0) ELSE 0 END) AS examSpecialistRevenue,
      SUM(CASE WHEN s.SRV_CD IN (${inList(EXAM_CONSULTANT_CODES)})
        THEN ISNULL(s.QTY,0) * ISNULL(s.PRC,0) - ISNULL(s.DISC_VL,0) ELSE 0 END) AS examConsultantRevenue,
      SUM(CASE WHEN s.SRV_CD = @xray1600Code
        THEN ISNULL(s.QTY,0) * ISNULL(s.PRC,0) - ISNULL(s.DISC_VL,0) ELSE 0 END) AS xray1600Revenue,
      SUM(CASE WHEN s.SRV_CD = @xray1502Code
        THEN ISNULL(s.QTY,0) * ISNULL(s.PRC,0) - ISNULL(s.DISC_VL,0) ELSE 0 END) AS xray1502Revenue,
      SUM(CASE WHEN s.SRV_CD IN (${inList(XRAY_REMAINING_CODES)})
        THEN ISNULL(s.QTY,0) * ISNULL(s.PRC,0) - ISNULL(s.DISC_VL,0) ELSE 0 END) AS xrayRemainingRevenue
    FROM op2026.dbo.PAJRNRCVH h
    JOIN op2026.dbo.PAPAT_SRV s
      ON h.SEC_CD = s.SEC_CD AND h.TR_TY = s.TR_TY AND h.TR_NO = s.TR_NO
    WHERE h.TR_DT >= @fromDate AND h.TR_DT < DATEADD(day, 1, @toDate)
      AND ISNULL(CONVERT(varchar(10), h.CNCL), '0') IN ('', '0')
      AND ISNULL(CONVERT(varchar(10), s.CNCL), '0') IN ('', '0')
  `;

  const includedCodes = [
    ...EXAM_SPECIALIST_CODES,
    ...EXAM_CONSULTANT_CODES,
    XRAY_1600_CODE,
    XRAY_1502_CODE,
    ...XRAY_REMAINING_CODES,
  ];
  const serviceDetailsSql = `
    SELECT
      s.SRV_CD AS serviceCode,
      MAX(NULLIF(LTRIM(RTRIM(c.SRV_NM_AR)), '')) AS serviceName,
      SUM(ISNULL(s.QTY, 0)) AS quantity,
      SUM(ISNULL(s.QTY,0) * ISNULL(s.PRC,0) - ISNULL(s.DISC_VL,0)) AS revenue
    FROM op2026.dbo.PAJRNRCVH h
    JOIN op2026.dbo.PAPAT_SRV s
      ON h.SEC_CD = s.SEC_CD AND h.TR_TY = s.TR_TY AND h.TR_NO = s.TR_NO
    LEFT JOIN op2026.dbo.SRVCMF c
      ON c.SRV_CD = s.SRV_CD
    WHERE h.TR_DT >= @fromDate AND h.TR_DT < DATEADD(day, 1, @toDate)
      AND ISNULL(CONVERT(varchar(10), h.CNCL), '0') IN ('', '0')
      AND ISNULL(CONVERT(varchar(10), s.CNCL), '0') IN ('', '0')
      AND s.SRV_CD IN (${inList(includedCodes)})
    GROUP BY s.SRV_CD
    ORDER BY s.SRV_CD
  `;

  const [rows, serviceRows] = await Promise.all([
    mssqlQuery<MarkazRevenueRow>(
      sqlText,
      {
        fromDate,
        toDate,
        xray1600Code: XRAY_1600_CODE,
        xray1502Code: XRAY_1502_CODE,
      },
      "computeMarkazAutoPools",
    ),
    mssqlQuery<MarkazServiceRevenueRow>(
      serviceDetailsSql,
      { fromDate, toDate },
      "computeMarkazIncludedServices",
    ),
  ]);

  const row = rows[0] ?? {
    examSpecialistRevenue: 0,
    examConsultantRevenue: 0,
    xray1600Revenue: 0,
    xray1502Revenue: 0,
    xrayRemainingRevenue: 0,
  };

  const examSpecialistRevenue = Number(row.examSpecialistRevenue ?? 0);
  const examConsultantRevenue = Number(row.examConsultantRevenue ?? 0);
  const xray1600Revenue = Number(row.xray1600Revenue ?? 0);
  const xray1502Revenue = Number(row.xray1502Revenue ?? 0);
  const xrayRemainingRevenue = Number(row.xrayRemainingRevenue ?? 0);

  const specialistCodes = new Set(EXAM_SPECIALIST_CODES);
  const consultantCodes = new Set(EXAM_CONSULTANT_CODES);
  const remainingXrayCodes = new Set(XRAY_REMAINING_CODES);
  const includedServices = serviceRows
    .map((service): CommissionIncludedService | null => {
      const serviceCode = String(service.serviceCode ?? "").trim();
      if (!serviceCode) return null;
      const group: CommissionIncludedService["group"] = specialistCodes.has(serviceCode)
        ? "كشف أخصائي"
        : consultantCodes.has(serviceCode)
          ? "كشف استشاري"
          : serviceCode === XRAY_1600_CODE
            ? "أشعة 1600"
            : serviceCode === XRAY_1502_CODE
              ? "أشعة 1502"
              : "باقي الأشعة";
      return {
        serviceCode,
        serviceName: String(service.serviceName ?? "").trim() || `خدمة ${serviceCode}`,
        group,
        quantity: Number(service.quantity ?? 0),
        revenue: Number(service.revenue ?? 0),
      };
    })
    .filter((service): service is CommissionIncludedService => service !== null);
  const examIncludedServices = includedServices.filter(
    (service) => specialistCodes.has(service.serviceCode) || consultantCodes.has(service.serviceCode),
  );
  const xrayIncludedServices = includedServices.filter(
    (service) =>
      service.serviceCode === XRAY_1600_CODE ||
      service.serviceCode === XRAY_1502_CODE ||
      remainingXrayCodes.has(service.serviceCode),
  );

  const [
    examSpecialistPrice,
    examConsultantPrice,
    examCommissionPerUnit,
    examDoctorPercent,
    examEmployeePercent,
    xrayDoctorPercent,
    xrayEmployeePercent,
    xray1600Price,
    xrayRemainingPrice,
    xray1502Price,
  ] = await Promise.all([
    resolveFixedPrice(EXAM_PRICE_SPECIALIST_CONFIG_KEY, EXAM_SPECIALIST_PRICE_FALLBACK),
    resolveFixedPrice(EXAM_PRICE_CONSULTANT_CONFIG_KEY, EXAM_CONSULTANT_PRICE_FALLBACK),
    resolveFixedPrice(EXAM_COMMISSION_PER_UNIT_CONFIG_KEY, EXAM_COMMISSION_PER_UNIT),
    resolveFixedPrice(EXAM_DOCTOR_PERCENT_CONFIG_KEY, 60, true),
    resolveFixedPrice(EXAM_EMPLOYEE_PERCENT_CONFIG_KEY, 40, true),
    resolveFixedPrice(XRAY_DOCTOR_PERCENT_CONFIG_KEY, 54.5, true),
    resolveFixedPrice(XRAY_EMPLOYEE_PERCENT_CONFIG_KEY, 45.5, true),
    resolveFixedPrice(XRAY_PRICE_1600_CONFIG_KEY, XRAY_1600_PRICE_FALLBACK),
    resolveFixedPrice(XRAY_PRICE_REMAINING_CONFIG_KEY, XRAY_REMAINING_PRICE_FALLBACK),
    resolveFixedPrice(XRAY_PRICE_1502_CONFIG_KEY, XRAY_1502_PRICE_FALLBACK),
  ]);
  const examSpecialistCount = examSpecialistRevenue / examSpecialistPrice;
  const examConsultantCount = examConsultantRevenue / examConsultantPrice;
  const examSpecialistPool = round2(
    examSpecialistCount * examCommissionPerUnit,
  );
  const examConsultantPool = round2(
    examConsultantCount * examCommissionPerUnit,
  );
  const examPool = round2(examSpecialistPool + examConsultantPool);
  const xray1600Pool = calcXray1600Pool(xray1600Revenue, xray1600Price);
  const xray1502Pool = calcXray1502Pool(xray1502Revenue, xray1502Price);
  const xrayRemainingPool = calcXrayRemainingPool(
    xrayRemainingRevenue,
    xrayRemainingPrice,
  );

  const xrayTotalPool = round2(
    xray1600Pool + xray1502Pool + xrayRemainingPool,
  );
  const pentacamPool = round2(xrayTotalPool * (xrayEmployeePercent / 100));
  const pentacamDrPool = round2(xrayTotalPool * (xrayDoctorPercent / 100));

  return {
    examPool,
    pentacamPool,
    pentacamDrPool,
    breakdown: {
      examSpecialistRevenue,
      examSpecialistPrice,
      examSpecialistCount,
      examSpecialistPool,
      examConsultantRevenue,
      examConsultantPrice,
      examConsultantCount,
      examConsultantPool,
      examCommissionPerUnit,
      examDoctorPercent,
      examEmployeePercent,
      xrayDoctorPercent,
      xrayEmployeePercent,
      xray1600Revenue,
      xray1600Price,
      xray1600Pool,
      xray1502Revenue,
      xray1502Price,
      xray1502Pool,
      xrayRemainingRevenue,
      xrayRemainingPrice,
      xrayRemainingPool,
      includedServices: {
        exam: examIncludedServices,
        xray: xrayIncludedServices,
      },
    },
  };
}

export async function computeMarkazEffectivePools(
  year: number,
  month: number,
): Promise<MarkazEffectivePools> {
  const [automaticPools, manualOverrides] = await Promise.all([
    computeMarkazAutoPools(year, month),
    getMarkazManualPoolOverrides(year, month),
  ]);
  const automatic = {
    examPool: automaticPools.examPool,
    pentacamPool: automaticPools.pentacamPool,
    pentacamDrPool: automaticPools.pentacamDrPool,
  };
  const source = Object.values(manualOverrides).some((value) => value !== null)
    ? "manual"
    : "automatic";
  return {
    ...automaticPools,
    examPool: manualOverrides.examPool ?? automatic.examPool,
    pentacamPool: manualOverrides.pentacamPool ?? automatic.pentacamPool,
    pentacamDrPool: manualOverrides.pentacamDrPool ?? automatic.pentacamDrPool,
    source,
    automatic,
    manualOverrides,
  };
}
