import { TRPCError } from "@trpc/server";
import { z } from "zod";
import crypto from "crypto";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDeviceDiagnostics } from "../services/attendance/deviceDiagnostics.service";
import { FKAttendLogPuller } from "../services/attendance/fkAttendLogPuller";
import {
  FKDeviceSyncService,
  syncFromFKDevice,
} from "../services/attendance/fkDeviceSyncService";
import {
  router,
  makeAttProcedure,
  makeAttWriteProcedure,
  protectedProcedure,
  adminProcedure,
} from "../_core/procedures";
import { DashboardService } from "../services/attendance/dashboard.service";
import { MonthlyComputeService } from "../services/attendance/monthlyCompute.service";
import { LeaveManagementService } from "../services/attendance/leaveManagement.service";
import { PermissionAdjustmentService } from "../services/attendance/permissionAdjustment.service";
import { AuditLogService } from "../services/attendance/auditLog.service";
import { DeviceSettingsService } from "../services/attendance/deviceSettings.service";
import { resetSyncHistory } from "../services/attendance/syncEngine";
import {
  initializeDeviceSync,
  getDeviceSyncEngine,
} from "../services/attendance/deviceSyncEngine";
import { ZKTecoDevice } from "../services/attendance/zktecoDevice";
import { dailyMaterializer } from "../services/attendance/dailyMaterializer";
import { getDb, getAllUsers } from "../db";
import { attendanceSyncRoutes } from "./attendance-sync";
import { fmtDate } from "./_attendance/schedule-helpers";
import {
  pushAppNotification,
  getAppNotificationSettings,
  DEFAULT_APP_NOTIFICATION_SETTINGS,
} from "../_core/appNotifications";
import {
  attendanceSyncRuns,
  attendancePunches,
  attendanceDaily,
  attendanceEmployees,
  attendanceLeaves,
  attendanceShifts,
  attendanceShiftAssignments,
  attendanceShiftCycles,
  attendanceShiftCycleSlots,
  attendanceShiftCycleAssignments,
  attendanceHolidays,
  attendanceLeaveBalances,
  attendancePermissions,
  employeeAttendanceMapping,
  attendanceShiftChangeRequests,
} from "../../drizzle/schema";
import { isNull } from "drizzle-orm";
import {
  desc,
  eq,
  and,
  or,
  gte,
  lte,
  lt,
  max,
  count,
  sql,
  inArray,
} from "drizzle-orm";

async function recomputeAssignmentRange(
  empCd: string,
  fromKey: string,
  toKey?: string | null,
): Promise<void> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const from = new Date(`${fromKey.slice(0, 10)}T12:00:00`);
  if (from > today) return;
  const requestedTo = toKey
    ? new Date(`${toKey.slice(0, 10)}T12:00:00`)
    : today;
  const to = requestedTo < today ? requestedTo : today;
  if (to < from) return;

  await dailyMaterializer.recomputeRange(from, to, { empCd }, undefined, {
    recomputeMonthly: true,
  });
}

/** End open schedules at the termination date and drop any daily rows after it. */
async function closeEmploymentSchedule(
  empCd: string,
  terminationDate: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(attendanceShiftAssignments)
    .set({ effectiveTo: terminationDate as any })
    .where(
      and(
        eq(attendanceShiftAssignments.empCd, empCd),
        or(
          isNull(attendanceShiftAssignments.effectiveTo),
          gte(attendanceShiftAssignments.effectiveTo, terminationDate as any),
        ),
      ),
    );
  await db
    .update(attendanceShiftCycleAssignments)
    .set({ effectiveTo: terminationDate as any })
    .where(
      and(
        eq(attendanceShiftCycleAssignments.empCd, empCd),
        or(
          isNull(attendanceShiftCycleAssignments.effectiveTo),
          gte(
            attendanceShiftCycleAssignments.effectiveTo,
            terminationDate as any,
          ),
        ),
      ),
    );
  const dayAfter = new Date(`${terminationDate}T12:00:00`);
  dayAfter.setDate(dayAfter.getDate() + 1);
  await recomputeAssignmentRange(empCd, fmtDate(dayAfter));
}

export const attendanceShiftsRoutes = {
  listShifts: makeAttProcedure(["/attendance/shift-schedule", "/attendance/employees", "/attendance/settings"]).query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const shifts = await db
      .select()
      .from(attendanceShifts)
      .where(eq(attendanceShifts.active, true))
      .orderBy(attendanceShifts.name);

    return shifts.map((s: any) => ({
      id: s.id,
      name: s.name,
      branch: s.branch,
      deviceId: s.deviceId,
      startTime: s.startTime,
      endTime: s.endTime,
      crossesMidnight: s.crossesMidnight,
      graceLateMin: s.graceLateMin,
      graceEarlyMin: s.graceEarlyMin,
      allowOT: s.allowOT,
      allowOTIn: s.allowOTIn,
      allowOTOut: s.allowOTOut,
      otMinMinutes: s.otMinMinutes ?? 0,
      otMinInMinutes: s.otMinInMinutes ?? s.otMinMinutes ?? 0,
      otMinOutMinutes: s.otMinOutMinutes ?? s.otMinMinutes ?? 0,
      otMaxMinutes: s.otMaxMinutes ?? 0,
      breakMinutes: s.breakMinutes,
      weekdayMask: s.weekdayMask,
      requirePunch: s.requirePunch,
      isFlexible: s.isFlexible ?? false,
      flexInFrom: s.flexInFrom ?? null,
      flexInTo: s.flexInTo ?? null,
      flexOutFrom: s.flexOutFrom ?? null,
      flexOutTo: s.flexOutTo ?? null,
      active: s.active,
      shiftSize: (s.shiftSize ?? "auto") as "big" | "small" | "auto",
      autoSmallThresholdMin: s.autoSmallThresholdMin ?? 270,
    }));
  }),

  createShift: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/settings"])
    .input(
      z.object({
        name: z.string().min(1).max(64),
        branch: z.enum(["operations", "center", "both"]),
        deviceId: z.enum(["fk", "zk", "both"]),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        crossesMidnight: z
          .boolean()
          .optional()
          .refine((value) => value !== true, "الورديات الليلية غير مدعومة"),
        graceLateMin: z.number().int().min(0).default(15),
        graceEarlyMin: z.number().int().min(0).default(15),
        allowOT: z.boolean().default(false),
        allowOTIn: z.boolean().default(false),
        allowOTOut: z.boolean().default(false),
        otMinMinutes: z.number().int().min(0).default(0),
        otMinInMinutes: z.number().int().min(0).default(0),
        otMinOutMinutes: z.number().int().min(0).default(0),
        otMaxMinutes: z.number().int().min(0).default(0),
        breakMinutes: z.number().int().min(0).default(60),
        requirePunch: z.boolean().default(true),
        isFlexible: z.boolean().default(false),
        flexInFrom: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        flexInTo: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        flexOutFrom: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        flexOutTo: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        shiftSize: z.enum(["big", "small", "auto"]).default("auto"),
        autoSmallThresholdMin: z.number().int().min(0).default(270),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const result = await db.insert(attendanceShifts).values({
          name: input.name,
          branch: input.branch,
          deviceId: input.deviceId,
          startTime: input.isFlexible
            ? (input.flexInFrom ?? "00:00")
            : input.startTime,
          endTime: input.isFlexible
            ? (input.flexOutTo ?? "00:00")
            : input.endTime,
          crossesMidnight: input.crossesMidnight ?? false,
          graceLateMin: input.graceLateMin,
          graceEarlyMin: input.graceEarlyMin,
          allowOT: input.allowOTIn || input.allowOTOut,
          allowOTIn: input.allowOTIn,
          allowOTOut: input.allowOTOut,
          otMinMinutes: input.otMinMinutes,
          otMinInMinutes: input.otMinInMinutes,
          otMinOutMinutes: input.otMinOutMinutes,
          otMaxMinutes: input.otMaxMinutes,
          breakMinutes: input.breakMinutes,
          weekdayMask: 127,
          requirePunch: input.requirePunch,
          isFlexible: input.isFlexible,
          flexInFrom: input.flexInFrom ?? null,
          flexInTo: input.flexInTo ?? null,
          flexOutFrom: input.flexOutFrom ?? null,
          flexOutTo: input.flexOutTo ?? null,
          shiftSize: input.shiftSize,
          autoSmallThresholdMin: input.autoSmallThresholdMin,
          active: true,
        });

        const rawShiftId =
          (result as any)?.[0]?.insertId ?? (result as any)?.insertId;
        const shiftId = Number(rawShiftId);
        if (!Number.isSafeInteger(shiftId) || shiftId <= 0) {
          throw new Error("Could not read inserted shift ID");
        }

        await AuditLogService.log({
          action: "shift_created",
          details: { shiftId, name: input.name },
          status: "success",
        });

        return { success: true, shiftId };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await AuditLogService.log({
          action: "shift_created",
          details: { error },
          status: "error",
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error,
          cause: err,
        });
      }
    }),

  updateShift: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/settings"])
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(64).optional(),
        branch: z.enum(["operations", "center", "both"]).optional(),
        deviceId: z.enum(["fk", "zk", "both"]).optional(),
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        endTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        graceLateMin: z.number().int().min(0).optional(),
        graceEarlyMin: z.number().int().min(0).optional(),
        allowOT: z.boolean().optional(),
        allowOTIn: z.boolean().optional(),
        allowOTOut: z.boolean().optional(),
        otMinMinutes: z.number().int().min(0).optional(),
        otMinInMinutes: z.number().int().min(0).optional(),
        otMinOutMinutes: z.number().int().min(0).optional(),
        otMaxMinutes: z.number().int().min(0).optional(),
        breakMinutes: z.number().int().min(0).optional(),
        requirePunch: z.boolean().optional(),
        isFlexible: z.boolean().optional(),
        flexInFrom: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        flexInTo: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        flexOutFrom: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        flexOutTo: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional()
          .nullable(),
        shiftSize: z.enum(["big", "small", "auto"]).optional(),
        autoSmallThresholdMin: z.number().int().min(0).optional(),
        active: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.branch !== undefined) updateData.branch = input.branch;
        if (input.deviceId !== undefined) updateData.deviceId = input.deviceId;
        if (input.startTime) updateData.startTime = input.startTime;
        if (input.endTime) updateData.endTime = input.endTime;
        if (input.graceLateMin !== undefined)
          updateData.graceLateMin = input.graceLateMin;
        if (input.graceEarlyMin !== undefined)
          updateData.graceEarlyMin = input.graceEarlyMin;
        if (input.allowOT !== undefined) updateData.allowOT = input.allowOT;
        if (input.allowOTIn !== undefined)
          updateData.allowOTIn = input.allowOTIn;
        if (input.allowOTOut !== undefined)
          updateData.allowOTOut = input.allowOTOut;
        if (input.allowOTIn !== undefined || input.allowOTOut !== undefined) {
          updateData.allowOT = Boolean(input.allowOTIn || input.allowOTOut);
        }
        if (input.otMinMinutes !== undefined)
          updateData.otMinMinutes = input.otMinMinutes;
        if (input.otMinInMinutes !== undefined)
          updateData.otMinInMinutes = input.otMinInMinutes;
        if (input.otMinOutMinutes !== undefined)
          updateData.otMinOutMinutes = input.otMinOutMinutes;
        if (input.otMaxMinutes !== undefined)
          updateData.otMaxMinutes = input.otMaxMinutes;
        if (input.breakMinutes !== undefined)
          updateData.breakMinutes = input.breakMinutes;
        if (input.requirePunch !== undefined)
          updateData.requirePunch = input.requirePunch;
        if (input.isFlexible !== undefined) {
          updateData.isFlexible = input.isFlexible;
          updateData.flexInFrom = input.flexInFrom ?? null;
          updateData.flexInTo = input.flexInTo ?? null;
          updateData.flexOutFrom = input.flexOutFrom ?? null;
          updateData.flexOutTo = input.flexOutTo ?? null;
          if (input.isFlexible) {
            updateData.startTime = input.flexInFrom ?? "00:00";
            updateData.endTime = input.flexOutTo ?? "00:00";
          }
        }
        if (input.active !== undefined) updateData.active = input.active;
        if (input.shiftSize !== undefined)
          updateData.shiftSize = input.shiftSize;
        if (input.autoSmallThresholdMin !== undefined)
          updateData.autoSmallThresholdMin = input.autoSmallThresholdMin;

        await db
          .update(attendanceShifts)
          .set(updateData)
          .where(eq(attendanceShifts.id, input.id));

        const directAssignments = await db
          .select({
            empCd: attendanceShiftAssignments.empCd,
            from: attendanceShiftAssignments.effectiveFrom,
            to: attendanceShiftAssignments.effectiveTo,
          })
          .from(attendanceShiftAssignments)
          .where(eq(attendanceShiftAssignments.shiftId, input.id));
        const cycleSlotRows = await db
          .select({ cycleId: attendanceShiftCycleSlots.cycleId })
          .from(attendanceShiftCycleSlots)
          .where(eq(attendanceShiftCycleSlots.shiftId, input.id));
        const affectedCycleIds: number[] = [
          ...new Set<number>(
            cycleSlotRows.map((row: any) => Number(row.cycleId)),
          ),
        ];
        const cycleAssignmentRows = affectedCycleIds.length
          ? await db
              .select({
                empCd: attendanceShiftCycleAssignments.empCd,
                from: attendanceShiftCycleAssignments.effectiveFrom,
                to: attendanceShiftCycleAssignments.effectiveTo,
              })
              .from(attendanceShiftCycleAssignments)
              .where(
                inArray(
                  attendanceShiftCycleAssignments.cycleId,
                  affectedCycleIds,
                ),
              )
          : [];
        const affected = new Map<string, { from: string; to: string | null }>();
        for (const assignment of [
          ...directAssignments,
          ...cycleAssignmentRows,
        ] as any[]) {
          const from = fmtDate(assignment.from);
          const to = assignment.to ? fmtDate(assignment.to) : null;
          const previous = affected.get(assignment.empCd);
          affected.set(assignment.empCd, {
            from: !previous || from < previous.from ? from : previous.from,
            to:
              !previous || previous.to === null || to === null
                ? null
                : to > previous.to
                  ? to
                  : previous.to,
          });
        }
        for (const [empCd, range] of affected) {
          await recomputeAssignmentRange(empCd, range.from, range.to);
        }

        await AuditLogService.log({
          action: "shift_updated",
          details: { shiftId: input.id, changes: Object.keys(updateData) },
          status: "success",
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error,
          cause: err,
        });
      }
    }),

  listAssignments: makeAttProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(z.object({ empCd: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const empFilter = input?.empCd
        ? sql`AND sa.emp_cd = ${input.empCd}`
        : sql``;
      const rows = await db.execute(sql`
        SELECT
          sa.id,
          sa.emp_cd        AS empCd,
          e.full_name      AS empName,
          sa.shift_id      AS shiftId,
          s.name           AS shiftName,
          sa.effective_from AS effectiveFrom,
          sa.effective_to   AS effectiveTo,
          sa.weekday_mask  AS weekdayMask
        FROM attendance_shift_assignments sa
        INNER JOIN attendance_employees e ON sa.emp_cd = e.emp_cd
        INNER JOIN attendance_shifts    s ON sa.shift_id = s.id
        WHERE 1=1 ${empFilter}
        ORDER BY sa.emp_cd, sa.effective_from DESC, sa.id DESC
      `);

      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const assignments: any[] = Array.isArray((rows as any)[0])
        ? (rows as any)[0]
        : (rows as any);
      return assignments.map((a: any) => {
        // Raw SQL rows carry DATE columns as local-midnight Date objects.
        const effectiveTo = a.effectiveTo ? fmtDate(a.effectiveTo) : null;
        return {
          id: a.id,
          empCd: a.empCd,
          empName: a.empName,
          shiftId: a.shiftId,
          shiftName: a.shiftName,
          effectiveFrom: fmtDate(a.effectiveFrom),
          effectiveTo,
          weekdayMask: a.weekdayMask,
          isExpired: effectiveTo !== null && effectiveTo < todayStr,
        };
      });
    }),

  assignShift: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        empCd: z.string(),
        shiftId: z.number(),
        effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
        effectiveTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(), // YYYY-MM-DD
        weekdayMask: z.number().int().min(0).max(127).default(127),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const result = await db.insert(attendanceShiftAssignments).values({
          empCd: input.empCd,
          shiftId: input.shiftId,
          effectiveFrom: input.effectiveFrom as any,
          effectiveTo: input.effectiveTo ? (input.effectiveTo as any) : null,
          weekdayMask: input.weekdayMask,
        });
        await recomputeAssignmentRange(
          input.empCd,
          input.effectiveFrom,
          input.effectiveTo,
        );

        await AuditLogService.log({
          action: "shift_assigned",
          details: {
            empCd: input.empCd,
            shiftId: input.shiftId,
            effectiveFrom: input.effectiveFrom,
          },
          status: "success",
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error,
          cause: err,
        });
      }
    }),

  addShiftAssignment: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        empCd: z.string(),
        shiftId: z.number(),
        effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        weekdayMask: z.number().int().min(0).max(127).default(127),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(attendanceShiftAssignments).values({
        empCd: input.empCd,
        shiftId: input.shiftId,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: null,
        weekdayMask: input.weekdayMask,
      });
      await recomputeAssignmentRange(input.empCd, input.effectiveFrom);
      return { success: true };
    }),

  updateAssignment: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        id: z.number(),
        shiftId: z.number().optional(),
        effectiveFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        effectiveTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        weekdayMask: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const existing = await db
          .select()
          .from(attendanceShiftAssignments)
          .where(eq(attendanceShiftAssignments.id, input.id))
          .limit(1);
        if (!existing[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "تعيين الوردية غير موجود",
          });
        }
        const updateData: any = {};
        if (input.shiftId !== undefined) updateData.shiftId = input.shiftId;
        if (input.effectiveFrom) updateData.effectiveFrom = input.effectiveFrom;
        // Allow clearing effectiveTo: undefined = don't touch, "" or null = clear it
        if (input.effectiveTo !== undefined)
          updateData.effectiveTo = input.effectiveTo || null;
        if (input.weekdayMask !== undefined)
          updateData.weekdayMask = input.weekdayMask;

        await db
          .update(attendanceShiftAssignments)
          .set(updateData)
          .where(eq(attendanceShiftAssignments.id, input.id));

        const previousFrom = fmtDate(existing[0].effectiveFrom as any);
        const previousTo = existing[0].effectiveTo
          ? fmtDate(existing[0].effectiveTo as any)
          : null;
        const nextFrom = input.effectiveFrom?.slice(0, 10) ?? previousFrom;
        const nextTo =
          input.effectiveTo === undefined
            ? previousTo
            : (input.effectiveTo?.slice(0, 10) ?? null);
        const recomputeFrom = nextFrom < previousFrom ? nextFrom : previousFrom;
        const recomputeTo =
          previousTo === null || nextTo === null
            ? null
            : previousTo > nextTo
              ? previousTo
              : nextTo;
        await recomputeAssignmentRange(
          existing[0].empCd,
          recomputeFrom,
          recomputeTo,
        );

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error,
          cause: err,
        });
      }
    }),

  deleteAssignment: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const existing = await db
          .select()
          .from(attendanceShiftAssignments)
          .where(eq(attendanceShiftAssignments.id, input.id))
          .limit(1);
        await db
          .delete(attendanceShiftAssignments)
          .where(eq(attendanceShiftAssignments.id, input.id));
        if (existing[0]) {
          await recomputeAssignmentRange(
            existing[0].empCd,
            fmtDate(existing[0].effectiveFrom as any),
            existing[0].effectiveTo
              ? fmtDate(existing[0].effectiveTo as any)
              : null,
          );
        }

        await AuditLogService.log({
          action: "shift_assignment_deleted",
          details: { assignmentId: input.id },
          status: "success",
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error,
          cause: err,
        });
      }
    }),

  saveDayShiftAssignments: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        empCd: z.string(),
        dayShifts: z.array(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            shiftId: z.number().int().positive(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = fmtDate(today);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = fmtDate(yesterday);

      await db.transaction(async (tx: any) => {
        const openAssignments = await tx
          .select()
          .from(attendanceShiftAssignments)
          .where(
            and(
              eq(attendanceShiftAssignments.empCd, input.empCd),
              isNull(attendanceShiftAssignments.effectiveTo),
            ),
          );

        for (const assignment of openAssignments) {
          if (fmtDate(assignment.effectiveFrom) < todayKey) {
            await tx
              .update(attendanceShiftAssignments)
              .set({ effectiveTo: yesterdayKey as any })
              .where(eq(attendanceShiftAssignments.id, assignment.id));
          } else {
            // Same-day and future schedules have no historical period to retain.
            await tx
              .delete(attendanceShiftAssignments)
              .where(eq(attendanceShiftAssignments.id, assignment.id));
          }
        }

        if (input.dayShifts.length === 0) return;

        const byShift = new Map<number, number[]>();
        for (const { dayOfWeek, shiftId } of input.dayShifts) {
          if (!byShift.has(shiftId)) byShift.set(shiftId, []);
          byShift.get(shiftId)!.push(dayOfWeek);
        }

        const rows = Array.from(byShift.entries()).map(([shiftId, days]) => ({
          empCd: input.empCd,
          shiftId,
          effectiveFrom: todayKey as any,
          effectiveTo: null,
          weekdayMask: days.reduce((mask, day) => mask | (1 << day), 0),
        }));
        await tx.insert(attendanceShiftAssignments).values(rows);
      });

      await recomputeAssignmentRange(input.empCd, todayKey);
      return { success: true };
    }),

  updateEmployee: makeAttWriteProcedure("/attendance/employees")
    .input(
      z
        .object({
          empCd: z.string(),
          fullName: z.string().min(1).optional(),
          department: z.string().optional(),
          salaryType: z.string().optional(),
          jobTitle: z.string().optional(),
          attendanceCommissionRate: z
            .number()
            .min(0)
            .max(1)
            .nullable()
            .optional(),
          attendanceLeaveMultiplier: z
            .number()
            .min(0)
            .max(1)
            .nullable()
            .optional(),
          active: z.boolean().optional(),
          terminationDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .nullable()
            .optional(),
        })
        .refine((input) => Object.keys(input).some((key) => key !== "empCd"), {
          message: "يجب إرسال حقل واحد على الأقل للتعديل",
        }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const updateData: Record<string, unknown> = {};
      if (input.fullName !== undefined) updateData.fullName = input.fullName;
      if (input.active !== undefined) updateData.active = input.active;
      if (input.department !== undefined)
        updateData.department = input.department;
      if (input.salaryType !== undefined)
        updateData.salaryType = input.salaryType;
      if (input.jobTitle !== undefined) updateData.jobTitle = input.jobTitle;
      if (input.attendanceCommissionRate !== undefined) {
        updateData.attendanceCommissionRate =
          input.attendanceCommissionRate == null
            ? null
            : String(input.attendanceCommissionRate);
      }
      if (input.attendanceLeaveMultiplier !== undefined) {
        updateData.attendanceLeaveMultiplier =
          input.attendanceLeaveMultiplier == null
            ? null
            : String(input.attendanceLeaveMultiplier);
      }
      if (input.active === true) {
        updateData.terminationDate = null;
      } else if (input.terminationDate !== undefined) {
        updateData.terminationDate = input.terminationDate;
      }
      await db
        .update(attendanceEmployees)
        .set(updateData as any)
        .where(eq(attendanceEmployees.empCd, input.empCd));
      return { success: true };
    }),

  terminateEmployee: makeAttWriteProcedure("/attendance/employees")
    .input(
      z.object({
        empCd: z.string().min(1),
        terminationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .update(attendanceEmployees)
        .set({ active: false, terminationDate: input.terminationDate })
        .where(eq(attendanceEmployees.empCd, input.empCd));

      const affectedRows =
        (result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows;
      if (affectedRows === 0) throw new Error("الموظف غير موجود");
      await closeEmploymentSchedule(input.empCd, input.terminationDate);
      return { success: true };
    }),

  deleteEmployee: makeAttWriteProcedure("/attendance/employees")
    .input(z.object({ empCd: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [employee] = await db
        .select({
          empCd: attendanceEmployees.empCd,
          active: attendanceEmployees.active,
          terminationDate: attendanceEmployees.terminationDate,
        })
        .from(attendanceEmployees)
        .where(eq(attendanceEmployees.empCd, input.empCd))
        .limit(1);
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الموظف غير موجود",
        });
      }

      const terminationDate = employee.terminationDate
        ? fmtDate(employee.terminationDate as any)
        : fmtDate(new Date());
      await db
        .update(attendanceEmployees)
        .set({ active: false, terminationDate: terminationDate as any })
        .where(eq(attendanceEmployees.empCd, input.empCd));
      await closeEmploymentSchedule(input.empCd, terminationDate);
      return { success: true };
    }),

  swapShifts: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z
        .object({
          empCdA: z.string().min(1),
          empCdB: z.string().min(1),
          dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD — start of swap
          dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD — last day of swap (inclusive)
        })
        .refine(
          (input) =>
            input.empCdA !== input.empCdB && input.dateFrom <= input.dateTo,
          {
            message: "اختر موظفين مختلفين وفترة صحيحة",
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const fromDate = new Date(`${input.dateFrom}T12:00:00`);
      const toDate = new Date(`${input.dateTo}T12:00:00`);
      const dayBefore = new Date(fromDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(toDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const fmt = fmtDate;

      const originalRows = await db.transaction(async (tx: any) => {
        const findAssignmentAtStart = async (empCd: string) => {
          const rows = await tx
            .select()
            .from(attendanceShiftAssignments)
            .where(
              and(
                eq(attendanceShiftAssignments.empCd, empCd),
                lte(
                  attendanceShiftAssignments.effectiveFrom,
                  input.dateFrom as any,
                ),
                or(
                  isNull(attendanceShiftAssignments.effectiveTo),
                  gte(
                    attendanceShiftAssignments.effectiveTo,
                    input.dateFrom as any,
                  ),
                ),
              ),
            )
            .orderBy(desc(attendanceShiftAssignments.effectiveFrom));
          if (rows.length !== 1) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `يجب وجود تعيين وردية واحد فقط بتاريخ البداية للموظف ${empCd}`,
            });
          }
          return rows[0];
        };
        const [aRow, bRow] = await Promise.all([
          findAssignmentAtStart(input.empCdA),
          findAssignmentAtStart(input.empCdB),
        ]);
        if (aRow.shiftId === bRow.shiftId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "الموظفان على نفس الوردية بالفعل",
          });
        for (const [empCd, row] of [
          [input.empCdA, aRow],
          [input.empCdB, bRow],
        ] as const) {
          if (row.effectiveTo && fmtDate(row.effectiveTo) < input.dateTo) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `تعيين الموظف ${empCd} لا يغطي كامل فترة التبديل`,
            });
          }
          const overlaps = await tx
            .select({ id: attendanceShiftAssignments.id })
            .from(attendanceShiftAssignments)
            .where(
              and(
                eq(attendanceShiftAssignments.empCd, empCd),
                lte(
                  attendanceShiftAssignments.effectiveFrom,
                  input.dateTo as any,
                ),
                or(
                  isNull(attendanceShiftAssignments.effectiveTo),
                  gte(
                    attendanceShiftAssignments.effectiveTo,
                    input.dateFrom as any,
                  ),
                ),
              ),
            );
          if (overlaps.some((assignment: any) => assignment.id !== row.id)) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `توجد تعيينات أخرى متداخلة للموظف ${empCd}`,
            });
          }
        }
        // Close each original the day before; one that starts on the swap
        // day has no earlier period, so remove it instead of inverting it.
        for (const row of [aRow, bRow]) {
          if (fmtDate(row.effectiveFrom) >= input.dateFrom) {
            await tx
              .delete(attendanceShiftAssignments)
              .where(eq(attendanceShiftAssignments.id, row.id));
          } else {
            await tx
              .update(attendanceShiftAssignments)
              .set({ effectiveTo: fmt(dayBefore) as any })
              .where(eq(attendanceShiftAssignments.id, row.id));
          }
        }
        await tx.insert(attendanceShiftAssignments).values([
          {
            empCd: input.empCdA,
            shiftId: bRow.shiftId,
            effectiveFrom: input.dateFrom as any,
            effectiveTo: input.dateTo as any,
            weekdayMask: aRow.weekdayMask,
          },
          {
            empCd: input.empCdB,
            shiftId: aRow.shiftId,
            effectiveFrom: input.dateFrom as any,
            effectiveTo: input.dateTo as any,
            weekdayMask: bRow.weekdayMask,
          },
        ]);
        // Restore the originals only if they continue past the swap.
        const restores = [
          { empCd: input.empCdA, row: aRow },
          { empCd: input.empCdB, row: bRow },
        ]
          .filter(
            ({ row }) =>
              !row.effectiveTo || fmtDate(row.effectiveTo) > input.dateTo,
          )
          .map(({ empCd, row }) => ({
            empCd,
            shiftId: row.shiftId,
            effectiveFrom: fmt(dayAfter) as any,
            effectiveTo: row.effectiveTo,
            weekdayMask: row.weekdayMask,
          }));
        if (restores.length) {
          await tx.insert(attendanceShiftAssignments).values(restores);
        }
        return [aRow, bRow] as const;
      });

      for (const empCd of [input.empCdA, input.empCdB]) {
        // Clamped to today: future days must not be materialized as absent.
        await recomputeAssignmentRange(empCd, input.dateFrom, input.dateTo);
      }
      await AuditLogService.log({
        action: "shift_swap",
        details: {
          empCdA: input.empCdA,
          empCdB: input.empCdB,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          shifts: originalRows.map((row: any) => row.shiftId),
        },
        userId: ctx.user.id,
        status: "success",
      });

      return { success: true };
    }),

  tempChangeShift: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z
        .object({
          empCd: z.string(),
          newShiftId: z.number().int(),
          dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD — first day
          dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD — last day (inclusive)
        })
        .refine(({ dateFrom, dateTo }) => dateFrom <= dateTo, {
          message: "فترة تغيير الوردية غير صحيحة",
        }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const fromDate = new Date(input.dateFrom);
      const toDate = new Date(input.dateTo);
      const dayBefore = new Date(fromDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(toDate);
      dayAfter.setDate(dayAfter.getDate() + 1);

      await db.transaction(async (tx: any) => {
        // Find current active assignment on dateFrom (handles open-ended and dated assignments like 2030-12-31)
        const existing = await tx
          .select()
          .from(attendanceShiftAssignments)
          .where(
            and(
              eq(attendanceShiftAssignments.empCd, input.empCd),
              lte(attendanceShiftAssignments.effectiveFrom, fromDate),
              or(
                isNull(attendanceShiftAssignments.effectiveTo),
                gte(attendanceShiftAssignments.effectiveTo, fromDate),
              ),
            ),
          )
          .orderBy(desc(attendanceShiftAssignments.effectiveFrom))
          .limit(1);

        const curr = existing[0];
        if (!curr)
          throw new Error("لا توجد وردية نشطة لهذا الموظف في هذا التاريخ");
        if (curr.shiftId === input.newShiftId)
          throw new Error("الموظف على هذه الوردية بالفعل");

        const currEffFromStr = fmtDate(curr.effectiveFrom);

        if (currEffFromStr === input.dateFrom) {
          // Original assignment starts exactly on dateFrom.
          // We delay its start to dayAfter.
          if (curr.effectiveTo && fmtDate(curr.effectiveTo) <= input.dateTo) {
            // If the original assignment ends within/on the swap period, delete it.
            await tx
              .delete(attendanceShiftAssignments)
              .where(eq(attendanceShiftAssignments.id, curr.id));
          } else {
            await tx
              .update(attendanceShiftAssignments)
              .set({ effectiveFrom: fmt(dayAfter) as any })
              .where(eq(attendanceShiftAssignments.id, curr.id));
          }
        } else {
          // Original assignment starts before dateFrom.
          // Close it the day before the change.
          await tx
            .update(attendanceShiftAssignments)
            .set({ effectiveTo: fmt(dayBefore) as any })
            .where(eq(attendanceShiftAssignments.id, curr.id));

          // Restore original shift after the period (if it doesn't end before/on dateTo)
          if (!curr.effectiveTo || fmtDate(curr.effectiveTo) > input.dateTo) {
            await tx.insert(attendanceShiftAssignments).values({
              empCd: input.empCd,
              shiftId: curr.shiftId,
              effectiveFrom: fmt(dayAfter) as any,
              effectiveTo: curr.effectiveTo,
              weekdayMask: curr.weekdayMask,
            });
          }
        }

        // Insert the temporary assignment
        await tx.insert(attendanceShiftAssignments).values({
          empCd: input.empCd,
          shiftId: input.newShiftId,
          effectiveFrom: input.dateFrom as any,
          effectiveTo: input.dateTo as any,
          weekdayMask: curr.weekdayMask,
        });
      });
      await recomputeAssignmentRange(input.empCd, input.dateFrom, input.dateTo);
      return { success: true };
    }),

  bulkAssignShift: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        empCds: z.array(z.string()).min(1),
        shiftId: z.number().int(),
        effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        effectiveTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        weekdayMask: z.number().int().default(62), // Sun-Thu default (0b0111110)
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let inserted = 0;
      for (const empCd of input.empCds) {
        await db.insert(attendanceShiftAssignments).values({
          empCd,
          shiftId: input.shiftId,
          effectiveFrom: input.effectiveFrom as any,
          effectiveTo: input.effectiveTo ? (input.effectiveTo as any) : null,
          weekdayMask: input.weekdayMask,
        });
        inserted++;
        await recomputeAssignmentRange(
          empCd,
          input.effectiveFrom,
          input.effectiveTo,
        );
      }
      return { success: true, inserted };
    }),

  createShiftChangeRequest: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        empCd: z.string(),
        requestType: z.enum(["daily", "weekly", "monthly", "swap"]),
        newShiftId: z.number().int().optional(),
        weekdayMask: z.number().int().optional(),
        cycleId: z.number().int().optional(),
        swapEmpCd: z.string().optional(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(attendanceShiftChangeRequests).values({
        empCd: input.empCd,
        requestType: input.requestType,
        newShiftId: input.newShiftId || null,
        weekdayMask: input.weekdayMask || null,
        cycleId: input.cycleId || null,
        swapEmpCd: input.swapEmpCd || null,
        dateFrom: input.dateFrom as any,
        dateTo: input.dateTo ? (input.dateTo as any) : null,
        status: "pending",
        note: input.note || null,
      });

      return { success: true };
    }),

  listShiftChangeRequests: makeAttProcedure(["/attendance", "/attendance/employees"])
    .input(
      z
        .object({
          empCd: z.string().optional(),
          status: z.enum(["pending", "approved", "rejected"]).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input?.empCd) {
        conditions.push(eq(attendanceShiftChangeRequests.empCd, input.empCd));
      }
      if (input?.status) {
        conditions.push(eq(attendanceShiftChangeRequests.status, input.status));
      }

      const rows = await db
        .select({
          id: attendanceShiftChangeRequests.id,
          empCd: attendanceShiftChangeRequests.empCd,
          empName: attendanceEmployees.fullName,
          requestType: attendanceShiftChangeRequests.requestType,
          newShiftId: attendanceShiftChangeRequests.newShiftId,
          newShiftName: attendanceShifts.name,
          weekdayMask: attendanceShiftChangeRequests.weekdayMask,
          cycleId: attendanceShiftChangeRequests.cycleId,
          cycleName: attendanceShiftCycles.name,
          swapEmpCd: attendanceShiftChangeRequests.swapEmpCd,
          swapEmpName: sql<string>`(SELECT full_name FROM attendance_employees WHERE emp_cd = ${attendanceShiftChangeRequests.swapEmpCd})`,
          dateFrom: attendanceShiftChangeRequests.dateFrom,
          dateTo: attendanceShiftChangeRequests.dateTo,
          status: attendanceShiftChangeRequests.status,
          note: attendanceShiftChangeRequests.note,
          createdAt: attendanceShiftChangeRequests.createdAt,
        })
        .from(attendanceShiftChangeRequests)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceShiftChangeRequests.empCd, attendanceEmployees.empCd),
        )
        .leftJoin(
          attendanceShifts,
          eq(attendanceShiftChangeRequests.newShiftId, attendanceShifts.id),
        )
        .leftJoin(
          attendanceShiftCycles,
          eq(attendanceShiftChangeRequests.cycleId, attendanceShiftCycles.id),
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(attendanceShiftChangeRequests.createdAt));

      return rows.map((r: any) => ({
        ...r,
        dateFrom: fmtDate(r.dateFrom as any),
        dateTo: r.dateTo ? fmtDate(r.dateTo as any) : null,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

  approveShiftChangeRequest: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        requestId: z.number().int(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const rootDb = await getDb();
      if (!rootDb) throw new Error("Database not available");
      const req = await rootDb.transaction(async (db: any) => {
        // 1. Get the request
        const reqRows = await db
          .select()
          .from(attendanceShiftChangeRequests)
          .where(eq(attendanceShiftChangeRequests.id, input.requestId))
          .limit(1)
          .for("update");
        const req = reqRows[0];
        if (!req) throw new Error("الطلب غير موجود");
        if (req.status !== "pending")
          throw new Error("الطلب تم البت فيه بالفعل");

        const fromDate = new Date(req.dateFrom);
        const toDate = req.dateTo
          ? new Date(req.dateTo)
          : new Date(req.dateFrom);
        const dateFromStr = fmtDate(req.dateFrom);
        const dateToStr = fmtDate(req.dateTo || req.dateFrom);

        const dayBefore = new Date(fromDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dayAfter = new Date(toDate);
        dayAfter.setDate(dayAfter.getDate() + 1);
        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        // 2. Execute based on type
        if (req.requestType === "daily") {
          // Daily temporary shift swap
          if (!req.newShiftId)
            throw new Error("الطلب غير مكتمل: لم يتم تحديد الوردية الجديدة");

          // Reuse our robust temp change logic
          const existing = await db
            .select()
            .from(attendanceShiftAssignments)
            .where(
              and(
                eq(attendanceShiftAssignments.empCd, req.empCd),
                lte(attendanceShiftAssignments.effectiveFrom, fromDate),
                or(
                  isNull(attendanceShiftAssignments.effectiveTo),
                  gte(attendanceShiftAssignments.effectiveTo, fromDate),
                ),
              ),
            )
            .orderBy(desc(attendanceShiftAssignments.effectiveFrom))
            .for("update");

          const curr = existing[0];
          if (existing.length > 1)
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "يوجد أكثر من تعيين نشط؛ حدّد الوردية من شاشة التعيينات بدل اعتماد تغيير مبهم",
            });
          if (!curr)
            throw new Error("لا توجد وردية نشطة للموظف في تاريخ البداية");
          if (curr.shiftId === req.newShiftId)
            throw new Error("الموظف على هذه الوردية بالفعل");

          const currEffFromStr = fmtDate(curr.effectiveFrom);

          if (currEffFromStr === dateFromStr) {
            if (curr.effectiveTo && fmtDate(curr.effectiveTo) <= dateToStr) {
              await db
                .delete(attendanceShiftAssignments)
                .where(eq(attendanceShiftAssignments.id, curr.id));
            } else {
              await db
                .update(attendanceShiftAssignments)
                .set({ effectiveFrom: fmt(dayAfter) as any })
                .where(eq(attendanceShiftAssignments.id, curr.id));
            }
          } else {
            await db
              .update(attendanceShiftAssignments)
              .set({ effectiveTo: fmt(dayBefore) as any })
              .where(eq(attendanceShiftAssignments.id, curr.id));

            if (!curr.effectiveTo || fmtDate(curr.effectiveTo) > dateToStr) {
              await db.insert(attendanceShiftAssignments).values({
                empCd: req.empCd,
                shiftId: curr.shiftId,
                effectiveFrom: fmt(dayAfter) as any,
                effectiveTo: curr.effectiveTo,
                weekdayMask: curr.weekdayMask,
              });
            }
          }

          await db.insert(attendanceShiftAssignments).values({
            empCd: req.empCd,
            shiftId: req.newShiftId,
            effectiveFrom: req.dateFrom as any,
            effectiveTo: req.dateTo as any,
            weekdayMask: curr.weekdayMask,
          });
        } else if (req.requestType === "weekly") {
          // Weekly assignment
          if (!req.newShiftId || !req.weekdayMask)
            throw new Error(
              "الطلب غير مكتمل: لم يتم تحديد الوردية أو أيام العمل",
            );

          // End current open-ended assignment if any
          await db.execute(sql`
          UPDATE attendance_shift_assignments
          SET effective_to = ${fmt(dayBefore)}
          WHERE emp_cd = ${req.empCd} AND effective_to IS NULL
        `);

          // Insert new assignment
          await db.insert(attendanceShiftAssignments).values({
            empCd: req.empCd,
            shiftId: req.newShiftId,
            effectiveFrom: req.dateFrom as any,
            effectiveTo: req.dateTo ? (req.dateTo as any) : null,
            weekdayMask: req.weekdayMask,
          });
        } else if (req.requestType === "monthly") {
          // Monthly shift cycle assignment
          if (!req.cycleId)
            throw new Error("الطلب غير مكتمل: لم يتم تحديد الدورة");

          // End current cycle assignment
          await db.execute(sql`
          UPDATE attendance_shift_cycle_assignments
          SET effective_to = ${fmt(dayBefore)}
          WHERE emp_cd = ${req.empCd} AND effective_to IS NULL
        `);

          // Insert new cycle assignment
          await db.insert(attendanceShiftCycleAssignments).values({
            empCd: req.empCd,
            cycleId: req.cycleId,
            effectiveFrom: req.dateFrom as any,
            effectiveTo: req.dateTo ? (req.dateTo as any) : null,
          });
        } else if (req.requestType === "swap") {
          // Swap shifts between two employees
          if (!req.swapEmpCd)
            throw new Error("الطلب غير مكتمل: لم يتم تحديد الموظف الآخر");

          // Find active shift of Employee A
          const existingA = await db
            .select()
            .from(attendanceShiftAssignments)
            .where(
              and(
                eq(attendanceShiftAssignments.empCd, req.empCd),
                lte(attendanceShiftAssignments.effectiveFrom, fromDate),
                or(
                  isNull(attendanceShiftAssignments.effectiveTo),
                  gte(attendanceShiftAssignments.effectiveTo, fromDate),
                ),
              ),
            )
            .orderBy(desc(attendanceShiftAssignments.effectiveFrom))
            .for("update");

          // Find active shift of Employee B
          const existingB = await db
            .select()
            .from(attendanceShiftAssignments)
            .where(
              and(
                eq(attendanceShiftAssignments.empCd, req.swapEmpCd),
                lte(attendanceShiftAssignments.effectiveFrom, fromDate),
                or(
                  isNull(attendanceShiftAssignments.effectiveTo),
                  gte(attendanceShiftAssignments.effectiveTo, fromDate),
                ),
              ),
            )
            .orderBy(desc(attendanceShiftAssignments.effectiveFrom))
            .for("update");

          const aRow = existingA[0];
          const bRow = existingB[0];
          if (existingA.length > 1 || existingB.length > 1)
            throw new TRPCError({
              code: "CONFLICT",
              message: "لا يمكن تبادل تعيين مبهم لموظف لديه أكثر من وردية نشطة",
            });
          if (!aRow || !bRow)
            throw new Error(
              "أحد الموظفين لا توجد لديه وردية نشطة في هذا التاريخ",
            );
          if (aRow.shiftId === bRow.shiftId)
            throw new Error("الموظفان على نفس الوردية بالفعل");

          // Close both assignments the day before
          await Promise.all([
            db
              .update(attendanceShiftAssignments)
              .set({ effectiveTo: fmt(dayBefore) as any })
              .where(eq(attendanceShiftAssignments.id, aRow.id)),
            db
              .update(attendanceShiftAssignments)
              .set({ effectiveTo: fmt(dayBefore) as any })
              .where(eq(attendanceShiftAssignments.id, bRow.id)),
          ]);

          // Create swapped assignments for the period
          await db.insert(attendanceShiftAssignments).values([
            {
              empCd: req.empCd,
              shiftId: bRow.shiftId,
              effectiveFrom: req.dateFrom as any,
              effectiveTo: req.dateTo as any,
              weekdayMask: aRow.weekdayMask,
            },
            {
              empCd: req.swapEmpCd,
              shiftId: aRow.shiftId,
              effectiveFrom: req.dateFrom as any,
              effectiveTo: req.dateTo as any,
              weekdayMask: bRow.weekdayMask,
            },
          ]);

          // Restore original shifts starting the day after the swap ends
          if (!aRow.effectiveTo || fmtDate(aRow.effectiveTo) > dateToStr) {
            await db.insert(attendanceShiftAssignments).values({
              empCd: req.empCd,
              shiftId: aRow.shiftId,
              effectiveFrom: fmt(dayAfter) as any,
              effectiveTo: aRow.effectiveTo,
              weekdayMask: aRow.weekdayMask,
            });
          }
          if (!bRow.effectiveTo || fmtDate(bRow.effectiveTo) > dateToStr) {
            await db.insert(attendanceShiftAssignments).values({
              empCd: req.swapEmpCd,
              shiftId: bRow.shiftId,
              effectiveFrom: fmt(dayAfter) as any,
              effectiveTo: bRow.effectiveTo,
              weekdayMask: bRow.weekdayMask,
            });
          }
        }

        // 3. Mark request as approved
        await db
          .update(attendanceShiftChangeRequests)
          .set({ status: "approved", updatedAt: new Date() })
          .where(eq(attendanceShiftChangeRequests.id, input.requestId));
        return req;
      });
      const dateFromStr = fmtDate(req.dateFrom);
      await AuditLogService.log({
        action: "shift_request_approved",
        empCd: req.empCd,
        userId: ctx.user.id,
        details: { requestId: input.requestId, type: req.requestType },
        status: "success",
      });

      // 4. Recompute daily attendance & monthly reports immediately to propagate changes
      try {
        // Clamped to today and scoped to the affected employees.
        const recomputeTo = req.dateTo ? fmtDate(req.dateTo) : null;
        await recomputeAssignmentRange(req.empCd, dateFromStr, recomputeTo);
        if (req.requestType === "swap" && req.swapEmpCd) {
          await recomputeAssignmentRange(
            req.swapEmpCd,
            dateFromStr,
            recomputeTo,
          );
        }
      } catch (err: any) {
        console.error(
          "Failed to recompute daily/monthly attendance after shift approval:",
          err,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "تم اعتماد الطلب لكن تعذرت إعادة حساب الحضور؛ أعد الحساب من الإعدادات",
          cause: err,
        });
      }

      return { success: true };
    }),

  rejectShiftChangeRequest: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        requestId: z.number().int(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(attendanceShiftChangeRequests)
        .set({
          status: "rejected",
          note: input.note || null,
          updatedAt: new Date(),
        })
        .where(eq(attendanceShiftChangeRequests.id, input.requestId));

      return { success: true };
    }),

  listShiftCycles: makeAttProcedure(["/attendance/shift-schedule", "/attendance/employees"]).query(
    async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const cycles = await db.select().from(attendanceShiftCycles);
      const slots = await db.select().from(attendanceShiftCycleSlots);
      return cycles.map((c: any) => ({
        id: c.id,
        name: c.name,
        period: c.period,
        anchorDate:
          c.anchorDate instanceof Date
            ? `${c.anchorDate.getFullYear()}-${String(c.anchorDate.getMonth() + 1).padStart(2, "0")}-${String(c.anchorDate.getDate()).padStart(2, "0")}`
            : String(c.anchorDate).slice(0, 10),
        slots: slots
          .filter((s: any) => s.cycleId === c.id)
          .sort((a: any, b: any) => a.slotIndex - b.slotIndex)
          .map((s: any) => ({
            id: s.id,
            slotIndex: s.slotIndex,
            shiftId: s.shiftId,
          })),
      }));
    },
  ),

  createShiftCycle: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z
        .object({
          name: z.string().min(1).max(100),
          period: z.enum(["day", "week", "month", "rotation"]),
          anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          slots: z
            .array(
              z.object({
                slotIndex: z.number().int().min(0).max(31),
                // 0 = explicit rest day (rotation cycles only)
                shiftId: z.number().int().min(0),
              }),
            )
            .min(1)
            .max(31),
        })
        .superRefine((input, ctx) => {
          const indexes = input.slots.map((slot) => slot.slotIndex);
          if (
            input.slots.some((slot) => slot.shiftId === 0) &&
            input.period !== "rotation"
          ) {
            ctx.addIssue({
              code: "custom",
              message: "أيام الراحة الصريحة متاحة لدورات التتابع فقط",
              path: ["slots"],
            });
          }
          if (!input.slots.some((slot) => slot.shiftId > 0)) {
            ctx.addIssue({
              code: "custom",
              message: "يجب تحديد وردية واحدة على الأقل",
              path: ["slots"],
            });
          }
          if (new Set(indexes).size !== indexes.length) {
            ctx.addIssue({
              code: "custom",
              message: "مؤشر الوردية مكرر",
              path: ["slots"],
            });
          }
          const maxSlot = input.period === "month" ? 31 : 6;
          if (
            indexes.some(
              (index) =>
                index > maxSlot || (input.period === "month" && index === 0),
            )
          ) {
            ctx.addIssue({
              code: "custom",
              message: "مؤشر الوردية خارج نطاق الدورة",
              path: ["slots"],
            });
          }
        }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const cycleId = await db.transaction(async (tx: any) => {
        const cycleResult = await tx.insert(attendanceShiftCycles).values({
          name: input.name,
          period: input.period,
          anchorDate: input.anchorDate as any,
        });
        const insertedId = Number(
          (cycleResult as any)?.[0]?.insertId ?? (cycleResult as any)?.insertId,
        );
        if (!Number.isSafeInteger(insertedId) || insertedId <= 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "تعذر قراءة رقم دورة الوردية الجديدة",
          });
        }
        await tx
          .insert(attendanceShiftCycleSlots)
          .values(
            input.slots.map((slot) => ({ ...slot, cycleId: insertedId })),
          );
        return insertedId;
      });
      return { id: cycleId };
    }),

  updateShiftCycle: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z
        .object({
          id: z.number().int(),
          name: z.string().min(1).max(100).optional(),
          period: z.enum(["day", "week", "month", "rotation"]).optional(),
          anchorDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
          slots: z
            .array(
              z.object({
                slotIndex: z.number().int().min(0).max(31),
                // 0 = explicit rest day (rotation cycles only)
                shiftId: z.number().int().min(0),
              }),
            )
            .max(31)
            .optional(),
        })
        .superRefine((input, ctx) => {
          if (!input.slots || !input.period) return;
          const indexes = input.slots.map((slot) => slot.slotIndex);
          if (
            input.slots.some((slot) => slot.shiftId === 0) &&
            input.period !== "rotation"
          ) {
            ctx.addIssue({
              code: "custom",
              message: "أيام الراحة الصريحة متاحة لدورات التتابع فقط",
              path: ["slots"],
            });
          }
          if (!input.slots.some((slot) => slot.shiftId > 0)) {
            ctx.addIssue({
              code: "custom",
              message: "يجب تحديد وردية واحدة على الأقل",
              path: ["slots"],
            });
          }
          if (new Set(indexes).size !== indexes.length) {
            ctx.addIssue({
              code: "custom",
              message: "مؤشر الوردية مكرر",
              path: ["slots"],
            });
          }
          const maxSlot = input.period === "month" ? 31 : 6;
          if (
            indexes.some(
              (index) =>
                index > maxSlot || (input.period === "month" && index === 0),
            )
          ) {
            ctx.addIssue({
              code: "custom",
              message: "مؤشر الوردية خارج نطاق الدورة",
              path: ["slots"],
            });
          }
        }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existingAssignments = await db
        .select({
          empCd: attendanceShiftCycleAssignments.empCd,
          from: attendanceShiftCycleAssignments.effectiveFrom,
          to: attendanceShiftCycleAssignments.effectiveTo,
        })
        .from(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.cycleId, input.id));
      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.period) updateData.period = input.period;
      if (input.anchorDate) updateData.anchorDate = input.anchorDate;
      if (Object.keys(updateData).length) {
        await db
          .update(attendanceShiftCycles)
          .set(updateData)
          .where(eq(attendanceShiftCycles.id, input.id));
      }
      if (input.slots) {
        await db.transaction(async (tx: any) => {
          await tx
            .delete(attendanceShiftCycleSlots)
            .where(eq(attendanceShiftCycleSlots.cycleId, input.id));
          if (input.slots!.length) {
            await tx
              .insert(attendanceShiftCycleSlots)
              .values(
                input.slots!.map((slot) => ({ ...slot, cycleId: input.id })),
              );
          }
        });
      }
      for (const assignment of existingAssignments as any[]) {
        await recomputeAssignmentRange(
          assignment.empCd,
          fmtDate(assignment.from),
          assignment.to ? fmtDate(assignment.to) : null,
        );
      }
      return { success: true };
    }),

  deleteShiftCycle: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existingAssignments = await db
        .select({
          empCd: attendanceShiftCycleAssignments.empCd,
          from: attendanceShiftCycleAssignments.effectiveFrom,
          to: attendanceShiftCycleAssignments.effectiveTo,
        })
        .from(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.cycleId, input.id));
      await db
        .delete(attendanceShiftCycleSlots)
        .where(eq(attendanceShiftCycleSlots.cycleId, input.id));
      await db
        .delete(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.cycleId, input.id));
      await db
        .delete(attendanceShiftCycles)
        .where(eq(attendanceShiftCycles.id, input.id));
      for (const assignment of existingAssignments as any[]) {
        await recomputeAssignmentRange(
          assignment.empCd,
          fmtDate(assignment.from),
          assignment.to ? fmtDate(assignment.to) : null,
        );
      }
      return { success: true };
    }),

  listCycleAssignments: makeAttProcedure(["/attendance/shift-schedule", "/attendance/employees"]).query(
    async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select({
          id: attendanceShiftCycleAssignments.id,
          empCd: attendanceShiftCycleAssignments.empCd,
          cycleId: attendanceShiftCycleAssignments.cycleId,
          effectiveFrom: attendanceShiftCycleAssignments.effectiveFrom,
          effectiveTo: attendanceShiftCycleAssignments.effectiveTo,
          empName: attendanceEmployees.fullName,
          cycleName: attendanceShiftCycles.name,
          period: attendanceShiftCycles.period,
        })
        .from(attendanceShiftCycleAssignments)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceShiftCycleAssignments.empCd, attendanceEmployees.empCd),
        )
        .leftJoin(
          attendanceShiftCycles,
          eq(attendanceShiftCycleAssignments.cycleId, attendanceShiftCycles.id),
        );
      return rows.map((r: any) => ({
        ...r,
        effectiveFrom:
          r.effectiveFrom instanceof Date
            ? `${r.effectiveFrom.getFullYear()}-${String(r.effectiveFrom.getMonth() + 1).padStart(2, "0")}-${String(r.effectiveFrom.getDate()).padStart(2, "0")}`
            : String(r.effectiveFrom ?? "").slice(0, 10),
        effectiveTo: r.effectiveTo
          ? r.effectiveTo instanceof Date
            ? `${r.effectiveTo.getFullYear()}-${String(r.effectiveTo.getMonth() + 1).padStart(2, "0")}-${String(r.effectiveTo.getDate()).padStart(2, "0")}`
            : String(r.effectiveTo).slice(0, 10)
          : null,
      }));
    },
  ),

  assignCycle: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        empCds: z.array(z.string()).min(1),
        cycleId: z.number().int(),
        effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        effectiveTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      for (const empCd of input.empCds) {
        // Close the previous cycle the day before so the two never overlap.
        const previousDay = new Date(`${input.effectiveFrom}T12:00:00`);
        previousDay.setDate(previousDay.getDate() - 1);
        await db.execute(sql`
          UPDATE attendance_shift_cycle_assignments
          SET effective_to = ${fmtDate(previousDay)}
          WHERE emp_cd = ${empCd} AND effective_to IS NULL
        `);
        await db.insert(attendanceShiftCycleAssignments).values({
          empCd,
          cycleId: input.cycleId,
          effectiveFrom: input.effectiveFrom as any,
          effectiveTo: input.effectiveTo ? (input.effectiveTo as any) : null,
        });
        await recomputeAssignmentRange(
          empCd,
          input.effectiveFrom,
          input.effectiveTo,
        );
      }
      return { inserted: input.empCds.length };
    }),

  updateCycleAssignment: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(
      z.object({
        id: z.number().int(),
        cycleId: z.number().int().optional(),
        effectiveFrom: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        effectiveTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db
        .select()
        .from(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.id, input.id))
        .limit(1);
      if (!existing[0]) throw new Error("تعيين الدورة غير موجود");
      const upd: any = {};
      if (input.cycleId !== undefined) upd.cycleId = input.cycleId;
      if (input.effectiveFrom !== undefined)
        upd.effectiveFrom = input.effectiveFrom as any;
      if (input.effectiveTo !== undefined)
        upd.effectiveTo = input.effectiveTo ? (input.effectiveTo as any) : null;
      if (Object.keys(upd).length) {
        await db
          .update(attendanceShiftCycleAssignments)
          .set(upd)
          .where(eq(attendanceShiftCycleAssignments.id, input.id));
      }
      const oldFrom = fmtDate(existing[0].effectiveFrom as any);
      const newFrom = input.effectiveFrom?.slice(0, 10) ?? oldFrom;
      const oldTo = existing[0].effectiveTo
        ? fmtDate(existing[0].effectiveTo as any)
        : null;
      const newTo =
        input.effectiveTo === undefined
          ? oldTo
          : (input.effectiveTo?.slice(0, 10) ?? null);
      await recomputeAssignmentRange(
        existing[0].empCd,
        newFrom < oldFrom ? newFrom : oldFrom,
        oldTo === null || newTo === null ? null : oldTo > newTo ? oldTo : newTo,
      );
      return { success: true };
    }),

  removeCycleAssignment: makeAttWriteProcedure(["/attendance/shift-schedule", "/attendance/employees"])
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db
        .select()
        .from(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.id, input.id))
        .limit(1);
      await db
        .delete(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.id, input.id));
      if (existing[0]) {
        await recomputeAssignmentRange(
          existing[0].empCd,
          fmtDate(existing[0].effectiveFrom as any),
          existing[0].effectiveTo
            ? fmtDate(existing[0].effectiveTo as any)
            : null,
        );
      }
      return { success: true };
    }),
};
