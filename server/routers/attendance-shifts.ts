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
import { desc, eq, and, or, gte, lte, lt, max, count, sql } from "drizzle-orm";

export const attendanceShiftsRoutes = {
  listShifts: makeAttProcedure("/attendance/shift-schedule").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const shifts = await db
      .select()
      .from(attendanceShifts)
      .where(eq(attendanceShifts.active, true))
      .orderBy(attendanceShifts.name);

    return shifts.map((s) => ({
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      crossesMidnight: s.crossesMidnight,
      graceLateMin: s.graceLateMin,
      graceEarlyMin: s.graceEarlyMin,
      allowOT: s.allowOT,
      breakMinutes: s.breakMinutes,
      weekdayMask: s.weekdayMask,
      requirePunch: s.requirePunch,
      active: s.active,
    }));
  }),

  createShift: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        name: z.string().min(1).max(64),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        crossesMidnight: z.boolean().optional(),
        graceLateMin: z.number().int().min(0).default(15),
        graceEarlyMin: z.number().int().min(0).default(15),
        allowOT: z.boolean().default(false),
        breakMinutes: z.number().int().min(0).default(60),
        requirePunch: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const result = await db.insert(attendanceShifts).values({
          name: input.name,
          startTime: input.startTime,
          endTime: input.endTime,
          crossesMidnight: input.crossesMidnight ?? false,
          graceLateMin: input.graceLateMin,
          graceEarlyMin: input.graceEarlyMin,
          allowOT: input.allowOT,
          breakMinutes: input.breakMinutes,
          weekdayMask: 127,
          requirePunch: input.requirePunch,
          active: true,
        });

        const shiftId = (result as any).insertId;

        AuditLogService.log({
          action: "shift_created",
          details: { shiftId, name: input.name },
          status: "success",
        });

        return { success: true, shiftId };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "shift_created",
          details: { error },
          status: "error",
        });
        return { success: false, error };
      }
    }),

  updateShift: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(64).optional(),
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
        breakMinutes: z.number().int().min(0).optional(),
        requirePunch: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.startTime) updateData.startTime = input.startTime;
        if (input.endTime) updateData.endTime = input.endTime;
        if (input.graceLateMin !== undefined)
          updateData.graceLateMin = input.graceLateMin;
        if (input.graceEarlyMin !== undefined)
          updateData.graceEarlyMin = input.graceEarlyMin;
        if (input.allowOT !== undefined) updateData.allowOT = input.allowOT;
        if (input.breakMinutes !== undefined)
          updateData.breakMinutes = input.breakMinutes;
        if (input.requirePunch !== undefined)
          updateData.requirePunch = input.requirePunch;

        await db
          .update(attendanceShifts)
          .set(updateData)
          .where(eq(attendanceShifts.id, input.id));

        AuditLogService.log({
          action: "shift_updated",
          details: { shiftId: input.id, changes: Object.keys(updateData) },
          status: "success",
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    }),

  listAssignments: makeAttProcedure("/attendance/shift-schedule")
    .input(z.object({ empCd: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [
        sql`(${attendanceShiftAssignments.effectiveTo} IS NULL OR ${attendanceShiftAssignments.effectiveTo} >= CURDATE())`,
      ];
      if (input?.empCd) {
        conditions.push(eq(attendanceShiftAssignments.empCd, input.empCd));
      }

      const assignments = await db
        .select({
          id: attendanceShiftAssignments.id,
          empCd: attendanceShiftAssignments.empCd,
          empName: attendanceEmployees.fullName,
          shiftId: attendanceShiftAssignments.shiftId,
          shiftName: attendanceShifts.name,
          effectiveFrom: attendanceShiftAssignments.effectiveFrom,
          effectiveTo: attendanceShiftAssignments.effectiveTo,
          weekdayMask: attendanceShiftAssignments.weekdayMask,
        })
        .from(attendanceShiftAssignments)
        .innerJoin(
          attendanceEmployees,
          eq(attendanceShiftAssignments.empCd, attendanceEmployees.empCd),
        )
        .innerJoin(
          attendanceShifts,
          eq(attendanceShiftAssignments.shiftId, attendanceShifts.id),
        )
        .where(and(...conditions))
        .orderBy(attendanceShiftAssignments.empCd);

      return assignments.map((a) => ({
        id: a.id,
        empCd: a.empCd,
        empName: a.empName,
        shiftId: a.shiftId,
        shiftName: a.shiftName,
        effectiveFrom: a.effectiveFrom.toISOString().split("T")[0],
        effectiveTo: a.effectiveTo
          ? a.effectiveTo.toISOString().split("T")[0]
          : null,
        weekdayMask: a.weekdayMask,
      }));
    }),

  assignShift: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCd: z.string(),
        shiftId: z.number(),
        effectiveFrom: z.string(), // YYYY-MM-DD
        effectiveTo: z.string().optional(), // YYYY-MM-DD
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

        AuditLogService.log({
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
        return { success: false, error };
      }
    }),

  addShiftAssignment: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCd: z.string(),
        shiftId: z.number(),
        effectiveFrom: z.string(),
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
      return { success: true };
    }),

  updateAssignment: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        id: z.number(),
        shiftId: z.number().optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().nullable().optional(),
        weekdayMask: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
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

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    }),

  deleteAssignment: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        await db
          .delete(attendanceShiftAssignments)
          .where(eq(attendanceShiftAssignments.id, input.id));

        AuditLogService.log({
          action: "shift_assignment_deleted",
          details: { assignmentId: input.id },
          status: "success",
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    }),

  saveDayShiftAssignments: makeAttWriteProcedure("/attendance/shift-schedule")
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

      await db
        .delete(attendanceShiftAssignments)
        .where(
          and(
            eq(attendanceShiftAssignments.empCd, input.empCd),
            isNull(attendanceShiftAssignments.effectiveTo),
          ),
        );

      if (input.dayShifts.length === 0) return { success: true };

      const byShift = new Map<number, number[]>();
      for (const { dayOfWeek, shiftId } of input.dayShifts) {
        if (!byShift.has(shiftId)) byShift.set(shiftId, []);
        byShift.get(shiftId)!.push(dayOfWeek);
      }

      const today = new Date();
      const rows = Array.from(byShift.entries()).map(([shiftId, days]) => ({
        empCd: input.empCd,
        shiftId,
        effectiveFrom: today,
        effectiveTo: null as Date | null,
        weekdayMask: days.reduce((m, d) => m | (1 << d), 0),
      }));

      await db.insert(attendanceShiftAssignments).values(rows);
      return { success: true };
    }),

  updateEmployee: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCd: z.string(),
        fullName: z.string().min(1),
        department: z.string().optional(),
        salaryType: z.string().optional(),
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
        active: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(attendanceEmployees)
        .set({
          fullName: input.fullName,
          department: input.department ?? null,
          salaryType: input.salaryType ?? null,
          attendanceCommissionRate:
            input.attendanceCommissionRate != null
              ? (String(input.attendanceCommissionRate) as any)
              : null,
          attendanceLeaveMultiplier:
            input.attendanceLeaveMultiplier != null
              ? (String(input.attendanceLeaveMultiplier) as any)
              : null,
          active: input.active,
        })
        .where(eq(attendanceEmployees.empCd, input.empCd));
      return { success: true };
    }),

  deleteEmployee: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(z.object({ empCd: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(attendanceEmployees)
        .where(eq(attendanceEmployees.empCd, input.empCd));
      return { success: true };
    }),

  swapShifts: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCdA: z.string(),
        empCdB: z.string(),
        dateFrom: z.string(), // YYYY-MM-DD — start of swap
        dateTo: z.string(), // YYYY-MM-DD — last day of swap (inclusive)
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [aRows, bRows] = await Promise.all([
        db
          .select()
          .from(attendanceShiftAssignments)
          .where(
            and(
              eq(attendanceShiftAssignments.empCd, input.empCdA),
              isNull(attendanceShiftAssignments.effectiveTo),
            ),
          )
          .limit(1),
        db
          .select()
          .from(attendanceShiftAssignments)
          .where(
            and(
              eq(attendanceShiftAssignments.empCd, input.empCdB),
              isNull(attendanceShiftAssignments.effectiveTo),
            ),
          )
          .limit(1),
      ]);

      const aRow = aRows[0];
      const bRow = bRows[0];

      if (!aRow) throw new Error("لا توجد وردية نشطة للموظف الأول");
      if (!bRow) throw new Error("لا توجد وردية نشطة للموظف الثاني");
      if (aRow.shiftId === bRow.shiftId)
        throw new Error("الموظفان على نفس الوردية بالفعل");

      const fromDate = new Date(input.dateFrom);
      const toDate = new Date(input.dateTo);
      const dayBefore = new Date(fromDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const dayAfter = new Date(toDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      // Close current open assignments the day before the swap starts
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

      // Insert swapped temp assignments for the swap period
      await db.insert(attendanceShiftAssignments).values([
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

      // Restore original shifts starting the day after the swap ends (open-ended)
      await db.insert(attendanceShiftAssignments).values([
        {
          empCd: input.empCdA,
          shiftId: aRow.shiftId,
          effectiveFrom: fmt(dayAfter) as any,
          effectiveTo: null,
          weekdayMask: aRow.weekdayMask,
        },
        {
          empCd: input.empCdB,
          shiftId: bRow.shiftId,
          effectiveFrom: fmt(dayAfter) as any,
          effectiveTo: null,
          weekdayMask: bRow.weekdayMask,
        },
      ]);

      return { success: true };
    }),

  tempChangeShift: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCd: z.string(),
        newShiftId: z.number().int(),
        dateFrom: z.string(), // YYYY-MM-DD — first day
        dateTo: z.string(), // YYYY-MM-DD — last day (inclusive)
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

      // Find current active assignment on dateFrom (handles open-ended and dated assignments like 2030-12-31)
      const existing = await db
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
        // Original assignment starts before dateFrom.
        // Close it the day before the change.
        await db
          .update(attendanceShiftAssignments)
          .set({ effectiveTo: fmt(dayBefore) as any })
          .where(eq(attendanceShiftAssignments.id, curr.id));

        // Restore original shift after the period (if it doesn't end before/on dateTo)
        if (!curr.effectiveTo || fmtDate(curr.effectiveTo) > input.dateTo) {
          await db.insert(attendanceShiftAssignments).values({
            empCd: input.empCd,
            shiftId: curr.shiftId,
            effectiveFrom: fmt(dayAfter) as any,
            effectiveTo: curr.effectiveTo,
            weekdayMask: curr.weekdayMask,
          });
        }
      }

      // Insert the temporary assignment
      await db.insert(attendanceShiftAssignments).values({
        empCd: input.empCd,
        shiftId: input.newShiftId,
        effectiveFrom: input.dateFrom as any,
        effectiveTo: input.dateTo as any,
        weekdayMask: curr.weekdayMask,
      });

      return { success: true };
    }),

  bulkAssignShift: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCds: z.array(z.string()).min(1),
        shiftId: z.number().int(),
        effectiveFrom: z.string(),
        effectiveTo: z.string().optional(),
        weekdayMask: z.number().int().default(62), // Sun-Thu default (0b0111110)
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      let inserted = 0;
      for (const empCd of input.empCds) {
        await db
          .insert(attendanceShiftAssignments)
          .values({
            empCd,
            shiftId: input.shiftId,
            effectiveFrom: input.effectiveFrom as any,
            effectiveTo: input.effectiveTo ? (input.effectiveTo as any) : null,
            weekdayMask: input.weekdayMask,
          });
        inserted++;
      }
      return { success: true, inserted };
    }),

  createShiftChangeRequest: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCd: z.string(),
        requestType: z.enum(["daily", "weekly", "monthly", "swap"]),
        newShiftId: z.number().int().optional(),
        weekdayMask: z.number().int().optional(),
        cycleId: z.number().int().optional(),
        swapEmpCd: z.string().optional(),
        dateFrom: z.string(),
        dateTo: z.string().optional(),
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

  listShiftChangeRequests: makeAttProcedure("/attendance")
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

      return rows.map((r) => ({
        ...r,
        dateFrom: fmtDate(r.dateFrom as any),
        dateTo: r.dateTo ? fmtDate(r.dateTo as any) : null,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

  approveShiftChangeRequest: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        requestId: z.number().int(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 1. Get the request
      const reqRows = await db
        .select()
        .from(attendanceShiftChangeRequests)
        .where(eq(attendanceShiftChangeRequests.id, input.requestId))
        .limit(1);
      const req = reqRows[0];
      if (!req) throw new Error("الطلب غير موجود");
      if (req.status !== "pending") throw new Error("الطلب تم البت فيه بالفعل");

      const fromDate = new Date(req.dateFrom);
      const toDate = req.dateTo ? new Date(req.dateTo) : new Date(req.dateFrom);
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
          .limit(1);

        const curr = existing[0];
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
          SET effective_to = ${req.dateFrom}
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
          .limit(1);

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
          .limit(1);

        const aRow = existingA[0];
        const bRow = existingB[0];
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

      // 4. Recompute daily attendance & monthly reports immediately to propagate changes
      try {
        const today = new Date();
        const calcToDate = req.dateTo
          ? new Date(req.dateTo)
          : new Date(fromDate).getTime() > today.getTime()
            ? new Date(fromDate)
            : today;

        // Materialize for employee A
        await dailyMaterializer.recomputeRange(fromDate, calcToDate, {
          empCd: req.empCd,
        });

        // Materialize for employee B if it's a swap request
        if (req.requestType === "swap" && req.swapEmpCd) {
          await dailyMaterializer.recomputeRange(fromDate, calcToDate, {
            empCd: req.swapEmpCd,
          });
        }

        // Also generate monthly reports for affected months
        const months = new Set<string>();
        for (
          let d = new Date(fromDate);
          d <= calcToDate;
          d.setDate(d.getDate() + 1)
        ) {
          months.add(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          );
        }
        for (const month of months) {
          const [year, monthNum] = month.split("-").map(Number);
          await MonthlyComputeService.saveMonthlyReports(year, monthNum);
        }
      } catch (err: any) {
        console.error(
          "Failed to recompute daily/monthly attendance after shift approval:",
          err,
        );
      }

      return { success: true };
    }),

  rejectShiftChangeRequest: makeAttWriteProcedure("/attendance/shift-schedule")
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

  listShiftCycles: makeAttProcedure("/attendance/shift-schedule").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cycles = await db.select().from(attendanceShiftCycles);
    const slots = await db.select().from(attendanceShiftCycleSlots);
    return cycles.map((c) => ({
      id: c.id,
      name: c.name,
      period: c.period,
      anchorDate:
        c.anchorDate instanceof Date
          ? `${c.anchorDate.getFullYear()}-${String(c.anchorDate.getMonth() + 1).padStart(2, "0")}-${String(c.anchorDate.getDate()).padStart(2, "0")}`
          : String(c.anchorDate).slice(0, 10),
      slots: slots
        .filter((s) => s.cycleId === c.id)
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .map((s) => ({ id: s.id, slotIndex: s.slotIndex, shiftId: s.shiftId })),
    }));
  }),

  createShiftCycle: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        name: z.string().min(1).max(100),
        period: z.enum(["day", "week", "month"]),
        anchorDate: z.string(),
        slots: z
          .array(
            z.object({
              slotIndex: z.number().int(),
              shiftId: z.number().int(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [res] = (await db.insert(attendanceShiftCycles).values({
        name: input.name,
        period: input.period,
        anchorDate: input.anchorDate as any,
      })) as any;
      const cycleId = res.insertId;
      for (const slot of input.slots) {
        await db
          .insert(attendanceShiftCycleSlots)
          .values({
            cycleId,
            slotIndex: slot.slotIndex,
            shiftId: slot.shiftId,
          });
      }
      return { id: cycleId };
    }),

  updateShiftCycle: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(100).optional(),
        period: z.enum(["day", "week", "month"]).optional(),
        anchorDate: z.string().optional(),
        slots: z
          .array(
            z.object({
              slotIndex: z.number().int(),
              shiftId: z.number().int(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
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
        await db
          .delete(attendanceShiftCycleSlots)
          .where(eq(attendanceShiftCycleSlots.cycleId, input.id));
        for (const slot of input.slots) {
          await db
            .insert(attendanceShiftCycleSlots)
            .values({
              cycleId: input.id,
              slotIndex: slot.slotIndex,
              shiftId: slot.shiftId,
            });
        }
      }
      return { success: true };
    }),

  deleteShiftCycle: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(attendanceShiftCycleSlots)
        .where(eq(attendanceShiftCycleSlots.cycleId, input.id));
      await db
        .delete(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.cycleId, input.id));
      await db
        .delete(attendanceShiftCycles)
        .where(eq(attendanceShiftCycles.id, input.id));
      return { success: true };
    }),

  listCycleAssignments: makeAttProcedure("/attendance/shift-schedule").query(async () => {
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
  }),

  assignCycle: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        empCds: z.array(z.string()).min(1),
        cycleId: z.number().int(),
        effectiveFrom: z.string(),
        effectiveTo: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      for (const empCd of input.empCds) {
        await db.execute(sql`
          UPDATE attendance_shift_cycle_assignments
          SET effective_to = ${input.effectiveFrom}
          WHERE emp_cd = ${empCd} AND effective_to IS NULL
        `);
        await db.insert(attendanceShiftCycleAssignments).values({
          empCd,
          cycleId: input.cycleId,
          effectiveFrom: input.effectiveFrom as any,
          effectiveTo: input.effectiveTo ? (input.effectiveTo as any) : null,
        });
      }
      return { inserted: input.empCds.length };
    }),

  updateCycleAssignment: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(
      z.object({
        id: z.number().int(),
        cycleId: z.number().int().optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
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
      return { success: true };
    }),

  removeCycleAssignment: makeAttWriteProcedure("/attendance/shift-schedule")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(attendanceShiftCycleAssignments)
        .where(eq(attendanceShiftCycleAssignments.id, input.id));
      return { success: true };
    }),
};
