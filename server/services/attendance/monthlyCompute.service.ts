import { getDb } from '../../db';
import { attendanceDaily, attendanceEmployees, attendanceMonthlyReport } from '../../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export class MonthlyComputeService {
  static getYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  static getMonthRange(year: number, month: number): [string, string] {
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    return [`${year}-${mm}-01`, `${year}-${mm}-${dd}`];
  }

  static async buildMonthly(year: number, month: number): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [dateFrom, dateTo] = this.getMonthRange(year, month);

    const daily = await db
      .select()
      .from(attendanceDaily)
      .where(
        and(
          gte(attendanceDaily.workDate, dateFrom),
          lte(attendanceDaily.workDate, dateTo)
        )
      );

    // Group by empCd
    const grouped = new Map<string, any>();

    for (const d of daily) {
      const key = d.empCd;
      if (!grouped.has(key)) {
        grouped.set(key, {
          empCd: d.empCd,
          yyyymm: this.getYearMonth(new Date(year, month - 1)),
          monthStart: dateFrom,
          monthEnd: dateTo,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0,
          holidayDays: 0,
          totalLateMins: 0,
          lateCount: 0,
          totalEarlyLeaveMins: 0,
          earlyLeaveCount: 0,
          totalOTMins: 0,
        });
      }

      const agg = grouped.get(key)!;
      agg.totalDays++;

      if (d.status === 'present' || d.status === 'partial' || d.status === 'missing_checkout') {
        agg.presentDays++;
      } else if (d.status === 'absent') {
        agg.absentDays++;
      } else if (d.status === 'leave') {
        agg.leaveDays++;
      } else if (d.status === 'holiday') {
        agg.holidayDays++;
      }

      agg.totalLateMins += d.lateMinutes || 0;
      if ((d.lateMinutes || 0) > 0) agg.lateCount++;

      agg.totalEarlyLeaveMins += d.earlyLeaveMin || 0;
      if ((d.earlyLeaveMin || 0) > 0) agg.earlyLeaveCount++;

      agg.totalOTMins += d.overtimeMinutes || 0;
    }

    return Array.from(grouped.values());
  }

  static async enrichMonthly(monthly: any[]): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const enriched = [];

    for (const m of monthly) {
      const empRows = await db
        .select()
        .from(attendanceEmployees)
        .where(eq(attendanceEmployees.empCd, m.empCd))
        .limit(1);

      const emp = empRows[0];

      enriched.push({
        ...m,
        empCd: m.empCd,
        empName: emp?.fullName || 'UNKNOWN',
        department: emp?.department || null,
        yyyymm: m.yyyymm,
        totalDays: m.totalDays,
        presentDays: m.presentDays,
        absentDays: m.absentDays,
        leaveDays: m.leaveDays,
        holidayDays: m.holidayDays,
        totalLateMins: m.totalLateMins,
        lateCount: m.lateCount,
        totalEarlyLeaveMins: m.totalEarlyLeaveMins,
        earlyLeaveCount: m.earlyLeaveCount,
        totalOTMins: m.totalOTMins,
        lastUpdated: new Date(),
      });
    }

    return enriched;
  }

  static async generateMonthly(year: number, month: number): Promise<any[]> {
    const monthly = await this.buildMonthly(year, month);
    const enriched = await this.enrichMonthly(monthly);
    return enriched;
  }

  static lateReport(monthly: any[]): any[] {
    return monthly
      .filter((m) => m.lateCount > 0)
      .map((m) => ({
        empCd: m.empCd,
        empName: m.empName,
        lateDays: m.lateCount,
        totalLateMins: m.totalLateMins,
        avgLateMins: Math.round(m.totalLateMins / m.lateCount),
      }))
      .sort((a, b) => b.totalLateMins - a.totalLateMins);
  }

  static absentReport(monthly: any[]): any[] {
    return monthly
      .filter((m) => m.absentDays > 0)
      .map((m) => ({
        empCd: m.empCd,
        empName: m.empName,
        absentDays: m.absentDays,
      }))
      .sort((a, b) => b.absentDays - a.absentDays);
  }

  static otReport(monthly: any[]): any[] {
    return monthly
      .filter((m) => m.totalOTMins > 0)
      .map((m) => ({
        empCd: m.empCd,
        empName: m.empName,
        otDays: Math.ceil(m.totalOTMins / 60 / 8),
        totalOTHours: (m.totalOTMins / 60).toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.totalOTHours) - parseFloat(a.totalOTHours));
  }

  static summaryReport(monthly: any[]): any[] {
    return monthly
      .map((m) => ({
        empCd: m.empCd,
        empName: m.empName,
        departId: m.departId,
        yyyymm: m.yyyymm,
        presentDays: m.presentDays,
        absentDays: m.absentDays,
        leaveDays: m.leaveDays,
        totalLateMins: m.totalLateMins,
        totalEarlyLeaveMins: m.totalEarlyLeaveMins,
        totalOTHours: (m.totalOTMins / 60).toFixed(2),
      }))
      .sort((a, b) => a.empName.localeCompare(b.empName));
  }

  static async saveMonthlyReports(year: number, month: number): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const monthly = await this.buildMonthly(year, month);
    const now = new Date();
    let savedCount = 0;

    for (const m of monthly) {
      const [saveFrom, saveTo] = MonthlyComputeService.getMonthRange(year, month);
      const allDailyRecords = await db
        .select()
        .from(attendanceDaily)
        .where(
          and(
            eq(attendanceDaily.empCd, m.empCd),
            gte(attendanceDaily.workDate, saveFrom),
            lte(attendanceDaily.workDate, saveTo)
          )
        );

      const partialDays = allDailyRecords.filter((d) => d.status === 'partial').length;
      const missingCheckoutDays = allDailyRecords.filter((d) => d.status === 'missing_checkout').length;
      // Recalculate presentDays to include partial + missing_checkout
      m.presentDays = allDailyRecords.filter(
        (d) => d.status === 'present' || d.status === 'partial' || d.status === 'missing_checkout'
      ).length;
      m.absentDays = allDailyRecords.filter((d) => d.status === 'absent').length;

      await db
        .insert(attendanceMonthlyReport)
        .values({
          empCd: m.empCd,
          year,
          month,
          totalDays: m.totalDays,
          presentDays: m.presentDays,
          absentDays: m.absentDays,
          leaveDays: m.leaveDays,
          holidayDays: m.holidayDays,
          partialDays,
          missingCheckoutDays,
          totalLateMins: m.totalLateMins,
          lateCount: m.lateCount,
          totalEarlyLeaveMins: m.totalEarlyLeaveMins,
          earlyLeaveCount: m.earlyLeaveCount,
          totalOTMins: m.totalOTMins,
          computedAt: now,
        })
        .onDuplicateKeyUpdate({
          set: {
            totalDays: m.totalDays,
            presentDays: m.presentDays,
            absentDays: m.absentDays,
            leaveDays: m.leaveDays,
            holidayDays: m.holidayDays,
            partialDays,
            missingCheckoutDays,
            totalLateMins: m.totalLateMins,
            lateCount: m.lateCount,
            totalEarlyLeaveMins: m.totalEarlyLeaveMins,
            earlyLeaveCount: m.earlyLeaveCount,
            totalOTMins: m.totalOTMins,
            computedAt: now,
            updatedAt: now,
          },
        });

      savedCount++;
    }

    return savedCount;
  }
}
