import { eq, or } from "drizzle-orm";
import { getDb } from "../../db";
import { salaryConfig } from "../../../drizzle/schema";
import { mssqlQuery } from "../accounting/mssqlAccounting";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// أخصائي: 1586 — استشاري: 1589
// الأسعار ثابتة (قيم احتياطية) ويمكن تعديلها يدويًا من صفحة النسب — لا نعتمد على متوسط PRC
// الفعلي لأن نفس الخدمة ممكن تتسجل كسطر منفصل لكل عين، فيطلع المتوسط لكل عين مش لكل مريض.
const EXAM_SPECIALIST_CODES = ["1586"];
const EXAM_SPECIALIST_PRICE_FALLBACK = 215;
const EXAM_CONSULTANT_CODES = ["1589"];
const EXAM_CONSULTANT_PRICE_FALLBACK = 465;
const EXAM_COMMISSION_PER_UNIT = 50;
const XRAY_1600_CODE = "1600";
const XRAY_1502_CODE = "1502";
const XRAY_REMAINING_CODES = [
  "1571",
  "1572",
  "1590",
  "1601",
  "1614",
  "1615",
  "1616",
  "1524",
  "1562",
];

const EXAM_PRICE_SPECIALIST_CONFIG_KEY = "exam_price_specialist";
const EXAM_PRICE_CONSULTANT_CONFIG_KEY = "exam_price_consultant";
const XRAY_PRICE_1600_CONFIG_KEY = "xray_price_1600";
const XRAY_PRICE_REMAINING_CONFIG_KEY = "xray_price_remaining";
const XRAY_PRICE_1502_CONFIG_KEY = "xray_price_1502";
const XRAY_1600_PRICE_FALLBACK = 460;
const XRAY_REMAINING_PRICE_FALLBACK = 350;
const XRAY_1502_PRICE_FALLBACK = 200;
const XRAY_1502_DEDUCTION = 55; // 55/200 = 27.5% at baseline price — price changes now flow through automatically

type ManualPoolField = "examPool" | "pentacamPool" | "pentacamDrPool";

function manualPoolKey(year: number, month: number, field: ManualPoolField): string {
  return `commission_manual_${year}_${String(month).padStart(2, "0")}_${field}`;
}

/** Manual override (salary_config) wins if set; else the hardcoded fallback. */
async function resolveFixedPrice(configKey: string, fallback: number): Promise<number> {
  const db = await getDb();
  if (db) {
    const rows = await db
      .select()
      .from(salaryConfig)
      .where(eq(salaryConfig.key, configKey));
    const manual = Number(rows[0]?.value);
    if (Number.isFinite(manual) && manual > 0) return manual;
  }
  return fallback;
}

const PRICE_OVERRIDE_KEYS = {
  examSpecialist: EXAM_PRICE_SPECIALIST_CONFIG_KEY,
  examConsultant: EXAM_PRICE_CONSULTANT_CONFIG_KEY,
  xray1600: XRAY_PRICE_1600_CONFIG_KEY,
  xrayRemaining: XRAY_PRICE_REMAINING_CONFIG_KEY,
  xray1502: XRAY_PRICE_1502_CONFIG_KEY,
} as const;

export async function getPriceOverrides(): Promise<
  Record<keyof typeof PRICE_OVERRIDE_KEYS, string | null>
> {
  const db = await getDb();
  const empty = {
    examSpecialist: null,
    examConsultant: null,
    xray1600: null,
    xrayRemaining: null,
    xray1502: null,
  };
  if (!db) return empty;
  const keys = Object.values(PRICE_OVERRIDE_KEYS);
  const rows = await db
    .select()
    .from(salaryConfig)
    .where(or(...keys.map((k) => eq(salaryConfig.key, k))));
  const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  return {
    examSpecialist: map[EXAM_PRICE_SPECIALIST_CONFIG_KEY] ?? null,
    examConsultant: map[EXAM_PRICE_CONSULTANT_CONFIG_KEY] ?? null,
    xray1600: map[XRAY_PRICE_1600_CONFIG_KEY] ?? null,
    xrayRemaining: map[XRAY_PRICE_REMAINING_CONFIG_KEY] ?? null,
    xray1502: map[XRAY_PRICE_1502_CONFIG_KEY] ?? null,
  };
}

export async function setPriceOverrides(
  input: Partial<Record<keyof typeof PRICE_OVERRIDE_KEYS, number | null>>,
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
    await db
      .insert(salaryConfig)
      .values(e as any)
      .onDuplicateKeyUpdate({ set: { value: e.value as any } });
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

export interface MarkazAutoPools {
  examPool: number;
  pentacamPool: number; // staff total
  pentacamDrPool: number; // doctor total
  breakdown: {
    examSpecialistRevenue: number;
    examSpecialistPrice: number;
    examSpecialistPool: number;
    examConsultantRevenue: number;
    examConsultantPrice: number;
    examConsultantPool: number;
    xray1600Revenue: number;
    xray1600Price: number;
    xray1600Pool: number;
    xray1502Revenue: number;
    xray1502Price: number;
    xray1502Pool: number;
    xrayRemainingRevenue: number;
    xrayRemainingPrice: number;
    xrayRemainingPool: number;
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

  const rows = await mssqlQuery<MarkazRevenueRow>(
    sqlText,
    {
      fromDate,
      toDate,
      xray1600Code: XRAY_1600_CODE,
      xray1502Code: XRAY_1502_CODE,
    },
    "computeMarkazAutoPools",
  );

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

  const [
    examSpecialistPrice,
    examConsultantPrice,
    xray1600Price,
    xrayRemainingPrice,
    xray1502Price,
  ] = await Promise.all([
    resolveFixedPrice(EXAM_PRICE_SPECIALIST_CONFIG_KEY, EXAM_SPECIALIST_PRICE_FALLBACK),
    resolveFixedPrice(EXAM_PRICE_CONSULTANT_CONFIG_KEY, EXAM_CONSULTANT_PRICE_FALLBACK),
    resolveFixedPrice(XRAY_PRICE_1600_CONFIG_KEY, XRAY_1600_PRICE_FALLBACK),
    resolveFixedPrice(XRAY_PRICE_REMAINING_CONFIG_KEY, XRAY_REMAINING_PRICE_FALLBACK),
    resolveFixedPrice(XRAY_PRICE_1502_CONFIG_KEY, XRAY_1502_PRICE_FALLBACK),
  ]);

  const examSpecialistPool = round2(
    (examSpecialistRevenue / examSpecialistPrice) * EXAM_COMMISSION_PER_UNIT,
  );
  const examConsultantPool = round2(
    (examConsultantRevenue / examConsultantPrice) * EXAM_COMMISSION_PER_UNIT,
  );
  const examPool = round2(examSpecialistPool + examConsultantPool);
  const xray1600Pool = round2((xray1600Revenue / xray1600Price) * 110);
  const xray1502Pool = round2((xray1502Revenue / xray1502Price) * XRAY_1502_DEDUCTION);
  const xrayRemainingPool = round2((xrayRemainingRevenue / xrayRemainingPrice) * 85);

  const pentacamPool = round2(
    xray1600Pool * 0.455 + xray1502Pool * 0.455 + xrayRemainingPool * 0.47,
  );
  const pentacamDrPool = round2(
    xray1600Pool * 0.545 + xray1502Pool * 0.545 + xrayRemainingPool * 0.53,
  );

  return {
    examPool,
    pentacamPool,
    pentacamDrPool,
    breakdown: {
      examSpecialistRevenue,
      examSpecialistPrice,
      examSpecialistPool,
      examConsultantRevenue,
      examConsultantPrice,
      examConsultantPool,
      xray1600Revenue,
      xray1600Price,
      xray1600Pool,
      xray1502Revenue,
      xray1502Price,
      xray1502Pool,
      xrayRemainingRevenue,
      xrayRemainingPrice,
      xrayRemainingPool,
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
