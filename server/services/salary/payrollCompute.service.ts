import { getDb } from '../../db';
import {
  attendanceEmployees,
  attendanceMonthlyReport,
  attendanceDaily,
  salaryBasics,
  salaryPenalties,
  salaryCommissionPools,
  salaryPayroll,
} from '../../../drizzle/schema';
import { eq, and, gte, lte, isNull, or } from 'drizzle-orm';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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
  basicSalary: number;
  workingDays: number;
  absentDays: number;
  lateMinutes: number;
  leaveDays: number;
  absentDeduction: number;
  lateDeduction: number;
  penaltyDeduction: number;
  totalDeductions: number;
  deductionPct: number;
  leaveMultiplier: number;
  netBasic: number;
  attendanceCommission: number;
  examCommission: number;
  pentacamCommission: number;
  totalCommission: number;
  totalPay: number;
}

export class PayrollComputeService {
  static async compute(year: number, month: number, filterEmpCd?: string): Promise<PayrollRow[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [firstDay, lastDay] = monthRange(year, month);

    const employees = filterEmpCd
      ? await db.select().from(attendanceEmployees).where(eq(attendanceEmployees.empCd, filterEmpCd))
      : await db.select().from(attendanceEmployees);

    const [poolRows, basics, monthlyReports, dailyRows, penalties] = await Promise.all([
      db.select().from(salaryCommissionPools)
        .where(and(eq(salaryCommissionPools.year, year), eq(salaryCommissionPools.month, month)))
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
    const pentacamPool = pool ? Number(pool.pentacamPool) : 0;

    // Resolve each employee's current basic (most recent effectiveFrom)
    const empBasicMap = new Map<string, number>();
    for (const emp of employees) {
      const rows = basics
        .filter((b) => b.empCd === emp.empCd)
        .sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
      if (rows.length > 0) empBasicMap.set(emp.empCd, Number(rows[0].basicAmount));
    }

    const sumAllBasics = Array.from(empBasicMap.values()).reduce((s, b) => s + b, 0);
    const activeCount = employees.filter((e) => empBasicMap.has(e.empCd)).length;

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
      const leaveDays = report?.leaveDays ?? 0;

      const dailyRate = workingDays > 0 ? basic / workingDays : 0;
      const minuteRate = dailyRate / 480; // 8h × 60min

      const absentDeduction = round2(absentDays * dailyRate);
      const lateDeduction = round2(lateMinutes * minuteRate);
      const penaltyDeduction = round2(
        penalties.filter((p) => p.empCd === emp.empCd).reduce((s, p) => s + Number(p.amount), 0)
      );
      const totalDeductions = round2(absentDeduction + lateDeduction + penaltyDeduction);
      const deductionPct = basic > 0 ? Math.min(1, totalDeductions / basic) : 0;

      const netBasic = round2(Math.max(0, basic - totalDeductions));
      const lm = leaveMultiplier(leaveDays);
      const commMult = lm * (1 - deductionPct);

      const attendanceCommission = round2(0.25 * basic * commMult);
      const examCommission = round2(activeCount > 0 ? (examPool / activeCount) * commMult : 0);
      const pentacamCommission = round2(
        sumAllBasics > 0 ? (basic / sumAllBasics) * pentacamPool * commMult : 0
      );
      const totalCommission = round2(attendanceCommission + examCommission + pentacamCommission);
      const totalPay = round2(netBasic + totalCommission);

      results.push({
        empCd: emp.empCd,
        year,
        month,
        basicSalary: basic,
        workingDays,
        absentDays,
        lateMinutes,
        leaveDays,
        absentDeduction,
        lateDeduction,
        penaltyDeduction,
        totalDeductions,
        deductionPct,
        leaveMultiplier: lm,
        netBasic,
        attendanceCommission,
        examCommission,
        pentacamCommission,
        totalCommission,
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
          basicSalary: String(r.basicSalary) as any,
          workingDays: r.workingDays,
          absentDays: r.absentDays,
          lateMinutes: r.lateMinutes,
          leaveDays: r.leaveDays,
          absentDeduction: String(r.absentDeduction) as any,
          lateDeduction: String(r.lateDeduction) as any,
          penaltyDeduction: String(r.penaltyDeduction) as any,
          totalDeductions: String(r.totalDeductions) as any,
          deductionPct: String(r.deductionPct) as any,
          leaveMultiplier: String(r.leaveMultiplier) as any,
          netBasic: String(r.netBasic) as any,
          attendanceCommission: String(r.attendanceCommission) as any,
          examCommission: String(r.examCommission) as any,
          pentacamCommission: String(r.pentacamCommission) as any,
          totalCommission: String(r.totalCommission) as any,
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
            leaveDays: r.leaveDays,
            absentDeduction: String(r.absentDeduction) as any,
            lateDeduction: String(r.lateDeduction) as any,
            penaltyDeduction: String(r.penaltyDeduction) as any,
            totalDeductions: String(r.totalDeductions) as any,
            deductionPct: String(r.deductionPct) as any,
            leaveMultiplier: String(r.leaveMultiplier) as any,
            netBasic: String(r.netBasic) as any,
            attendanceCommission: String(r.attendanceCommission) as any,
            examCommission: String(r.examCommission) as any,
            pentacamCommission: String(r.pentacamCommission) as any,
            totalCommission: String(r.totalCommission) as any,
            totalPay: String(r.totalPay) as any,
            computedAt: now,
          },
        });
      saved++;
    }

    return saved;
  }
}
