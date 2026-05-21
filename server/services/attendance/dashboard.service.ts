/**
 * Dashboard Service
 * Computes dashboard summary metrics from attendance_daily
 */

import { getDb } from '../../db';
import { attendanceDaily, attendanceSyncRuns } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';

export interface DashboardSummary {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  insideNow: number;
  missingCheckoutYesterday: number;
  lastSync: {
    status: 'never' | 'ok' | 'partial' | 'failed' | 'locked' | 'running';
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
    if (!db) throw new Error('Database not available');

    // Use YYYY-MM-DD strings — Drizzle MySQL date columns compare as strings
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

    // Count present today (status in present, partial, holiday)
    const presentTodayResult = await db
      .select({ count: sql<number>`COUNT(*) as count` })
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${todayStr} AND ${attendanceDaily.status} IN ('present', 'partial', 'holiday')`);
    const presentToday = Number(presentTodayResult[0]?.count ?? 0);

    // Count absent today
    const absentTodayResult = await db
      .select({ count: sql<number>`COUNT(*) as count` })
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${todayStr} AND ${attendanceDaily.status} = 'absent'`);
    const absentToday = Number(absentTodayResult[0]?.count ?? 0);

    // Count late today (late_minutes > 0)
    const lateTodayResult = await db
      .select({ count: sql<number>`COUNT(*) as count` })
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${todayStr} AND ${attendanceDaily.lateMinutes} > 0`);
    const lateToday = Number(lateTodayResult[0]?.count ?? 0);

    // Count inside now (today and inside_now = 1)
    const insideNowResult = await db
      .select({ count: sql<number>`COUNT(*) as count` })
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${todayStr} AND ${attendanceDaily.insideNow} = 1`);
    const insideNow = Number(insideNowResult[0]?.count ?? 0);

    // Count missing checkout yesterday
    const missingCheckoutResult = await db
      .select({ count: sql<number>`COUNT(*) as count` })
      .from(attendanceDaily)
      .where(sql`${attendanceDaily.workDate} = ${yesterdayStr} AND ${attendanceDaily.status} = 'missing_checkout'`);
    const missingCheckoutYesterday = Number(missingCheckoutResult[0]?.count ?? 0);

    // Get last sync run
    const lastSyncRows = await db
      .select()
      .from(attendanceSyncRuns)
      .orderBy(sql`${attendanceSyncRuns.startedAt} DESC`)
      .limit(1);

    const lastSyncRow = lastSyncRows[0];
    const lastSync = {
      status: (lastSyncRow?.status ?? 'never') as 'never' | 'ok' | 'partial' | 'failed' | 'locked' | 'running',
      finishedAt: lastSyncRow?.finishedAt?.toISOString() ?? null,
      rowsInserted: lastSyncRow?.rowsInserted ?? 0,
      highWaterMark: lastSyncRow?.highWaterMark?.toISOString() ?? null,
      error: lastSyncRow?.error ?? null,
    };

    return {
      presentToday,
      absentToday,
      lateToday,
      insideNow,
      missingCheckoutYesterday,
      lastSync,
      asOf: new Date().toISOString(),
    };
  }
}
