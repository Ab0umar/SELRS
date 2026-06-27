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
import { ZK4370SyncService } from "../services/attendance/zk4370Sync.service";
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
import { fmtDate } from "./_attendance/schedule-helpers";

export const attendanceSyncRoutes = {
  deviceSettings: makeAttProcedure("/attendance/admin/device").query(async () => {
    return {
      ef10k: DeviceSettingsService.getSettings(),
      k40: DeviceSettingsService.getK40Settings(),
    };
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
        deviceId: z.number().int().min(1).max(2).optional(),
        enabled: z.boolean().optional(),
        ip: z.string().optional(),
        port: z.number().int().min(1).max(65535).optional(),
        fallbackToAccess: z.boolean().optional(),
        realTimeSync: z.boolean().optional(),
        zk40Protocol: z.enum(["adms", "tcp"]).optional(),
        fkProtocol: z.number().int().min(0).max(1).optional(),
        commPassword: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return DeviceSettingsService.updateSettings(input);
    }),

  syncFromZK40: makeAttWriteProcedure("/attendance/admin/sync").mutation(
    async ({ ctx }) => {
      const k40 = DeviceSettingsService.getK40Settings();
      const ip = k40.ip ?? process.env.ZK4370_IP ?? "";
      const port = k40.port ?? 4370;
      if (!ip) throw new Error("ZK40 IP not configured");
      if (k40.zk40Protocol === "tcp") {
        const punches = await FKAttendLogPuller.pullLogs({ ip, port, protocol: k40.fkProtocol ?? 0, password: k40.commPassword ?? 0 });
        return { recordsSeen: punches.length, recordsInserted: punches.length, recordsSkipped: 0 };
      }
      return ZK4370SyncService.pull(ctx.user?.id, ip, port);
    },
  ),

  pushEmployeesToZK40: makeAttWriteProcedure("/attendance/admin/sync").mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { queueAdmsUserCommands } = await import("../_core/zktecoAdms");
    const employees = await db
      .select({ empCd: attendanceEmployees.empCd, fullName: attendanceEmployees.fullName })
      .from(attendanceEmployees)
      .where(eq(attendanceEmployees.active, true));
    const queued = queueAdmsUserCommands(employees as any[]);
    return { queued, message: `Queued ${queued} employees — K40 will receive them on next poll` };
  }),

  zk40SyncLogs: makeAttProcedure("/attendance/admin/sync").query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: attendanceSyncRuns.id,
        startedAt: attendanceSyncRuns.startedAt,
        finishedAt: attendanceSyncRuns.finishedAt,
        status: attendanceSyncRuns.status,
        rowsSeen: attendanceSyncRuns.rowsSeen,
        rowsInserted: attendanceSyncRuns.rowsInserted,
        rowsSkipped: attendanceSyncRuns.rowsSkipped,
        error: attendanceSyncRuns.error,
      })
      .from(attendanceSyncRuns)
      .where(eq(attendanceSyncRuns.source, "tcp"))
      .orderBy(desc(attendanceSyncRuns.startedAt))
      .limit(20);
  }),

  admsStatus: makeAttProcedure("/attendance/admin/device").query(async () => {
    const db = await getDb();
    if (!db) return { lastPunch: null, punchCount: 0, lastDeviceId: null, recentPunches: [] };
    const admsFilter = and(
      eq(attendancePunches.source, "tcp"),
      sql`${attendancePunches.deviceId} NOT LIKE 'fk_device%'`,
      sql`${attendancePunches.deviceId} NOT LIKE 'zk4370_%'`,
    );
    const [row] = await db
      .select({ lastPunch: max(attendancePunches.punchAt), total: count() })
      .from(attendancePunches)
      .where(admsFilter);
    const recent = await db
      .select({ empCd: attendancePunches.empCd, punchAt: attendancePunches.punchAt, direction: attendancePunches.direction, deviceId: attendancePunches.deviceId })
      .from(attendancePunches)
      .where(admsFilter)
      .orderBy(desc(attendancePunches.punchAt))
      .limit(10);
    return {
      lastPunch: row?.lastPunch ?? null,
      punchCount: row?.total ?? 0,
      lastDeviceId: recent[0]?.deviceId ?? null,
      recentPunches: recent,
    };
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
};
