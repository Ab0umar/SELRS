import { z } from 'zod';
import crypto from 'crypto';
import { getDeviceDiagnostics } from '../services/attendance/deviceDiagnostics.service';
import { router, attendanceViewerProcedure, attendanceManagerProcedure } from '../_core/procedures';
import { DashboardService } from '../services/attendance/dashboard.service';
import { MonthlyComputeService } from '../services/attendance/monthlyCompute.service';
import { LeaveManagementService } from '../services/attendance/leaveManagement.service';
import { PermissionAdjustmentService } from '../services/attendance/permissionAdjustment.service';
import { AuditLogService } from '../services/attendance/auditLog.service';
import { DeviceSettingsService } from '../services/attendance/deviceSettings.service';
import { runSyncOnce } from '../services/attendance/syncEngine';
import { getDb } from '../db';
import { attendanceSyncRuns, attendancePunches, attendanceDaily, attendanceEmployees, attendanceLeaves } from '../../drizzle/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

/**
 * AttendanceRouter - TRPC router for attendance module
 */
export const attendanceRouter = router({
  dashboardSummary: attendanceViewerProcedure.query(async () => {
    return DashboardService.getSummary();
  }),

  syncStatus: attendanceViewerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const runs = await db
        .select()
        .from(attendanceSyncRuns)
        .orderBy(desc(attendanceSyncRuns.startedAt))
        .limit(input.limit);

      const current = runs.find((r) => r.status === 'running');

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

  rawPunches: attendanceViewerProcedure
    .input(
      z.object({
        empCd: z.string().optional(),
        fromDate: z.string().optional(), // YYYY-MM-DD
        toDate: z.string().optional(), // YYYY-MM-DD
        limit: z.number().int().min(1).max(1000).default(500),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

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

      const total = conditions.length > 0
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

  dailyByDate: attendanceViewerProcedure
    .input(
      z.object({
        date: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const targetDate = new Date(input.date);

      const daily = await db
        .select()
        .from(attendanceDaily)
        .where(eq(attendanceDaily.workDate, targetDate))
        .orderBy(attendanceDaily.empCd);

      return daily.map((d) => ({
        empCd: d.empCd,
        workDate: d.workDate.toISOString().split('T')[0],
        shiftId: d.shiftId,
        lateMinutes: d.lateMinutes,
        earlyLeaveMin: d.earlyLeaveMin,
        overtimeMinutes: d.overtimeMinutes,
        status: d.status,
        insideNow: d.insideNow,
      }));
    }),

  dailyByEmployee: attendanceViewerProcedure
    .input(
      z.object({
        empCd: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

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
            lte(attendanceDaily.workDate, to)
          )
        )
        .orderBy(attendanceDaily.workDate);

      return daily.map((d) => ({
        empCd: d.empCd,
        workDate: d.workDate.toISOString().split('T')[0],
        shiftId: d.shiftId,
        lateMinutes: d.lateMinutes,
        earlyLeaveMin: d.earlyLeaveMin,
        overtimeMinutes: d.overtimeMinutes,
        status: d.status,
        insideNow: d.insideNow,
      }));
    }),

  monthlyReport: attendanceViewerProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(input.year, input.month);
      return monthly;
    }),

  lateReport: attendanceViewerProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(input.year, input.month);
      return MonthlyComputeService.lateReport(monthly);
    }),

  absentReport: attendanceViewerProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(input.year, input.month);
      return MonthlyComputeService.absentReport(monthly);
    }),

  otReport: attendanceViewerProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(input.year, input.month);
      return MonthlyComputeService.otReport(monthly);
    }),

  summaryReport: attendanceViewerProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const monthly = await MonthlyComputeService.generateMonthly(input.year, input.month);
      return MonthlyComputeService.summaryReport(monthly);
    }),

  employeeLeaves: attendanceViewerProcedure
    .input(
      z.object({
        empCd: z.string(),
        year: z.number().int().min(2020).max(2099).optional(),
      })
    )
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();
      const fromDate = new Date(year, 0, 1);
      const toDate = new Date(year, 11, 31);
      return LeaveManagementService.getEmployeeLeaves(input.empCd, fromDate, toDate);
    }),

  leaveBalance: attendanceViewerProcedure
    .input(
      z.object({
        empCd: z.string(),
        year: z.number().int().min(2020).max(2099).optional(),
      })
    )
    .query(async ({ input }) => {
      const year = input.year || new Date().getFullYear();
      return LeaveManagementService.getLeaveBalance(input.empCd, year);
    }),

  pendingLeaves: attendanceViewerProcedure.query(async () => {
    return LeaveManagementService.getPendingLeaves();
  }),

  createLeave: attendanceManagerProcedure
    .input(
      z.object({
        empCd: z.string(),
        dateFrom: z.string(), // YYYY-MM-DD
        dateTo: z.string(), // YYYY-MM-DD
        type: z.enum(['annual', 'sick', 'unpaid', 'other']),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const dateFrom = new Date(input.dateFrom);
      const dateTo = new Date(input.dateTo);

      if (dateTo < dateFrom) {
        throw new Error('End date must be after start date');
      }

      return LeaveManagementService.createLeave({
        empCd: input.empCd,
        dateFrom,
        dateTo,
        type: input.type,
        note: input.note,
      });
    }),

  approveLeave: attendanceManagerProcedure
    .input(z.object({ leaveId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get the leave record to know the date range
      const leave = await db
        .select()
        .from(attendanceLeaves)
        .where(eq(attendanceLeaves.id, input.leaveId))
        .limit(1);

      if (!leave[0]) {
        throw new Error('Leave record not found');
      }

      // Approve the leave
      await LeaveManagementService.approveLeave(input.leaveId);

      // Recompute daily records for the leave date range
      await PermissionAdjustmentService.recomputeRange(
        leave[0].empCd,
        leave[0].dateFrom,
        leave[0].dateTo
      );

      return { success: true, leaveId: input.leaveId };
    }),

  deleteLeave: attendanceManagerProcedure
    .input(z.object({ leaveId: z.number() }))
    .mutation(async ({ input }) => {
      return LeaveManagementService.deleteLeave(input.leaveId);
    }),

  recomputeDaily: attendanceManagerProcedure
    .input(
      z.object({
        empCd: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .mutation(async ({ input }) => {
      const fromDate = new Date(input.fromDate);
      const toDate = new Date(input.toDate);

      const updated = await PermissionAdjustmentService.recomputeRange(
        input.empCd,
        fromDate,
        toDate
      );

      return { success: true, recordsUpdated: updated };
    }),

  adjustmentSummary: attendanceViewerProcedure
    .input(
      z.object({
        empCd: z.string(),
        fromDate: z.string(), // YYYY-MM-DD
        toDate: z.string(), // YYYY-MM-DD
      })
    )
    .query(async ({ input }) => {
      const fromDate = new Date(input.fromDate);
      const toDate = new Date(input.toDate);

      return PermissionAdjustmentService.getAdjustmentSummary(
        input.empCd,
        fromDate,
        toDate
      );
    }),

  auditLogs: attendanceViewerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      return AuditLogService.getRecentLogs(input.limit);
    }),

  auditStats: attendanceViewerProcedure.query(async () => {
    return AuditLogService.getStats();
  }),

  systemHealth: attendanceViewerProcedure.query(async () => {
    const db = await getDb();
    const stats = AuditLogService.getStats();

    return {
      database: db ? 'healthy' : 'disconnected',
      auditLog: 'operational',
      lastSyncTime: stats.lastSyncRun,
      syncRunsLast24h: stats.syncRunsLast24h,
      errorsLast24h: stats.errorsLast24h,
      totalEmployees: 0, // Would query from DB
      totalRecordsProcessed: stats.totalRowsInsertedLast24h,
    };
  }),

  deviceSettings: attendanceViewerProcedure.query(async () => {
    return DeviceSettingsService.getSettings();
  }),

  deviceStatus: attendanceViewerProcedure.query(async () => {
    return DeviceSettingsService.getDeviceStatus();
  }),

  updateDeviceSettings: attendanceManagerProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        ip: z.string().optional(),
        port: z.number().int().min(1).max(65535).optional(),
        fallbackToAccess: z.boolean().optional(),
        realTimeSync: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return DeviceSettingsService.updateSettings(input);
    }),

  connectDevice: attendanceManagerProcedure
    .mutation(async () => {
      const connected = await DeviceSettingsService.connectDevice();
      AuditLogService.log({
        action: 'device_connected',
        details: { success: connected },
        status: connected ? 'success' : 'error',
      });
      return { success: connected };
    }),

  disconnectDevice: attendanceManagerProcedure
    .mutation(async () => {
      DeviceSettingsService.disconnectDevice();
      AuditLogService.log({
        action: 'device_disconnected',
        details: {},
        status: 'success',
      });
      return { success: true };
    }),

  resetDeviceConnection: attendanceManagerProcedure
    .mutation(async () => {
      DeviceSettingsService.resetDeviceConnection();
      AuditLogService.log({
        action: 'device_reset',
        details: {},
        status: 'success',
      });
      return { success: true };
    }),

  sendDeviceCommand: attendanceManagerProcedure
    .input(z.object({ hex: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const success = DeviceSettingsService.sendDeviceCommandHex(input.hex);
        return { success, error: success ? undefined : 'Device not connected' };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }),

  batchAddPunches: attendanceManagerProcedure
    .input(
      z.object({
        punches: z.array(
          z.object({
            empCd: z.string(),
            punchAt: z.string(), // ISO timestamp
            direction: z.enum(['in', 'out', 'unknown']),
            note: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const results = [];

      for (const punch of input.punches) {
        const punchAt = new Date(punch.punchAt);
        const hashInput = `${punch.empCd}|${punchAt.getTime()}|${punch.direction}`;
        const hash = crypto.createHash('sha1').update(hashInput).digest('hex');

        try {
          const existing = await db
            .select()
            .from(attendancePunches)
            .where(eq(attendancePunches.sourceHash, hash))
            .limit(1);

          if (existing.length > 0) {
            results.push({ empCd: punch.empCd, success: false, error: 'Duplicate punch' });
            continue;
          }

          await db.insert(attendancePunches).values({
            empCd: punch.empCd,
            punchAt: punchAt,
            direction: punch.direction,
            source: 'manual',
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

  runDeviceDiagnostics: attendanceManagerProcedure
    .input(
      z.object({
        ip: z.string(),
        port: z.number().int().min(1).max(65535),
      })
    )
    .mutation(async ({ input }) => {
      const diagnostics = getDeviceDiagnostics();
      const results = await diagnostics.runFullDiagnostics(input.ip, input.port);
      const report = diagnostics.generateReport();

      return {
        success: results.every((r) => r.success),
        results,
        report,
      };
    }),

  syncNow: attendanceManagerProcedure
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        const result = await runSyncOnce({ trigger: 'manual', triggeredBy: ctx.user.id });
        AuditLogService.log({
          action: 'manual_sync_triggered',
          details: { runId: result.runId, status: result.status },
          status: result.status === 'failed' ? 'error' : 'success',
        });
        return {
          success: result.status !== 'failed',
          runId: result.runId,
          status: result.status,
          error: result.error,
          rowsInserted: result.rowsInserted,
          rowsSeen: result.rowsSeen,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: 'manual_sync_triggered',
          details: { error },
          status: 'error',
        });
        return {
          success: false,
          error,
        };
      }
    }),

  healthCheck: attendanceViewerProcedure.query(async () => {
    const db = await getDb();
    return {
      status: 'ok',
      database: db ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }),
});

export type AttendanceRouter = typeof attendanceRouter;
