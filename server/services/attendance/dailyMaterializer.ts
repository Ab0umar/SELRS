/**
 * Daily Attendance Materializer
 * Rebuilds attendance_daily from raw punches + rules
 * Idempotent: safe to call multiple times
 */

import { getDb, getDbConnection } from "../../db";
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
} from "../../../drizzle/schema";
import { eq, and, lte, gte, isNull, or, sql, inArray } from "drizzle-orm";
import {
  computeDay,
  DayContext,
  resolveShifts,
  resolveCycleShift,
  partitionPunchesForShifts,
  applyApprovedPermissions,
  cycleOverridesDirectAssignment,
  mergeContinuousBothDeviceShifts,
  ShiftCycle,
  CycleAssignment,
  Shift,
  ymd,
} from "./rulesEngine";
import { PunchesService } from "./punches.service";
import { MonthlyComputeService } from "./monthlyCompute.service";
import { withMaterializerTransaction } from "./materializerMutex";
import { toDateOnlyKey } from "./dateOnly";

export class DailyMaterializer {
  /**
   * Recompute daily attendance for a date range
   * Loads all raw data, applies rules, UPSERTs to attendance_daily
   */
  static async recomputeRange(
    from: Date,
    to: Date,
    scope?: { empCd?: string; empCds?: string[] },
    dbOverride?: any,
    options: { recomputeMonthly?: boolean } = {},
  ): Promise<number> {
    const db = dbOverride ?? (await getDb());
    if (!db) throw new Error("Database not available");

    const run = async (activeDb: any) =>
      this.recomputeRangeInTransaction(from, to, scope, activeDb);
    const recomputeMonthlyReports = async (result: {
      employeeCodes: string[];
    }) => {
      if (!options.recomputeMonthly) return;
      const fromDate = new Date(from);
      const toDate = new Date(to);
      const employeeCodes = scope?.empCd ? [scope.empCd] : result.employeeCodes;
      for (const empCd of employeeCodes) {
        for (
          let month = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
          month <= new Date(toDate.getFullYear(), toDate.getMonth(), 1);
          month.setMonth(month.getMonth() + 1)
        ) {
          await MonthlyComputeService.saveEmployeeMonth(
            empCd,
            month.getFullYear(),
            month.getMonth() + 1,
          );
        }
      }
    };
    let result: { rowsWritten: number; employeeCodes: string[] };
    if (dbOverride) {
      // A supplied DB handle is owned by the caller (typically a test or an
      // outer transaction); do not acquire a second connection or nest txs.
      result = await run(dbOverride);
      await recomputeMonthlyReports(result);
    } else {
      const lockConnection = await getDbConnection();
      result = await withMaterializerTransaction(
        lockConnection,
        db,
        run,
        recomputeMonthlyReports,
      );
    }
    return result.rowsWritten;
  }

  private static async recomputeRangeInTransaction(
    from: Date,
    to: Date,
    scope: { empCd?: string; empCds?: string[] } | undefined,
    db: any,
  ): Promise<{ rowsWritten: number; employeeCodes: string[] }> {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(to);
    // The end date is inclusive; never treat tomorrow as an exclusive end, or an
    // extra future day gets materialized.
    toDate.setHours(0, 0, 0, 0);
    if (toDate < fromDate)
      throw new Error("End date must not be before start date");
    if (toDate.getTime() - fromDate.getTime() >= 366 * 24 * 60 * 60 * 1000) {
      throw new Error("Attendance recomputation range cannot exceed 366 days");
    }

    // Load all shifts and assignments for the range
    const shifts = await this.loadShifts(db);
    const shiftsById = new Map(shifts.map((s) => [s.id, s]));

    const assignments = await this.loadAssignments(db, fromDate, toDate);
    const cycleAssignments = await this.loadCycleAssignments(
      db,
      fromDate,
      toDate,
    );
    const cyclesById = await this.loadCycles(db);
    const employees = await this.loadEmployees(
      db,
      scope?.empCd ?? scope?.empCds,
    );
    const leaves = await this.loadLeaves(db, fromDate, toDate);
    const holidays = await this.loadHolidays(db, fromDate, toDate);
    const holidaySet = new Set(
      holidays
        .filter((holiday) => holiday.paid)
        .map((holiday) => this.dateKey(holiday.date)),
    );
    const permissions = await this.loadPermissions(db, fromDate, toDate);
    const punchesEndExclusive = new Date(toDate);
    punchesEndExclusive.setDate(punchesEndExclusive.getDate() + 1);
    const punchesByEmployeeDate = new Map<string, any[]>();
    const rangePunches = await PunchesService.getPunchesByRange(
      fromDate,
      punchesEndExclusive,
      scope?.empCd ?? scope?.empCds,
      undefined,
      db,
    );
    for (const punch of rangePunches) {
      const key = `${punch.empCd}|${this.dateKey(new Date(punch.punchAt))}`;
      const employeePunches = punchesByEmployeeDate.get(key) ?? [];
      employeePunches.push(punch);
      punchesByEmployeeDate.set(key, employeePunches);
    }

    // Collect all employees to process before loading prior rows so stale-row
    // cleanup cannot affect inactive employees outside this materialization.
    const empCodes = scope?.empCd
      ? [scope.empCd]
      : employees.map((e) => e.empCd);

    const existingDailyRows = empCodes.length
      ? await db
          .select({
            empCd: attendanceDaily.empCd,
            workDate: attendanceDaily.workDate,
            shiftId: attendanceDaily.shiftId,
          })
          .from(attendanceDaily)
          .where(
            and(
              gte(attendanceDaily.workDate, this.dateKey(fromDate) as any),
              lte(attendanceDaily.workDate, this.dateKey(toDate) as any),
              inArray(attendanceDaily.empCd, empCodes),
            ),
          )
      : [];

    let rowsWritten = 0;
    const now = new Date();
    const dailyRowsToUpsert: Array<Record<string, any>> = [];
    const desiredDailyKeys = new Set<string>();

    // For each employee, for each day in range
    for (const empCd of empCodes) {
      const empAssignments = assignments.filter((a) => a.empCd === empCd);
      const defaultShift =
        employees.find((e) => e.empCd === empCd)?.defaultShiftId ?? null;
      const empLeaves = leaves.filter((l) => l.empCd === empCd);
      const terminationDate = employees.find(
        (e) => e.empCd === empCd,
      )?.terminationDate;
      const terminationKey = terminationDate
        ? toDateOnlyKey(terminationDate)
        : null;

      for (
        let d = new Date(fromDate);
        d <= toDate;
        d.setDate(d.getDate() + 1)
      ) {
        const workDate = new Date(d);
        workDate.setHours(0, 0, 0, 0);
        const workDateStr = this.dateKey(workDate);
        // No attendance is expected after the employee has left.
        if (terminationKey && workDateStr > terminationKey) continue;

        // Get approved leave for this day (use ymd() to avoid UTC-vs-local timezone mismatch)
        const approvedLeave = empLeaves.find((l) => {
          if (!l.approved) return false;
          const fromStr = ymd(new Date(l.dateFrom));
          const toStr = ymd(new Date(l.dateTo));
          return fromStr <= workDateStr && toStr >= workDateStr;
        });
        const leaveApproved = Boolean(approvedLeave);

        const isHoliday = holidaySet.has(this.dateKey(workDate));

        // Get shift for this day — direct assignment first, then cycle fallback
        // If employee has an active cycle, don't fall back to defaultShift on rest days
        const hasActiveCycle = cycleAssignments.some((ca) => {
          if (ca.empCd !== empCd) return false;
          const fromStr = this.dateKey(ca.effectiveFrom);
          const toStr = ca.effectiveTo ? this.dateKey(ca.effectiveTo) : null;
          return (
            fromStr <= workDateStr && (toStr === null || toStr >= workDateStr)
          );
        });
        let dayShifts = resolveShifts(
          empCd,
          workDate,
          empAssignments,
          hasActiveCycle ? null : defaultShift,
          shiftsById,
        );

        // A cycle assigned after the employee's current direct assignment is
        // the newer schedule decision, so it overrides that assignment.
        const latestCycleFrom = cycleAssignments
          .filter((ca) => {
            if (ca.empCd !== empCd) return false;
            const fromStr = this.dateKey(ca.effectiveFrom);
            const toStr = ca.effectiveTo ? this.dateKey(ca.effectiveTo) : null;
            return (
              fromStr <= workDateStr && (toStr === null || toStr >= workDateStr)
            );
          })
          .map((ca) => this.dateKey(ca.effectiveFrom))
          .sort()
          .pop();
        const latestDirectFrom = empAssignments
          .filter((a) => {
            const fromStr = ymd(new Date(a.effectiveFrom));
            const toStr = a.effectiveTo ? ymd(new Date(a.effectiveTo)) : null;
            return (
              fromStr <= workDateStr && (toStr === null || toStr >= workDateStr)
            );
          })
          .map((a) => ymd(new Date(a.effectiveFrom)))
          .sort()
          .pop();
        const preferCycle = cycleOverridesDirectAssignment(
          latestCycleFrom,
          latestDirectFrom,
        );
        if (preferCycle) {
          dayShifts = [];
        }

        if (dayShifts.length === 0 && (!latestDirectFrom || preferCycle)) {
          const cycleShift = resolveCycleShift(
            empCd,
            workDate,
            cycleAssignments,
            cyclesById,
            shiftsById,
          );
          if (cycleShift) {
            dayShifts = [cycleShift];
          }
        }

        const punches =
          punchesByEmployeeDate.get(`${empCd}|${workDateStr}`) ?? [];

        // Skip days with no shift assignment AND no punches — not a working day
        if (
          dayShifts.length === 0 &&
          punches.length === 0 &&
          !leaveApproved &&
          !isHoliday
        ) {
          continue;
        }

        // Back-to-back shifts that take both devices are one continuous day:
        // a single row, first ZK scan in and last FK scan out.
        const mergedDay = mergeContinuousBothDeviceShifts(dayShifts);
        if (mergedDay) dayShifts = [mergedDay];

        const partitionedPunches = partitionPunchesForShifts(
          punches.map((p) => ({
            id: p.id,
            punchAt: new Date(p.punchAt),
            direction: p.direction,
            source: p.source,
            deviceId: p.deviceId,
          })),
          dayShifts,
          workDate,
        );

        // Get break minutes for this day (TODO: configurable breaks)
        const shiftsToProcess: Array<Shift | null> =
          dayShifts.length > 0
            ? [...dayShifts].sort(
                (a, b) => a.startTime.localeCompare(b.startTime) || a.id - b.id,
              )
            : [null];
        const dayPerms = permissions.filter(
          (permission) =>
            permission.empCd === empCd &&
            permission.approved &&
            this.dateKey(new Date(permission.date)) === workDateStr,
        );
        const firstShiftId = shiftsToProcess[0]?.id ?? 0;
        const lastShiftId =
          shiftsToProcess[shiftsToProcess.length - 1]?.id ?? 0;

        for (const shift of shiftsToProcess) {
          const shiftId = shift?.id ?? 0;
          const shiftPunches = partitionedPunches.get(shiftId) ?? [];
          const breakMinutes = shift?.breakMinutes ?? 0;

          const shiftStart = shift
            ? shift.isFlexible
              ? (shift.flexInFrom ?? shift.startTime)
              : shift.startTime
            : null;
          const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
          // A shift that has not started yet (later today, or any future day)
          // cannot be an absence; leave/holiday rows are still written.
          const todayKey = this.dateKey(now);
          if (
            shiftStart &&
            shiftPunches.length === 0 &&
            !leaveApproved &&
            !isHoliday &&
            (workDateStr > todayKey ||
              (workDateStr === todayKey && nowTime < shiftStart))
          ) {
            continue;
          }

          const ctx: DayContext = {
            empCd,
            workDate,
            shift,
            punches: shiftPunches,
            leaveApproved,
            isHoliday,
            breakMinutes,
            now,
          };

          let result = computeDay(ctx);

          // A timed permission belongs to one shift row only. Entry permissions
          // apply to the earliest shift and exit permissions to the latest;
          // day-long missions intentionally apply to every assigned shift.
          const shiftPerms = dayPerms.filter(
            (permission) =>
              permission.type === "mission" ||
              (permission.type === "in" && shiftId === firstShiftId) ||
              (permission.type === "out" && shiftId === lastShiftId),
          );
          result = applyApprovedPermissions(result, shiftPerms as any[]);

          const dailyRow = {
            empCd: result.empCd,
            workDate: workDateStr as any,
            shiftId,
            firstIn: result.firstIn,
            lastOut: result.lastOut,
            workedMinutes: result.workedMinutes,
            lateMinutes: result.lateMinutes,
            earlyLeaveMin: result.earlyLeaveMin,
            overtimeInMinutes: result.overtimeInMinutes,
            overtimeOutMinutes: result.overtimeOutMinutes,
            overtimeMinutes: result.overtimeMinutes,
            status: result.status,
            leaveType: approvedLeave?.type ?? null,
            leaveNotAffectCommission:
              approvedLeave?.notAffectCommission ?? false,
            insideNow: result.insideNow,
            computedAt: now,
          };
          dailyRowsToUpsert.push(dailyRow);
          desiredDailyKeys.add(`${empCd}|${workDateStr}|${shiftId}`);
          rowsWritten++;
        }
      }
    }

    const upsertUpdate = {
      firstIn: sql`VALUES(${attendanceDaily.firstIn})`,
      lastOut: sql`VALUES(${attendanceDaily.lastOut})`,
      workedMinutes: sql`VALUES(${attendanceDaily.workedMinutes})`,
      lateMinutes: sql`VALUES(${attendanceDaily.lateMinutes})`,
      earlyLeaveMin: sql`VALUES(${attendanceDaily.earlyLeaveMin})`,
      overtimeInMinutes: sql`VALUES(${attendanceDaily.overtimeInMinutes})`,
      overtimeOutMinutes: sql`VALUES(${attendanceDaily.overtimeOutMinutes})`,
      overtimeMinutes: sql`VALUES(${attendanceDaily.overtimeMinutes})`,
      status: sql`VALUES(${attendanceDaily.status})`,
      leaveType: sql`VALUES(${attendanceDaily.leaveType})`,
      leaveNotAffectCommission: sql`VALUES(${attendanceDaily.leaveNotAffectCommission})`,
      insideNow: sql`VALUES(${attendanceDaily.insideNow})`,
      computedAt: sql`VALUES(${attendanceDaily.computedAt})`,
    };
    const upsertBatchSize = 250;
    for (
      let index = 0;
      index < dailyRowsToUpsert.length;
      index += upsertBatchSize
    ) {
      await db
        .insert(attendanceDaily)
        .values(dailyRowsToUpsert.slice(index, index + upsertBatchSize) as any)
        .onDuplicateKeyUpdate({ set: upsertUpdate });
    }

    const staleRows = existingDailyRows
      .map((row: any) => ({
        ...row,
        workDateKey: toDateOnlyKey(row.workDate),
      }))
      .filter(
        (row: any) =>
          !desiredDailyKeys.has(
            `${row.empCd}|${row.workDateKey}|${row.shiftId}`,
          ),
      );
    for (let index = 0; index < staleRows.length; index += 200) {
      const rows = staleRows.slice(index, index + 200);
      await db
        .delete(attendanceDaily)
        .where(
          or(
            ...rows.map((row: any) =>
              and(
                eq(attendanceDaily.empCd, row.empCd),
                eq(attendanceDaily.workDate, row.workDateKey as any),
                eq(attendanceDaily.shiftId, row.shiftId),
              ),
            ),
          ),
        );
    }

    return { rowsWritten, employeeCodes: empCodes };
  }

  // Loaders

  private static async loadShifts(db: any): Promise<any[]> {
    // Include inactive shifts: deactivating only hides a shift from new
    // assignments; existing (and historical) assignments still resolve to it.
    return await db.select().from(attendanceShifts);
  }

  private static async loadAssignments(
    db: any,
    from: Date,
    to: Date,
  ): Promise<any[]> {
    return await db
      .select()
      .from(attendanceShiftAssignments)
      .where(
        and(
          lte(attendanceShiftAssignments.effectiveFrom, to),
          or(
            isNull(attendanceShiftAssignments.effectiveTo),
            gte(attendanceShiftAssignments.effectiveTo, from),
          ),
        ),
      );
  }

  private static async loadEmployees(
    db: any,
    empCd?: string | string[],
  ): Promise<any[]> {
    if (Array.isArray(empCd)) {
      if (empCd.length === 0) return [];
      return db
        .select()
        .from(attendanceEmployees)
        .where(
          and(
            inArray(attendanceEmployees.empCd, empCd),
            eq(attendanceEmployees.active, true),
          ),
        );
    }
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

  private static async loadCycleAssignments(
    db: any,
    from: Date,
    to: Date,
  ): Promise<CycleAssignment[]> {
    const rows = await db
      .select()
      .from(attendanceShiftCycleAssignments)
      .where(
        and(
          lte(attendanceShiftCycleAssignments.effectiveFrom, to),
          or(
            isNull(attendanceShiftCycleAssignments.effectiveTo),
            gte(attendanceShiftCycleAssignments.effectiveTo, from),
          ),
        ),
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

  private static async loadPermissions(
    db: any,
    from: Date,
    to: Date,
  ): Promise<any[]> {
    return await db
      .select()
      .from(attendancePermissions)
      .where(
        and(
          gte(attendancePermissions.date, from),
          lte(attendancePermissions.date, to),
        ),
      );
  }

  private static async loadLeaves(
    db: any,
    from: Date,
    to: Date,
  ): Promise<any[]> {
    return await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          lte(attendanceLeaves.dateFrom, to),
          gte(attendanceLeaves.dateTo, from),
        ),
      );
  }

  private static async loadHolidays(
    db: any,
    from: Date,
    to: Date,
  ): Promise<any[]> {
    return await db
      .select()
      .from(attendanceHolidays)
      .where(
        and(
          gte(attendanceHolidays.date, from),
          lte(attendanceHolidays.date, to),
        ),
      );
  }

  // Helpers

  private static dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

export const dailyMaterializer = DailyMaterializer;
