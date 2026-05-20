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
import { runSyncOnce, resetSyncHistory } from '../services/attendance/syncEngine';
import { initializeDeviceSync, getDeviceSyncEngine } from '../services/attendance/deviceSyncEngine';
import { dailyMaterializer } from '../services/attendance/dailyMaterializer';
import { getDb } from '../db';
import { attendanceSyncRuns, attendancePunches, attendanceDaily, attendanceEmployees, attendanceLeaves, attendanceShifts, attendanceShiftAssignments } from '../../drizzle/schema';
import { isNull } from 'drizzle-orm';
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

  employeesList: attendanceViewerProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

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

  resetSyncHistory: attendanceManagerProcedure
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        await resetSyncHistory();
        AuditLogService.log({
          action: 'sync_history_reset',
          details: { triggeredBy: ctx.user.id },
          status: 'success',
        });
        return {
          success: true,
          message: 'Sync history cleared. Next sync will import all data from last 2 years.',
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: 'sync_history_reset',
          details: { error },
          status: 'error',
        });
        return {
          success: false,
          error,
        };
      }
    }),

  // Device Sync Procedures (ZKTeco direct connection)
  deviceSyncNow: attendanceManagerProcedure
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        const engine = getDeviceSyncEngine();
        if (!engine) {
          throw new Error('Device sync not initialized. Configure device IP in settings.');
        }

        const result = await engine.syncNow();
        AuditLogService.log({
          action: 'device_sync_triggered',
          details: {
            recordsImported: result.recordsImported,
            recordsSkipped: result.recordsSkipped
          },
          status: result.status === 'completed' ? 'success' : 'error',
        });

        return {
          success: result.status === 'completed',
          status: result.status,
          recordsImported: result.recordsImported,
          recordsSkipped: result.recordsSkipped,
          error: result.error,
          completedAt: result.completedAt?.toISOString(),
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: 'device_sync_triggered',
          details: { error },
          status: 'error',
        });
        return {
          success: false,
          error,
        };
      }
    }),

  deviceSyncStatus: attendanceViewerProcedure
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

  initializeDeviceSync: attendanceManagerProcedure
    .input(
      z.object({
        deviceIp: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
        devicePort: z.number().int().min(1).max(65535).default(5005),
        enableAutoSync: z.boolean().default(false),
        syncIntervalMinutes: z.number().int().min(5).max(1440).default(60),
      })
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
          action: 'device_sync_initialized',
          details: {
            deviceIp: input.deviceIp,
            devicePort: input.devicePort,
            autoSyncEnabled: input.enableAutoSync,
          },
          status: 'success',
        });

        return {
          success: true,
          message: `Connected to device at ${input.deviceIp}:${input.devicePort}`,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: 'device_sync_initialized',
          details: { deviceIp: input.deviceIp, error },
          status: 'error',
        });
        return {
          success: false,
          error,
        };
      }
    }),

  materializeDaily: attendanceManagerProcedure
    .input(
      z.object({
        fromDate: z.string().optional(), // YYYY-MM-DD, defaults to 30 days ago
        toDate: z.string().optional(), // YYYY-MM-DD, defaults to today
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const toDate = input.toDate ? new Date(input.toDate) : new Date();
        const fromDate = input.fromDate
          ? new Date(input.fromDate)
          : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        const rowsWritten = await dailyMaterializer.recomputeRange(fromDate, toDate);

        // Also generate monthly reports for affected months
        const months = new Set<string>();
        for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        let monthsGenerated = 0;
        for (const month of months) {
          const [year, monthNum] = month.split('-').map(Number);
          try {
            await MonthlyComputeService.saveMonthlyReports(year, monthNum);
            monthsGenerated++;
          } catch (e) {
            console.error(`Failed to generate monthly report for ${month}:`, e);
          }
        }

        AuditLogService.log({
          action: 'materialize_daily_triggered',
          details: { fromDate: fromDate.toISOString(), toDate: toDate.toISOString(), rowsWritten, monthsGenerated },
          status: 'success',
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
          action: 'materialize_daily_triggered',
          details: { error },
          status: 'error',
        });
        return {
          success: false,
          error,
        };
      }
    }),

  generateMonthlyReports: attendanceManagerProcedure
    .input(
      z.object({
        year: z.number().int().min(2020).max(2099),
        month: z.number().int().min(1).max(12),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const savedCount = await MonthlyComputeService.saveMonthlyReports(input.year, input.month);

        AuditLogService.log({
          action: 'generate_monthly_reports',
          details: { year: input.year, month: input.month, savedCount },
          status: 'success',
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
          action: 'generate_monthly_reports',
          details: { year: input.year, month: input.month, error },
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

  bootstrapShifts: attendanceManagerProcedure
    .input(z.object({}).optional())
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        // Create default 8am-5pm shift if it doesn't exist
        const existingShifts = await db
          .select()
          .from(attendanceShifts)
          .where(eq(attendanceShifts.name, 'Default (8AM-5PM)'));

        let shiftId: number;

        if (existingShifts.length === 0) {
          // Create new shift
          const result = await db.insert(attendanceShifts).values({
            name: 'Default (8AM-5PM)',
            startTime: '08:00',
            endTime: '17:00',
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
          action: 'bootstrap_shifts',
          details: { shiftId, employeesAssigned: assigned, totalEmployees: employees.length },
          status: 'success',
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
          action: 'bootstrap_shifts',
          details: { error },
          status: 'error',
        });
        return {
          success: false,
          error,
        };
      }
    }),

  listShifts: attendanceViewerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

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
      breakMinutes: s.breakMinutes,
      active: s.active,
    }));
  }),

  createShift: attendanceManagerProcedure
    .input(
      z.object({
        name: z.string().min(1).max(64),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        crossesMidnight: z.boolean().optional(),
        graceLateMin: z.number().int().min(0).default(15),
        graceEarlyMin: z.number().int().min(0).default(15),
        breakMinutes: z.number().int().min(0).default(60),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const result = await db.insert(attendanceShifts).values({
          name: input.name,
          startTime: input.startTime,
          endTime: input.endTime,
          crossesMidnight: input.crossesMidnight ?? false,
          graceLateMin: input.graceLateMin,
          graceEarlyMin: input.graceEarlyMin,
          breakMinutes: input.breakMinutes,
          active: true,
        });

        const shiftId = (result as any).insertId;

        AuditLogService.log({
          action: 'shift_created',
          details: { shiftId, name: input.name },
          status: 'success',
        });

        return { success: true, shiftId };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        AuditLogService.log({
          action: 'shift_created',
          details: { error },
          status: 'error',
        });
        return { success: false, error };
      }
    }),

  updateShift: attendanceManagerProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(64).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        graceLateMin: z.number().int().min(0).optional(),
        graceEarlyMin: z.number().int().min(0).optional(),
        breakMinutes: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.startTime) updateData.startTime = input.startTime;
        if (input.endTime) updateData.endTime = input.endTime;
        if (input.graceLateMin !== undefined) updateData.graceLateMin = input.graceLateMin;
        if (input.graceEarlyMin !== undefined) updateData.graceEarlyMin = input.graceEarlyMin;
        if (input.breakMinutes !== undefined) updateData.breakMinutes = input.breakMinutes;

        await db
          .update(attendanceShifts)
          .set(updateData)
          .where(eq(attendanceShifts.id, input.id));

        AuditLogService.log({
          action: 'shift_updated',
          details: { shiftId: input.id, changes: Object.keys(updateData) },
          status: 'success',
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    }),

  listAssignments: attendanceViewerProcedure
    .input(z.object({ empCd: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions = [];
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
        .innerJoin(attendanceEmployees, eq(attendanceShiftAssignments.empCd, attendanceEmployees.empCd))
        .innerJoin(attendanceShifts, eq(attendanceShiftAssignments.shiftId, attendanceShifts.id))
        .where(conditions.length > 0 ? and(...(conditions as any)) : undefined)
        .orderBy(attendanceShiftAssignments.empCd);

      return assignments.map((a) => ({
        id: a.id,
        empCd: a.empCd,
        empName: a.empName,
        shiftId: a.shiftId,
        shiftName: a.shiftName,
        effectiveFrom: a.effectiveFrom.toISOString().split('T')[0],
        effectiveTo: a.effectiveTo ? a.effectiveTo.toISOString().split('T')[0] : null,
        weekdayMask: a.weekdayMask,
      }));
    }),

  assignShift: attendanceManagerProcedure
    .input(
      z.object({
        empCd: z.string(),
        shiftId: z.number(),
        effectiveFrom: z.string(), // YYYY-MM-DD
        effectiveTo: z.string().optional(), // YYYY-MM-DD
        weekdayMask: z.number().int().min(0).max(127).default(127),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const effectiveFrom = new Date(input.effectiveFrom);
        const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;

        // Check if already assigned (and mark previous as ended if needed)
        const existing = await db
          .select()
          .from(attendanceShiftAssignments)
          .where(
            and(
              eq(attendanceShiftAssignments.empCd, input.empCd),
              isNull(attendanceShiftAssignments.effectiveTo)
            )
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
          action: 'shift_assigned',
          details: { empCd: input.empCd, shiftId: input.shiftId, effectiveFrom: input.effectiveFrom },
          status: 'success',
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { success: false, error };
      }
    }),

  updateAssignment: attendanceManagerProcedure
    .input(
      z.object({
        id: z.number(),
        shiftId: z.number().optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().optional(),
        weekdayMask: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const updateData: any = {};
        if (input.shiftId !== undefined) updateData.shiftId = input.shiftId;
        if (input.effectiveFrom) updateData.effectiveFrom = new Date(input.effectiveFrom);
        if (input.effectiveTo) updateData.effectiveTo = new Date(input.effectiveTo);
        if (input.weekdayMask !== undefined) updateData.weekdayMask = input.weekdayMask;

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

  deleteAssignment: attendanceManagerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

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
});

export type AttendanceRouter = typeof attendanceRouter;
