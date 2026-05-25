import { getDb } from '../../db';
import {
  attendanceEmployees,
  attendanceMonthlyReport,
  attendanceDaily,
  salaryBasics,
  salaryPenalties,
  salaryCommissionPools,
  salaryPayroll,
  salaryConfig,
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
  totalDeductions: number;
  deductionPct: number;
  leaveMultiplier: number;
  netBasic: number;
  attendanceCommission: number;
  examCommission: number;
  pentacamCommission: number;
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

    const [poolRows, basics, monthlyReports, dailyRows, penalties] = await Promise.all([
      db.select().from(salaryCommissionPools)
        .where(and(eq(salaryCommissionPools.year, year), eq(salaryCommissionPools.month, month), eq(salaryCommissionPools.section, section)))
        .limit(1),
      db.select().from(salaryBasics)
        .where(and(
          lte(salaryBasics.effectiveFrom, lastDay as any),
          or(isNull(salaryBasics.effectiveTo), gte(salaryBasics.effectiveTo, firstDay as any))
        )),
      db.select().from(attendanceMonthlyReport)
        .where(and(eq(attendanceMonthlyReport.year, year), eq(attendanceMonthlyReport.month, month))),
      db.select({ empCd: attendanceDaily.empCd, status: attendanceDaily.status })
        .from(attendanceDaily)
        .where(and(gte(attendanceDaily.workDate, firstDay as any), lte(attendanceDaily.workDate, lastDay as any))),
      db.select().from(salaryPenalties)
        .where(and(eq(salaryPenalties.year, year), eq(salaryPenalties.month, month))),
    ]);

    const pool = poolRows[0];
    const examPool = pool ? Number(pool.examPool) : 0;
    const examPoolConsultant = pool?.examPoolConsultant != null ? Number(pool.examPoolConsultant) : null;
    const examPoolSpecialist = pool?.examPoolSpecialist != null ? Number(pool.examPoolSpecialist) : null;
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

    const sumAllBasics = Array.from(empBasicMap.values()).reduce((s, b) => s + b, 0);
    const activeCount = empBasicMap.size;

    // Load shift staff for مركز — they share the same exam/pentacam pools
    const activeShiftStaff = isMarkaz
      ? (await db.select().from(shiftStaff)).filter(ss => ss.active)
      : [];
    const shiftAttRows = activeShiftStaff.length > 0
      ? await db.select().from(shiftAttendance)
          .where(and(eq(shiftAttendance.year, year), eq(shiftAttendance.month, month)))
      : [];

    type ShiftStats = { scheduled: number; attended: number; commMult: number; shiftPay: number };
    const shiftStatsMap = new Map<number, ShiftStats>();
    for (const ss of activeShiftStaff) {
      const rows = shiftAttRows.filter(a => a.staffId === ss.id);
      const scheduled = rows.length;
      const attended = rows.filter(a => a.present).length;
      const commMult = scheduled > 0 ? attended / scheduled : 1;
      shiftStatsMap.set(ss.id, { scheduled, attended, commMult, shiftPay: round2(Number(ss.ratePerShift) * attended) });
    }

    // Separate doctors and techs — techs join employee pools, doctors get remainder
    const doctors = activeShiftStaff.filter(ss => ss.type === 'doctor');
    const techs   = activeShiftStaff.filter(ss => ss.type === 'tech');
    // Use each tech's actual monthly shift pay (rate × attended) — same unit as employee basicSalary
    const sumTechShiftPay = techs.reduce((s, ss) => s + (shiftStatsMap.get(ss.id)?.shiftPay ?? 0), 0);
    // Denominators include only techs alongside regular employees
    const totalSumForPentacam = sumAllBasics + sumTechShiftPay;
    // Only count techs who have at least one scheduled shift this month
    const activeTechsThisMonth = techs.filter(ss => (shiftStatsMap.get(ss.id)?.scheduled ?? 0) > 0);
    const totalCountForExam    = activeCount + activeTechsThisMonth.length;

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

      const absentDays = report?.absentDays ?? 0;
      const lateMinutes = report?.totalLateMins ?? 0;
      const earlyLeaveMinutes = report?.totalEarlyLeaveMins ?? 0;
      const overtimeMinutes = report?.totalOTMins ?? 0;
      const leaveDays = report?.leaveDays ?? 0;

      const dailyRate = workingDays > 0 ? basic / workingDays : 0;
      const minuteRate = dailyRate / 360; // 6h × 60min

      const overtimeRate = minuteRate * 2; // ساعة الإضافي = ضعف المعدل العادي
      const absentDeduction = round2(absentDays * dailyRate);
      const lateDeduction = round2(lateMinutes * minuteRate);
      const earlyLeaveDeduction = round2(earlyLeaveMinutes * minuteRate);
      const overtimePay = round2(overtimeMinutes * overtimeRate);
      const penaltyDeduction = round2(
        penalties.filter((p) => p.empCd === emp.empCd).reduce((s, p) => s + Number(p.amount), 0)
      );
      const totalDeductions = round2(absentDeduction + lateDeduction + earlyLeaveDeduction + penaltyDeduction);
      const deductionPct = basic > 0 ? Math.min(1, totalDeductions / basic) : 0;

      const netBasic = round2(Math.max(0, basic - totalDeductions));
      const lm = leaveMultiplier(leaveDays);
      const commMult = lm * (1 - deductionPct);
      const empRate = emp.attendanceCommissionRate != null ? Number(emp.attendanceCommissionRate) : null;
      const acRate = empRate !== null ? empRate : attendanceCommissionRate(leaveDays, acRates);

      const attendanceCommission = round2(acRate * basic * (1 - deductionPct));
      let examCommission: number;
      if (!isMarkaz && (examPoolConsultant !== null || examPoolSpecialist !== null)) {
        const t = emp.salaryType;
        const cShare = (t === 'استشاري' || t === 'الاثنين') ? perConsultant : 0;
        const sShare = (t === 'أخصائي' || t === 'الاثنين') ? perSpecialist : 0;
        examCommission = round2((cShare + sShare) * commMult);
      } else {
        const examDivisor = isMarkaz ? totalCountForExam : 3;
        const empShares = !isMarkaz && emp.salaryType === 'الاثنين' ? 2 : 1;
        examCommission = round2(examDivisor > 0 ? (examPool / examDivisor) * empShares : 0);
      }
      const pentacamCommission = round2(
        totalSumForPentacam > 0 ? (basic / totalSumForPentacam) * pentacamPool * commMult : 0
      );
      const totalCommission = round2(attendanceCommission + examCommission + pentacamCommission);
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
        totalDeductions,
        deductionPct,
        leaveMultiplier: lm,
        netBasic,
        attendanceCommission,
        examCommission,
        pentacamCommission,
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
      const stats = shiftStatsMap.get(ss.id) ?? { scheduled: 0, attended: 0, commMult: 1, shiftPay: 0 };
      const { scheduled, attended, commMult, shiftPay } = stats;

      const attendanceCommission = round2(0.25 * shiftPay);
      const examCommission       = scheduled > 0 && totalCountForExam > 0 ? round2(examPool / totalCountForExam) : 0;
      const pentacamCommission   = round2(totalSumForPentacam > 0 ? (shiftPay / totalSumForPentacam) * pentacamPool * commMult : 0);
      usedExam  = round2(usedExam  + examCommission);
      usedPenta = round2(usedPenta + pentacamCommission);
      const totalCommission = round2(attendanceCommission + examCommission + pentacamCommission);
      const totalPay        = round2(shiftPay + totalCommission);

      results.push({
        empCd: `shift_${ss.id}`,
        year, month, section,
        basicSalary:         shiftPay,
        workingDays:         scheduled,
        absentDays:          scheduled - attended,
        lateMinutes:         0,
        earlyLeaveMinutes:   0,
        overtimeMinutes:     0,
        leaveDays:           0,
        absentDeduction:     0,
        lateDeduction:       0,
        earlyLeaveDeduction: 0,
        penaltyDeduction:    0,
        totalDeductions:     0,
        deductionPct:        0,
        leaveMultiplier:     1,
        netBasic:            shiftPay,
        attendanceCommission,
        examCommission,
        pentacamCommission,
        totalCommission,
        overtimePay:         0,
        totalPay,
      });
    }

    // Doctors: get the remaining pool split equally among them
    const remainingExam  = Math.max(0, round2(examPool  - usedExam));
    const remainingPenta = Math.max(0, round2(pentacamPool - usedPenta));
    for (const ss of doctors) {
      const stats = shiftStatsMap.get(ss.id) ?? { scheduled: 0, attended: 0, commMult: 1, shiftPay: 0 };
      const { scheduled, attended, commMult, shiftPay } = stats;

      const attendanceCommission = round2(0.25 * shiftPay);
      const examCommission       = round2(doctors.length > 0 ? remainingExam / doctors.length : 0);
      const pentacamCommission   = round2(doctors.length > 0 ? (remainingPenta / doctors.length) * commMult : 0);
      const totalCommission      = round2(attendanceCommission + examCommission + pentacamCommission);
      const totalPay             = round2(shiftPay + totalCommission);

      results.push({
        empCd: `shift_${ss.id}`,
        year, month, section,
        basicSalary:         shiftPay,
        workingDays:         scheduled,
        absentDays:          scheduled - attended,
        lateMinutes:         0,
        earlyLeaveMinutes:   0,
        overtimeMinutes:     0,
        leaveDays:           0,
        absentDeduction:     0,
        lateDeduction:       0,
        earlyLeaveDeduction: 0,
        penaltyDeduction:    0,
        totalDeductions:     0,
        deductionPct:        0,
        leaveMultiplier:     1,
        netBasic:            shiftPay,
        attendanceCommission,
        examCommission,
        pentacamCommission,
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
          totalDeductions: String(r.totalDeductions) as any,
          deductionPct: String(r.deductionPct) as any,
          leaveMultiplier: String(r.leaveMultiplier) as any,
          netBasic: String(r.netBasic) as any,
          attendanceCommission: String(r.attendanceCommission) as any,
          examCommission: String(r.examCommission) as any,
          pentacamCommission: String(r.pentacamCommission) as any,
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
            totalDeductions: String(r.totalDeductions) as any,
            deductionPct: String(r.deductionPct) as any,
            leaveMultiplier: String(r.leaveMultiplier) as any,
            netBasic: String(r.netBasic) as any,
            attendanceCommission: String(r.attendanceCommission) as any,
            examCommission: String(r.examCommission) as any,
            pentacamCommission: String(r.pentacamCommission) as any,
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
