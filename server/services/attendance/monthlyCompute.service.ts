import { getDb } from "../../db";
import {
  attendanceDaily,
  attendanceEmployees,
  attendanceMonthlyReport,
} from "../../../drizzle/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { aggregateAttendanceDays } from "./dailyAggregation";

export class MonthlyComputeService {
  static getYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  static getMonthRange(year: number, month: number): [string, string] {
    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, "0");
    return [`${year}-${mm}-01`, `${year}-${mm}-${dd}`];
  }

  static async buildMonthly(year: number, month: number): Promise<any[]> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [dateFrom, dateTo] = this.getMonthRange(year, month);

    const daily = await db
      .select()
      .from(attendanceDaily)
      .where(
        and(
          gte(attendanceDaily.workDate, dateFrom as any),
          lte(attendanceDaily.workDate, dateTo as any),
        ),
      );

    // Day counts are employee-level; minute totals are still the sum of all
    // assigned shifts in that day.
    const employeeDays = aggregateAttendanceDays(daily as any[]);

    // Group by empCd
    const grouped = new Map<string, any>();

    for (const d of employeeDays) {
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

      if (
        d.status === "present" ||
        d.status === "partial" ||
        d.status === "missing_checkout"
      ) {
        agg.presentDays++;
      } else if (d.status === "absent") {
        agg.absentDays++;
      } else if (d.status === "leave") {
        agg.leaveDays++;
      } else if (d.status === "holiday") {
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
    if (!db) throw new Error("Database not available");

    if (monthly.length === 0) return [];
    const employeeRows = await db
      .select({ empCd: attendanceEmployees.empCd, fullName: attendanceEmployees.fullName, department: attendanceEmployees.department })
      .from(attendanceEmployees)
      .where(inArray(attendanceEmployees.empCd, monthly.map((row) => row.empCd)));
    const employeeByCode = new Map<
      string,
      { fullName: string | null; department: string | null }
    >(
      employeeRows.map(
        (employee: {
          empCd: string;
          fullName: string | null;
          department: string | null;
        }) => [employee.empCd, employee] as const,
      ),
    );

    return monthly.map((m) => {
      const emp = employeeByCode.get(m.empCd);
      return {
        ...m,
        empCd: m.empCd,
        empName: emp?.fullName || "UNKNOWN",
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
      };
    });
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
        department: m.department ?? null,
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

  static async saveEmployeeMonth(
    empCd: string,
    year: number,
    month: number,
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [dateFrom, dateTo] = this.getMonthRange(year, month);
    const rows = await db
      .select()
      .from(attendanceDaily)
      .where(
        and(
          eq(attendanceDaily.empCd, empCd),
          gte(attendanceDaily.workDate, dateFrom as any),
          lte(attendanceDaily.workDate, dateTo as any),
        ),
      );
    const days = aggregateAttendanceDays(rows as any[]);
    if (days.length === 0) {
      await db
        .delete(attendanceMonthlyReport)
        .where(
          and(
            eq(attendanceMonthlyReport.empCd, empCd),
            eq(attendanceMonthlyReport.year, year),
            eq(attendanceMonthlyReport.month, month),
          ),
        );
      return;
    }
    const partialDays = days.filter((d) => d.status === "partial").length;
    const missingCheckoutDays = days.filter(
      (d) => d.status === "missing_checkout",
    ).length;
    const now = new Date();
    await db
      .insert(attendanceMonthlyReport)
      .values({
        empCd,
        year,
        month,
        totalDays: days.length,
        presentDays: days.filter((d) =>
          ["present", "partial", "missing_checkout"].includes(d.status),
        ).length,
        absentDays: days.filter((d) => d.status === "absent").length,
        leaveDays: days.filter((d) => d.status === "leave").length,
        holidayDays: days.filter((d) => d.status === "holiday").length,
        partialDays,
        missingCheckoutDays,
        totalLateMins: days.reduce((sum, d) => sum + (d.lateMinutes ?? 0), 0),
        lateCount: days.filter((d) => (d.lateMinutes ?? 0) > 0).length,
        totalEarlyLeaveMins: days.reduce(
          (sum, d) => sum + (d.earlyLeaveMin ?? 0),
          0,
        ),
        earlyLeaveCount: days.filter((d) => (d.earlyLeaveMin ?? 0) > 0).length,
        totalOTMins: days.reduce((sum, d) => sum + (d.overtimeMinutes ?? 0), 0),
        computedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          totalDays: days.length,
          presentDays: days.filter((d) =>
            ["present", "partial", "missing_checkout"].includes(d.status),
          ).length,
          absentDays: days.filter((d) => d.status === "absent").length,
          leaveDays: days.filter((d) => d.status === "leave").length,
          holidayDays: days.filter((d) => d.status === "holiday").length,
          partialDays,
          missingCheckoutDays,
          totalLateMins: days.reduce((sum, d) => sum + (d.lateMinutes ?? 0), 0),
          lateCount: days.filter((d) => (d.lateMinutes ?? 0) > 0).length,
          totalEarlyLeaveMins: days.reduce(
            (sum, d) => sum + (d.earlyLeaveMin ?? 0),
            0,
          ),
          earlyLeaveCount: days.filter((d) => (d.earlyLeaveMin ?? 0) > 0)
            .length,
          totalOTMins: days.reduce(
            (sum, d) => sum + (d.overtimeMinutes ?? 0),
            0,
          ),
          computedAt: now,
        },
      });
  }

  static async saveMonthlyReports(
    year: number,
    month: number,
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const monthly = await this.buildMonthly(year, month);
    const now = new Date();
    let savedCount = 0;

    const [saveFrom, saveTo] = MonthlyComputeService.getMonthRange(year, month);
    const allDailyRecords = await db
      .select()
      .from(attendanceDaily)
      .where(and(
        gte(attendanceDaily.workDate, saveFrom as any),
        lte(attendanceDaily.workDate, saveTo as any),
        inArray(attendanceDaily.empCd, monthly.map((row) => row.empCd)),
      ));
    const dailyByEmployee = new Map<string, any[]>();
    for (const row of allDailyRecords) {
      const rows = dailyByEmployee.get(row.empCd) ?? [];
      rows.push(row);
      dailyByEmployee.set(row.empCd, rows);
    }

    for (const m of monthly) {
      const employeeDays = aggregateAttendanceDays(dailyByEmployee.get(m.empCd) ?? []);
      const partialDays = employeeDays.filter(
        (d: any) => d.status === "partial",
      ).length;
      const missingCheckoutDays = employeeDays.filter(
        (d: any) => d.status === "missing_checkout",
      ).length;
      // Recalculate presentDays to include partial + missing_checkout
      m.presentDays = employeeDays.filter(
        (d: any) =>
          d.status === "present" ||
          d.status === "partial" ||
          d.status === "missing_checkout",
      ).length;
      m.absentDays = employeeDays.filter(
        (d: any) => d.status === "absent",
      ).length;

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
