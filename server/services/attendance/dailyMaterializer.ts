/**
 * Daily Attendance Materializer
 * Rebuilds attendance_daily from raw punches + rules
 * Idempotent: safe to call multiple times
 */

import { getDb } from '../../db';
import {
  attendanceDaily,
  attendanceShifts,
  attendanceShiftAssignments,
  attendanceShiftCycles,
  attendanceShiftCycleSlots,
  attendanceShiftCycleAssignments,
  attendanceEmployees,
  attendanceLeaves,
  attendanceHolidays,
  attendancePermissions,
} from '../../../drizzle/schema';
import { eq, and, lte, gte, isNull, or } from 'drizzle-orm';
import {
  computeDay,
  DayContext,
  resolveShift,
  resolveCycleShift,
  ShiftCycle,
  CycleAssignment,
  Shift,
  ymd,
} from './rulesEngine';
import { PunchesService } from './punches.service';

export class DailyMaterializer {
  /**
   * Recompute daily attendance for a date range
   * Loads all raw data, applies rules, UPSERTs to attendance_daily
   */
  static async recomputeRange(
    from: Date,
    to: Date,
    scope?: { empCd?: string }
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    // Load all shifts and assignments for the range
    const shifts = await this.loadShifts(db);
    const shiftsById = new Map(shifts.map((s) => [s.id, s]));

    const assignments = await this.loadAssignments(db, fromDate, toDate);
    const cycleAssignments = await this.loadCycleAssignments(db, fromDate, toDate);
    const cyclesById = await this.loadCycles(db);
    const employees = await this.loadEmployees(db, scope?.empCd);
    const leaves = await this.loadLeaves(db, fromDate, toDate);
    const holidays = await this.loadHolidays(db, fromDate, toDate);
    const holidaySet = new Set(holidays.map((h) => this.dateKey(h.date)));
    const permissions = await this.loadPermissions(db, fromDate, toDate);

    // Collect all employees to process
    const empCodes = scope?.empCd ? [scope.empCd] : employees.map((e) => e.empCd);

    let rowsWritten = 0;
    const now = new Date();

    // For each employee, for each day in range
    for (const empCd of empCodes) {
      const empAssignments = assignments.filter((a) => a.empCd === empCd);
      const defaultShift = employees.find((e) => e.empCd === empCd)?.defaultShiftId ?? null;
      const empLeaves = leaves.filter((l) => l.empCd === empCd);

      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const workDate = new Date(d);
        workDate.setHours(0, 0, 0, 0);
        const workDateStr = this.dateKey(workDate);

        // Get approved leave for this day (use ymd() to avoid UTC-vs-local timezone mismatch)
        const leaveApproved = empLeaves.some((l) => {
          if (!l.approved) return false;
          const fromStr = ymd(new Date(l.dateFrom));
          const toStr = ymd(new Date(l.dateTo));
          return fromStr <= workDateStr && toStr >= workDateStr;
        });

        // Check if holiday
        const isHoliday = holidaySet.has(this.dateKey(workDate));

        // Get shift for this day — direct assignment first, then cycle fallback
        // If employee has an active cycle, don't fall back to defaultShift on rest days
        const hasActiveCycle = cycleAssignments.some((ca) => {
          if (ca.empCd !== empCd) return false;
          const fromStr = this.dateKey(ca.effectiveFrom);
          const toStr = ca.effectiveTo ? this.dateKey(ca.effectiveTo) : null;
          return fromStr <= workDateStr && (toStr === null || toStr >= workDateStr);
        });
        const shift =
          resolveShift(empCd, workDate, empAssignments, hasActiveCycle ? null : defaultShift, shiftsById) ??
          resolveCycleShift(empCd, workDate, cycleAssignments, cyclesById, shiftsById);

        // Get punches for this day and empCd
        const punches = await PunchesService.getPunchesByRange(workDate, workDate, empCd);

        // Skip days with no shift assignment AND no punches — not a working day
        // Also delete any stale row (e.g. from a previous run that used defaultShift on a cycle rest day)
        if (!shift && punches.length === 0) {
          await db
            .delete(attendanceDaily)
            .where(and(eq(attendanceDaily.empCd, empCd), eq(attendanceDaily.workDate, workDateStr as any)));
          continue;
        }

        // Get break minutes for this day (TODO: configurable breaks)
        const breakMinutes = 0;

        // Build context and compute
        const ctx: DayContext = {
          empCd,
          workDate,
          shift: shift ?? null,
          punches: punches.map((p) => ({
            id: p.id,
            punchAt: new Date(p.punchAt),
            direction: p.direction,
            source: p.source,
          })),
          leaveApproved,
          isHoliday,
          breakMinutes,
          now,
        };

        const result = computeDay(ctx);

        // Apply approved permissions — reduce lateMinutes / earlyLeaveMin
        const dayPerms = permissions.filter(
          (p) => p.empCd === empCd && p.approved && this.dateKey(new Date(p.date)) === workDateStr
        );
        for (const perm of dayPerms) {
          if (perm.type === 'in') {
            result.lateMinutes = Math.max(0, (result.lateMinutes || 0) - perm.durationMinutes);
          } else if (perm.type === 'out') {
            result.earlyLeaveMin = Math.max(0, (result.earlyLeaveMin || 0) - perm.durationMinutes);
          }
        }
        if (result.status === 'partial' && result.lateMinutes === 0 && result.earlyLeaveMin === 0) {
          result.status = 'present';
        }

        // UPSERT to attendance_daily
        await db
          .insert(attendanceDaily)
          .values({
            empCd: result.empCd,
            workDate: workDateStr as any,
            shiftId: result.shiftId,
            firstIn: result.firstIn,
            lastOut: result.lastOut,
            workedMinutes: result.workedMinutes,
            lateMinutes: result.lateMinutes,
            earlyLeaveMin: result.earlyLeaveMin,
            overtimeMinutes: result.overtimeMinutes,
            status: result.status,
            insideNow: result.insideNow,
            computedAt: result.computedAt,
          })
          .onDuplicateKeyUpdate({
            set: {
              shiftId: result.shiftId,
              firstIn: result.firstIn,
              lastOut: result.lastOut,
              workedMinutes: result.workedMinutes,
              lateMinutes: result.lateMinutes,
              earlyLeaveMin: result.earlyLeaveMin,
              overtimeMinutes: result.overtimeMinutes,
              status: result.status,
              insideNow: result.insideNow,
              computedAt: result.computedAt,
            },
          });

        rowsWritten++;
      }
    }

    return rowsWritten;
  }

  // ============ Loaders ============

  private static async loadShifts(db: any): Promise<any[]> {
    return await db.select().from(attendanceShifts).where(eq(attendanceShifts.active, true));
  }

  private static async loadAssignments(db: any, from: Date, to: Date): Promise<any[]> {
    return await db
      .select()
      .from(attendanceShiftAssignments)
      .where(
        and(
          lte(attendanceShiftAssignments.effectiveFrom, to),
          or(
            isNull(attendanceShiftAssignments.effectiveTo),
            gte(attendanceShiftAssignments.effectiveTo, from)
          )
        )
      );
  }

  private static async loadEmployees(db: any, empCd?: string): Promise<any[]> {
    if (empCd) {
      return await db
        .select()
        .from(attendanceEmployees)
        .where(eq(attendanceEmployees.empCd, empCd));
    }
    return await db
      .select()
      .from(attendanceEmployees)
      .where(eq(attendanceEmployees.active, true));
  }

  private static async loadCycleAssignments(db: any, from: Date, to: Date): Promise<CycleAssignment[]> {
    const rows = await db
      .select()
      .from(attendanceShiftCycleAssignments)
      .where(
        and(
          lte(attendanceShiftCycleAssignments.effectiveFrom, to),
          or(
            isNull(attendanceShiftCycleAssignments.effectiveTo),
            gte(attendanceShiftCycleAssignments.effectiveTo, from)
          )
        )
      );
    return rows.map((r: any) => ({
      empCd: r.empCd,
      cycleId: r.cycleId,
      effectiveFrom: new Date(r.effectiveFrom),
      effectiveTo: r.effectiveTo ? new Date(r.effectiveTo) : null,
    }));
  }

  private static async loadCycles(db: any): Promise<Map<number, ShiftCycle>> {
    const cycles = await db.select().from(attendanceShiftCycles);
    const slots = await db.select().from(attendanceShiftCycleSlots);
    const map = new Map<number, ShiftCycle>();
    for (const c of cycles) {
      map.set(c.id, {
        id: c.id,
        period: c.period,
        anchorDate: new Date(c.anchorDate),
        slots: slots
          .filter((s: any) => s.cycleId === c.id)
          .sort((a: any, b: any) => a.slotIndex - b.slotIndex)
          .map((s: any) => ({ slotIndex: s.slotIndex, shiftId: s.shiftId })),
      });
    }
    return map;
  }

  private static async loadPermissions(db: any, from: Date, to: Date): Promise<any[]> {
    return await db
      .select()
      .from(attendancePermissions)
      .where(
        and(
          gte(attendancePermissions.date, from),
          lte(attendancePermissions.date, to)
        )
      );
  }

  private static async loadLeaves(db: any, from: Date, to: Date): Promise<any[]> {
    return await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          lte(attendanceLeaves.dateFrom, to),
          gte(attendanceLeaves.dateTo, from)
        )
      );
  }

  private static async loadHolidays(db: any, from: Date, to: Date): Promise<any[]> {
    return await db
      .select()
      .from(attendanceHolidays)
      .where(
        and(
          gte(attendanceHolidays.date, from),
          lte(attendanceHolidays.date, to)
        )
      );
  }

  // ============ Helpers ============

  private static dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

// Export singleton instance
export const dailyMaterializer = DailyMaterializer;
