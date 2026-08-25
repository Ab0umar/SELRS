/**
 * Dashboard Service
 * Computes dashboard summary metrics from attendance_daily
 */

import { getDb } from "../../db";
import { attendanceDaily, attendanceSyncRuns, attendanceShifts } from "../../../drizzle/schema";
import { sql, eq } from "drizzle-orm";
import { aggregateAttendanceDays } from "./dailyAggregation";

export interface DashboardSummary {
  presentToday: number;
  presentMorning: number;
  presentEvening: number;
  absentToday: number;
  lateToday: number;
  insideNow: number;
  missingCheckoutYesterday: number;
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
    const presentToday = todayDays.filter((day) =>
      ["present", "partial", "missing_checkout", "holiday"].includes(day.status),
    ).length;

    // Count present today by shift
    const presentList = await db
      .select({
        shiftStartTime: attendanceShifts.startTime,
        firstIn: attendanceDaily.firstIn,
      })
      .from(attendanceDaily)
      .leftJoin(attendanceShifts, eq(attendanceDaily.shiftId, attendanceShifts.id))
      .where(
        sql`${attendanceDaily.workDate} = ${todayStr} AND ${attendanceDaily.status} IN ('present', 'partial', 'holiday')`,
      );

    let presentMorning = 0;
    let presentEvening = 0;
    presentList.forEach((row: (typeof presentList)[number]) => {
      if (row.shiftStartTime) {
        if (row.shiftStartTime < "13:00") presentMorning++;
        else presentEvening++;
      } else if (row.firstIn) {
        const h = row.firstIn.getHours();
        if (h < 13) presentMorning++;
        else presentEvening++;
      } else {
        presentMorning++;
      }
    });

    // Count absent today
    const absentToday = todayDays.filter((day) => day.status === "absent").length;

    // Count late today (late_minutes > 0)
    const lateToday = todayDays.filter((day) => (day.lateMinutes ?? 0) > 0).length;

    // Count inside now (today and inside_now = 1)
    const insideNow = todayDays.filter((day) => day.insideNow).length;

    // Count missing checkout yesterday
    const yesterdayRows = await db
      .select()
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${yesterdayStr}`);
    const missingCheckoutYesterday = aggregateAttendanceDays(yesterdayRows as any[])
      .filter((day) => day.status === "missing_checkout").length;

    // Get last sync run
    const lastSyncRows = await db
      .select()
      .from(attendanceSyncRuns)
      .orderBy(sql`${attendanceSyncRuns.startedAt} DESC`)
      .limit(1);

    const lastSyncRow = lastSyncRows[0];
    const lastSync = {
      status: (lastSyncRow?.status ?? "never") as
        | "never"
        | "ok"
        | "partial"
        | "failed"
        | "locked"
        | "running",
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
      lastSync,
      asOf: now.toISOString(),
    };
  }
}
