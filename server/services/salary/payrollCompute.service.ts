import { getDb } from "../../db";
import {
  attendanceEmployees,
  attendanceMonthlyReport,
  attendanceDaily,
  attendanceShifts,
  attendanceLeaves,
  salaryBasics,
  salaryPenalties,
  salaryAdvances,
  salaryCommissionPools,
  salaryPayroll,
  salaryConfig,
  salaryHolidays,
  shiftStaff,
  shiftAttendance,
  salaryMissingCheckoutExclude,
} from "../../../drizzle/schema";
import { eq, and, gte, lte, isNull, or, inArray } from "drizzle-orm";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const PENTACAM_TIERS = [
  { price: 450, deduction: 123.75, empPct: 0.455 },
  { price: 400, deduction: 110, empPct: 0.455 },
  { price: 350, deduction: 85, empPct: 0.47 },
  { price: 250, deduction: 60, empPct: 0.5 },
] as const;

export function calcPentacamPool(
  cases450: number,
  cases400: number,
  cases350: number,
  cases250: number,
): number {
  return round2(
    cases450 * PENTACAM_TIERS[0].deduction * PENTACAM_TIERS[0].empPct +
      cases400 * PENTACAM_TIERS[1].deduction * PENTACAM_TIERS[1].empPct +
      cases350 * PENTACAM_TIERS[2].deduction * PENTACAM_TIERS[2].empPct +
      cases250 * PENTACAM_TIERS[3].deduction * PENTACAM_TIERS[3].empPct,
  );
}

export function calcPentacamDrPool(
  cases450: number,
  cases400: number,
  cases350: number,
  cases250: number,
): number {
  return round2(
    cases450 * PENTACAM_TIERS[0].deduction * (1 - PENTACAM_TIERS[0].empPct) +
      cases400 * PENTACAM_TIERS[1].deduction * (1 - PENTACAM_TIERS[1].empPct) +
      cases350 * PENTACAM_TIERS[2].deduction * (1 - PENTACAM_TIERS[2].empPct) +
      cases250 * PENTACAM_TIERS[3].deduction * (1 - PENTACAM_TIERS[3].empPct),
  );
}

interface AttendanceRates {
  r3: number;
  r5: number;
  r7: number;
  r10: number;
}

function attendanceCommissionRate(
  leaveDays: number,
  rates: AttendanceRates,
): number {
  if (leaveDays <= 3) return rates.r3;
  if (leaveDays <= 5) return rates.r5;
  if (leaveDays <= 7) return rates.r7;
  if (leaveDays <= 10) return rates.r10;
  return 0;
}

async function loadAttendanceRates(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<AttendanceRates> {
  const keys = [
    "attendance_rate_3",
    "attendance_rate_5",
    "attendance_rate_7",
    "attendance_rate_10",
  ];
  const rows = await db!
    .select()
    .from(salaryConfig)
    .where(inArray(salaryConfig.key, keys));
  const map = Object.fromEntries(rows.map((r: any) => [r.key, parseFloat(r.value)]));
  return {
    r3: map["attendance_rate_3"] ?? 0.25,
    r5: map["attendance_rate_5"] ?? 0.15,
    r7: map["attendance_rate_7"] ?? 0.1,
    r10: map["attendance_rate_10"] ?? 0.05,
  };
}

interface LateTier {
  minMin: number;
  maxMin: number | null;
  type?: "linear";
  dayFraction?: number;
}

const DEFAULT_LATE_TIERS: LateTier[] = [
  { minMin: 1, maxMin: 14, type: "linear" },
  { minMin: 15, maxMin: 29, dayFraction: 0.25 },
  { minMin: 30, maxMin: 59, dayFraction: 0.5 },
  { minMin: 60, maxMin: 119, dayFraction: 1 },
  { minMin: 120, maxMin: null, dayFraction: 2 },
];

async function loadLateTiers(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<LateTier[]> {
  const rows = await db!.select().from(salaryConfig).where(eq(salaryConfig.key, "salary_late_tiers"));
  if (rows.length && rows[0].value) {
    try { return JSON.parse(rows[0].value as string) as LateTier[]; } catch {}
  }
  return DEFAULT_LATE_TIERS;
}

function calcLateDayTier(lateMinutes: number, dailyRate: number, minuteRate: number, tiers: LateTier[]): number {
  if (lateMinutes <= 0) return 0;
  const tier = tiers.find(
    (t) => lateMinutes >= t.minMin && (t.maxMin === null || lateMinutes <= t.maxMin),
  );
  if (!tier) return round2(lateMinutes * minuteRate);
  if (tier.type === "linear") return round2(lateMinutes * minuteRate);
  return round2((tier.dayFraction ?? 0) * dailyRate);
}

// Leave multiplier for exam/pentacam commissions (separate rule the user specified)
function leaveMultiplier(leaveDays: number): number {
  if (leaveDays <= 3) return 1.0;
  if (leaveDays <= 5) return 0.75;
  if (leaveDays <= 7) return 0.5;
  if (leaveDays <= 10) return 0.25;
  return 0;
}

function monthRange(year: number, month: number): [string, string] {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return [
    `${year}-${mm}-01`,
    `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  ];
}

export interface PayrollRow {
  empCd: string;
  year: number;
  month: number;
  section: string;
  basicSalary: number;
  workingDays: number;
  absentDays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeMinutes: number;
  leaveDays: number;
  absentDeduction: number;
  lateDeduction: number;
  earlyLeaveDeduction: number;
  penaltyDeduction: number;
  advancesDeduction: number;
  insuranceDeduction: number;
  totalDeductions: number;
  deductionPct: number;
  leaveMultiplier: number;
  netBasic: number;
  attendanceCommission: number;
  attendanceCommissionRaw: number;
  examCommission: number;
  examCommissionRaw: number;
  pentacamCommission: number;
  pentacamCommissionRaw: number;
  costOfLivingAllowance: number;
  transportAllowance: number;
  totalCommission: number;
  overtimePay: number;
  totalPay: number;
}

export class PayrollComputeService {
  static async compute(
    year: number,
    month: number,
    section = "مركز",
    filterEmpCd?: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<PayrollRow[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const firstDay = fromDate || monthRange(year, month)[0];
    const lastDay = toDate || monthRange(year, month)[1];

    const employees = filterEmpCd
      ? await db
          .select()
          .from(attendanceEmployees)
          .where(eq(attendanceEmployees.empCd, filterEmpCd))
      : await db
          .select()
          .from(attendanceEmployees)
          .where(eq(attendanceEmployees.department, section));

    const isMarkaz = section === "مركز";

    const acRates = await loadAttendanceRates(db);
    const lateTiers = await loadLateTiers(db);

    const [
      poolRows,
      basics,
      monthlyReports,
      dailyRows,
      penalties,
      advances,
      shiftAttendanceRows,
      holidayRows,
      shiftDefs,
      mcExcludeRows,
      sickLeaveRows,
    ] = await Promise.all([
      db
        .select()
        .from(salaryCommissionPools)
        .where(
          and(
            eq(salaryCommissionPools.year, year),
            eq(salaryCommissionPools.month, month),
          ),
        ),
      db
        .select()
        .from(salaryBasics)
        .where(
          and(
            lte(salaryBasics.effectiveFrom, lastDay as any),
            or(
              isNull(salaryBasics.effectiveTo),
              gte(salaryBasics.effectiveTo, firstDay as any),
            ),
          ),
        ),
      db
        .select()
        .from(attendanceMonthlyReport)
        .where(
          and(
            eq(attendanceMonthlyReport.year, year),
            eq(attendanceMonthlyReport.month, month),
          ),
        ),
      db
        .select({
          empCd: attendanceDaily.empCd,
          status: attendanceDaily.status,
          workDate: attendanceDaily.workDate,
          lateMinutes: attendanceDaily.lateMinutes,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
          overtimeMinutes: attendanceDaily.overtimeMinutes,
          leaveType: attendanceDaily.leaveType,
          leaveNotAffectCommission: attendanceDaily.leaveNotAffectCommission,
        })
        .from(attendanceDaily)
        .where(
          and(
            gte(attendanceDaily.workDate, firstDay as any),
            lte(attendanceDaily.workDate, lastDay as any),
          ),
        ),
      db
        .select()
        .from(salaryPenalties)
        .where(
          and(eq(salaryPenalties.year, year), eq(salaryPenalties.month, month)),
        ),
      db
        .select()
        .from(salaryAdvances)
        .where(
          and(eq(salaryAdvances.year, year), eq(salaryAdvances.month, month)),
        ),
      isMarkaz
        ? db
            .select()
            .from(shiftAttendance)
            .where(
              and(
                eq(shiftAttendance.year, year),
                eq(shiftAttendance.month, month),
              ),
            )
        : Promise.resolve([]),
      db
        .select()
        .from(salaryHolidays)
        .where(
          and(eq(salaryHolidays.year, year), eq(salaryHolidays.month, month)),
        ),
      db.select().from(attendanceShifts),
      db.select().from(salaryMissingCheckoutExclude).where(
        and(
          gte(salaryMissingCheckoutExclude.workDate, firstDay as any),
          lte(salaryMissingCheckoutExclude.workDate, lastDay as any),
        ),
      ),
      db
        .select({ empCd: attendanceLeaves.empCd, dateFrom: attendanceLeaves.dateFrom, dateTo: attendanceLeaves.dateTo })
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.type, "sick"),
            eq(attendanceLeaves.approved, true),
            lte(attendanceLeaves.dateFrom, lastDay as any),
            gte(attendanceLeaves.dateTo, firstDay as any),
          ),
        ),
    ]);

    // Set of holiday date strings YYYY-MM-DD (not Fridays — already excluded from roster)
    const holidayDates = new Set<string>(
      holidayRows
        .map((h: any) => {
          const d = h.date as any;
          return d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        })
        .filter((ds: any) => ds >= firstDay && ds <= lastDay),
    );
    // Set of "empCd|workDate" strings excluded from missing-checkout deduction
    const mcExcludeSet = new Set<string>(
      (mcExcludeRows as any[]).map((r) => {
        const d = r.workDate as any;
        const ds = d instanceof Date
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          : String(d).slice(0, 10);
        return `${r.empCd}|${ds}`;
      }),
    );

    // Set of "empCd|YYYY-MM-DD" for approved sick leave days within this month
    const sickDatesSet = new Set<string>();
    for (const sl of sickLeaveRows as any[]) {
      const from = String(sl.dateFrom instanceof Date ? sl.dateFrom.toISOString().slice(0, 10) : sl.dateFrom).slice(0, 10);
      const to = String(sl.dateTo instanceof Date ? sl.dateTo.toISOString().slice(0, 10) : sl.dateTo).slice(0, 10);
      const cur = new Date(from + "T00:00:00");
      const end = new Date(to + "T00:00:00");
      while (cur <= end) {
        const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
        if (ds >= firstDay && ds <= lastDay) sickDatesSet.add(`${sl.empCd}|${ds}`);
        cur.setDate(cur.getDate() + 1);
      }
    }

    // Number of holiday working days (exclude Fridays = day 5)
    const holidayWorkingDaysCount = [...holidayDates].filter(
      (ds) => new Date(ds + "T00:00:00").getDay() !== 5,
    ).length;

    const pool = poolRows.find((p: any) => p.section === section) ?? poolRows[0];
    const allowancePool =
      poolRows.find(
        (p: any) =>
          Number((p as any).costOfLivingAllowanceAmount ?? 0) > 0 ||
          Number((p as any).transportAllowanceAmount ?? 0) > 0,
      ) ?? pool;
    const examPool = pool ? Number(pool.examPool) : 0;
    const examPoolConsultant =
      pool?.examPoolConsultant != null ? Number(pool.examPoolConsultant) : null;
    const examPoolSpecialist =
      pool?.examPoolSpecialist != null ? Number(pool.examPoolSpecialist) : null;
    const costOfLivingAllowance = allowancePool
      ? Number((allowancePool as any).costOfLivingAllowanceAmount ?? 0)
      : 0;
    const transportAllowance = allowancePool
      ? Number((allowancePool as any).transportAllowanceAmount ?? 0)
      : 0;
    const pentacamPool = pool
      ? calcPentacamPool(
          pool.cases450 ?? 0,
          pool.cases400 ?? 0,
          pool.cases350 ?? 0,
          pool.cases250 ?? 0,
        )
      : 0;
    const pentacamDrPool = pool
      ? calcPentacamDrPool(
          pool.cases450 ?? 0,
          pool.cases400 ?? 0,
          pool.cases350 ?? 0,
          pool.cases250 ?? 0,
        )
      : 0;

    // Resolve each employee's current basic (most recent effectiveFrom)
    const empBasicMap = new Map<string, number>();
    for (const emp of employees) {
      const rows = basics
        .filter((b: any) => b.empCd === emp.empCd)
        .sort((a: any, b: any) =>
          String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)),
        );
      if (rows.length > 0) {
        const r = rows[0];
        const total =
          Number(r.basicAmount) +
          Number((r as any).socialAllowance ?? 0) +
          Number((r as any).costOfLivingAllowance ?? 0) +
          Number((r as any).transportAllowance ?? 0) +
          Number((r as any).workNatureAllowance ?? 0) +
          Number((r as any).receptionAllowance ?? 0) +
          Number((r as any).yearlyRaise ?? 0);
        empBasicMap.set(emp.empCd, total);
      }
    }

    // Commission eligibility flags per employee
    const commFlagsMap = new Map<
      string,
      {
        commAttendance: boolean;
        commExam: boolean;
        commPentacam: boolean;
        commDay10: boolean;
      }
    >();
    for (const emp of employees) {
      commFlagsMap.set(emp.empCd, {
        commAttendance: emp.commAttendance !== false,
        commExam: emp.commExam !== false,
        commPentacam: emp.commPentacam !== false,
        commDay10: emp.commDay10 !== false,
      });
    }

    const sumAllBasics = Array.from(empBasicMap.values()).reduce(
      (s, b) => s + b,
      0,
    );
    const activeCount = empBasicMap.size;

    // Pre-pass: compute net-for-ratios per employee (basic minus all deductions except insurance)
    const netForRatioMap = new Map<string, number>();
    for (const emp of employees) {
      const basic = empBasicMap.get(emp.empCd);
      if (!basic) continue;
      const report = monthlyReports.find((r: any) => r.empCd === emp.empCd);
      const empDailyRows = dailyRows.filter((d: any) => d.empCd === emp.empCd);
      const wDays = empDailyRows.filter((d: any) => d.status !== "holiday").length;
      let rawAbsent = 0, lateMins = 0, earlyMins = 0, missingCoDays = 0;
      if (fromDate || toDate) {
        rawAbsent = empDailyRows.filter((d: any) => d.status === "absent").length;
        missingCoDays = empDailyRows.filter((d: any) => d.status === "missing_checkout").length;
        lateMins = empDailyRows.reduce((s: any, d: any) => s + (d.lateMinutes ?? 0), 0);
        earlyMins = empDailyRows.reduce((s: any, d: any) => s + (d.earlyLeaveMin ?? 0), 0);
      } else {
        rawAbsent = Number(report?.absentDays ?? 0);
        lateMins = Number(report?.totalLateMins ?? 0);
        earlyMins = Number(report?.totalEarlyLeaveMins ?? 0);
      }
      const absentD = Math.max(0, rawAbsent - holidayWorkingDaysCount);
      const dayRate = wDays > 0 ? basic / wDays : 0;
      const minRate = dayRate / 360;
      const deductions = round2(
        absentD * dayRate +
        missingCoDays * dayRate * 0.25 +
        lateMins * minRate +
        earlyMins * minRate +
        penalties.filter((p: any) => p.empCd === emp.empCd).reduce((s: any, p: any) => s + Number(p.amount), 0) +
        advances.filter((a: any) => a.empCd === emp.empCd).reduce((s: any, a: any) => s + Number(a.amount), 0),
      );
      netForRatioMap.set(emp.empCd, round2(Math.max(0, basic - deductions)));
    }

    // Pentacam denominator: sum nets-for-ratio of pentacam-eligible employees
    const sumNetsForPenta = Array.from(netForRatioMap.entries())
      .filter(([cd]) => commFlagsMap.get(cd)?.commPentacam !== false)
      .reduce((s, [, n]) => s + n, 0);
    // Exam count: only count employees eligible for exam
    const activeExamCount = Array.from(empBasicMap.keys()).filter(
      (cd) => commFlagsMap.get(cd)?.commExam !== false,
    ).length;

    // Load shift staff for مركز — they share the same exam/pentacam pools
    const activeShiftStaff = isMarkaz
      ? (await db.select().from(shiftStaff)).filter((ss: any) => ss.active)
      : [];
    const shiftAttRows = activeShiftStaff.length > 0 ? shiftAttendanceRows : [];

    // Build map of punch dates for shift staff linked to employees
    const linkedEmpCds = activeShiftStaff
      .filter((ss: any) => ss.empCd)
      .map((ss: any) => ss.empCd!);
    const punchDatesMap = new Map<string, Set<string>>();
    if (linkedEmpCds.length > 0) {
      for (const row of dailyRows) {
        if (!linkedEmpCds.includes(row.empCd)) continue;
        if (
          row.status !== "present" &&
          row.status !== "partial" &&
          row.status !== "missing_checkout"
        )
          continue;
        if (!punchDatesMap.has(row.empCd))
          punchDatesMap.set(row.empCd, new Set());
        const d = row.workDate as any;
        const ds =
          d instanceof Date
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            : String(d).slice(0, 10);
        punchDatesMap.get(row.empCd)!.add(ds);
      }
    }

    function fmtDate(d: any): string {
      return d instanceof Date
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        : String(d).slice(0, 10);
    }

    // Build shift-name → size map (same logic as salary.ts router)
    const shiftSizeMap = new Map<string, "big" | "small">();
    for (const sd of shiftDefs as any[]) {
      let size: "big" | "small" = "big";
      if (sd.shiftSize === "big") size = "big";
      else if (sd.shiftSize === "small") size = "small";
      else {
        // auto: compute duration in minutes
        const [sh, sm] = (sd.startTime as string).split(":").map(Number);
        const [eh, em] = (sd.endTime as string).split(":").map(Number);
        let dur = eh * 60 + em - (sh * 60 + sm);
        if (dur < 0) dur += 24 * 60;
        const threshold = sd.autoSmallThresholdMin ?? 270;
        size = dur < threshold ? "small" : "big";
      }
      shiftSizeMap.set(sd.name as string, size);
    }

    type ShiftStats = {
      scheduled: number;
      attended: number;
      commMult: number;
      shiftPay: number;
      deductionPct: number;
      netPay: number;
    };
    const shiftStatsMap = new Map<number, ShiftStats>();
    for (const ss of activeShiftStaff) {
      // Exclude entries on official holidays — those days are off, not absent
      const rows = shiftAttRows.filter((a: any) => {
        const ds = fmtDate(a.workDate);
        return a.staffId === ss.id && !holidayDates.has(ds);
      });
      const scheduled = rows.length;

      // Count attended by checking punch data (for linked employees) or shift_attendance.present field
      let attended = 0;
      if (ss.empCd) {
        const punchDates = punchDatesMap.get(ss.empCd);
        attended = rows.filter((a: any) =>
          punchDates?.has(fmtDate(a.workDate)),
        ).length;
      } else {
        attended = rows.filter((a: any) => a.present).length;
      }

      const rateBig = Number(ss.ratePerShift);
      const rateSmall = Number(ss.rateSmallShift ?? 0) || rateBig;

      // For linked employees, apply punch deductions; otherwise, just attendance ratio
      let deductionPct = 0;
      if (ss.empCd) {
        let lateMinutes = 0;
        let earlyLeaveMinutes = 0;
        let hasData = false;

        if (fromDate || toDate) {
          const empDailyRows = dailyRows.filter((d: any) => d.empCd === ss.empCd);
          lateMinutes = empDailyRows.reduce((s: any, d: any) => s + (d.lateMinutes ?? 0), 0);
          earlyLeaveMinutes = empDailyRows.reduce((s: any, d: any) => s + (d.earlyLeaveMin ?? 0), 0);
          hasData = true;
        } else {
          const report = monthlyReports.find((r: any) => r.empCd === ss.empCd);
          if (report) {
            lateMinutes = report.totalLateMins ?? 0;
            earlyLeaveMinutes = report.totalEarlyLeaveMins ?? 0;
            hasData = true;
          }
        }

        if (hasData) {
          const basic = empBasicMap.get(ss.empCd) ?? 0;
          if (basic > 0 && scheduled > 0) {
            const dailyRate = basic / scheduled;
            const minuteRate = dailyRate / 360;
            const totalDeduction = round2(
              (lateMinutes + earlyLeaveMinutes) * minuteRate,
            );
            deductionPct = Math.min(1, totalDeduction / basic);
          }
        }
      }

      // Calculate pay per shift type (big vs small) like the shift preview does
      const byShift: Record<string, { scheduled: number; attended: number; rate: number }> = {};
      for (const a of rows) {
        const isPresent = ss.empCd
          ? punchDatesMap.get(ss.empCd)?.has(fmtDate(a.workDate)) ?? false
          : a.present;
        const defSize = shiftSizeMap.get(a.shiftName);
        // Night is always small, Morning always big; other names use their definition.
        const size: "big" | "small" =
          a.shiftName === "Night"
            ? "small"
            : a.shiftName === "Morning"
              ? "big"
              : defSize ?? "big";
        const r = size === "small" ? rateSmall : rateBig;
        if (!byShift[a.shiftName]) byShift[a.shiftName] = { scheduled: 0, attended: 0, rate: r };
        byShift[a.shiftName].scheduled++;
        if (isPresent) byShift[a.shiftName].attended++;
      }

      const basicSalary = round2(Object.values(byShift).reduce((s, b) => s + b.scheduled * b.rate, 0));
      const absentDeduction = round2(
        Object.values(byShift).reduce((s, b) => s + Math.max(0, b.scheduled - b.attended) * b.rate, 0),
      );
      const punchDeduction = round2(basicSalary * deductionPct);
      const netPay = round2(basicSalary - absentDeduction - punchDeduction);

      const commMult =
        (scheduled > 0 ? attended / scheduled : 1) * (1 - deductionPct);
      shiftStatsMap.set(ss.id, {
        scheduled,
        attended,
        commMult,
        shiftPay: round2(
          Object.values(byShift).reduce((s, b) => s + b.attended * b.rate, 0),
        ),
        deductionPct,
        netPay,
      });
    }

    // Separate doctors and techs — techs join employee pools, doctors get remainder
    const doctors = activeShiftStaff.filter((ss: any) => ss.type === "doctor");
    const techs = activeShiftStaff.filter((ss: any) => ss.type === "tech");
    // Use each tech's net pay (after deductions) for pool calculations
    const sumTechShiftPay = techs.reduce(
      (s: any, ss: any) => s + (shiftStatsMap.get(ss.id)?.netPay ?? 0),
      0,
    );
    // Denominators: employee nets (excl. insurance deduction) + tech net pay
    const totalSumForPentacam = sumNetsForPenta + sumTechShiftPay;
    // Only count techs who have at least one scheduled shift this month
    const activeTechsThisMonth = techs.filter(
      (ss: any) => (shiftStatsMap.get(ss.id)?.scheduled ?? 0) > 0,
    );
    const totalCountForExam = activeExamCount + activeTechsThisMonth.length;
    // مركز: 60% of examPool to doctors (by salary), 40% to emps+techs (equally)
    const examPoolDrs = round2(examPool * 0.6);
    const examPoolEmpsTechs = round2(examPool * 0.4);

    // عيادة: count eligible employees per pool to avoid double-paying
    const consultantEligible = !isMarkaz
      ? employees.filter(
          (e: any) =>
            empBasicMap.has(e.empCd) &&
            (e.salaryType === "استشاري" || e.salaryType === "الاثنين"),
        ).length
      : 0;
    const specialistEligible = !isMarkaz
      ? employees.filter(
          (e: any) =>
            empBasicMap.has(e.empCd) &&
            (e.salaryType === "أخصائي" || e.salaryType === "الاثنين"),
        ).length
      : 0;
    const perConsultant =
      examPoolConsultant !== null && consultantEligible > 0
        ? examPoolConsultant / consultantEligible
        : 0;
    const perSpecialist =
      examPoolSpecialist !== null && specialistEligible > 0
        ? examPoolSpecialist / specialistEligible
        : 0;

    const results: PayrollRow[] = [];

    for (const emp of employees) {
      const basic = empBasicMap.get(emp.empCd);
      if (!basic) continue;

      const report = monthlyReports.find((r: any) => r.empCd === emp.empCd);

      // Working days = scheduled days (all statuses except holiday)
      const workingDays = dailyRows.filter(
        (d: any) => d.empCd === emp.empCd && d.status !== "holiday",
      ).length;

      // Official holidays count as paid non-working days — don't deduct absence for them
      let rawAbsentDays = 0;
      let lateMinutes = 0;
      let earlyLeaveMinutes = 0;
      let overtimeMinutes = 0;
      let leaveDays = 0;

      let missingCheckoutDays = 0;
      if (fromDate || toDate) {
        const empDailyRows = dailyRows.filter((d: any) => d.empCd === emp.empCd);
        rawAbsentDays = empDailyRows.filter((d: any) => d.status === "absent").length;
        missingCheckoutDays = empDailyRows.filter((d: any) => {
          if (d.status !== "missing_checkout") return false;
          const ds = d.workDate instanceof Date
            ? `${d.workDate.getFullYear()}-${String(d.workDate.getMonth() + 1).padStart(2, "0")}-${String(d.workDate.getDate()).padStart(2, "0")}`
            : String(d.workDate).slice(0, 10);
          return !mcExcludeSet.has(`${emp.empCd}|${ds}`);
        }).length;
        lateMinutes = empDailyRows.reduce((s: any, d: any) => s + (d.lateMinutes ?? 0), 0);
        earlyLeaveMinutes = empDailyRows.reduce((s: any, d: any) => s + (d.earlyLeaveMin ?? 0), 0);
        overtimeMinutes = empDailyRows.reduce((s: any, d: any) => s + (d.overtimeMinutes ?? 0), 0);
        leaveDays = empDailyRows.filter((d: any) => d.status === "leave" && !d.leaveNotAffectCommission && !sickDatesSet.has(`${emp.empCd}|${String(d.workDate instanceof Date ? d.workDate.toISOString().slice(0,10) : d.workDate).slice(0,10)}`)).length;
      } else {
        rawAbsentDays = report?.absentDays ?? 0;
        lateMinutes = report?.totalLateMins ?? 0;
        earlyLeaveMinutes = report?.totalEarlyLeaveMins ?? 0;
        overtimeMinutes = report?.totalOTMins ?? 0;
        // Exclude sick leave and no-commission-impact leave from leaveDays using dailyRows (always loaded)
        const empDailyRowsForLeave = dailyRows.filter((d: any) => d.empCd === emp.empCd);
        leaveDays = empDailyRowsForLeave.filter((d: any) => d.status === "leave" && d.leaveType !== "sick" && !d.leaveNotAffectCommission).length;
      }
      const absentDays = Math.max(0, rawAbsentDays - holidayWorkingDaysCount);

      const dailyRate = workingDays > 0 ? basic / workingDays : 0;
      const minuteRate = dailyRate / 360; // 6h × 60min

      const overtimeRate = minuteRate * 2; // ساعة الإضافي = ضعف المعدل العادي
      const absentDeduction = round2(absentDays * dailyRate);
      const missingCheckoutDeduction = round2(missingCheckoutDays * dailyRate * 0.25);

      // Per-day late tier deduction — always use daily rows for tier classification
      const empDailyRowsForLate = dailyRows.filter((d: any) => d.empCd === emp.empCd);
      const lateDeduction = round2(
        empDailyRowsForLate.reduce((sum: number, d: any) => {
          const mins = d.lateMinutes ?? 0;
          return sum + calcLateDayTier(mins, dailyRate, minuteRate, lateTiers);
        }, 0),
      );

      const earlyLeaveDeduction = round2(earlyLeaveMinutes * minuteRate);
      const overtimePay = round2(overtimeMinutes * overtimeRate);
      const penaltyDeduction = round2(
        penalties
          .filter((p: any) => p.empCd === emp.empCd)
          .reduce((s: any, p: any) => {
            if (p.penaltyDays) return s + Number(p.penaltyDays) * dailyRate;
            return s + Number(p.amount);
          }, 0),
      );
      const advancesDeduction = round2(
        advances
          .filter((a: any) => a.empCd === emp.empCd)
          .reduce((s: any, a: any) => s + Number(a.amount), 0),
      );
      const basicRow = basics
        .filter((b: any) => b.empCd === emp.empCd)
        .sort((a: any, b: any) =>
          String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)),
        )[0];
      const insuranceDeduction = round2(
        Number((basicRow as any)?.insuranceDeduction ?? 0),
      );
      const totalDeductions = round2(
        absentDeduction +
          missingCheckoutDeduction +
          lateDeduction +
          earlyLeaveDeduction +
          penaltyDeduction +
          advancesDeduction +
          insuranceDeduction,
      );
      const deductionPct = basic > 0 ? Math.min(1, totalDeductions / basic) : 0;

      const netBasic = round2(Math.max(0, basic - totalDeductions));
      const customLm =
        emp.attendanceLeaveMultiplier != null
          ? Number(emp.attendanceLeaveMultiplier)
          : null;
      const lm = customLm !== null ? customLm : leaveMultiplier(leaveDays);
      // Only insurance is excluded from the commission deduction basis
      const deductionsForComm = round2(
        absentDeduction + missingCheckoutDeduction + lateDeduction +
        earlyLeaveDeduction + penaltyDeduction + advancesDeduction,
      );
      const deductionPctForComm = basic > 0 ? Math.min(1, deductionsForComm / basic) : 0;
      const commMult = lm * (1 - deductionPctForComm);
      const empRate =
        emp.attendanceCommissionRate != null
          ? Number(emp.attendanceCommissionRate)
          : null;
      const acRate =
        empRate !== null
          ? empRate
          : attendanceCommissionRate(leaveDays, acRates);

      const flags = commFlagsMap.get(emp.empCd) ?? {
        commAttendance: true,
        commExam: true,
        commPentacam: true,
        commDay10: true,
      };

      const attendanceCommissionRaw = flags.commAttendance
        ? round2(acRate * basic)
        : 0;
      const attendanceCommission = round2(attendanceCommissionRaw * commMult);
      let examCommissionRaw: number;
      if (!flags.commExam) {
        examCommissionRaw = 0;
      } else if (
        !isMarkaz &&
        (examPoolConsultant !== null || examPoolSpecialist !== null)
      ) {
        const t = emp.salaryType;
        const cShare = t === "استشاري" || t === "الاثنين" ? perConsultant : 0;
        const sShare = t === "أخصائي" || t === "الاثنين" ? perSpecialist : 0;
        examCommissionRaw = round2(cShare + sShare);
      } else {
        if (isMarkaz) {
          examCommissionRaw =
            totalCountForExam > 0
              ? round2(examPoolEmpsTechs / totalCountForExam)
              : 0;
        } else {
          const empShares = emp.salaryType === "الاثنين" ? 2 : 1;
          examCommissionRaw = round2((examPool / 3) * empShares);
        }
      }
      const examCommission = round2(examCommissionRaw * commMult);
      const netForRatio = netForRatioMap.get(emp.empCd) ?? 0;
      const pentacamCommissionRaw =
        isMarkaz && flags.commPentacam
          ? round2(
              totalSumForPentacam > 0
                ? (netForRatio / totalSumForPentacam) * pentacamPool
                : 0,
            )
          : 0;
      const pentacamCommission = round2(pentacamCommissionRaw * commMult);
      const costOfLivingAllowancePay =
        flags.commDay10 && netBasic > 0 ? round2(costOfLivingAllowance) : 0;
      const transportAllowancePay =
        flags.commDay10 && netBasic > 0 ? round2(transportAllowance) : 0;
      const day10Allowances = round2(
        costOfLivingAllowancePay + transportAllowancePay,
      );
      const totalCommission = round2(
        attendanceCommission +
          examCommission +
          pentacamCommission +
          day10Allowances,
      );
      const totalPay = round2(netBasic + totalCommission + overtimePay);

      results.push({
        empCd: emp.empCd,
        year,
        month,
        section,
        basicSalary: basic,
        workingDays,
        absentDays,
        lateMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
        leaveDays,
        absentDeduction,
        lateDeduction,
        earlyLeaveDeduction,
        penaltyDeduction,
        advancesDeduction,
        insuranceDeduction,
        totalDeductions,
        deductionPct,
        leaveMultiplier: lm,
        netBasic,
        attendanceCommission,
        attendanceCommissionRaw,
        examCommission,
        examCommissionRaw,
        pentacamCommission,
        pentacamCommissionRaw,
        costOfLivingAllowance: costOfLivingAllowancePay,
        transportAllowance: transportAllowancePay,
        totalCommission,
        overtimePay,
        totalPay,
      });
    }

    // Add shift staff rows (مركز only)
    // Techs: share pools proportionally with regular employees
    let usedExam = 0;
    let usedPenta = 0;
    for (const ss of techs) {
      const stats = shiftStatsMap.get(ss.id) ?? {
        scheduled: 0,
        attended: 0,
        commMult: 1,
        shiftPay: 0,
        deductionPct: 0,
        netPay: 0,
      };
      const { scheduled, attended, commMult, shiftPay, deductionPct, netPay } =
        stats;

      const rate = Number(ss.ratePerShift);
      const basicSalary = round2(scheduled * rate);
      const absent = scheduled - attended;
      const absentDeduction = round2(absent * rate);
      const punchDeduction = round2(basicSalary * deductionPct);
      const totalDeductions = round2(absentDeduction + punchDeduction);
      const netBasic = netPay;

      const attendanceCommission = round2(0.25 * netBasic);
      const examCommission =
        scheduled > 0 && totalCountForExam > 0 && netBasic > 0
          ? round2(examPoolEmpsTechs / totalCountForExam)
          : 0;
      const pentacamCommission = round2(
        totalSumForPentacam > 0
          ? (netBasic / totalSumForPentacam) * pentacamPool
          : 0,
      );
      usedExam = round2(usedExam + examCommission);
      usedPenta = round2(usedPenta + pentacamCommission);
      const totalCommission = round2(
        attendanceCommission + examCommission + pentacamCommission,
      );
      const totalPay = round2(netBasic + totalCommission);

      results.push({
        empCd: `shift_${ss.id}`,
        year,
        month,
        section,
        basicSalary,
        workingDays: scheduled,
        absentDays: absent,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        leaveDays: 0,
        absentDeduction,
        lateDeduction: punchDeduction,
        earlyLeaveDeduction: 0,
        penaltyDeduction: 0,
        advancesDeduction: 0,
        insuranceDeduction: 0,
        totalDeductions,
        deductionPct,
        leaveMultiplier: 1,
        netBasic,
        attendanceCommission,
        attendanceCommissionRaw: attendanceCommission,
        examCommission,
        examCommissionRaw: examCommission,
        pentacamCommission,
        pentacamCommissionRaw: pentacamCommission,
        costOfLivingAllowance: 0,
        transportAllowance: 0,
        totalCommission,
        overtimePay: 0,
        totalPay,
      });
    }

    // Doctors: each commission by salary proportion within doctors only
    const sumDoctorBasics = doctors.reduce(
      (s: any, ss: any) => s + (shiftStatsMap.get(ss.id)?.netPay ?? 0),
      0,
    );
    for (const ss of doctors) {
      const stats = shiftStatsMap.get(ss.id) ?? {
        scheduled: 0,
        attended: 0,
        commMult: 1,
        shiftPay: 0,
        deductionPct: 0,
        netPay: 0,
      };
      const { scheduled, attended, commMult, shiftPay, deductionPct, netPay } =
        stats;

      const rate = Number(ss.ratePerShift);
      const basicSalary = round2(scheduled * rate);
      const absent = scheduled - attended;
      const absentDeduction = round2(absent * rate);
      const punchDeduction = round2(basicSalary * deductionPct);
      const totalDeductions = round2(absentDeduction + punchDeduction);
      const netBasic = netPay;

      const attendanceCommission = round2(0.25 * netBasic);
      const examCommission = round2(
        sumDoctorBasics > 0
          ? (netBasic / sumDoctorBasics) * examPoolDrs
          : 0,
      );
      const pentacamCommission = round2(
        sumDoctorBasics > 0
          ? (netBasic / sumDoctorBasics) * pentacamDrPool
          : 0,
      );
      const totalCommission = round2(
        attendanceCommission + examCommission + pentacamCommission,
      );
      const totalPay = round2(netBasic + totalCommission);

      results.push({
        empCd: `shift_${ss.id}`,
        year,
        month,
        section,
        basicSalary,
        workingDays: scheduled,
        absentDays: absent,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        leaveDays: 0,
        absentDeduction,
        lateDeduction: punchDeduction,
        earlyLeaveDeduction: 0,
        penaltyDeduction: 0,
        advancesDeduction: 0,
        insuranceDeduction: 0,
        totalDeductions,
        deductionPct,
        leaveMultiplier: 1,
        netBasic,
        attendanceCommission,
        attendanceCommissionRaw: attendanceCommission,
        examCommission,
        examCommissionRaw: examCommission,
        pentacamCommission,
        pentacamCommissionRaw: pentacamCommission,
        costOfLivingAllowance: 0,
        transportAllowance: 0,
        totalCommission,
        overtimePay: 0,
        totalPay,
      });
    }

    return results;
  }

  static async savePayroll(rows: PayrollRow[]): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();
    let saved = 0;

    for (const r of rows) {
      await db
        .insert(salaryPayroll)
        .values({
          empCd: r.empCd,
          year: r.year,
          month: r.month,
          section: r.section,
          basicSalary: String(r.basicSalary) as any,
          workingDays: r.workingDays,
          absentDays: r.absentDays,
          lateMinutes: r.lateMinutes,
          earlyLeaveMinutes: r.earlyLeaveMinutes,
          overtimeMinutes: r.overtimeMinutes,
          leaveDays: r.leaveDays,
          absentDeduction: String(r.absentDeduction) as any,
          lateDeduction: String(r.lateDeduction) as any,
          earlyLeaveDeduction: String(r.earlyLeaveDeduction) as any,
          penaltyDeduction: String(r.penaltyDeduction) as any,
          advancesDeduction: String(r.advancesDeduction) as any,
          insuranceDeduction: String(r.insuranceDeduction) as any,
          totalDeductions: String(r.totalDeductions) as any,
          deductionPct: String(r.deductionPct) as any,
          leaveMultiplier: String(r.leaveMultiplier) as any,
          netBasic: String(r.netBasic) as any,
          attendanceCommission: String(r.attendanceCommission) as any,
          attendanceCommissionRaw: String(r.attendanceCommissionRaw) as any,
          examCommission: String(r.examCommission) as any,
          examCommissionRaw: String(r.examCommissionRaw) as any,
          pentacamCommission: String(r.pentacamCommission) as any,
          pentacamCommissionRaw: String(r.pentacamCommissionRaw) as any,
          costOfLivingAllowance: String(r.costOfLivingAllowance) as any,
          transportAllowance: String(r.transportAllowance) as any,
          totalCommission: String(r.totalCommission) as any,
          overtimePay: String(r.overtimePay) as any,
          totalPay: String(r.totalPay) as any,
          payrollStatus: "draft",
          computedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            basicSalary: String(r.basicSalary) as any,
            workingDays: r.workingDays,
            absentDays: r.absentDays,
            lateMinutes: r.lateMinutes,
            earlyLeaveMinutes: r.earlyLeaveMinutes,
            overtimeMinutes: r.overtimeMinutes,
            leaveDays: r.leaveDays,
            absentDeduction: String(r.absentDeduction) as any,
            lateDeduction: String(r.lateDeduction) as any,
            earlyLeaveDeduction: String(r.earlyLeaveDeduction) as any,
            penaltyDeduction: String(r.penaltyDeduction) as any,
            advancesDeduction: String(r.advancesDeduction) as any,
            insuranceDeduction: String(r.insuranceDeduction) as any,
            totalDeductions: String(r.totalDeductions) as any,
            deductionPct: String(r.deductionPct) as any,
            leaveMultiplier: String(r.leaveMultiplier) as any,
            netBasic: String(r.netBasic) as any,
            attendanceCommission: String(r.attendanceCommission) as any,
            attendanceCommissionRaw: String(r.attendanceCommissionRaw) as any,
            examCommission: String(r.examCommission) as any,
            examCommissionRaw: String(r.examCommissionRaw) as any,
            pentacamCommission: String(r.pentacamCommission) as any,
            pentacamCommissionRaw: String(r.pentacamCommissionRaw) as any,
            costOfLivingAllowance: String(r.costOfLivingAllowance) as any,
            transportAllowance: String(r.transportAllowance) as any,
            totalCommission: String(r.totalCommission) as any,
            overtimePay: String(r.overtimePay) as any,
            totalPay: String(r.totalPay) as any,
            computedAt: now,
          },
        });
      saved++;
    }

    return saved;
  }
}
