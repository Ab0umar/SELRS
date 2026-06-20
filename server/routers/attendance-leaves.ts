import { z } from "zod";
import crypto from "crypto";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { TRPCError } from "@trpc/server";
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

export const attendanceLeavesRoutes = {
  employeeLeaves: makeAttProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string(),
        year: z.number().int().min(2020).max(2099).optional(),
      }),
    )
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();
      const fromDate = new Date(year, 0, 1);
      const toDate = new Date(year, 11, 31);
      return LeaveManagementService.getEmployeeLeaves(
        input.empCd,
        fromDate,
        toDate,
      );
    }),

  leaveBalance: makeAttProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string(),
        year: z.number().int().min(2020).max(2099).optional(),
      }),
    )
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();
      return LeaveManagementService.getLeaveBalance(input.empCd, year);
    }),

  pendingLeaves: makeAttProcedure("/attendance").query(async () => {
    return LeaveManagementService.getPendingLeaves();
  }),

  createLeave: makeAttWriteProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string(),
        dateFrom: z.string(), // YYYY-MM-DD
        dateTo: z.string(), // YYYY-MM-DD
        type: z.enum(["annual", "sick", "unpaid", "other"]),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.dateTo < input.dateFrom) {
        throw new Error("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const overlappingLeave = await db
        .select({ id: attendanceLeaves.id })
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, input.empCd),
            lte(attendanceLeaves.dateFrom, input.dateTo as any),
            gte(attendanceLeaves.dateTo, input.dateFrom as any),
          ),
        )
        .limit(1);

      if (overlappingLeave.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "توجد إجازة متداخلة مع هذه الفترة",
        });
      }

      await LeaveManagementService.createLeave({
        empCd: input.empCd,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        type: input.type,
        note: input.note,
        approved: true,
      });

      // Recompute daily records immediately since leave is auto-approved
      await PermissionAdjustmentService.recomputeRange(
        input.empCd,
        new Date(input.dateFrom + "T12:00:00"),
        new Date(input.dateTo + "T12:00:00"),
      );

      AuditLogService.log({
        action: "leave_created",
        details: { empCd: input.empCd, dateFrom: input.dateFrom, dateTo: input.dateTo, type: input.type },
        status: "success",
      });

      return { success: true };
    }),

  approveLeave: makeAttWriteProcedure("/attendance")
    .input(z.object({ leaveId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the leave record to know the date range
      const leave = await db
        .select()
        .from(attendanceLeaves)
        .where(eq(attendanceLeaves.id, input.leaveId))
        .limit(1);

      if (!leave[0]) {
        throw new Error("Leave record not found");
      }

      // Approve the leave
      await LeaveManagementService.approveLeave(input.leaveId);

      // Recompute daily records for the leave date range
      await PermissionAdjustmentService.recomputeRange(
        leave[0].empCd,
        new Date(String(leave[0].dateFrom) + "T12:00:00"),
        new Date(String(leave[0].dateTo) + "T12:00:00"),
      );

      // Notify the employee whose leave was approved
      const empMapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.machineUserId, leave[0].empCd))
        .limit(1);
      if (empMapping[0]?.userId) {
        const ns = await getAppNotificationSettings().catch(
          () => DEFAULT_APP_NOTIFICATION_SETTINGS,
        );
        if (ns.attendance.enabled) {
          const typeAr =
            String(leave[0].type ?? "") === "annual" ? "سنوية" : "مرضية";
          pushAppNotification({
            title: "تمت الموافقة على طلب الإجازة",
            message: `تمت الموافقة على إجازتك ${typeAr} من ${leave[0].dateFrom} إلى ${leave[0].dateTo}`,
            kind: "success",
            targetUserIds: [empMapping[0].userId],
            source: "attendance",
            entityType: "leave_approved",
            meta: { empCd: leave[0].empCd, path: "/attendance/me" },
            channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
          }).catch(() => {});
        }
      }

      return { success: true, leaveId: input.leaveId };
    }),

  deleteLeave: makeAttWriteProcedure("/attendance")
    .input(z.object({ leaveId: z.number() }))
    .mutation(async ({ input }) => {
      await LeaveManagementService.deleteLeave(input.leaveId);
      AuditLogService.log({
        action: "leave_deleted",
        details: { leaveId: input.leaveId },
        status: "success",
      });
      return { success: true };
    }),

  listLeaves: makeAttProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conditions: any[] = [];
      if (input.empCd) conditions.push(eq(attendanceLeaves.empCd, input.empCd));
      if (input.from)
        conditions.push(gte(attendanceLeaves.dateFrom, input.from as any));
      if (input.to)
        conditions.push(lte(attendanceLeaves.dateTo, input.to as any));
      const rows = await db
        .select({
          id: attendanceLeaves.id,
          empCd: attendanceLeaves.empCd,
          empName: attendanceEmployees.fullName,
          dateFrom: attendanceLeaves.dateFrom,
          dateTo: attendanceLeaves.dateTo,
          type: attendanceLeaves.type,
          approved: attendanceLeaves.approved,
          note: attendanceLeaves.note,
        })
        .from(attendanceLeaves)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceLeaves.empCd, attendanceEmployees.empCd),
        )
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(attendanceLeaves.dateFrom));
      return rows.map((r: any) => ({
        ...r,
        dateFrom: fmtDate(r.dateFrom as any),
        dateTo: fmtDate(r.dateTo as any),
      }));
    }),

  recomputeDaily: makeAttWriteProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      }),
    )
    .mutation(async ({ input }) => {
      const fromDate = new Date(input.fromDate);
      const toDate = new Date(input.toDate);

      const updated = await PermissionAdjustmentService.recomputeRange(
        input.empCd,
        fromDate,
        toDate,
      );

      return { success: true, recordsUpdated: updated };
    }),

  adjustmentSummary: makeAttProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      }),
    )
    .query(async ({ input }) => {
      const fromDate = new Date(input.fromDate);
      const toDate = new Date(input.toDate);

      return PermissionAdjustmentService.getAdjustmentSummary(
        input.empCd,
        fromDate,
        toDate,
      );
    }),

  setLeaveBalance: makeAttWriteProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string(),
        year: z.number().int(),
        annualAllocation: z.number().int().min(0),
        carryOver: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .insert(attendanceLeaveBalances)
        .values({
          empCd: input.empCd,
          year: input.year,
          annualAllocation: input.annualAllocation,
          carryOver: input.carryOver,
        })
        .onDuplicateKeyUpdate({
          set: {
            annualAllocation: input.annualAllocation,
            carryOver: input.carryOver,
          },
        });
      return { success: true };
    }),

  allLeaveBalances: makeAttProcedure("/attendance")
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const year = input.year ?? new Date().getFullYear();
      const balances = await db
        .select({
          empCd: attendanceLeaveBalances.empCd,
          empName: attendanceEmployees.fullName,
          annualAllocation: attendanceLeaveBalances.annualAllocation,
          carryOver: attendanceLeaveBalances.carryOver,
        })
        .from(attendanceLeaveBalances)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceLeaveBalances.empCd, attendanceEmployees.empCd),
        )
        .where(eq(attendanceLeaveBalances.year, year));

      // Count used days per employee from approved leaves
      const mm = String(year).padStart(4, "0");
      const usedRows = await db
        .select()
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.approved, true),
            gte(attendanceLeaves.dateFrom, `${year}-01-01` as any),
            lte(attendanceLeaves.dateTo, `${year}-12-31` as any),
          ),
        );

      return balances.map((b: any) => {
        const empLeaves = usedRows.filter((l: any) => l.empCd === b.empCd);
        const usedDays = empLeaves.reduce((acc: any, l: any) => {
          const from = new Date(l.dateFrom as any);
          const to = new Date(l.dateTo as any);
          const days =
            Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
          return acc + days;
        }, 0);
        const total = b.annualAllocation + b.carryOver;
        return {
          empCd: b.empCd,
          empName: b.empName,
          annualAllocation: b.annualAllocation,
          carryOver: b.carryOver,
          total,
          usedDays,
          remainingDays: Math.max(0, total - usedDays),
        };
      });
    }),

  listPermissions: makeAttProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const conditions: any[] = [];
      if (input.empCd)
        conditions.push(eq(attendancePermissions.empCd, input.empCd));
      if (input.from)
        conditions.push(gte(attendancePermissions.date, input.from as any));
      if (input.to)
        conditions.push(lte(attendancePermissions.date, input.to as any));
      return db
        .select()
        .from(attendancePermissions)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(attendancePermissions.date));
    }),

  createPermission: makeAttWriteProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string(),
        date: z.string(),
        type: z.enum(["in", "out"]),
        durationMinutes: z.number().int().min(1).max(480),
        notAffectSalary: z.boolean().optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.insert(attendancePermissions).values({
        empCd: input.empCd,
        date: input.date as any,
        type: input.type,
        durationMinutes: input.durationMinutes,
        approved: true,
        notAffectSalary: input.notAffectSalary ?? false,
        note: input.note ?? null,
      });

      // Notify the employee that a permission was granted for them
      const empMapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.machineUserId, input.empCd))
        .limit(1);
      if (empMapping[0]?.userId) {
        const ns = await getAppNotificationSettings().catch(
          () => DEFAULT_APP_NOTIFICATION_SETTINGS,
        );
        if (ns.attendance.enabled) {
          const typeAr = input.type === "out" ? "خروج مبكر" : "دخول متأخر";
          pushAppNotification({
            title: "تم منح إذن",
            message: `تمت الموافقة على إذن ${typeAr} — ${input.durationMinutes} دقيقة (${input.date})`,
            kind: "success",
            targetUserIds: [empMapping[0].userId],
            source: "attendance",
            entityType: "permission_granted",
            meta: { empCd: input.empCd, path: "/attendance/me" },
            channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
          }).catch(() => {});
        }
      }

      return { success: true, id: (result as any)?.[0]?.insertId };
    }),

  approvePermission: makeAttWriteProcedure("/attendance")
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const permRows = await db
        .select()
        .from(attendancePermissions)
        .where(eq(attendancePermissions.id, input.id))
        .limit(1);
      const perm = permRows[0];
      if (!perm) throw new Error("الإذن غير موجود");
      if (perm.approved) throw new Error("الإذن معتمد بالفعل");

      // 1. Mark as approved
      await db
        .update(attendancePermissions)
        .set({ approved: true, updatedAt: new Date() })
        .where(eq(attendancePermissions.id, input.id));

      // 2. Recompute daily records immediately to propagate permission
      try {
        const dateObj = new Date(String(perm.date) + "T12:00:00");

        // Recompute daily records (recomputes lateMinutes, earlyLeaveMin, etc.)
        await dailyMaterializer.recomputeRange(dateObj, dateObj, {
          empCd: perm.empCd,
        });

        // Update leave/permission status in daily records
        await PermissionAdjustmentService.recomputeRange(
          perm.empCd,
          dateObj,
          dateObj,
        );

        // Also generate monthly report for the affected month
        const monthNum = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();
        await MonthlyComputeService.saveMonthlyReports(year, monthNum);
      } catch (err: any) {
        console.error(
          "Failed to recompute daily/monthly attendance after permission approval:",
          err,
        );
      }

      // Notify the employee that a permission was approved for them
      const empMapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.machineUserId, perm.empCd))
        .limit(1);
      if (empMapping[0]?.userId) {
        const ns = await getAppNotificationSettings().catch(
          () => DEFAULT_APP_NOTIFICATION_SETTINGS,
        );
        if (ns.attendance.enabled) {
          const typeAr = perm.type === "out" ? "خروج مبكر" : "دخول متأخر";
          pushAppNotification({
            title: "تمت الموافقة على إذن",
            message: `تمت الموافقة على طلب إذن ${typeAr} — ${perm.durationMinutes} دقيقة (${perm.date})`,
            kind: "info",
            targetRoles: null,
            targetUserIds: [empMapping[0].userId],
            source: "attendance",
            entityType: "permission_approved",
            meta: { path: "/attendance/my" },
            channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
          }).catch(() => {});
        }
      }

      return { success: true };
    }),

  deletePermission: makeAttWriteProcedure("/attendance")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const permRows = await db
        .select()
        .from(attendancePermissions)
        .where(eq(attendancePermissions.id, input.id))
        .limit(1);
      const perm = permRows[0];

      await db
        .delete(attendancePermissions)
        .where(eq(attendancePermissions.id, input.id));

      if (perm && perm.approved) {
        try {
          const dateObj = new Date(String(perm.date) + "T12:00:00");
          // Recompute daily records (recomputes lateMinutes, earlyLeaveMin, etc.)
          await dailyMaterializer.recomputeRange(dateObj, dateObj, {
            empCd: perm.empCd,
          });

          // Update leave/permission status in daily records
          await PermissionAdjustmentService.recomputeRange(
            perm.empCd,
            dateObj,
            dateObj,
          );

          // Also generate monthly report for the affected month
          const monthNum = dateObj.getMonth() + 1;
          const year = dateObj.getFullYear();
          await MonthlyComputeService.saveMonthlyReports(year, monthNum);
        } catch (err: any) {
          console.error(
            "Failed to recompute daily/monthly attendance after permission deletion:",
            err,
          );
        }
      }

      return { success: true };
    }),

  permissionReport: makeAttProcedure("/attendance")
    .input(
      z.object({
        from: z.string(), // YYYY-MM-DD
        to: z.string(), // YYYY-MM-DD
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { from, to } = input;
      const perms = await db
        .select({
          empCd: attendancePermissions.empCd,
          empName: attendanceEmployees.fullName,
          type: attendancePermissions.type,
          durationMinutes: attendancePermissions.durationMinutes,
          date: attendancePermissions.date,
        })
        .from(attendancePermissions)
        .leftJoin(
          attendanceEmployees,
          eq(attendancePermissions.empCd, attendanceEmployees.empCd),
        )
        .where(
          and(
            gte(attendancePermissions.date, from as any),
            lte(attendancePermissions.date, to as any),
            eq(attendancePermissions.approved, true),
          ),
        );

      const grouped = new Map<string, any>();
      for (const p of perms) {
        if (!grouped.has(p.empCd))
          grouped.set(p.empCd, {
            empCd: p.empCd,
            empName: p.empName,
            inCount: 0,
            outCount: 0,
            totalInMins: 0,
            totalOutMins: 0,
          });
        const agg = grouped.get(p.empCd)!;
        if (p.type === "in") {
          agg.inCount++;
          agg.totalInMins += p.durationMinutes;
        } else {
          agg.outCount++;
          agg.totalOutMins += p.durationMinutes;
        }
      }
      return Array.from(grouped.values()).sort((a, b) =>
        a.empCd.localeCompare(b.empCd),
      );
    }),

  listHolidays: makeAttProcedure("/attendance")
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const year = input.year ?? new Date().getFullYear();
      const rows = await db
        .select()
        .from(attendanceHolidays)
        .where(
          and(
            gte(attendanceHolidays.date, `${year}-01-01` as any),
            lte(attendanceHolidays.date, `${year}-12-31` as any),
          ),
        )
        .orderBy(attendanceHolidays.date);
      return rows.map((h: any) => ({
        date:
          h.date instanceof Date
            ? `${h.date.getFullYear()}-${String(h.date.getMonth() + 1).padStart(2, "0")}-${String(h.date.getDate()).padStart(2, "0")}`
            : String(h.date),
        label: h.label,
        paid: h.paid,
      }));
    }),

  addHoliday: makeAttWriteProcedure("/attendance")
    .input(
      z.object({
        date: z.string(),
        label: z.string(),
        paid: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .insert(attendanceHolidays)
        .values({
          date: input.date as any,
          label: input.label,
          paid: input.paid,
        })
        .onDuplicateKeyUpdate({
          set: { label: input.label, paid: input.paid },
        });
      AuditLogService.log({
        action: "holiday_added",
        details: { date: input.date, label: input.label },
        status: "success",
      });
      return { success: true };
    }),

  deleteHoliday: makeAttWriteProcedure("/attendance")
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(attendanceHolidays)
        .where(eq(attendanceHolidays.date, input.date as any));
      AuditLogService.log({
        action: "holiday_deleted",
        details: { date: input.date },
        status: "success",
      });
      return { success: true };
    })
};
