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
import { accountLeaveDays } from "../services/attendance/leaveAccounting";
import { loadLeaveDayExclusions } from "../services/attendance/leaveDayExclusions";
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
import {
  desc,
  eq,
  and,
  or,
  inArray,
  gte,
  lte,
  lt,
  max,
  count,
  sql,
} from "drizzle-orm";
import { getAttendanceDepartmentValues } from "../services/attendance/departmentFilter";

async function recomputeLeaveRangeAndMonthly(
  empCd: string,
  fromDate: string,
  toDate: string,
): Promise<void> {
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  await dailyMaterializer.recomputeRange(from, to, { empCd }, undefined, {
    recomputeMonthly: true,
  });
}

async function recomputePermissionDayAndMonthly(
  empCd: string,
  workDate: Date,
): Promise<void> {
  await dailyMaterializer.recomputeRange(workDate, workDate, { empCd });
  await PermissionAdjustmentService.recomputeRange(empCd, workDate, workDate);
  await MonthlyComputeService.saveEmployeeMonth(
    empCd,
    workDate.getFullYear(),
    workDate.getMonth() + 1,
  );
}

export const attendanceLeavesRoutes = {
  employeeLeaves: makeAttProcedure(["/attendance", "/attendance/employees"])
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

  leaveBalance: makeAttProcedure(["/attendance", "/attendance/employees"])
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

  createLeave: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(
      z.object({
        empCd: z.string(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(["annual", "sick", "salary", "unpaid", "other"]),
        note: z.string().optional(),
        notAffectCommission: z.boolean().optional(),
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
            // Pending self-service requests don't block the admin; approving
            // one that overlaps is rejected in approveLeave instead.
            eq(attendanceLeaves.approved, true),
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
        notAffectCommission: input.notAffectCommission,
      });

      // Recompute daily records immediately since leave is auto-approved
      await recomputeLeaveRangeAndMonthly(
        input.empCd,
        input.dateFrom,
        input.dateTo,
      );

      await AuditLogService.log({
        action: "leave_created",
        details: {
          empCd: input.empCd,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          type: input.type,
        },
        status: "success",
      });

      return { success: true };
    }),

  approveLeave: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(z.object({ leaveId: z.number() }))
    .mutation(async ({ input, ctx }) => {
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

      const approvedOverlapRange = await db
        .select({ id: attendanceLeaves.id })
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, leave[0].empCd),
            eq(attendanceLeaves.approved, true),
            lte(attendanceLeaves.dateFrom, leave[0].dateTo as any),
            gte(attendanceLeaves.dateTo, leave[0].dateFrom as any),
            sql`${attendanceLeaves.id} <> ${input.leaveId}`,
          ),
        )
        .limit(1);
      if (approvedOverlapRange.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "توجد إجازة معتمدة متداخلة مع هذه الفترة",
        });
      }

      // Approve the leave
      await LeaveManagementService.approveLeave(input.leaveId);
      await AuditLogService.log({
        action: "leave_approved",
        empCd: leave[0].empCd,
        userId: ctx.user.id,
        details: { leaveId: input.leaveId },
        status: "success",
      });

      // Recompute daily records for the leave date range
      const toDateKey = (value: unknown): string => {
        if (value instanceof Date) return fmtDate(value);
        return String(value).slice(0, 10);
      };
      await recomputeLeaveRangeAndMonthly(
        leave[0].empCd,
        toDateKey(leave[0].dateFrom),
        toDateKey(leave[0].dateTo),
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
          const typeArByValue: Record<string, string> = {
            annual: "سنوية",
            sick: "مرضية",
            salary: "من الراتب",
            unpaid: "غير مدفوعة",
            other: "أخرى",
          };
          const typeAr = typeArByValue[String(leave[0].type ?? "")] ?? "إجازة";
          pushAppNotification({
            title: "تمت الموافقة على طلب الإجازة",
            message: `تمت الموافقة على إجازتك ${typeAr} من ${fmtDate(leave[0].dateFrom as any)} إلى ${fmtDate(leave[0].dateTo as any)}`,
            kind: "success",
            targetUserIds: [empMapping[0].userId],
            source: "attendance",
            entityType: "leave_approved",
            meta: { empCd: leave[0].empCd, path: "/attendance/my" },
            channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
          }).catch(() => {});
        }
      }

      return { success: true, leaveId: input.leaveId };
    }),

  deleteLeave: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(z.object({ leaveId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const leaveRows = await db
        .select({
          empCd: attendanceLeaves.empCd,
          dateFrom: attendanceLeaves.dateFrom,
          dateTo: attendanceLeaves.dateTo,
        })
        .from(attendanceLeaves)
        .where(eq(attendanceLeaves.id, input.leaveId))
        .limit(1);
      await LeaveManagementService.deleteLeave(input.leaveId);
      if (leaveRows[0]) {
        const dateKey = (value: unknown) =>
          value instanceof Date ? fmtDate(value) : String(value).slice(0, 10);
        await recomputeLeaveRangeAndMonthly(
          leaveRows[0].empCd,
          dateKey(leaveRows[0].dateFrom),
          dateKey(leaveRows[0].dateTo),
        );
      }
      await AuditLogService.log({
        action: "leave_deleted",
        details: { leaveId: input.leaveId },
        status: "success",
      });
      return { success: true };
    }),

  updateLeave: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(
      z.object({
        leaveId: z.number().int(),
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(["annual", "sick", "salary", "unpaid", "other"]),
        note: z.string().optional(),
        notAffectCommission: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.dateTo < input.dateFrom) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
        });
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const existing = await db
        .select()
        .from(attendanceLeaves)
        .where(eq(attendanceLeaves.id, input.leaveId))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "السجل غير موجود" });
      }

      const toDateKeyEdit = (value: unknown): string => {
        if (value instanceof Date) return fmtDate(value);
        return String(value).slice(0, 10);
      };
      const oldDateFrom = toDateKeyEdit(existing[0].dateFrom);
      const oldDateTo = toDateKeyEdit(existing[0].dateTo);
      const empCd = existing[0].empCd;

      const overlappingLeave = await db
        .select({ id: attendanceLeaves.id })
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.empCd, empCd),
            lte(attendanceLeaves.dateFrom, input.dateTo as any),
            gte(attendanceLeaves.dateTo, input.dateFrom as any),
            sql`${attendanceLeaves.id} <> ${input.leaveId}`,
          ),
        )
        .limit(1);
      if (overlappingLeave.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "توجد إجازة متداخلة مع هذه الفترة",
        });
      }

      await db
        .update(attendanceLeaves)
        .set({
          dateFrom: input.dateFrom as any,
          dateTo: input.dateTo as any,
          type: input.type,
          note: input.note ?? null,
          notAffectCommission: input.notAffectCommission ?? false,
        })
        .where(eq(attendanceLeaves.id, input.leaveId));

      // Recompute old range
      await recomputeLeaveRangeAndMonthly(empCd, oldDateFrom, oldDateTo);
      // Recompute new range if dates changed
      if (input.dateFrom !== oldDateFrom || input.dateTo !== oldDateTo) {
        await recomputeLeaveRangeAndMonthly(
          empCd,
          input.dateFrom,
          input.dateTo,
        );
      }

      await AuditLogService.log({
        action: "leave_updated",
        details: {
          leaveId: input.leaveId,
          empCd,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
        },
        status: "success",
      });

      return { success: true };
    }),

  listLeaves: makeAttProcedure(["/attendance", "/attendance/employees"])
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
      // Include any leave overlapping the requested interval, including leaves
      // that begin before or end after it.
      if (input.from || input.to) {
        const from = input.from ?? input.to!;
        const to = input.to ?? input.from!;
        conditions.push(
          or(
            and(
              lte(attendanceLeaves.dateFrom, to as any),
              gte(attendanceLeaves.dateTo, from as any),
            ),
            eq(attendanceLeaves.approved, false),
          ),
        );
      }
      const rows = await db
        .select({
          id: attendanceLeaves.id,
          empCd: attendanceLeaves.empCd,
          empName: attendanceEmployees.fullName,
          dateFrom: attendanceLeaves.dateFrom,
          dateTo: attendanceLeaves.dateTo,
          type: attendanceLeaves.type,
          approved: attendanceLeaves.approved,
          notAffectCommission: attendanceLeaves.notAffectCommission,
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
      z
        .object({
          empCd: z.string(),
          fromDate: z.string(), // YYYY-MM-DD
          toDate: z.string(), // YYYY-MM-DD
        })
        .refine(
          ({ fromDate, toDate }) => {
            const from = Date.parse(`${fromDate}T00:00:00Z`);
            const to = Date.parse(`${toDate}T00:00:00Z`);
            return (
              Number.isFinite(from) &&
              Number.isFinite(to) &&
              to >= from &&
              (to - from) / 86_400_000 < 366
            );
          },
          { message: "الفترة لازم تكون صحيحة ولا تتجاوز 366 يومًا" },
        ),
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

  setLeaveBalance: makeAttWriteProcedure(["/attendance", "/attendance/reports"])
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

  allLeaveBalances: makeAttProcedure(["/attendance", "/attendance/reports"])
    .input(
      z.object({
        year: z.number().int().optional(),
        department: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const year = input.year ?? new Date().getFullYear();
      const employeeConditions: any[] = [eq(attendanceEmployees.active, true)];
      if (input.department) {
        employeeConditions.push(
          inArray(
            attendanceEmployees.department,
            getAttendanceDepartmentValues(input.department),
          ),
        );
      }
      const balances = await db
        .select({
          empCd: attendanceEmployees.empCd,
          empName: attendanceEmployees.fullName,
          annualAllocation: attendanceLeaveBalances.annualAllocation,
          carryOver: attendanceLeaveBalances.carryOver,
        })
        .from(attendanceEmployees)
        .leftJoin(
          attendanceLeaveBalances,
          and(
            eq(attendanceLeaveBalances.empCd, attendanceEmployees.empCd),
            eq(attendanceLeaveBalances.year, year),
          ),
        )
        .where(
          employeeConditions.length ? and(...employeeConditions) : undefined,
        );

      // Count used days per employee from approved leaves
      // Sick leave deducts from annual balance; unpaid/other do not
      const usedRows = await db
        .select()
        .from(attendanceLeaves)
        .where(
          and(
            eq(attendanceLeaves.approved, true),
            or(
              eq(attendanceLeaves.type, "annual"),
              eq(attendanceLeaves.type, "sick"),
              eq(attendanceLeaves.type, "other"),
            ),
            lte(attendanceLeaves.dateFrom, `${year}-12-31` as any),
            gte(attendanceLeaves.dateTo, `${year}-01-01` as any),
          ),
        );

      const isRestOrHoliday = await loadLeaveDayExclusions(
        db,
        balances.map((b: any) => b.empCd),
        year,
      );
      return balances.map((b: any) => {
        const empLeaves = usedRows.filter((l: any) => l.empCd === b.empCd);
        const annualAllocation = Number(b.annualAllocation ?? 21);
        const carryOver = Number(b.carryOver ?? 0);
        const total = annualAllocation + carryOver;
        const usedDays = accountLeaveDays(empLeaves, total, year, (key) =>
          isRestOrHoliday(b.empCd, key),
        ).balanceDays;
        return {
          empCd: b.empCd,
          empName: b.empName,
          annualAllocation,
          carryOver,
          total,
          usedDays,
          remainingDays: Math.max(0, total - usedDays),
        };
      });
    }),

  listPermissions: makeAttProcedure(["/attendance", "/attendance/employees"])
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
      const dateConditions: any[] = [];
      if (input.from)
        dateConditions.push(gte(attendancePermissions.date, input.from as any));
      if (input.to)
        dateConditions.push(lte(attendancePermissions.date, input.to as any));
      // Pending requests stay visible for approval whatever the date filter,
      // matching listLeaves.
      if (dateConditions.length)
        conditions.push(
          or(and(...dateConditions), eq(attendancePermissions.approved, false)),
        );
      const permissions = await db
        .select({
          id: attendancePermissions.id,
          empCd: attendancePermissions.empCd,
          empName: attendanceEmployees.fullName,
          date: attendancePermissions.date,
          type: attendancePermissions.type,
          durationMinutes: attendancePermissions.durationMinutes,
          approved: attendancePermissions.approved,
          notAffectSalary: attendancePermissions.notAffectSalary,
          note: attendancePermissions.note,
          createdAt: attendancePermissions.createdAt,
          updatedAt: attendancePermissions.updatedAt,
        })
        .from(attendancePermissions)
        .leftJoin(
          attendanceEmployees,
          eq(attendancePermissions.empCd, attendanceEmployees.empCd),
        )
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(attendancePermissions.date));
      return permissions.map((permission: any) => ({
        ...permission,
        date: fmtDate(permission.date),
      }));
    }),

  createPermission: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(
      z.object({
        empCd: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(["in", "out", "mission"]),
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

      const permissionDate = new Date(`${input.date}T12:00:00`);
      await dailyMaterializer.recomputeRange(
        permissionDate,
        permissionDate,
        {
          empCd: input.empCd,
        },
        undefined,
        { recomputeMonthly: true },
      );

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
          const typeAr =
            input.type === "mission"
              ? "مأمورية"
              : input.type === "out"
                ? "خروج مبكر"
                : "دخول متأخر";
          pushAppNotification({
            title: "تم منح إذن",
            message: `تمت الموافقة على إذن ${typeAr} — ${input.durationMinutes} دقيقة (${input.date})`,
            kind: "success",
            targetUserIds: [empMapping[0].userId],
            source: "attendance",
            entityType: "permission_granted",
            meta: { empCd: input.empCd, path: "/attendance/my" },
            channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
          }).catch(() => {});
        }
      }

      return { success: true, id: (result as any)?.[0]?.insertId };
    }),

  updatePermission: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(
      z.object({
        id: z.number().int(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        type: z.enum(["in", "out", "mission"]),
        durationMinutes: z.number().int().min(1).max(480),
        notAffectSalary: z.boolean().optional(),
        note: z.string().optional(),
      }),
    )
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

      await db
        .update(attendancePermissions)
        .set({
          date: input.date as any,
          type: input.type,
          durationMinutes: input.durationMinutes,
          notAffectSalary: input.notAffectSalary ?? false,
          note: input.note ?? null,
          updatedAt: new Date(),
        })
        .where(eq(attendancePermissions.id, input.id));

      // Recompute both old and new date
      const oldDate = new Date(fmtDate(perm.date) + "T12:00:00");
      const newDate = new Date(input.date + "T12:00:00");
      const datesToRecompute = [oldDate];
      if (oldDate.toDateString() !== newDate.toDateString())
        datesToRecompute.push(newDate);

      for (const d of datesToRecompute) {
        try {
          await recomputePermissionDayAndMonthly(perm.empCd, d);
        } catch (err) {
          console.error("Failed to recompute after permission update:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "تم حفظ الإذن لكن تعذرت إعادة حساب الحضور والراتب؛ أعد المحاولة",
            cause: err,
          });
        }
      }

      return { success: true };
    }),

  approvePermission: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const permRows = await db
        .select()
        .from(attendancePermissions)
        .where(eq(attendancePermissions.id, input.id))
        .limit(1);
      const perm = permRows[0];
      if (!perm) throw new Error("الإذن غير موجود");
      const wasApproved = Boolean(perm.approved);

      // Mark it approved once; retries still recompute but do not notify twice.
      if (!wasApproved) {
        await db
          .update(attendancePermissions)
          .set({ approved: true, updatedAt: new Date() })
          .where(eq(attendancePermissions.id, input.id));
      }
      await AuditLogService.log({
        action: "permission_approved",
        empCd: perm.empCd,
        userId: ctx.user.id,
        details: { permissionId: input.id },
        status: "success",
      });

      // 2. Recompute daily records immediately to propagate permission
      try {
        const dateObj = new Date(`${fmtDate(perm.date)}T12:00:00`);
        await recomputePermissionDayAndMonthly(perm.empCd, dateObj);
      } catch (err: any) {
        console.error(
          "Failed to recompute daily/monthly attendance after permission approval:",
          err,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "تم اعتماد الإذن لكن تعذرت إعادة حساب الحضور والراتب؛ أعد المحاولة",
          cause: err,
        });
      }

      // Notify only on the transition to approved; retries may still recompute.
      const empMapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.machineUserId, perm.empCd))
        .limit(1);
      if (!wasApproved && empMapping[0]?.userId) {
        const ns = await getAppNotificationSettings().catch(
          () => DEFAULT_APP_NOTIFICATION_SETTINGS,
        );
        if (ns.attendance.enabled) {
          const typeAr =
            perm.type === "mission"
              ? "مأمورية"
              : perm.type === "out"
                ? "خروج مبكر"
                : "دخول متأخر";
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

  deletePermission: makeAttWriteProcedure(["/attendance", "/attendance/employees"])
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
          const dateObj = new Date(`${fmtDate(perm.date)}T12:00:00`);
          await recomputePermissionDayAndMonthly(perm.empCd, dateObj);
        } catch (err: any) {
          console.error(
            "Failed to recompute daily/monthly attendance after permission deletion:",
            err,
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "تم حذف الإذن لكن تعذرت إعادة حساب الحضور والراتب",
            cause: err,
          });
        }
      }

      return { success: true };
    }),

  permissionReport: makeAttProcedure(["/attendance", "/attendance/reports"])
    .input(
      z.object({
        from: z.string(), // YYYY-MM-DD
        to: z.string(), // YYYY-MM-DD
        department: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { from, to } = input;
      const conditions: any[] = [
        gte(attendancePermissions.date, from as any),
        lte(attendancePermissions.date, to as any),
        eq(attendancePermissions.approved, true),
      ];
      if (input.department) {
        conditions.push(
          inArray(
            attendanceEmployees.department,
            getAttendanceDepartmentValues(input.department),
          ),
        );
      }
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
        .where(and(...conditions));

      const grouped = new Map<string, any>();
      for (const p of perms) {
        if (!grouped.has(p.empCd))
          grouped.set(p.empCd, {
            empCd: p.empCd,
            empName: p.empName,
            inCount: 0,
            outCount: 0,
            missionCount: 0,
            totalInMins: 0,
            totalOutMins: 0,
          });
        const agg = grouped.get(p.empCd)!;
        if (p.type === "in") {
          agg.inCount++;
          agg.totalInMins += p.durationMinutes;
        } else if (p.type === "mission") {
          agg.missionCount++;
        } else {
          agg.outCount++;
          agg.totalOutMins += p.durationMinutes;
        }
      }
      return Array.from(grouped.values()).sort((a, b) =>
        a.empCd.localeCompare(b.empCd),
      );
    }),

  listHolidays: makeAttProcedure(["/attendance", "/attendance/settings"])
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

  seedHolidays: makeAttWriteProcedure(["/attendance", "/attendance/settings"])
    .input(
      z.object({
        holidays: z
          .array(
            z.object({
              date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              label: z.string().min(1).max(255),
            }),
          )
          .min(1)
          .max(50),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db
        .select({ date: attendanceHolidays.date })
        .from(attendanceHolidays);
      const existingDates = new Set(
        existing.map((holiday: any) => fmtDate(holiday.date)),
      );
      const missing = input.holidays.filter(
        (holiday) => !existingDates.has(holiday.date),
      );
      if (missing.length === 0) return { success: true, added: 0 };
      const sortedDates = missing.map((holiday) => holiday.date).sort();
      const from = new Date(`${sortedDates[0]}T12:00:00`);
      const to = new Date(`${sortedDates[sortedDates.length - 1]}T12:00:00`);
      if ((to.getTime() - from.getTime()) / 86400000 > 365)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "اختر عطلات سنة واحدة",
        });
      const inserted = await db
        .insert(attendanceHolidays)
        .ignore()
        .values(
          missing.map((holiday) => ({
            ...holiday,
            date: holiday.date as any,
            paid: true,
          })),
        );
      await dailyMaterializer.recomputeRange(from, to, undefined, undefined, {
        recomputeMonthly: true,
      });
      const added = (inserted as any)[0].affectedRows as number;
      await AuditLogService.log({
        action: "holidays_seeded",
        userId: ctx.user?.id,
        details: { added },
        status: "success",
      });
      return { success: true, added };
    }),

  addHoliday: makeAttWriteProcedure(["/attendance", "/attendance/settings"])
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
      const holidayDate = new Date(`${input.date}T12:00:00`);
      await dailyMaterializer.recomputeRange(
        holidayDate,
        holidayDate,
        undefined,
        undefined,
        { recomputeMonthly: true },
      );
      await AuditLogService.log({
        action: "holiday_added",
        details: { date: input.date, label: input.label },
        status: "success",
      });
      return { success: true };
    }),

  deleteHoliday: makeAttWriteProcedure(["/attendance", "/attendance/settings"])
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(attendanceHolidays)
        .where(eq(attendanceHolidays.date, input.date as any));
      const holidayDate = new Date(`${input.date}T12:00:00`);
      await dailyMaterializer.recomputeRange(
        holidayDate,
        holidayDate,
        undefined,
        undefined,
        { recomputeMonthly: true },
      );
      await AuditLogService.log({
        action: "holiday_deleted",
        details: { date: input.date },
        status: "success",
      });
      return { success: true };
    }),
};
