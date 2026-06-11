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

/** Format a DB date value (Date object or string) as YYYY-MM-DD using local time parts. */
function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * AttendanceRouter - TRPC router for attendance module
 */
export const attendanceRouter = router({
  dashboardSummary: makeAttProcedure("/attendance").query(async () => {
    return DashboardService.getSummary();
  }),

  offTodayList: makeAttProcedure("/attendance").query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const rows = await db
      .select({
        empCd: attendanceLeaves.empCd,
        fullName: attendanceEmployees.fullName,
        department: attendanceEmployees.department,
        type: attendanceLeaves.type,
        approved: attendanceLeaves.approved,
      })
      .from(attendanceLeaves)
      .leftJoin(
        attendanceEmployees,
        eq(attendanceLeaves.empCd, attendanceEmployees.empCd),
      )
      .where(
        sql`${attendanceLeaves.dateFrom} <= ${todayStr} AND ${attendanceLeaves.dateTo} >= ${todayStr}`,
      )
      .orderBy(attendanceEmployees.fullName);
    return rows.map((r) => ({
      empCd: r.empCd,
      fullName: String(r.fullName ?? r.empCd),
      department: r.department ?? null,
      type: r.type,
      approved: r.approved,
    }));
  }),

  syncStatus: makeAttProcedure("/attendance")
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const runs = await db
        .select()
        .from(attendanceSyncRuns)
        .orderBy(desc(attendanceSyncRuns.startedAt))
        .limit(input.limit);

      const current = runs.find((r) => r.status === "running");

      return {
        runs: runs.map((r) => ({
          id: r.id,
          startedAt: r.startedAt.toISOString(),
          finishedAt: r.finishedAt?.toISOString() ?? null,
          source: r.source,
          trigger: r.trigger,
          triggeredBy: r.triggeredBy,
          status: r.status,
          rowsSeen: r.rowsSeen,
          rowsInserted: r.rowsInserted,
          rowsSkipped: r.rowsSkipped,
          rowsQuarantined: r.rowsQuarantined,
          highWaterMark: r.highWaterMark?.toISOString() ?? null,
          error: r.error,
        })),
        current: current
          ? {
              id: current.id,
              startedAt: current.startedAt.toISOString(),
              finishedAt: current.finishedAt?.toISOString() ?? null,
              source: current.source,
              trigger: current.trigger,
              triggeredBy: current.triggeredBy,
              status: current.status,
              rowsSeen: current.rowsSeen,
              rowsInserted: current.rowsInserted,
              rowsSkipped: current.rowsSkipped,
              rowsQuarantined: current.rowsQuarantined,
              highWaterMark: current.highWaterMark?.toISOString() ?? null,
              error: current.error,
            }
          : null,
      };
    }),

  employeesList: makeAttProcedure("/attendance/employees")
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employees = await db
        .select()
        .from(attendanceEmployees)
        .orderBy(attendanceEmployees.empCd);

      return {
        employees: employees.map((e) => ({
          empCd: e.empCd,
          fullName: e.fullName,
          department: e.department,
          active: e.active,
        })),
        total: employees.length,
      };
    }),

  rawPunches: makeAttProcedure("/attendance")
    .input(
      z.object({
        empCd: z.string().optional(),
        fromDate: z.string().optional(), // YYYY-MM-DD
        toDate: z.string().optional(), // YYYY-MM-DD
        limit: z.number().int().min(1).max(1000).default(500),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];

      if (input.empCd) {
        conditions.push(eq(attendancePunches.empCd, input.empCd));
      }

      if (input.fromDate) {
        const from = new Date(input.fromDate);
        conditions.push(gte(attendancePunches.punchAt, from));
      }

      if (input.toDate) {
        const to = new Date(input.toDate);
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(attendancePunches.punchAt, to));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const punches = await db
        .select()
        .from(attendancePunches)
        .where(where)
        .orderBy(desc(attendancePunches.punchAt))
        .limit(input.limit)
        .offset(input.offset);

      const total =
        conditions.length > 0
          ? await db
              .select({ count: attendancePunches.id })
              .from(attendancePunches)
              .where(where)
          : [];

      return {
        punches: punches.map((p) => ({
          id: p.id,
          empCd: p.empCd,
          punchAt: p.punchAt.toISOString(),
          direction: p.direction,
          deviceId: p.deviceId,
          sourceHash: p.sourceHash,
        })),
        total: total[0]?.count ?? 0,
      };
    }),

  dailyByDate: makeAttProcedure("/attendance")
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const daily = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          workDate: attendanceDaily.workDate,
          shiftId: attendanceDaily.shiftId,
          firstIn: attendanceDaily.firstIn,
          lastOut: attendanceDaily.lastOut,
          workedMinutes: attendanceDaily.workedMinutes,
          lateMinutes: attendanceDaily.lateMinutes,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
          overtimeMinutes: attendanceDaily.overtimeMinutes,
          status: attendanceDaily.status,
          insideNow: attendanceDaily.insideNow,
          computedAt: attendanceDaily.computedAt,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(eq(attendanceDaily.workDate, input.date as any))
        .orderBy(attendanceDaily.empCd);

      return daily.map((d) => ({
        empCd: d.empCd,
        empName: d.empName ?? null,
        workDate: d.workDate.toISOString().split("T")[0],
        shiftId: d.shiftId,
        firstIn: d.firstIn?.toISOString() ?? null,
        lastOut: d.lastOut?.toISOString() ?? null,
        workedMinutes: d.workedMinutes,
        lateMinutes: d.lateMinutes,
        earlyLeaveMin: d.earlyLeaveMin,
        overtimeMinutes: d.overtimeMinutes,
        status: d.status,
        insideNow: d.insideNow,
        computedAt: d.computedAt.toISOString(),
      }));
    }),

  dailyByEmployee: makeAttProcedure("/attendance/employees")
    .input(
      z.object({
        empCd: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const from = new Date(input.fromDate);
      const to = new Date(input.toDate);
      to.setHours(23, 59, 59, 999);

      const daily = await db
        .select()
        .from(attendanceDaily)
        .where(
          and(
            eq(attendanceDaily.empCd, input.empCd),
            gte(attendanceDaily.workDate, from),
            lte(attendanceDaily.workDate, to),
          ),
        )
        .orderBy(attendanceDaily.workDate);

      return daily.map((d) => ({
        empCd: d.empCd,
        workDate: d.workDate.toISOString().split("T")[0],
        shiftId: d.shiftId,
        firstIn: d.firstIn?.toISOString() ?? null,
        lastOut: d.lastOut?.toISOString() ?? null,
        workedMinutes: d.workedMinutes,
        lateMinutes: d.lateMinutes,
        earlyLeaveMin: d.earlyLeaveMin,
        overtimeMinutes: d.overtimeMinutes,
        status: d.status,
        insideNow: d.insideNow,
        computedAt: d.computedAt.toISOString(),
      }));
    }),

  monthlyReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return monthly;
    }),

  lateReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.lateReport(monthly);
    }),

  absentReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.absentReport(monthly);
    }),

  otReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.otReport(monthly);
    }),

  summaryReport: makeAttProcedure("/attendance/reports")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(
        input.year,
        input.month,
      );
      return MonthlyComputeService.summaryReport(monthly);
    }),

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
      return LeaveManagementService.deleteLeave(input.leaveId);
    }),

  // List all leaves across all employees, filterable by empCd and date range
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
      return rows.map((r) => ({
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

  auditLogs: makeAttProcedure("/attendance")
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return AuditLogService.getRecentLogs(input.limit);
    }),

  auditStats: makeAttProcedure("/attendance").query(async () => {
    return AuditLogService.getStats();
  }),

  systemHealth: makeAttProcedure("/attendance").query(async () => {
    const db = await getDb();
    const stats = AuditLogService.getStats();

    return {
      database: db ? "healthy" : "disconnected",
      auditLog: "operational",
      lastSyncTime: stats.lastSyncRun,
      syncRunsLast24h: stats.syncRunsLast24h,
      errorsLast24h: stats.errorsLast24h,
      totalEmployees: 0, // Would query from DB
      totalRecordsProcessed: stats.totalRowsInsertedLast24h,
    };
  }),

  deviceSettings: makeAttProcedure("/attendance/admin/device").query(async () => {
    return DeviceSettingsService.getSettings();
  }),

  deviceStatus: makeAttProcedure("/attendance/admin/device").query(async () => {
    const db = await getDb();
    if (!db)
      return {
        connected: false,
        lastConnected: null,
        uptime: 0,
        lastPunch: null,
        punchCount: 0,
        connectionError: null,
      };

    const [row] = await db
      .select({ lastPunch: max(attendancePunches.punchAt), total: count() })
      .from(attendancePunches);

    const settings = DeviceSettingsService.getSettings();
    const connected = DeviceSettingsService.isDeviceOnline();
    return {
      connected,
      lastConnected: null,
      uptime: 0,
      connectionError: null,
      lastPunch: row?.lastPunch ?? null,
      punchCount: row?.total ?? 0,
      ip: settings.ip,
      port: settings.port,
    };
  }),

  updateDeviceSettings: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        enabled: z.boolean().optional(),
        ip: z.string().optional(),
        port: z.number().int().min(1).max(65535).optional(),
        fallbackToAccess: z.boolean().optional(),
        realTimeSync: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return DeviceSettingsService.updateSettings(input);
    }),

  connectDevice: makeAttWriteProcedure("/attendance/admin/device").mutation(async () => {
    const connected = await DeviceSettingsService.connectDevice();
    AuditLogService.log({
      action: "device_connected",
      details: { success: connected },
      status: connected ? "success" : "error",
    });
    return { success: connected };
  }),

  disconnectDevice: makeAttWriteProcedure("/attendance/admin/device").mutation(async () => {
    DeviceSettingsService.disconnectDevice();
    AuditLogService.log({
      action: "device_disconnected",
      details: {},
      status: "success",
    });
    return { success: true };
  }),

  resetDeviceConnection: makeAttWriteProcedure("/attendance/admin/device").mutation(async () => {
    DeviceSettingsService.resetDeviceConnection();
    AuditLogService.log({
      action: "device_reset",
      details: {},
      status: "success",
    });
    return { success: true };
  }),

  sendDeviceCommand: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        hex: z
          .string()
          .regex(/^[0-9a-fA-F]+$/, "hex string contains invalid characters")
          .max(256, "hex string too long")
          .refine(
            (s) => s.length % 2 === 0,
            "hex string must have even length",
          ),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const success = DeviceSettingsService.sendDeviceCommandHex(input.hex);
        return { success, error: success ? undefined : "Device not connected" };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }),

  batchAddPunches: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        punches: z.array(
          z.object({
            empCd: z.string(),
            punchAt: z.string(), // ISO timestamp
            direction: z.enum(["in", "out", "unknown"]),
            note: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const results = [];

      for (const punch of input.punches) {
        const punchAt = new Date(punch.punchAt);
        const hashInput = `${punch.empCd}|${punchAt.getTime()}|${punch.direction}`;
        const hash = crypto.createHash("sha1").update(hashInput).digest("hex");

        try {
          const existing = await db
            .select()
            .from(attendancePunches)
            .where(eq(attendancePunches.sourceHash, hash))
            .limit(1);

          if (existing.length > 0) {
            results.push({
              empCd: punch.empCd,
              success: false,
              error: "Duplicate punch",
            });
            continue;
          }

          await db.insert(attendancePunches).values({
            empCd: punch.empCd,
            punchAt: punchAt,
            direction: punch.direction,
            source: "manual",
            sourceHash: hash,
            note: punch.note,
          });

          results.push({ empCd: punch.empCd, success: true });
        } catch (err) {
          results.push({
            empCd: punch.empCd,
            success: false,
            error: (err as Error).message,
          });
        }
      }

      return {
        total: input.punches.length,
        successful: results.filter((r) => r.success).length,
        results,
      };
    }),

  runDeviceDiagnostics: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        ip: z.string(),
        port: z.number().int().min(1).max(65535),
      }),
    )
    .mutation(async ({ input }) => {
      const diagnostics = getDeviceDiagnostics();
      const results = await diagnostics.runFullDiagnostics(
        input.ip,
        input.port,
      );
      const report = diagnostics.generateReport();

      return {
        success: results.every((r) => r.success),
        results,
        report,
      };
    }),

  testZKTecoConnection: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
        port: z.number().int().min(1).max(65535).default(5005),
      }),
    )
    .mutation(async ({ input }) => {
      const device = new ZKTecoDevice({
        ip: input.ip,
        port: input.port,
        timeout: 5000,
      });

      try {
        await device.connect();
        const isValid = await device.verifyConnection();

        if (!isValid) {
          device.disconnect();
          return {
            success: false,
            error: "Device did not respond to verification command",
          };
        }

        const info = await device.getDeviceInfo();
        device.disconnect();

        return {
          success: true,
          deviceInfo: {
            model: info.model,
            serialNumber: info.serialNumber,
            firmware: info.firmware,
            userCount: info.userCount,
            fpCount: info.fpCount,
            recordCount: info.recordCount,
          },
        };
      } catch (error) {
        device.disconnect();
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  pullDeviceLogs: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        ip: z
          .string()
          .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address")
          .optional(),
        port: z.number().int().min(1).max(65535).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const config = input.ip
          ? { ip: input.ip, port: input.port }
          : undefined;
        const punches = await FKAttendLogPuller.pullLogs(config);

        AuditLogService.log({
          action: "device_logs_pulled",
          details: {
            count: punches.length,
            ip: input.ip || "192.168.0.10",
          },
          status: "success",
        });

        return {
          success: true,
          count: punches.length,
          sample: punches.slice(0, 3).map((p) => ({
            empNo: p.enrollNo,
            timestamp: p.timestamp.toISOString(),
            direction: p.inOutMode === 1 ? "in" : "out",
          })),
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        AuditLogService.log({
          action: "device_logs_pulled",
          details: { error: errorMsg },
          status: "error",
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    }),

  exportDevicePunches: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        ip: z
          .string()
          .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address")
          .optional(),
        port: z.number().int().min(1).max(65535).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const config = input.ip ? { ip: input.ip, port: input.port } : undefined;
      const punches = await FKAttendLogPuller.pullLogs(config);
      return {
        success: true,
        count: punches.length,
        punches: punches.map((p) => ({
          empNo: p.enrollNo,
          timestamp: p.timestamp.toISOString(),
          direction: p.inOutMode === 1 ? "in" : "out",
          year: p.year,
          month: p.month,
          day: p.day,
          hour: p.hour,
          minute: p.minute,
          second: p.second,
        })),
      };
    }),

  syncEmployeesFromDevice: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        ip: z
          .string()
          .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address")
          .optional(),
        port: z.number().int().min(1).max(65535).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const settings = DeviceSettingsService.getSettings();
      const ip = input.ip || settings.ip || "192.168.0.10";
      const port = input.port || settings.port || 5005;

      const pullerPath =
        process.env.FK_USER_PULLER_PATH ?? "D:\\Programs\\fp\\FKUserPuller.exe";
      const tempFile = path.join(os.tmpdir(), `fk_users_${Date.now()}.csv`);

      try {
        const cmd = `"${pullerPath}" --ip ${ip} --port ${port} --out "${tempFile}"`;
        const output = execSync(cmd, { encoding: "utf-8", timeout: 30000 });
        console.log("[FKUserPuller]", output);

        if (!fs.existsSync(tempFile))
          throw new Error("لم يُنتج الملف — فحص اتصال الجهاز");

        const lines = fs
          .readFileSync(tempFile, "utf-8")
          .trim()
          .split("\n")
          .slice(1);
        const employees: { empNo: string; name: string }[] = [];
        for (const line of lines) {
          const parts = line.trim().split(",");
          if (!parts[0]?.trim()) continue;
          const empNo = parts[0].trim();
          const name = (parts[1] ?? "").trim(); // keep empty if device has no name
          employees.push({ empNo, name });
        }

        if (!employees.length)
          return {
            success: true,
            inserted: 0,
            updated: 0,
            total: 0,
            employees: [],
          };

        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        const now = new Date();
        let inserted = 0;
        let updated = 0;

        for (const emp of employees) {
          const empCd = emp.empNo;

          const existing = await db
            .select({
              empCd: attendanceEmployees.empCd,
              fullName: attendanceEmployees.fullName,
            })
            .from(attendanceEmployees)
            .where(eq(attendanceEmployees.empCd, empCd))
            .limit(1);

          if (existing.length) {
            // only update name if device actually provided one and current name is just the ID
            const hasRealName = emp.name && emp.name !== empCd;
            const currentIsPlaceholder =
              !existing[0].fullName || existing[0].fullName === empCd;
            if (hasRealName && currentIsPlaceholder) {
              await db
                .update(attendanceEmployees)
                .set({ fullName: emp.name, updatedAt: now })
                .where(eq(attendanceEmployees.empCd, empCd));
              updated++;
            }
            // else: leave existing name intact
          } else {
            await db.insert(attendanceEmployees).values({
              empCd,
              fullName: emp.name || empCd, // placeholder = enrollNo if no name
              active: true,
              createdAt: now,
              updatedAt: now,
            });
            inserted++;
          }
        }

        AuditLogService.log({
          action: "sync_employees_device",
          details: { inserted, updated, total: employees.length },
          status: "success",
        });

        return {
          success: true,
          inserted,
          updated,
          total: employees.length,
          employees,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "sync_employees_device",
          details: { error: msg },
          status: "error",
        });
        throw new Error(msg);
      } finally {
        try {
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch {}
      }
    }),

  syncFromFKDevice: makeAttWriteProcedure("/attendance/admin/sync")
    .input(
      z.object({
        ip: z
          .string()
          .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address")
          .optional(),
        port: z.number().int().min(1).max(65535).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const deviceConfig = input.ip
          ? { ip: input.ip, port: input.port }
          : undefined;
        const result = await FKDeviceSyncService.syncNow(
          ctx.user.id,
          deviceConfig,
        );

        AuditLogService.log({
          action: "fk_device_sync",
          details: {
            recordsSeen: result.recordsSeen,
            recordsInserted: result.recordsInserted,
            recordsSkipped: result.recordsSkipped,
            duration: result.duration,
          },
          status: result.success ? "success" : "error",
        });

        return {
          success: result.success,
          recordsSeen: result.recordsSeen,
          recordsInserted: result.recordsInserted,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          error: result.error,
          startedAt: result.startedAt.toISOString(),
          completedAt: result.completedAt.toISOString(),
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        AuditLogService.log({
          action: "fk_device_sync",
          details: { error: errorMsg },
          status: "error",
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    }),

  testFKDeviceConnection: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        ip: z
          .string()
          .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address")
          .optional(),
        port: z.number().int().min(1).max(65535).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const deviceConfig = input.ip
          ? { ip: input.ip, port: input.port }
          : undefined;
        const connected = await FKAttendLogPuller.testConnection(deviceConfig);

        if (connected) {
          return {
            success: true,
            message: "Device connected successfully",
          };
        } else {
          return {
            success: false,
            message: "Device connection test failed",
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }),

  syncNow: makeAttWriteProcedure("/attendance/admin/sync")
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        const result = await FKDeviceSyncService.syncNow(ctx.user.id);

        // Always recompute today so dashboard stat cards reflect current state
        // even when no new punches were inserted (e.g. first run or duplicates)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        await dailyMaterializer.recomputeRange(today, tomorrow);

        AuditLogService.log({
          action: "manual_sync_triggered",
          details: {
            inserted: result.recordsInserted,
            seen: result.recordsSeen,
          },
          status: result.success ? "success" : "error",
        });
        return {
          success: result.success,
          error: result.error,
          rowsInserted: result.recordsInserted,
          rowsSeen: result.recordsSeen,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "manual_sync_triggered",
          details: { error },
          status: "error",
        });
        return {
          success: false,
          error,
        };
      }
    }),

  resetSyncHistory: makeAttWriteProcedure("/attendance/admin/sync")
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        await resetSyncHistory();
        AuditLogService.log({
          action: "sync_history_reset",
          details: { triggeredBy: ctx.user.id },
          status: "success",
        });
        return {
          success: true,
          message:
            "Sync history cleared. Next sync will import all data from last 2 years.",
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "sync_history_reset",
          details: { error },
          status: "error",
        });
        return {
          success: false,
          error,
        };
      }
    }),

  // Device Sync Procedures (ZKTeco direct connection)
  deviceSyncNow: makeAttWriteProcedure("/attendance/admin/sync")
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        const engine = getDeviceSyncEngine();
        if (!engine) {
          throw new Error(
            "Device sync not initialized. Configure device IP in settings.",
          );
        }

        const result = await engine.syncNow();
        AuditLogService.log({
          action: "device_sync_triggered",
          details: {
            recordsImported: result.recordsImported,
            recordsSkipped: result.recordsSkipped,
          },
          status: result.status === "completed" ? "success" : "error",
        });

        return {
          success: result.status === "completed",
          status: result.status,
          recordsImported: result.recordsImported,
          recordsSkipped: result.recordsSkipped,
          error: result.error,
          completedAt: result.completedAt?.toISOString(),
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "device_sync_triggered",
          details: { error },
          status: "error",
        });
        return {
          success: false,
          error,
        };
      }
    }),

  deviceSyncStatus: makeAttProcedure("/attendance/admin/sync")
    .input(z.object({}).optional())
    .query(async () => {
      const engine = getDeviceSyncEngine();
      if (!engine) {
        return {
          initialized: false,
          currentSync: null,
        };
      }

      const status = engine.getCurrentSyncStatus();
      return {
        initialized: true,
        currentSync: status
          ? {
              status: status.status,
              recordsImported: status.recordsImported,
              recordsSkipped: status.recordsSkipped,
              startedAt: status.startedAt.toISOString(),
              completedAt: status.completedAt?.toISOString(),
              error: status.error,
            }
          : null,
      };
    }),

  initializeDeviceSync: makeAttWriteProcedure("/attendance/admin/sync")
    .input(
      z.object({
        deviceIp: z
          .string()
          .regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
        devicePort: z.number().int().min(1).max(65535).default(5005),
        enableAutoSync: z.boolean().default(false),
        syncIntervalMinutes: z.number().int().min(5).max(1440).default(60),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const engine = await initializeDeviceSync({
          deviceIp: input.deviceIp,
          devicePort: input.devicePort,
          enableAutoSync: input.enableAutoSync,
          syncIntervalMinutes: input.syncIntervalMinutes,
        });

        AuditLogService.log({
          action: "device_sync_initialized",
          details: {
            deviceIp: input.deviceIp,
            devicePort: input.devicePort,
            autoSyncEnabled: input.enableAutoSync,
          },
          status: "success",
        });

        return {
          success: true,
          message: `Connected to device at ${input.deviceIp}:${input.devicePort}`,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "device_sync_initialized",
          details: { deviceIp: input.deviceIp, error },
          status: "error",
        });
        return {
          success: false,
          error,
        };
      }
    }),

  materializeDaily: makeAttWriteProcedure("/attendance")
    .input(
      z.object({
        fromDate: z.string().optional(), // YYYY-MM-DD, defaults to 30 days ago
        toDate: z.string().optional(), // YYYY-MM-DD, defaults to today
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const toDate = input.toDate ? new Date(input.toDate) : new Date();
        const fromDate = input.fromDate
          ? new Date(input.fromDate)
          : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        const rowsWritten = await dailyMaterializer.recomputeRange(
          fromDate,
          toDate,
        );

        // Also generate monthly reports for affected months
        const months = new Set<string>();
        for (
          let d = new Date(fromDate);
          d <= toDate;
          d.setDate(d.getDate() + 1)
        ) {
          months.add(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          );
        }

        let monthsGenerated = 0;
        for (const month of months) {
          const [year, monthNum] = month.split("-").map(Number);
          try {
            await MonthlyComputeService.saveMonthlyReports(year, monthNum);
            monthsGenerated++;
          } catch (e) {
            console.error(`Failed to generate monthly report for ${month}:`, e);
          }
        }

        AuditLogService.log({
          action: "materialize_daily_triggered",
          details: {
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
            rowsWritten,
            monthsGenerated,
          },
          status: "success",
        });

        return {
          success: true,
          rowsWritten,
          monthsGenerated,
          message: `Materialized ${rowsWritten} daily records & generated ${monthsGenerated} monthly reports`,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "materialize_daily_triggered",
          details: { error },
          status: "error",
        });
        return {
          success: false,
          error,
        };
      }
    }),

  generateMonthlyReports: makeAttWriteProcedure("/attendance")
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const savedCount = await MonthlyComputeService.saveMonthlyReports(
          input.year,
          input.month,
        );

        AuditLogService.log({
          action: "generate_monthly_reports",
          details: { year: input.year, month: input.month, savedCount },
          status: "success",
        });

        return {
          success: true,
          message: `Generated/updated monthly reports for ${savedCount} employees`,
          savedCount,
          year: input.year,
          month: input.month,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "generate_monthly_reports",
          details: { year: input.year, month: input.month, error },
          status: "error",
        });
        return {
          success: false,
          error,
        };
      }
    }),

  healthCheck: makeAttProcedure("/attendance").query(async () => {
    const db = await getDb();
    return {
      status: "ok",
      database: db ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    };
  }),

  bootstrapShifts: makeAttWriteProcedure("/attendance")
    .input(z.object({}).optional())
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Create default 8am-5pm shift if it doesn't exist
        const existingShifts = await db
          .select()
          .from(attendanceShifts)
          .where(eq(attendanceShifts.name, "Default (8AM-5PM)"));

        let shiftId: number;

        if (existingShifts.length === 0) {
          // Create new shift
          const result = await db.insert(attendanceShifts).values({
            name: "Default (8AM-5PM)",
            startTime: "08:00",
            endTime: "17:00",
            crossesMidnight: false,
            graceLateMin: 15,
            graceEarlyMin: 15,
            breakMinutes: 60,
            active: true,
          });
          shiftId = (result as any).insertId || 1;
        } else {
          shiftId = existingShifts[0].id;
        }

        // Get all active employees
        const employees = await db
          .select()
          .from(attendanceEmployees)
          .where(eq(attendanceEmployees.active, true));

        // Assign all employees to the shift from Jan 1, 2026
        const startDate = new Date(2026, 0, 1);
        let assigned = 0;

        for (const emp of employees) {
          // Check if already assigned
          const existing = await db
            .select()
            .from(attendanceShiftAssignments)
            .where(eq(attendanceShiftAssignments.empCd, emp.empCd));

          if (existing.length === 0) {
            await db.insert(attendanceShiftAssignments).values({
              empCd: emp.empCd,
              shiftId,
              effectiveFrom: startDate,
              effectiveTo: null,
              weekdayMask: 127,
            });
            assigned++;
          }
        }

        AuditLogService.log({
          action: "bootstrap_shifts",
          details: {
            shiftId,
            employeesAssigned: assigned,
            totalEmployees: employees.length,
          },
          status: "success",
        });

        return {
          success: true,
          message: `Created shift and assigned ${assigned} employees. ${employees.length - assigned} were already assigned.`,
          shiftId,
          assignedCount: assigned,
          totalEmployees: employees.length,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: "bootstrap_shifts",
          details: { error },
          status: "error",
        });
        return {
          success: false,
          error,
        };
      }
    }),

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

      const today = new Date();
      const conditions: any[] = [
        or(
          isNull(attendanceShiftAssignments.effectiveTo),
          gte(attendanceShiftAssignments.effectiveTo, today),
        ),
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
        const effectiveFrom = new Date(input.effectiveFrom);
        const effectiveTo = input.effectiveTo
          ? new Date(input.effectiveTo)
          : null;

        // Check if already assigned (and mark previous as ended if needed)
        const existing = await db
          .select()
          .from(attendanceShiftAssignments)
          .where(
            and(
              eq(attendanceShiftAssignments.empCd, input.empCd),
              isNull(attendanceShiftAssignments.effectiveTo),
            ),
          );

        if (existing.length > 0) {
          // End the previous assignment
          await db
            .update(attendanceShiftAssignments)
            .set({ effectiveTo: new Date(effectiveFrom.getTime() - 86400000) }) // Day before
            .where(eq(attendanceShiftAssignments.id, existing[0].id));
        }

        // Create new assignment
        const result = await db.insert(attendanceShiftAssignments).values({
          empCd: input.empCd,
          shiftId: input.shiftId,
          effectiveFrom,
          effectiveTo,
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
        effectiveTo: z.string().optional(),
        weekdayMask: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        const updateData: any = {};
        if (input.shiftId !== undefined) updateData.shiftId = input.shiftId;
        if (input.effectiveFrom)
          updateData.effectiveFrom = new Date(input.effectiveFrom);
        if (input.effectiveTo)
          updateData.effectiveTo = new Date(input.effectiveTo);
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

  // ─── Employee Edit / Delete ──────────────────────────────────────────────
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

  // ─── Swap Shifts Between Two Employees ──────────────────────────────────
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

  // ─── Temp Shift Change For Single Employee ───────────────────────────────
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

  // ─── Bulk Shift Assignment ───────────────────────────────────────────────
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
          })
          .onDuplicateKeyUpdate({
            set: {
              shiftId: input.shiftId,
              weekdayMask: input.weekdayMask,
              effectiveTo: input.effectiveTo
                ? (input.effectiveTo as any)
                : null,
            },
          });
        inserted++;
      }
      return { success: true, inserted };
    }),

  // ─── Leave Balance ────────────────────────────────────────────────────────
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

      return balances.map((b) => {
        const empLeaves = usedRows.filter((l) => l.empCd === b.empCd);
        const usedDays = empLeaves.reduce((acc, l) => {
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

  // ─── Permissions (إذن) ────────────────────────────────────────────────────
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

  // ─── Holidays ─────────────────────────────────────────────────────────────
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
      return rows.map((h) => ({
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
      return { success: true };
    }),

  // ─── Date-range report ────────────────────────────────────────────────────
  rangeReport: makeAttProcedure("/attendance")
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const daily = await db
        .select({
          empCd: attendanceDaily.empCd,
          empName: attendanceEmployees.fullName,
          status: attendanceDaily.status,
          lateMinutes: attendanceDaily.lateMinutes,
          earlyLeaveMin: attendanceDaily.earlyLeaveMin,
          overtimeMinutes: attendanceDaily.overtimeMinutes,
          workedMinutes: attendanceDaily.workedMinutes,
        })
        .from(attendanceDaily)
        .leftJoin(
          attendanceEmployees,
          eq(attendanceDaily.empCd, attendanceEmployees.empCd),
        )
        .where(
          and(
            gte(attendanceDaily.workDate, input.from as any),
            lte(attendanceDaily.workDate, input.to as any),
          ),
        );

      const grouped = new Map<string, any>();
      for (const d of daily) {
        if (!grouped.has(d.empCd))
          grouped.set(d.empCd, {
            empCd: d.empCd,
            empName: d.empName,
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            leaveDays: 0,
            totalLateMins: 0,
            totalEarlyMins: 0,
            totalOTMins: 0,
            totalWorkedMins: 0,
          });
        const a = grouped.get(d.empCd)!;
        a.totalDays++;
        if (
          d.status === "present" ||
          d.status === "partial" ||
          d.status === "missing_checkout"
        )
          a.presentDays++;
        else if (d.status === "absent") a.absentDays++;
        else if (d.status === "leave") a.leaveDays++;
        a.totalLateMins += d.lateMinutes ?? 0;
        a.totalEarlyMins += d.earlyLeaveMin ?? 0;
        a.totalOTMins += d.overtimeMinutes ?? 0;
        a.totalWorkedMins += d.workedMinutes ?? 0;
      }
      return Array.from(grouped.values()).sort((a, b) =>
        a.empCd.localeCompare(b.empCd),
      );
    }),

  // ─── Self-service: employee's own profile ────────────────────────────────

  myAttendanceProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Resolve empCd from logged-in user
    const mapping = await db
      .select()
      .from(employeeAttendanceMapping)
      .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
      .limit(1);

    if (!mapping[0]) return { linked: false };

    const empCd = mapping[0].machineUserId;
    const year = new Date().getFullYear();
    const now = new Date();
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const monthEndStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const yearStartStr = `${year}-01-01`;
    const yearEndStr = `${year}-12-31`;

    // Annual leave balance
    const annualLeaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.type, "annual"),
          eq(attendanceLeaves.approved, true),
          sql`${attendanceLeaves.dateFrom} >= ${yearStartStr}`,
          sql`${attendanceLeaves.dateTo} <= ${yearEndStr}`,
        ),
      );
    const usedAnnual = annualLeaves.reduce((s, l) => {
      const d1 = new Date(String(l.dateFrom));
      const d2 = new Date(String(l.dateTo));
      return s + Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
    }, 0);

    // Sick leaves this year (approved only)
    const sickLeaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.type, "sick"),
          eq(attendanceLeaves.approved, true),
          sql`${attendanceLeaves.dateFrom} >= ${yearStartStr}`,
          sql`${attendanceLeaves.dateTo} <= ${yearEndStr}`,
        ),
      );
    const usedSick = sickLeaves.reduce((s, l) => {
      const d1 = new Date(String(l.dateFrom));
      const d2 = new Date(String(l.dateTo));
      return s + Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1;
    }, 0);

    // Leave balance config (allocation)
    const balRow = await db
      .select()
      .from(attendanceLeaveBalances)
      .where(
        and(
          eq(attendanceLeaveBalances.empCd, empCd),
          eq(attendanceLeaveBalances.year, year),
        ),
      )
      .limit(1);
    const annualAllocation = balRow[0]?.annualAllocation ?? 21;

    // Current month daily stats
    const monthlyDaily = await db
      .select({
        lateMins: sql<number>`COALESCE(SUM(${attendanceDaily.lateMinutes}),0)`,
        earlyMins: sql<number>`COALESCE(SUM(${attendanceDaily.earlyLeaveMin}),0)`,
      })
      .from(attendanceDaily)
      .where(
        and(
          eq(attendanceDaily.empCd, empCd),
          sql`${attendanceDaily.workDate} >= ${monthStartStr}`,
          sql`${attendanceDaily.workDate} <= ${monthEndStr}`,
        ),
      );

    // Current month permissions
    const monthPerms = await db
      .select()
      .from(attendancePermissions)
      .where(
        and(
          eq(attendancePermissions.empCd, empCd),
          eq(attendancePermissions.approved, true),
          sql`${attendancePermissions.date} >= ${monthStartStr}`,
          sql`${attendancePermissions.date} <= ${monthEndStr}`,
        ),
      );
    const permInMins = monthPerms
      .filter((p) => p.type === "in")
      .reduce((s, p) => s + p.durationMinutes, 0);
    const permOutMins = monthPerms
      .filter((p) => p.type === "out")
      .reduce((s, p) => s + p.durationMinutes, 0);

    // Pending leaves (approved: false)
    const pendingLeaves = await db
      .select()
      .from(attendanceLeaves)
      .where(
        and(
          eq(attendanceLeaves.empCd, empCd),
          eq(attendanceLeaves.approved, false),
        ),
      )
      .orderBy(desc(attendanceLeaves.createdAt));

    // Pending permissions (approved: false)
    const pendingPerms = await db
      .select()
      .from(attendancePermissions)
      .where(
        and(
          eq(attendancePermissions.empCd, empCd),
          eq(attendancePermissions.approved, false),
        ),
      )
      .orderBy(desc(attendancePermissions.createdAt));

    const pendingShiftChanges = await db
      .select()
      .from(attendanceShiftChangeRequests)
      .where(
        and(
          eq(attendanceShiftChangeRequests.empCd, empCd),
          eq(attendanceShiftChangeRequests.status, "pending"),
        ),
      )
      .orderBy(desc(attendanceShiftChangeRequests.createdAt));

    return {
      linked: true,
      empCd,
      leaveBalance: {
        annualAllocation,
        usedAnnual,
        remainingAnnual: Math.max(0, annualAllocation - usedAnnual),
        usedSick,
      },
      monthStats: {
        lateMins: monthlyDaily[0]?.lateMins ?? 0,
        earlyMins: monthlyDaily[0]?.earlyMins ?? 0,
        permInMins,
        permOutMins,
      },
      pendingLeaves: pendingLeaves.map((l: any) => ({
        ...l,
        dateFrom: fmtDate(l.dateFrom as any),
        dateTo: fmtDate(l.dateTo as any),
        date: fmtDate((l as any).date),
      })),
      pendingPerms: pendingPerms.map((p: any) => ({
        ...p,
        date: fmtDate(p.date as any),
      })),
      pendingShiftChanges: pendingShiftChanges.map((s) => ({
        ...s,
        dateFrom: fmtDate(s.dateFrom as any),
        dateTo: s.dateTo ? fmtDate(s.dateTo as any) : null,
      })),
    };
  }),

  myRequestLeave: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
        type: z.enum(["annual", "sick"]),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const mapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
        .limit(1);
      if (!mapping[0]) throw new Error("لم يتم ربط حسابك بسجل موظف");

      const dateFrom = input.dateFrom;
      const dateTo =
        input.dateTo < input.dateFrom ? input.dateFrom : input.dateTo;
      const empCd = mapping[0].machineUserId;
      const noteVal = input.note || null;

      // Raw SQL insert — bypasses Drizzle date column mapping entirely
      await db.execute(
        sql`INSERT INTO attendance_leaves (emp_cd, date_from, date_to, type, approved, note)
            VALUES (${empCd}, ${dateFrom}, ${dateTo}, ${input.type}, 0, ${noteVal})`,
      );

      // Read back what was actually stored
      const stored = await db.execute(
        sql`SELECT date_from, date_to FROM attendance_leaves
            WHERE emp_cd = ${empCd}
            ORDER BY id DESC LIMIT 1`,
      );
      const row = (stored as any)[0]?.[0] ?? {};
      const storedFrom = fmtDate(row.date_from ?? dateFrom);
      const storedTo = fmtDate(row.date_to ?? dateTo);

      const userName = String(ctx.user.name || ctx.user.username || "");
      const ns = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );
      if (ns.attendance.enabled) {
        const fmtDayMonth = (d: string) => {
          const dt = new Date(`${d}T00:00:00`);
          const weekday = dt.toLocaleDateString("ar-EG", {
            timeZone: "Africa/Cairo",
            weekday: "long",
          });
          return `${weekday} ${dt.getDate()}/${dt.getMonth() + 1}`;
        };
        pushAppNotification({
          title: "طلب اجازه",
          message: `${userName} طلب اجازه من ${fmtDayMonth(dateFrom)} حتي ${fmtDayMonth(dateTo)}`,
          kind: "info",
          targetRoles: ns.attendance.managerId ? null : ["admin", "manager"],
          targetUserIds: ns.attendance.managerId
            ? [ns.attendance.managerId]
            : null,
          source: "attendance",
          entityType: "leave_request",
          meta: { path: "/attendance/employees", empCd },
          channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
        }).catch(() => {});
      }

      return { success: true, dateFrom: storedFrom, dateTo: storedTo };
    }),

  myRequestPermission: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        type: z.enum(["in", "out"]),
        durationMinutes: z.number().int().min(1).max(480),
        timeFrom: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const mapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
        .limit(1);
      if (!mapping[0]) throw new Error("لم يتم ربط حسابك بسجل موظف");

      await db.insert(attendancePermissions).values({
        empCd: mapping[0].machineUserId,
        date: input.date as any,
        type: input.type,
        durationMinutes: input.durationMinutes,
        approved: false,
        note: input.note ?? null,
      });

      const userName = String(ctx.user.name || ctx.user.username || "");
      const typeAr = input.type === "out" ? "خروج" : "دخول";
      const ns = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );
      if (ns.attendance.enabled) {
        const mins = input.durationMinutes;
        const durationAr =
          mins % 60 === 0
            ? mins / 60 === 1
              ? "ساعة"
              : mins / 60 === 2
                ? "ساعتين"
                : `${mins / 60} ساعات`
            : mins < 60
              ? `${mins} دقيقة`
              : `${Math.floor(mins / 60)} ساعة ${mins % 60} دقيقة`;
        const dt = new Date(`${input.date}T00:00:00`);
        const weekday = dt.toLocaleDateString("ar-EG", {
          timeZone: "Africa/Cairo",
          weekday: "long",
        });
        const dayMonth = `${dt.getDate()}/${dt.getMonth() + 1}`;
        let timeRange = "";
        if (input.timeFrom) {
          const [fh, fm] = input.timeFrom.split(":").map(Number);
          const toMins = (fh ?? 0) * 60 + (fm ?? 0) + mins;
          const th = Math.floor(toMins / 60) % 24;
          const tm = toMins % 60;
          const pad = (n: number) => String(n).padStart(2, "0");
          timeRange = ` من ${pad(fh ?? 0)}:${pad(fm ?? 0)} حتي ${pad(th)}:${pad(tm)}`;
        }
        pushAppNotification({
          title: "طلب اذن",
          message: `${userName} طلب اذن ${typeAr} لمدة ${durationAr} ${weekday} ${dayMonth}${timeRange}`,
          kind: "info",
          targetRoles: ns.attendance.managerId ? null : ["admin", "manager"],
          targetUserIds: ns.attendance.managerId
            ? [ns.attendance.managerId]
            : null,
          source: "attendance",
          entityType: "permission_request",
          meta: {
            path: "/attendance/employees",
            empCd: mapping[0].machineUserId,
          },
          channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
        }).catch(() => {});
      }

      return { success: true };
    }),

  myRequestShiftChange: protectedProcedure
    .input(
      z.object({
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const mapping = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, ctx.user.id))
        .limit(1);
      if (!mapping[0]) throw new Error("لم يتم ربط حسابك بسجل موظف");

      const empCd = mapping[0].machineUserId;

      await db.insert(attendanceShiftChangeRequests).values({
        empCd,
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

      const userName = String(ctx.user.name || ctx.user.username || "");
      const typeAr =
        input.requestType === "daily"
          ? "يومي"
          : input.requestType === "weekly"
            ? "أسبوعي"
            : input.requestType === "monthly"
              ? "شهري"
              : "تبادل مع زميل";
      const ns = await getAppNotificationSettings().catch(
        () => DEFAULT_APP_NOTIFICATION_SETTINGS,
      );
      if (ns.attendance.enabled) {
        pushAppNotification({
          title: "طلب تغيير موعد",
          message: `${userName} طلب تغيير موعد (${typeAr}) من تاريخ ${input.dateFrom}`,
          kind: "info",
          targetRoles: ns.attendance.managerId ? null : ["admin", "manager"],
          targetUserIds: ns.attendance.managerId
            ? [ns.attendance.managerId]
            : null,
          source: "attendance",
          entityType: "schedule_change_request",
          meta: { path: "/attendance/employees", empCd },
          channels: { inApp: ns.attendance.inApp, push: ns.attendance.push },
        }).catch(() => {});
      }

      return { success: true };
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

  // Admin: list all system users with their current empCd mapping
  listUserMappings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const allUsers = await getAllUsers();

    const mappings = await db.select().from(employeeAttendanceMapping);
    const byUserId = new Map(mappings.map((m) => [m.userId, m]));

    return allUsers
      .sort((a, b) =>
        (a.name || a.username).localeCompare(b.name || b.username, "ar"),
      )
      .map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        empCd: byUserId.get(u.id)?.machineUserId ?? null,
        mappingId: byUserId.get(u.id)?.id ?? null,
      }));
  }),

  // Admin: set or update empCd for a user (upsert by userId)
  setUserMapping: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        empCd: z.string().max(50).nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!input.empCd) {
        // Remove mapping
        await db
          .delete(employeeAttendanceMapping)
          .where(eq(employeeAttendanceMapping.userId, input.userId));
        return { success: true };
      }

      const existing = await db
        .select()
        .from(employeeAttendanceMapping)
        .where(eq(employeeAttendanceMapping.userId, input.userId))
        .limit(1);

      if (existing[0]) {
        await db
          .update(employeeAttendanceMapping)
          .set({ machineUserId: input.empCd })
          .where(eq(employeeAttendanceMapping.userId, input.userId));
      } else {
        await db.insert(employeeAttendanceMapping).values({
          userId: input.userId,
          machineUserId: input.empCd,
        });
      }
      return { success: true };
    }),

  // ─── Shift Cycles ────────────────────────────────────────────────────────

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
});

export type AttendanceRouter = typeof attendanceRouter;
