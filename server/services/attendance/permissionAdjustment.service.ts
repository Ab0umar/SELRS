import { getDb } from '../../db';
import { attendanceDaily, attendanceLeaves } from '../../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export class PermissionAdjustmentService {
  /**
   * Apply leave adjustments to daily records
   * Updates status to 'leave' for dates covered by approved leaves
   */
  static async applyLeaveAdjustments(empCd: string, fromDate: Date, toDate: Date): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get approved leaves for this employee in the date range
    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.approved, true),
          lte(attendanceLeaves.dateFrom, toDate),
          gte(attendanceLeaves.dateTo, fromDate)
        )
      );

    let updatedCount = 0;

    // For each leave, update daily records within that date range
    for (const leave of leaves) {
      const leaveStart = new Date(leave.dateFrom);
      const leaveEnd = new Date(leave.dateTo);

      // Get daily records within leave date range
      const dailyRecords = await db
        .select()
        .from(attendanceDaily)
        .where(
          and(
            eq(attendanceDaily.empCd, empCd),
            gte(attendanceDaily.workDate, leaveStart),
            lte(attendanceDaily.workDate, leaveEnd)
          )
        );

      // Update each daily record to 'leave' status
      for (const daily of dailyRecords) {
        await db
          .update(attendanceDaily)
          .set({
            status: 'leave',
            lateMinutes: 0,
            earlyLeaveMin: 0,
          })
          .where(
            and(
              eq(attendanceDaily.empCd, empCd),
              eq(attendanceDaily.workDate, daily.workDate)
            )
          );

        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Recompute daily records for a date range
   * Applies all adjustments (leaves, permissions, etc.)
   */
  static async recomputeRange(empCd: string, fromDate: Date, toDate: Date): Promise<number> {
    // First, get all daily records in the range and reset them (if needed)
    // Then apply leave adjustments
    return this.applyLeaveAdjustments(empCd, fromDate, toDate);
  }

  /**
   * Recompute daily for all employees in a date range
   * Used when approving bulk leaves or batch processing
   */
  static async recomputeAllEmployees(fromDate: Date, toDate: Date): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get all daily records in range
    const dailyRecords = await db
      .select()
      .from(attendanceDaily)
      .where(
        and(
          gte(attendanceDaily.workDate, fromDate),
          lte(attendanceDaily.workDate, toDate)
        )
      );

    // Group by empCd and recompute
    const empCodes = [...new Set(dailyRecords.map((d) => d.empCd))];
    let totalUpdated = 0;

    for (const empCd of empCodes) {
      const updated = await this.recomputeRange(empCd, fromDate, toDate);
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
    toDate: Date
  ): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const leaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.approved, true),
          lte(attendanceLeaves.dateFrom, toDate),
          gte(attendanceLeaves.dateTo, fromDate)
        )
      );

    const dailyWithLeave = await db
      .select()
      .from(attendanceDaily)
      .where(
        and(
          eq(attendanceDaily.empCd, empCd),
          eq(attendanceDaily.status, 'leave'),
          gte(attendanceDaily.workDate, fromDate),
          lte(attendanceDaily.workDate, toDate)
        )
      );

    return {
      empCd,
      periodStart: fromDate.toISOString().split('T')[0],
      periodEnd: toDate.toISOString().split('T')[0],
      approvedLeaves: leaves.length,
      totalLeaveDays: leaves.reduce((sum, l) => {
        const diff = l.dateTo.getTime() - l.dateFrom.getTime();
        return sum + Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
      }, 0),
      appliedToDailyRecords: dailyWithLeave.length,
      byLeaveType: leaves.reduce(
        (acc, l) => {
          acc[l.type] = (acc[l.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}
