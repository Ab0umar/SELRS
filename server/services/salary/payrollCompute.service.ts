import { getDb } from '../../db';
import {
  attendanceEmployees,
  attendanceMonthlyReport,
  attendanceDaily,
  salaryBasics,
  salaryPenalties,
  salaryAdvances,
  salaryCommissionPools,
  salaryPayroll,
  salaryConfig,
  salaryHolidays,
  shiftStaff,
  shiftAttendance,
} from '../../../drizzle/schema';
import { eq, and, gte, lte, isNull, or, inArray } from 'drizzle-orm';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const PENTACAM_TIERS = [
  { price: 450, deduction: 123.75, empPct: 0.455 },
  { price: 400, deduction: 110,    empPct: 0.455 },
  { price: 350, deduction: 85,     empPct: 0.47  },
  { price: 250, deduction: 60,     empPct: 0.50  },
] as const;

export function calcPentacamPool(cases450: number, cases400: number, cases350: number, cases250: number): number {
  return round2(
    cases450 * PENTACAM_TIERS[0].deduction * PENTACAM_TIERS[0].empPct +
    cases400 * PENTACAM_TIERS[1].deduction * PENTACAM_TIERS[1].empPct +
    cases350 * PENTACAM_TIERS[2].deduction * PENTACAM_TIERS[2].empPct +
    cases250 * PENTACAM_TIERS[3].deduction * PENTACAM_TIERS[3].empPct
  );
}

interface AttendanceRates { r3: number; r5: number; r7: number; r10: number; }

function attendanceCommissionRate(leaveDays: number, rates: AttendanceRates): number {
  if (leaveDays <= 3) return rates.r3;
  if (leaveDays <= 5) return rates.r5;
  if (leaveDays <= 7) return rates.r7;
  if (leaveDays <= 10) return rates.r10;
  return 0;
}

async function loadAttendanceRates(db: Awaited<ReturnType<typeof getDb>>): Promise<AttendanceRates> {
  const keys = ['attendance_rate_3', 'attendance_rate_5', 'attendance_rate_7', 'attendance_rate_10'];
  const rows = await db!.select().from(salaryConfig).where(inArray(salaryConfig.key, keys));
  const map = Object.fromEntries(rows.map(r => [r.key, parseFloat(r.value)]));
  return {
    r3:  map['attendance_rate_3']  ?? 0.25,
    r5:  map['attendance_rate_5']  ?? 0.15,
    r7:  map['attendance_rate_7']  ?? 0.10,
    r10: map['attendance_rate_10'] ?? 0.05,
  };
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
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return [`${year}-${mm}-01`, `${year}-${mm}-${String(lastDay).padStart(2, '0')}`];
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
  examCommission: number;
  pentacamCommission: number;
  costOfLivingAllowance: number;
  transportAllowance: number;
  totalCommission: number;
  overtimePay: number;
  totalPay: number;
}

export class PayrollComputeService {
  static async compute(year: number, month: number, section = 'مركز', filterEmpCd?: string): Promise<PayrollRow[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [firstDay, lastDay] = monthRange(year, month);

    const employees = filterEmpCd
      ? await db.select().from(attendanceEmployees).where(eq(attendanceEmployees.empCd, filterEmpCd))
      : await db.select().from(attendanceEmployees).where(eq(attendanceEmployees.department, section));

    const isMarkaz = section === 'مركز';

    const acRates = await loadAttendanceRates(db);

    const [poolRows, basics, monthlyReports, dailyRows, penalties, advances, shiftAttendanceRows, holidayRows] = await Promise.all([
      db.select().from(salaryCommissionPools)
        .where(and(eq(salaryCommissionPools.year, year), eq(salaryCommissionPools.month, month))),
      db.select().from(salaryBasics)
        .where(and(
          lte(salaryBasics.effectiveFrom, lastDay as any),
          or(isNull(salaryBasics.effectiveTo), gte(salaryBasics.effectiveTo, firstDay as any))
        )),
      db.select().from(attendanceMonthlyReport)
        .where(and(eq(attendanceMonthlyReport.year, year), eq(attendanceMonthlyReport.month, month))),
      db.select({ empCd: attendanceDaily.empCd, status: attendanceDaily.status, workDate: attendanceDaily.workDate })
        .from(attendanceDaily)
        .where(and(gte(attendanceDaily.workDate, firstDay as any), lte(attendanceDaily.workDate, lastDay as any))),
      db.select().from(salaryPenalties)
        .where(and(eq(salaryPenalties.year, year), eq(salaryPenalties.month, month))),
      db.select().from(salaryAdvances)
        .where(and(eq(salaryAdvances.year, year), eq(salaryAdvances.month, month))),
      isMarkaz ? db.select().from(shiftAttendance)
        .where(and(eq(shiftAttendance.year, year), eq(shiftAttendance.month, month))) : Promise.resolve([]),
      db.select().from(salaryHolidays)
        .where(and(eq(salaryHolidays.year, year), eq(salaryHolidays.month, month))),
    ]);

    // Set of holiday date strings YYYY-MM-DD (not Fridays — already excluded from roster)
    const holidayDates = new Set<string>(
      holidayRows.map(h => {
        const d = h.date as any;
        return d instanceof Date
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          : String(d).slice(0, 10);
      })
    );
    // Number of holiday working days (exclude Fridays = day 5)
    const holidayWorkingDaysCount = [...holidayDates].filter(ds => new Date(ds + 'T00:00:00').getDay() !== 5).length;

    const pool = poolRows.find(p => p.section === section) ?? poolRows[0];
    const allowancePool = poolRows.find(p => Number((p as any).costOfLivingAllowanceAmount ?? 0) > 0 || Number((p as any).transportAllowanceAmount ?? 0) > 0) ?? pool;
    const examPool = pool ? Number(pool.examPool) : 0;
    const examPoolConsultant = pool?.examPoolConsultant != null ? Number(pool.examPoolConsultant) : null;
    const examPoolSpecialist = pool?.examPoolSpecialist != null ? Number(pool.examPoolSpecialist) : null;
    const costOfLivingAllowance = allowancePool ? Number((allowancePool as any).costOfLivingAllowanceAmount ?? 0) : 0;
    const transportAllowance = allowancePool ? Number((allowancePool as any).transportAllowanceAmount ?? 0) : 0;
    const pentacamPool = pool
      ? calcPentacamPool(pool.cases450 ?? 0, pool.cases400 ?? 0, pool.cases350 ?? 0, pool.cases250 ?? 0)
      : 0;

    // Resolve each employee's current basic (most recent effectiveFrom)
    const empBasicMap = new Map<string, number>();
    for (const emp of employees) {
      const rows = basics
        .filter((b) => b.empCd === emp.empCd)
        .sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
      if (rows.length > 0) {
        const r = rows[0];
        const total = Number(r.basicAmount)
          + Number((r as any).socialAllowance ?? 0)
          + Number((r as any).costOfLivingAllowance ?? 0)
          + Number((r as any).transportAllowance ?? 0)
          + Number((r as any).workNatureAllowance ?? 0)
          + Number((r as any).receptionAllowance ?? 0)
          + Number((r as any).yearlyRaise ?? 0);
        empBasicMap.set(emp.empCd, total);
      }
    }

    // Commission eligibility flags per employee
    const commFlagsMap = new Map<string, { commAttendance: boolean; commExam: boolean; commPentacam: boolean }>();
    for (const emp of employees) {
      commFlagsMap.set(emp.empCd, {
        commAttendance: emp.commAttendance !== false,
        commExam:       emp.commExam       !== false,
        commPentacam:   emp.commPentacam   !== false,
      });
    }

    const sumAllBasics = Array.from(empBasicMap.values()).reduce((s, b) => s + b, 0);
    const activeCount = empBasicMap.size;
    // Pentacam denominator: only sum basics of employees eligible for pentacam
    const sumBasicsForPenta = Array.from(empBasicMap.entries())
      .filter(([cd]) => commFlagsMap.get(cd)?.commPentacam !== false)
      .reduce((s, [, b]) => s + b, 0);
    // Exam count: only count employees eligible for exam
    const activeExamCount = Array.from(empBasicMap.keys())
      .filter(cd => commFlagsMap.get(cd)?.commExam !== false).length;

    // Load shift staff for مركز — they share the same exam/pentacam pools
    const activeShiftStaff = isMarkaz
      ? (await db.select().from(shiftStaff)).filter(ss => ss.active)
      : [];
    const shiftAttRows = activeShiftStaff.length > 0 ? shiftAttendanceRows : [];

    // Build map of punch dates for shift staff linked to employees
    const linkedEmpCds = activeShiftStaff.filter(ss => ss.empCd).map(ss => ss.empCd!);
    const punchDatesMap = new Map<string, Set<string>>();
    if (linkedEmpCds.length > 0) {
      for (const row of dailyRows) {
        if (!linkedEmpCds.includes(row.empCd)) continue;
        if (row.status !== 'present' && row.status !== 'partial' && row.status !== 'missing_checkout') continue;
        if (!punchDatesMap.has(row.empCd)) punchDatesMap.set(row.empCd, new Set());
        const d = row.workDate as any;
        const ds = d instanceof Date
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          : String(d).slice(0, 10);
        punchDatesMap.get(row.empCd)!.add(ds);
      }
    }

    function fmtDate(d: any): string {
      return d instanceof Date
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : String(d).slice(0, 10);
    }

    type ShiftStats = { scheduled: number; attended: number; commMult: number; shiftPay: number; deductionPct: number; netPay: number };
    const shiftStatsMap = new Map<number, ShiftStats>();
    for (const ss of activeShiftStaff) {
      // Exclude entries on official holidays — those days are off, not absent
      const rows = shiftAttRows.filter(a => {
        const ds = fmtDate(a.workDate);
        return a.staffId === ss.id && !holidayDates.has(ds);
      });
      const scheduled = rows.length;

      // Count attended by checking punch data (for linked employees) or shift_attendance.present field
      let attended = 0;
      if (ss.empCd) {
        const punchDates = punchDatesMap.get(ss.empCd);
        attended = rows.filter(a => punchDates?.has(fmtDate(a.workDate))).length;
      } else {
        attended = rows.filter(a => a.present).length;
      }
      const rate = Number(ss.ratePerShift);

      // For linked employees, apply punch deductions; otherwise, just attendance ratio
      let deductionPct = 0;
      if (ss.empCd) {
        const report = monthlyReports.find((r) => r.empCd === ss.empCd);
        if (report) {
          const basic = empBasicMap.get(ss.empCd) ?? 0;
          const lateMinutes = report.totalLateMins ?? 0;
          const earlyLeaveMinutes = report.totalEarlyLeaveMins ?? 0;
          if (basic > 0 && scheduled > 0) {
            const dailyRate = basic / scheduled;
            const minuteRate = dailyRate / 360;
            const MAX_LATE_EARLY_MINS = 200;
            const rawCombinedMins = lateMinutes + earlyLeaveMinutes;
            const cappedMins = Math.min(rawCombinedMins, MAX_LATE_EARLY_MINS);
            const capRatio = rawCombinedMins > 0 ? cappedMins / rawCombinedMins : 1;
            const totalDeduction = round2(lateMinutes * capRatio * minuteRate + earlyLeaveMinutes * capRatio * minuteRate);
            deductionPct = Math.min(1, totalDeduction / basic);
          }
        }
      }

      const basicSalary = round2(scheduled * rate);
      const absent = scheduled - attended;
      const absentDeduction = round2(absent * rate);
      const punchDeduction = round2(basicSalary * deductionPct);
      const netPay = round2(basicSalary - absentDeduction - punchDeduction);

      const commMult = (scheduled > 0 ? attended / scheduled : 1) * (1 - deductionPct);
      shiftStatsMap.set(ss.id, { scheduled, attended, commMult, shiftPay: round2(attended * rate), deductionPct, netPay });
    }

    // Separate doctors and techs — techs join employee pools, doctors get remainder
    const doctors = activeShiftStaff.filter(ss => ss.type === 'doctor');
    const techs   = activeShiftStaff.filter(ss => ss.type === 'tech');
    // Use each tech's net pay (after deductions) for pool calculations
    const sumTechShiftPay = techs.reduce((s, ss) => s + (shiftStatsMap.get(ss.id)?.netPay ?? 0), 0);
    // Denominators: use eligibility-filtered employee sums + techs
    const totalSumForPentacam = sumBasicsForPenta + sumTechShiftPay;
    // Only count techs who have at least one scheduled shift this month
    const activeTechsThisMonth = techs.filter(ss => (shiftStatsMap.get(ss.id)?.scheduled ?? 0) > 0);
    const totalCountForExam    = activeExamCount + activeTechsThisMonth.length;

    // عيادة: count eligible employees per pool to avoid double-paying
    const consultantEligible = !isMarkaz
      ? employees.filter(e => empBasicMap.has(e.empCd) && (e.salaryType === 'استشاري' || e.salaryType === 'الاثنين')).length
      : 0;
    const specialistEligible = !isMarkaz
      ? employees.filter(e => empBasicMap.has(e.empCd) && (e.salaryType === 'أخصائي' || e.salaryType === 'الاثنين')).length
      : 0;
    const perConsultant = examPoolConsultant !== null && consultantEligible > 0 ? examPoolConsultant / consultantEligible : 0;
    const perSpecialist = examPoolSpecialist !== null && specialistEligible > 0 ? examPoolSpecialist / specialistEligible : 0;

    const results: PayrollRow[] = [];

    for (const emp of employees) {
      const basic = empBasicMap.get(emp.empCd);
      if (!basic) continue;

      const report = monthlyReports.find((r) => r.empCd === emp.empCd);

      // Working days = scheduled days (all statuses except holiday)
      const workingDays = dailyRows.filter(
        (d) => d.empCd === emp.empCd && d.status !== 'holiday'
      ).length;

      // Official holidays count as paid non-working days — don't deduct absence for them
      const rawAbsentDays = report?.absentDays ?? 0;
      const absentDays = Math.max(0, rawAbsentDays - holidayWorkingDaysCount);
      const lateMinutes = report?.totalLateMins ?? 0;
      const earlyLeaveMinutes = report?.totalEarlyLeaveMins ?? 0;
      const overtimeMinutes = report?.totalOTMins ?? 0;
      const leaveDays = report?.leaveDays ?? 0;

      const dailyRate = workingDays > 0 ? basic / workingDays : 0;
      const minuteRate = dailyRate / 360; // 6h × 60min

      const overtimeRate = minuteRate * 2; // ساعة الإضافي = ضعف المعدل العادي
      const absentDeduction = round2(absentDays * dailyRate);
      // Cap combined late + early leave at 200 minutes per month
      const MAX_LATE_EARLY_MINS = 200;
      const rawCombinedMins = lateMinutes + earlyLeaveMinutes;
      const cappedMins = Math.min(rawCombinedMins, MAX_LATE_EARLY_MINS);
      const capRatio = rawCombinedMins > 0 ? cappedMins / rawCombinedMins : 1;
      const lateDeduction = round2(lateMinutes * capRatio * minuteRate);
      const earlyLeaveDeduction = round2(earlyLeaveMinutes * capRatio * minuteRate);
      const overtimePay = round2(overtimeMinutes * overtimeRate);
      const penaltyDeduction = round2(
        penalties.filter((p) => p.empCd === emp.empCd).reduce((s, p) => s + Number(p.amount), 0)
      );
      const advancesDeduction = round2(
        advances.filter((a) => a.empCd === emp.empCd).reduce((s, a) => s + Number(a.amount), 0)
      );
      const basicRow = basics
        .filter((b) => b.empCd === emp.empCd)
        .sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)))[0];
      const insuranceDeduction = round2(Number((basicRow as any)?.insuranceDeduction ?? 0));
      const totalDeductions = round2(absentDeduction + lateDeduction + earlyLeaveDeduction + penaltyDeduction + advancesDeduction + insuranceDeduction);
      const deductionPct = basic > 0 ? Math.min(1, totalDeductions / basic) : 0;

      const netBasic = round2(Math.max(0, basic - totalDeductions));
      const lm = leaveMultiplier(leaveDays);
      const commMult = lm * (1 - deductionPct);
      const empRate = emp.attendanceCommissionRate != null ? Number(emp.attendanceCommissionRate) : null;
      const acRate = empRate !== null ? empRate : attendanceCommissionRate(leaveDays, acRates);

      const flags = commFlagsMap.get(emp.empCd) ?? { commAttendance: true, commExam: true, commPentacam: true };

      const attendanceCommission = flags.commAttendance
        ? round2(acRate * basic * (1 - deductionPct))
        : 0;
      let examCommission: number;
      if (!flags.commExam) {
        examCommission = 0;
      } else if (!isMarkaz && (examPoolConsultant !== null || examPoolSpecialist !== null)) {
        const t = emp.salaryType;
        const cShare = (t === 'استشاري' || t === 'الاثنين') ? perConsultant : 0;
        const sShare = (t === 'أخصائي' || t === 'الاثنين') ? perSpecialist : 0;
        examCommission = round2(cShare + sShare);
      } else {
        const examDivisor = isMarkaz ? totalCountForExam : 3;
        const empShares = !isMarkaz && emp.salaryType === 'الاثنين' ? 2 : 1;
        examCommission = round2(examDivisor > 0 ? (examPool / examDivisor) * empShares : 0);
      }
      const pentacamCommission = isMarkaz && flags.commPentacam
        ? round2(totalSumForPentacam > 0 ? (basic / totalSumForPentacam) * pentacamPool * commMult : 0)
        : 0;
      const costOfLivingAllowancePay = round2(costOfLivingAllowance);
      const transportAllowancePay = round2(transportAllowance);
      const day10Allowances = round2(costOfLivingAllowancePay + transportAllowancePay);
      const totalCommission = round2(attendanceCommission + examCommission + pentacamCommission + day10Allowances);
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
        examCommission,
        pentacamCommission,
        costOfLivingAllowance: costOfLivingAllowancePay,
        transportAllowance: transportAllowancePay,
        totalCommission,
        overtimePay,
        totalPay,
      });
    }

    // Add shift staff rows (مركز only)
    // Techs: share pools proportionally with regular employees
    let usedExam  = 0;
    let usedPenta = 0;
    for (const ss of techs) {
      const stats = shiftStatsMap.get(ss.id) ?? { scheduled: 0, attended: 0, commMult: 1, shiftPay: 0, deductionPct: 0, netPay: 0 };
      const { scheduled, attended, commMult, shiftPay, deductionPct, netPay } = stats;

      const rate = Number(ss.ratePerShift);
      const basicSalary = round2(scheduled * rate);
      const absent = scheduled - attended;
      const absentDeduction = round2(absent * rate);
      const punchDeduction = round2(basicSalary * deductionPct);
      const totalDeductions = round2(absentDeduction + punchDeduction);
      const netBasic = netPay;

      const attendanceCommission = round2(0.25 * netBasic);
      const examCommission       = scheduled > 0 && totalCountForExam > 0 ? round2(examPool / totalCountForExam) : 0;
      const pentacamCommission   = round2(totalSumForPentacam > 0 ? (netBasic / totalSumForPentacam) * pentacamPool * commMult : 0);
      usedExam  = round2(usedExam  + examCommission);
      usedPenta = round2(usedPenta + pentacamCommission);
      const totalCommission = round2(attendanceCommission + examCommission + pentacamCommission);
      const totalPay        = round2(netBasic + totalCommission);

      results.push({
        empCd: `shift_${ss.id}`,
        year, month, section,
        basicSalary,
        workingDays:         scheduled,
        absentDays:          absent,
        lateMinutes:         0,
        earlyLeaveMinutes:   0,
        overtimeMinutes:     0,
        leaveDays:           0,
        absentDeduction,
        lateDeduction:       punchDeduction,
        earlyLeaveDeduction: 0,
        penaltyDeduction:    0,
        advancesDeduction:   0,
        insuranceDeduction:  0,
        totalDeductions,
        deductionPct,
        leaveMultiplier:     1,
        netBasic,
        attendanceCommission,
        examCommission,
        pentacamCommission,
        costOfLivingAllowance: 0,
        transportAllowance: 0,
        totalCommission,
        overtimePay:         0,
        totalPay,
      });
    }

    // Doctors: get the remaining pool split equally among them
    const remainingExam  = Math.max(0, round2(examPool  - usedExam));
    const remainingPenta = Math.max(0, round2(pentacamPool - usedPenta));
    for (const ss of doctors) {
      const stats = shiftStatsMap.get(ss.id) ?? { scheduled: 0, attended: 0, commMult: 1, shiftPay: 0, deductionPct: 0, netPay: 0 };
      const { scheduled, attended, commMult, shiftPay, deductionPct, netPay } = stats;

      const rate = Number(ss.ratePerShift);
      const basicSalary = round2(scheduled * rate);
      const absent = scheduled - attended;
      const absentDeduction = round2(absent * rate);
      const punchDeduction = round2(basicSalary * deductionPct);
      const totalDeductions = round2(absentDeduction + punchDeduction);
      const netBasic = netPay;

      const attendanceCommission = round2(0.25 * netBasic);
      const examCommission       = round2(doctors.length > 0 ? remainingExam / doctors.length : 0);
      const pentacamCommission   = round2(doctors.length > 0 ? (remainingPenta / doctors.length) * commMult : 0);
      const totalCommission      = round2(attendanceCommission + examCommission + pentacamCommission);
      const totalPay             = round2(netBasic + totalCommission);

      results.push({
        empCd: `shift_${ss.id}`,
        year, month, section,
        basicSalary,
        workingDays:         scheduled,
        absentDays:          absent,
        lateMinutes:         0,
        earlyLeaveMinutes:   0,
        overtimeMinutes:     0,
        leaveDays:           0,
        absentDeduction,
        lateDeduction:       punchDeduction,
        earlyLeaveDeduction: 0,
        penaltyDeduction:    0,
        advancesDeduction:   0,
        insuranceDeduction:  0,
        totalDeductions,
        deductionPct,
        leaveMultiplier:     1,
        netBasic,
        attendanceCommission,
        examCommission,
        pentacamCommission,
        costOfLivingAllowance: 0,
        transportAllowance: 0,
        totalCommission,
        overtimePay:         0,
        totalPay,
      });
    }

    return results;
  }

  static async savePayroll(rows: PayrollRow[]): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

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
          examCommission: String(r.examCommission) as any,
          pentacamCommission: String(r.pentacamCommission) as any,
          costOfLivingAllowance: String(r.costOfLivingAllowance) as any,
          transportAllowance: String(r.transportAllowance) as any,
          totalCommission: String(r.totalCommission) as any,
          overtimePay: String(r.overtimePay) as any,
          totalPay: String(r.totalPay) as any,
          payrollStatus: 'draft',
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
            examCommission: String(r.examCommission) as any,
            pentacamCommission: String(r.pentacamCommission) as any,
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
