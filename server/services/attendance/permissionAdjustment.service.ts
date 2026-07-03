import { getDb } from "../../db";
import { attendanceDaily, attendanceLeaves } from "../../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

function dateKey(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export class PermissionAdjustmentService {
  /**
   * Apply leave adjustments to daily records
   * Updates status to 'leave' for dates covered by approved leaves
   */
  static async applyLeaveAdjustments(
    empCd: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const fromKey = dateKey(fromDate);
    const toKey = dateKey(toDate);

    // Get approved leaves for this employee in the date range
    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.approved, true),
          lte(attendanceLeaves.dateFrom, toKey as any),
          gte(attendanceLeaves.dateTo, fromKey as any),
        ),
      );

    let updatedCount = 0;

    // For each leave, update daily records within that date range
    for (const leave of leaves) {
      const leaveStartKey = dateKey(leave.dateFrom as any);
      const leaveEndKey = dateKey(leave.dateTo as any);

      // Get daily records within leave date range
      const dailyRecords = await db
        .select()
        .from(attendanceDaily)
        .where(
          and(
            eq(attendanceDaily.empCd, empCd),
            gte(attendanceDaily.workDate, leaveStartKey as any),
            lte(attendanceDaily.workDate, leaveEndKey as any),
          ),
        );

      // Update each daily record to 'leave' status
      for (const daily of dailyRecords) {
        const result: any = await db
          .update(attendanceDaily)
          .set({
            status: "leave",
            leaveType: (leave as any).type ?? null,
            leaveNotAffectCommission: (leave as any).notAffectCommission ?? false,
            lateMinutes: 0,
            earlyLeaveMin: 0,
          })
          .where(
            and(
              eq(attendanceDaily.empCd, empCd),
              eq(attendanceDaily.workDate, dateKey(daily.workDate) as any),
            ),
          );

        updatedCount += result?.[0]?.affectedRows ?? 0;
      }
    }

    return updatedCount;
  }

  /**
   * Recompute daily records for a date range
   * Applies all adjustments (leaves, permissions, etc.)
   */
  static async recomputeRange(
    empCd: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    // First, get all daily records in the range and reset them (if needed)
    // Then apply leave adjustments
    return this.applyLeaveAdjustments(empCd, fromDate, toDate);
  }

  /**
   * Recompute daily for all employees in a date range
   * Used when approving bulk leaves or batch processing
   */
  static async recomputeAllEmployees(
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get all daily records in range
    const dailyRecords = await db
      .select()
      .from(attendanceDaily)
      .where(
        and(
          gte(attendanceDaily.workDate, fromDate),
          lte(attendanceDaily.workDate, toDate),
        ),
      );

    // Group by empCd and recompute
    const empCodes = [...new Set(dailyRecords.map((d: any) => d.empCd))];
    let totalUpdated = 0;

    for (const empCd of empCodes) {
      const updated = await this.recomputeRange(empCd as string, fromDate, toDate);
      totalUpdated += updated;
    }

    return totalUpdated;
  }

  /**
   * Get adjustment summary for a date range
   */
  static async getAdjustmentSummary(
    empCd: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.approved, true),
          lte(attendanceLeaves.dateFrom, toDate),
          gte(attendanceLeaves.dateTo, fromDate),
        ),
      );

    const dailyWithLeave = await db
      .select()
      .from(attendanceDaily)
      .where(
        and(
          eq(attendanceDaily.empCd, empCd),
          eq(attendanceDaily.status, "leave"),
          gte(attendanceDaily.workDate, fromDate),
          lte(attendanceDaily.workDate, toDate),
        ),
      );

    return {
      empCd,
      periodStart: fromDate.toISOString().split("T")[0],
      periodEnd: toDate.toISOString().split("T")[0],
      approvedLeaves: leaves.length,
      totalLeaveDays: leaves.reduce((sum: any, l: any) => {
        const diff = l.dateTo.getTime() - l.dateFrom.getTime();
        return sum + Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
      }, 0),
      appliedToDailyRecords: dailyWithLeave.length,
      byLeaveType: leaves.reduce(
        (acc: any, l: any) => {
          acc[l.type] = (acc[l.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
