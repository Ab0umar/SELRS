import { z } from 'zod';
import crypto from 'crypto';
import { getDeviceDiagnostics } from '../services/attendance/deviceDiagnostics.service';
import { FKAttendLogPuller } from '../services/attendance/fkAttendLogPuller';
import { FKDeviceSyncService, syncFromFKDevice } from '../services/attendance/fkDeviceSyncService';
import { router, attendanceViewerProcedure, attendanceManagerProcedure } from '../_core/procedures';
import { DashboardService } from '../services/attendance/dashboard.service';
import { MonthlyComputeService } from '../services/attendance/monthlyCompute.service';
import { LeaveManagementService } from '../services/attendance/leaveManagement.service';
import { PermissionAdjustmentService } from '../services/attendance/permissionAdjustment.service';
import { AuditLogService } from '../services/attendance/auditLog.service';
import { DeviceSettingsService } from '../services/attendance/deviceSettings.service';
import { runSyncOnce, resetSyncHistory } from '../services/attendance/syncEngine';
import { initializeDeviceSync, getDeviceSyncEngine } from '../services/attendance/deviceSyncEngine';
import { ZKTecoDevice } from '../services/attendance/zktecoDevice';
import { dailyMaterializer } from '../services/attendance/dailyMaterializer';
import { getDb } from '../db';
import { attendanceSyncRuns, attendancePunches, attendanceDaily, attendanceEmployees, attendanceLeaves, attendanceShifts, attendanceShiftAssignments, attendanceHolidays, attendanceLeaveBalances, attendancePermissions } from '../../drizzle/schema';
import { isNull } from 'drizzle-orm';
import { desc, eq, and, gte, lte, lt } from 'drizzle-orm';

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
      const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

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
        .leftJoin(attendanceEmployees, eq(attendanceDaily.empCd, attendanceEmployees.empCd))
        .where(and(gte(attendanceDaily.workDate, targetDate), lt(attendanceDaily.workDate, nextDate)))
        .orderBy(attendanceDaily.empCd);

      return daily.map((d) => ({
        empCd: d.empCd,
        empName: d.empName ?? null,
        workDate: d.workDate.toISOString().split('T')[0],
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

  // List all leaves across all employees, filterable by empCd and date range
  listLeaves: attendanceViewerProcedure
    .input(z.object({
      empCd: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const conditions: any[] = [];
      if (input.empCd) conditions.push(eq(attendanceLeaves.empCd, input.empCd));
      if (input.from) conditions.push(gte(attendanceLeaves.dateFrom, input.from as any));
      if (input.to) conditions.push(lte(attendanceLeaves.dateTo, input.to as any));
      const rows = await db.select({
        id: attendanceLeaves.id,
        empCd: attendanceLeaves.empCd,
        empName: attendanceEmployees.fullName,
        dateFrom: attendanceLeaves.dateFrom,
        dateTo: attendanceLeaves.dateTo,
        type: attendanceLeaves.type,
        approved: attendanceLeaves.approved,
        note: attendanceLeaves.note,
      }).from(attendanceLeaves)
        .leftJoin(attendanceEmployees, eq(attendanceLeaves.empCd, attendanceEmployees.empCd))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(attendanceLeaves.dateFrom));
      return rows.map((r) => ({
        ...r,
        dateFrom: String(r.dateFrom).split('T')[0],
        dateTo: String(r.dateTo).split('T')[0],
      }));
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

  testZKTecoConnection: attendanceManagerProcedure
    .input(
      z.object({
        ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
        port: z.number().int().min(1).max(65535).default(5005),
      })
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

  pullDeviceLogs: attendanceManagerProcedure
    .input(
      z.object({
        ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address").optional(),
        port: z.number().int().min(1).max(65535).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const config = input.ip ? { ip: input.ip, port: input.port } : undefined;
        const punches = await FKAttendLogPuller.pullLogs(config);

        AuditLogService.log({
          action: 'device_logs_pulled',
          details: {
            count: punches.length,
            ip: input.ip || '192.168.0.10',
          },
          status: 'success',
        });

        return {
          success: true,
          count: punches.length,
          sample: punches.slice(0, 3).map((p) => ({
            empNo: p.enrollNo,
            timestamp: p.timestamp.toISOString(),
            direction: p.inOutMode === 1 ? 'in' : 'out',
          })),
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        AuditLogService.log({
          action: 'device_logs_pulled',
          details: { error: errorMsg },
          status: 'error',
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    }),

  syncFromFKDevice: attendanceManagerProcedure
    .input(
      z.object({
        ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address").optional(),
        port: z.number().int().min(1).max(65535).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const deviceConfig = input.ip ? { ip: input.ip, port: input.port } : undefined;
        const result = await FKDeviceSyncService.syncNow(ctx.user.id, deviceConfig);

        AuditLogService.log({
          action: 'fk_device_sync',
          details: {
            recordsSeen: result.recordsSeen,
            recordsInserted: result.recordsInserted,
            recordsSkipped: result.recordsSkipped,
            duration: result.duration,
          },
          status: result.success ? 'success' : 'error',
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
          action: 'fk_device_sync',
          details: { error: errorMsg },
          status: 'error',
        });
        return {
          success: false,
          error: errorMsg,
        };
      }
    }),

  testFKDeviceConnection: attendanceManagerProcedure
    .input(
      z.object({
        ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address").optional(),
        port: z.number().int().min(1).max(65535).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const deviceConfig = input.ip ? { ip: input.ip, port: input.port } : undefined;
        const connected = await FKAttendLogPuller.testConnection(deviceConfig);

        if (connected) {
          return {
            success: true,
            message: 'Device connected successfully',
          };
        } else {
          return {
            success: false,
            message: 'Device connection test failed',
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
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

  // ─── Employee Edit / Delete ──────────────────────────────────────────────
  updateEmployee: attendanceManagerProcedure
    .input(z.object({
      empCd: z.string(),
      fullName: z.string().min(1),
      department: z.string().optional(),
      active: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db
        .update(attendanceEmployees)
        .set({ fullName: input.fullName, department: input.department ?? null, active: input.active })
        .where(eq(attendanceEmployees.empCd, input.empCd));
      return { success: true };
    }),

  deleteEmployee: attendanceManagerProcedure
    .input(z.object({ empCd: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.delete(attendanceEmployees).where(eq(attendanceEmployees.empCd, input.empCd));
      return { success: true };
    }),

  // ─── Bulk Shift Assignment ───────────────────────────────────────────────
  bulkAssignShift: attendanceManagerProcedure
    .input(z.object({
      empCds: z.array(z.string()).min(1),
      shiftId: z.number().int(),
      effectiveFrom: z.string(),
      effectiveTo: z.string().optional(),
      weekdayMask: z.number().int().default(62), // Sun-Thu default (0b0111110)
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      let inserted = 0;
      for (const empCd of input.empCds) {
        await db.insert(attendanceShiftAssignments).values({
          empCd,
          shiftId: input.shiftId,
          effectiveFrom: input.effectiveFrom as any,
          effectiveTo: input.effectiveTo ? input.effectiveTo as any : null,
          weekdayMask: input.weekdayMask,
        }).onDuplicateKeyUpdate({ set: { shiftId: input.shiftId, weekdayMask: input.weekdayMask, effectiveTo: input.effectiveTo ? input.effectiveTo as any : null } });
        inserted++;
      }
      return { success: true, inserted };
    }),

  // ─── Leave Balance ────────────────────────────────────────────────────────
  setLeaveBalance: attendanceManagerProcedure
    .input(z.object({
      empCd: z.string(),
      year: z.number().int(),
      annualAllocation: z.number().int().min(0),
      carryOver: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.insert(attendanceLeaveBalances).values({
        empCd: input.empCd, year: input.year,
        annualAllocation: input.annualAllocation, carryOver: input.carryOver,
      }).onDuplicateKeyUpdate({ set: { annualAllocation: input.annualAllocation, carryOver: input.carryOver } });
      return { success: true };
    }),

  allLeaveBalances: attendanceViewerProcedure
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const year = input.year ?? new Date().getFullYear();
      const balances = await db.select({
        empCd: attendanceLeaveBalances.empCd,
        empName: attendanceEmployees.fullName,
        annualAllocation: attendanceLeaveBalances.annualAllocation,
        carryOver: attendanceLeaveBalances.carryOver,
      }).from(attendanceLeaveBalances)
        .leftJoin(attendanceEmployees, eq(attendanceLeaveBalances.empCd, attendanceEmployees.empCd))
        .where(eq(attendanceLeaveBalances.year, year));

      // Count used days per employee from approved leaves
      const mm = String(year).padStart(4, '0');
      const usedRows = await db.select().from(attendanceLeaves)
        .where(and(
          eq(attendanceLeaves.approved, true),
          gte(attendanceLeaves.dateFrom, `${year}-01-01` as any),
          lte(attendanceLeaves.dateTo, `${year}-12-31` as any),
        ));

      return balances.map((b) => {
        const empLeaves = usedRows.filter((l) => l.empCd === b.empCd);
        const usedDays = empLeaves.reduce((acc, l) => {
          const from = new Date(l.dateFrom as any);
          const to = new Date(l.dateTo as any);
          const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
          return acc + days;
        }, 0);
        const total = b.annualAllocation + b.carryOver;
        return { empCd: b.empCd, empName: b.empName, annualAllocation: b.annualAllocation, carryOver: b.carryOver, total, usedDays, remainingDays: Math.max(0, total - usedDays) };
      });
    }),

  // ─── Permissions (إذن) ────────────────────────────────────────────────────
  listPermissions: attendanceViewerProcedure
    .input(z.object({ empCd: z.string().optional(), from: z.string().optional(), to: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const conditions: any[] = [];
      if (input.empCd) conditions.push(eq(attendancePermissions.empCd, input.empCd));
      if (input.from) conditions.push(gte(attendancePermissions.date, input.from as any));
      if (input.to) conditions.push(lte(attendancePermissions.date, input.to as any));
      return db.select().from(attendancePermissions)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(attendancePermissions.date));
    }),

  createPermission: attendanceManagerProcedure
    .input(z.object({
      empCd: z.string(),
      date: z.string(),
      type: z.enum(['in', 'out']),
      durationMinutes: z.number().int().min(1).max(480),
      note: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const result = await db.insert(attendancePermissions).values({
        empCd: input.empCd, date: input.date as any,
        type: input.type, durationMinutes: input.durationMinutes,
        approved: true, note: input.note ?? null,
      });
      return { success: true, id: (result as any)?.[0]?.insertId };
    }),

  deletePermission: attendanceManagerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.delete(attendancePermissions).where(eq(attendancePermissions.id, input.id));
      return { success: true };
    }),

  permissionReport: attendanceViewerProcedure
    .input(z.object({ year: z.number().int(), month: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const mm = String(input.month).padStart(2, '0');
      const lastDay = new Date(input.year, input.month, 0).getDate();
      const from = `${input.year}-${mm}-01`;
      const to = `${input.year}-${mm}-${String(lastDay).padStart(2, '0')}`;
      const perms = await db.select({
        empCd: attendancePermissions.empCd,
        empName: attendanceEmployees.fullName,
        type: attendancePermissions.type,
        durationMinutes: attendancePermissions.durationMinutes,
        date: attendancePermissions.date,
      }).from(attendancePermissions)
        .leftJoin(attendanceEmployees, eq(attendancePermissions.empCd, attendanceEmployees.empCd))
        .where(and(gte(attendancePermissions.date, from as any), lte(attendancePermissions.date, to as any), eq(attendancePermissions.approved, true)));

      const grouped = new Map<string, any>();
      for (const p of perms) {
        if (!grouped.has(p.empCd)) grouped.set(p.empCd, { empCd: p.empCd, empName: p.empName, inCount: 0, outCount: 0, totalInMins: 0, totalOutMins: 0 });
        const agg = grouped.get(p.empCd)!;
        if (p.type === 'in') { agg.inCount++; agg.totalInMins += p.durationMinutes; }
        else { agg.outCount++; agg.totalOutMins += p.durationMinutes; }
      }
      return Array.from(grouped.values()).sort((a, b) => a.empCd.localeCompare(b.empCd));
    }),

  // ─── Holidays ─────────────────────────────────────────────────────────────
  listHolidays: attendanceViewerProcedure
    .input(z.object({ year: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const year = input.year ?? new Date().getFullYear();
      return db.select().from(attendanceHolidays)
        .where(and(gte(attendanceHolidays.date, `${year}-01-01` as any), lte(attendanceHolidays.date, `${year}-12-31` as any)))
        .orderBy(attendanceHolidays.date);
    }),

  addHoliday: attendanceManagerProcedure
    .input(z.object({ date: z.string(), label: z.string(), paid: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.insert(attendanceHolidays).values({ date: input.date as any, label: input.label, paid: input.paid })
        .onDuplicateKeyUpdate({ set: { label: input.label, paid: input.paid } });
      return { success: true };
    }),

  deleteHoliday: attendanceManagerProcedure
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.delete(attendanceHolidays).where(eq(attendanceHolidays.date, input.date as any));
      return { success: true };
    }),

  // ─── Date-range report ────────────────────────────────────────────────────
  rangeReport: attendanceViewerProcedure
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const daily = await db.select({
        empCd: attendanceDaily.empCd,
        empName: attendanceEmployees.fullName,
        status: attendanceDaily.status,
        lateMinutes: attendanceDaily.lateMinutes,
        earlyLeaveMin: attendanceDaily.earlyLeaveMin,
        overtimeMinutes: attendanceDaily.overtimeMinutes,
        workedMinutes: attendanceDaily.workedMinutes,
      }).from(attendanceDaily)
        .leftJoin(attendanceEmployees, eq(attendanceDaily.empCd, attendanceEmployees.empCd))
        .where(and(gte(attendanceDaily.workDate, input.from as any), lte(attendanceDaily.workDate, input.to as any)));

      const grouped = new Map<string, any>();
      for (const d of daily) {
        if (!grouped.has(d.empCd)) grouped.set(d.empCd, {
          empCd: d.empCd, empName: d.empName,
          totalDays: 0, presentDays: 0, absentDays: 0, leaveDays: 0,
          totalLateMins: 0, totalEarlyMins: 0, totalOTMins: 0, totalWorkedMins: 0,
        });
        const a = grouped.get(d.empCd)!;
        a.totalDays++;
        if (d.status === 'present' || d.status === 'partial' || d.status === 'missing_checkout') a.presentDays++;
        else if (d.status === 'absent') a.absentDays++;
        else if (d.status === 'leave') a.leaveDays++;
        a.totalLateMins += d.lateMinutes ?? 0;
        a.totalEarlyMins += d.earlyLeaveMin ?? 0;
        a.totalOTMins += d.overtimeMinutes ?? 0;
        a.totalWorkedMins += d.workedMinutes ?? 0;
      }
      return Array.from(grouped.values()).sort((a, b) => a.empCd.localeCompare(b.empCd));
    }),
});

export type AttendanceRouter = typeof attendanceRouter;
