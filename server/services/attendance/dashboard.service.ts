/**
 * Dashboard Service
 * Computes dashboard summary metrics from attendance_daily
 */

import { getDb } from "../../db";
import {
  attendanceDaily,
  attendanceSyncRuns,
  attendanceShifts,
  salaryBasics,
} from "../../../drizzle/schema";
import { sql, eq } from "drizzle-orm";
import { aggregateAttendanceDays } from "./dailyAggregation";

export interface SectionCounts {
  presentToday: number;
  presentMorning: number;
  presentEvening: number;
  absentToday: number;
  lateToday: number;
  insideNow: number;
  missingCheckoutYesterday: number;
}

export type DashboardSection = "center" | "clinic" | "unassigned";

export interface DashboardSummary extends SectionCounts {
  /** Same counts split by the employee's payroll section (مركز / عيادة). */
  bySection: Record<DashboardSection, SectionCounts>;
  lastSync: {
    status: "never" | "ok" | "partial" | "failed" | "locked" | "running";
    finishedAt: string | null;
    rowsInserted: number;
    highWaterMark: string | null;
    error: string | null;
  };
  asOf: string;
}

export class DashboardService {
  static async getSummary(): Promise<DashboardSummary> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Use YYYY-MM-DD strings — Drizzle MySQL date columns compare as strings
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;

    const todayRows = await db
      .select()
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${todayStr}`);
    const todayDays = aggregateAttendanceDays(todayRows as any[]);

    // The attendance roster has no center/clinic flag; payroll basics do.
    const sectionRows = await db
      .select({ empCd: salaryBasics.empCd, section: salaryBasics.section })
      .from(salaryBasics);
    const sectionByEmp = new Map<string, DashboardSection>();
    for (const row of sectionRows as { empCd: string; section: string }[]) {
      if (row.section === "عيادة") sectionByEmp.set(row.empCd, "clinic");
      else if (row.section === "مركز" && !sectionByEmp.has(row.empCd))
        sectionByEmp.set(row.empCd, "center");
    }
    const emptyCounts = (): SectionCounts => ({
      presentToday: 0,
      presentMorning: 0,
      presentEvening: 0,
      absentToday: 0,
      lateToday: 0,
      insideNow: 0,
      missingCheckoutYesterday: 0,
    });
    const bySection: Record<DashboardSection, SectionCounts> = {
      center: emptyCounts(),
      clinic: emptyCounts(),
      unassigned: emptyCounts(),
    };
    const bucket = (empCd: string) =>
      bySection[sectionByEmp.get(empCd) ?? "unassigned"];
    const punchedEmployees = new Set(
      todayRows
        .filter(
          (row: { firstIn: Date | null; lastOut: Date | null }) =>
            row.firstIn || row.lastOut,
        )
        .map((row: { empCd: string }) => row.empCd),
    );
    const presentDays = todayDays.filter(
      (day) =>
        ["present", "partial", "missing_checkout"].includes(day.status) ||
        (day.status === "holiday" && punchedEmployees.has(day.empCd)),
    );
    const presentToday = presentDays.length;
    presentDays.forEach((day) => (bucket(day.empCd).presentToday += 1));

    // Count present today by shift
    const presentList = await db
      .select({
        empCd: attendanceDaily.empCd,
        shiftStartTime: attendanceShifts.startTime,
        firstIn: attendanceDaily.firstIn,
      })
      .from(attendanceDaily)
      .leftJoin(
        attendanceShifts,
        eq(attendanceDaily.shiftId, attendanceShifts.id),
      )
      .where(
        sql`${attendanceDaily.workDate} = ${todayStr} AND ${attendanceDaily.insideNow} = 1`,
      );

    let presentMorning = 0;
    let presentEvening = 0;
    const classifiedEmployees = new Set<string>();
    presentList.forEach((row: (typeof presentList)[number]) => {
      if (classifiedEmployees.has(row.empCd)) return;
      classifiedEmployees.add(row.empCd);
      const target = bucket(row.empCd);
      const morning = row.shiftStartTime
        ? row.shiftStartTime < "13:00"
        : row.firstIn
          ? row.firstIn.getHours() < 13
          : true;
      if (morning) {
        presentMorning++;
        target.presentMorning += 1;
      } else {
        presentEvening++;
        target.presentEvening += 1;
      }
    });

    // Count absent today
    const absentDays = todayDays.filter((day) => day.status === "absent");
    const absentToday = absentDays.length;
    absentDays.forEach((day) => (bucket(day.empCd).absentToday += 1));

    // Count late today (late_minutes > 0)
    const lateDays = todayDays.filter((day) => (day.lateMinutes ?? 0) > 0);
    const lateToday = lateDays.length;
    lateDays.forEach((day) => (bucket(day.empCd).lateToday += 1));

    // Count inside now (today and inside_now = 1)
    const insideDays = todayDays.filter((day) => day.insideNow);
    const insideNow = insideDays.length;
    insideDays.forEach((day) => (bucket(day.empCd).insideNow += 1));

    // Count missing checkout yesterday
    const yesterdayRows = await db
      .select()
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${yesterdayStr}`);
    const missingDays = aggregateAttendanceDays(
      yesterdayRows as any[],
    ).filter((day) => day.status === "missing_checkout");
    const missingCheckoutYesterday = missingDays.length;
    missingDays.forEach(
      (day) => (bucket(day.empCd).missingCheckoutYesterday += 1),
    );

    const lastSyncRows = await db
      .select()
      .from(attendanceSyncRuns)
      .orderBy(sql`${attendanceSyncRuns.startedAt} DESC`)
      .limit(1);

    const lastSyncRow = lastSyncRows[0];
    const lastSync = {
      status: (lastSyncRow?.status ?? "never") as
        "never" | "ok" | "partial" | "failed" | "locked" | "running",
      finishedAt: lastSyncRow?.finishedAt?.toISOString() ?? null,
      rowsInserted: lastSyncRow?.rowsInserted ?? 0,
      highWaterMark: lastSyncRow?.highWaterMark?.toISOString() ?? null,
      error: lastSyncRow?.error ?? null,
    };

    return {
      presentToday,
      presentMorning,
      presentEvening,
      absentToday,
      lateToday,
      insideNow,
      missingCheckoutYesterday,
      bySection,
      lastSync,
      asOf: now.toISOString(),
    };
  }
}
