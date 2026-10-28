import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { isIPv4 } from "node:net";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getDeviceDiagnostics } from "../services/attendance/deviceDiagnostics.service";
import { FKAttendLogPuller, FK_USE_LEGACY } from "../services/attendance/fkAttendLogPuller";
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
import {
  resetSyncHistory,
  resetFkSyncHistory,
  resetZkSyncHistory,
} from "../services/attendance/syncEngine";
import {
  initializeDeviceSync,
  getDeviceSyncEngine,
} from "../services/attendance/deviceSyncEngine";
import { ZKTecoDevice } from "../services/attendance/zktecoDevice";
import { ZK4370SyncService } from "../services/attendance/zk4370Sync.service";
import { dailyMaterializer } from "../services/attendance/dailyMaterializer";
import { getDb, getAllUsers } from "../db";

const ipv4Address = z.string().refine(isIPv4, "Invalid IPv4 address");

function attendanceOperationError(error: unknown): TRPCError {
  if (error instanceof TRPCError) return error;
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}
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
import { fmtDate } from "./_attendance/schedule-helpers";

// Device status pages poll every 15-30s; the aggregates scan the punches table,
// so share one result for a few seconds instead of recomputing per request.
const statusCache = new Map<string, { at: number; value: unknown }>();
async function cachedStatus<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = statusCache.get(key);
  if (hit && Date.now() - hit.at < 15_000) return hit.value as T;
  const value = await load();
  statusCache.set(key, { at: Date.now(), value });
  return value;
}

export const attendanceSyncRoutes = {
  deviceSettings: makeAttProcedure(["/attendance/admin/device", "/attendance/settings"]).query(
    async () => {
      return {
        ef10k: DeviceSettingsService.getSettings(),
        k40: DeviceSettingsService.getK40Settings(),
      };
    },
  ),

  deviceStatus: makeAttProcedure(["/attendance/admin/device", "/attendance/live", "/attendance/settings", "/attendance/admin/console"]).query(async () => {
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

    const [row] = await cachedStatus("device", async () =>
      db
        .select({ lastPunch: max(attendancePunches.punchAt), total: count() })
        .from(attendancePunches)
        .where(sql`${attendancePunches.deviceId} LIKE 'fk%'`),
    );

    const settings = DeviceSettingsService.getSettings();
    const connected = DeviceSettingsService.isDeviceOnline();
    return {
      connected,
      lastConnected: DeviceSettingsService.getFKLastConnected(),
      uptime: 0,
      connectionError: null,
      lastPunch: row?.lastPunch ?? null,
      punchCount: row?.total ?? 0,
      ip: settings.ip,
      port: settings.port,
    };
  }),

  updateDeviceSettings: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/settings"])
    .input(
      z.object({
        deviceId: z.number().int().min(1).max(2).optional(),
        enabled: z.boolean().optional(),
        ip: ipv4Address.optional(),
        port: z.number().int().min(1).max(65535).optional(),
        fallbackToAccess: z.boolean().optional(),
        realTimeSync: z.boolean().optional(),
        zk40Protocol: z.enum(["adms", "tcp"]).optional(),
        fkProtocol: z.number().int().min(0).max(1).optional(),
        commPassword: z.number().int().min(0).optional(),
        admsEnabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return DeviceSettingsService.updateSettings(input);
    }),

  syncFromZK40: makeAttWriteProcedure(["/attendance/admin/sync", "/attendance/admin/device", "/attendance/settings"]).mutation(
    async ({ ctx }) => {
      const k40 = DeviceSettingsService.getK40Settings();
      if (k40.zk40Protocol !== "tcp") {
        throw new Error("ZK40 is configured for ADMS, not TCP sync");
      }
      const ip = process.env.ZK4370_IP || k40.ip || "";
      const port =
        parseInt(process.env.ZK4370_PORT ?? "", 10) || k40.port || 4370;
      if (!ip) throw new Error("ZK40 IP not configured");
      return ZK4370SyncService.pull(
        ctx.user?.id,
        ip,
        port,
        k40.commPassword ?? 0,
      );
    },
  ),

  pushEmployeesToZK40: makeAttWriteProcedure(["/attendance/admin/sync", "/attendance/admin/device", "/attendance/settings"]).mutation(
    async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const k40 = DeviceSettingsService.getK40Settings();
      if (k40.zk40Protocol === "tcp") {
        const pushed = await ZK4370SyncService.push(
          k40.ip,
          k40.port,
          k40.commPassword ?? 0,
        );
        if (!pushed.success) throw new Error(pushed.errors.join("; "));
        return {
          queued: pushed.pushed,
          message: `تم إرسال ${pushed.pushed} موظف عبر TCP`,
        };
      }
      const { queueAdmsUserCommands } = await import("../_core/zktecoAdms");
      const employees = await db
        .select({
          empCd: attendanceEmployees.empCd,
          fullName: attendanceEmployees.fullName,
        })
        .from(attendanceEmployees)
        .where(eq(attendanceEmployees.active, true));
      const queued = queueAdmsUserCommands(employees as any[]);
      return {
        queued,
        message: `Queued ${queued} employees — K40 will receive them on next poll`,
      };
    },
  ),

  zk40SyncLogs: makeAttProcedure(["/attendance/admin/sync", "/attendance/settings"]).query(async () => {
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
      .where(
        and(
          eq(attendanceSyncRuns.source, "tcp"),
          sql`LOWER(${attendanceSyncRuns.deviceId}) LIKE 'zk%'`,
        ),
      )
      .orderBy(desc(attendanceSyncRuns.startedAt))
      .limit(20);
  }),

  admsStatus: makeAttProcedure(["/attendance/admin/device", "/attendance/live", "/attendance/settings"]).query(async () => {
    const db = await getDb();
    if (!db)
      return {
        lastPunch: null,
        punchCount: 0,
        lastDeviceId: null,
        recentPunches: [],
      };
    const admsFilter = and(
      eq(attendancePunches.source, "tcp"),
      sql`${attendancePunches.deviceId} NOT LIKE 'fk%'`,
    );
    const { getAdmsLastContact } = await import("../_core/zktecoAdms");
    const lastContact = getAdmsLastContact();
    const base = await cachedStatus("adms", async () => {
      const [row] = await db
        .select({ lastPunch: max(attendancePunches.punchAt), total: count() })
        .from(attendancePunches)
        .where(admsFilter);
      const recent = await db
        .select({
          empCd: attendancePunches.empCd,
          punchAt: attendancePunches.punchAt,
          direction: attendancePunches.direction,
          deviceId: attendancePunches.deviceId,
        })
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
    });
    return { ...base, lastContact };
  }),

  // Mirrors admsStatus but scoped to FK devices (deviceId prefixed "fk_"),
  // so the live board can show FK and ZK/ADMS as two independent channels
  // instead of one card that silently only ever reflected FK's numbers.
  fkStatus: makeAttProcedure(["/attendance/admin/device", "/attendance/live"]).query(async () => {
    const db = await getDb();
    if (!db)
      return {
        lastPunch: null,
        punchCount: 0,
        lastDeviceId: null,
        recentPunches: [],
      };
    const fkFilter = and(
      eq(attendancePunches.source, "tcp"),
      sql`${attendancePunches.deviceId} LIKE 'fk\\_%'`,
    );
    return cachedStatus("fk", async () => {
      const [row] = await db
        .select({ lastPunch: max(attendancePunches.punchAt), total: count() })
        .from(attendancePunches)
        .where(fkFilter);
      const recent = await db
        .select({
          empCd: attendancePunches.empCd,
          punchAt: attendancePunches.punchAt,
          direction: attendancePunches.direction,
          deviceId: attendancePunches.deviceId,
        })
        .from(attendancePunches)
        .where(fkFilter)
        .orderBy(desc(attendancePunches.punchAt))
        .limit(10);
      return {
        lastPunch: row?.lastPunch ?? null,
        punchCount: row?.total ?? 0,
        lastDeviceId: recent[0]?.deviceId ?? null,
        recentPunches: recent,
      };
    });
  }),

  connectDevice: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/settings"]).mutation(
    async () => {
      const connected = await DeviceSettingsService.connectDevice();
      if (!connected)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تعذر الاتصال بجهاز FK",
        });
      await AuditLogService.log({
        action: "device_connected",
        details: { success: connected },
        status: connected ? "success" : "error",
      });
      return { success: connected };
    },
  ),

  disconnectDevice: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/settings"]).mutation(
    async () => {
      DeviceSettingsService.disconnectDevice();
      await AuditLogService.log({
        action: "device_disconnected",
        details: {},
        status: "success",
      });
      return { success: true };
    },
  ),

  resetDeviceConnection: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/settings"]).mutation(async () => {
    DeviceSettingsService.resetDeviceConnection();
    await AuditLogService.log({
      action: "device_reset",
      details: {},
      status: "success",
    });
    return { success: true };
  }),

  // K40/ZK is pull-based (no persistent session) — "connect" is a live reachability
  // test via the TCP client, mirroring EF10K's connect/disconnect/reset trio.
  zk40Status: makeAttProcedure("/attendance/admin/device").query(async () => {
    return DeviceSettingsService.getK40ConnectionStatus();
  }),

  connectZK40Device: makeAttWriteProcedure("/attendance/admin/device").mutation(
    async () => {
      const k40 = DeviceSettingsService.getK40Settings();
      if (!k40.ip) {
        await AuditLogService.log({
          action: "zk40_connected",
          details: { error: "no IP configured" },
          status: "error",
        });
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "K40 IP not configured",
        });
      }
      const { ZKDevicePuller } =
        await import("../services/attendance/zkDevicePuller");
      const info = await ZKDevicePuller.getDeviceInfo(
        k40.ip,
        k40.port,
        k40.commPassword,
      );
      DeviceSettingsService.reportK40Connection(info.ok, info.error ?? null);
      if (info.ok)
        await DeviceSettingsService.updateSettings({
          deviceId: 2,
          enabled: true,
        });
      await AuditLogService.log({
        action: "zk40_connected",
        details: { success: info.ok, ip: k40.ip, port: k40.port },
        status: info.ok ? "success" : "error",
      });
      if (!info.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: info.error ?? "K40 device is unreachable",
        });
      }
      return { success: true };
    },
  ),

  disconnectZK40Device: makeAttWriteProcedure(
    "/attendance/admin/device",
  ).mutation(async () => {
    await DeviceSettingsService.updateSettings({ deviceId: 2, enabled: false });
    DeviceSettingsService.reportK40Connection(false);
    await AuditLogService.log({
      action: "zk40_disconnected",
      details: {},
      status: "success",
    });
    return { success: true };
  }),

  sendDeviceCommand: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/admin/console"])
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
        if (!success) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Device not connected",
          });
        }
        return { success: true };
      } catch (err) {
        throw attendanceOperationError(err);
      }
    }),

  batchAddPunches: makeAttWriteProcedure("/attendance/admin/device")
    .input(
      z.object({
        punches: z
          .array(
            z.object({
              empCd: z.string().trim().min(1).max(32),
              punchAt: z.string().datetime({ offset: true }), // ISO timestamp
              direction: z.enum(["in", "out", "unknown"]),
              note: z.string().max(255).optional(),
            }),
          )
          .min(1)
          .max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employeeCodes = Array.from(
        new Set(input.punches.map((p) => p.empCd)),
      );
      if (
        input.punches.some((punch) =>
          Number.isNaN(new Date(punch.punchAt).getTime()),
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "توقيت بصمة غير صالح",
        });
      }
      const knownEmployees = await db
        .select({ empCd: attendanceEmployees.empCd })
        .from(attendanceEmployees)
        .where(inArray(attendanceEmployees.empCd, employeeCodes));
      const knownCodes = new Set(
        knownEmployees.map((employee: any) => employee.empCd),
      );

      const results: Array<{
        empCd: string;
        status: "inserted" | "skipped" | "failed";
        error?: string;
      }> = [];

      for (const punch of input.punches) {
        if (!knownCodes.has(punch.empCd)) {
          results.push({
            empCd: punch.empCd,
            status: "skipped",
            error: "Unknown employee",
          });
          continue;
        }
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
              status: "skipped",
              error: "Duplicate punch",
            });
            continue;
          }

          await db.insert(attendancePunches).values({
            empCd: punch.empCd,
            punchAt: punchAt,
            direction: punch.direction,
            source: "manual",
            sourceRowId: `manual_${punch.empCd}_${punchAt.getTime()}`,
            sourceHash: hash,
            note: punch.note,
            insertedBy: ctx.user.id,
          });

          results.push({ empCd: punch.empCd, status: "inserted" });
        } catch (err) {
          results.push({
            empCd: punch.empCd,
            status: "failed",
            error: (err as Error).message,
          });
        }
      }

      const successfulPunches = input.punches.filter(
        (_punch, index) => results[index]?.status === "inserted",
      );
      const affectedDays = new Map<string, { empCd: string; date: Date }>();
      for (const punch of successfulPunches) {
        const date = new Date(punch.punchAt);
        date.setHours(12, 0, 0, 0);
        affectedDays.set(`${punch.empCd}|${fmtDate(date)}`, {
          empCd: punch.empCd,
          date,
        });
      }
      for (const { empCd, date } of affectedDays.values()) {
        await dailyMaterializer.recomputeRange(date, date, { empCd });
      }
      const employeeMonths = new Set<string>();
      for (const punch of successfulPunches) {
        const dateKey = fmtDate(new Date(punch.punchAt));
        employeeMonths.add(`${punch.empCd}|${dateKey.slice(0, 7)}`);
      }
      for (const employeeMonth of employeeMonths) {
        const [empCd, monthKey] = employeeMonth.split("|");
        const [year, month] = monthKey.split("-").map(Number);
        await MonthlyComputeService.saveEmployeeMonth(empCd, year, month);
      }

      // Report failures only after the rows that did insert are recomputed.
      const failedPunches = results.filter(
        (result) => result.status === "failed",
      );
      if (failedPunches.length) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to insert ${failedPunches.length} punch(es)`,
          cause: failedPunches,
        });
      }

      await AuditLogService.log({
        action: "batch_manual_punches_added",
        details: {
          requested: input.punches.length,
          successful: results.filter((result) => result.status === "inserted")
            .length,
          empCds: employeeCodes,
        },
        userId: ctx.user.id,
        status: "success",
      });

      return {
        total: input.punches.length,
        successful: results.filter((result) => result.status === "inserted")
          .length,
        results,
      };
    }),

  runDeviceDiagnostics: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/admin/console"])
    .input(
      z.object({
        ip: ipv4Address,
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
        ip: ipv4Address,
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
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Device did not respond to verification command",
          });
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
        throw attendanceOperationError(error);
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
        const settings = DeviceSettingsService.getSettings();
        const config = {
          ip: input.ip || settings.ip || undefined,
          port: input.port || settings.port || undefined,
          protocol: settings.fkProtocol ?? 0,
          password: settings.commPassword ?? 0,
        };
        const punches = await FKAttendLogPuller.pullLogs(config);

        await AuditLogService.log({
          action: "device_logs_pulled",
          details: {
            count: punches.length,
            ip: config.ip,
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
        await AuditLogService.log({
          action: "device_logs_pulled",
          details: { error: errorMsg },
          status: "error",
        });
        throw attendanceOperationError(errorMsg);
      }
    }),

  exportDevicePunches: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/admin/sync"])
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
      const config = {
        ip: input.ip || settings.ip || undefined,
        port: input.port || settings.port || undefined,
        protocol: settings.fkProtocol ?? 0,
        password: settings.commPassword ?? 0,
      };
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

  syncEmployeesFromDevice: makeAttWriteProcedure(["/attendance/admin/device", "/attendance/admin/sync"])
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
      const ip = input.ip || settings.ip;
      if (!ip) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "عنوان جهاز البصمة غير مضبوط (ATTENDANCE_DEVICE_IP)",
        });
      }
      const port = input.port || settings.port || 5005;
      const validatedIp = ipv4Address.parse(ip);

      const tempFile = path.join(os.tmpdir(), `fk_users_${Date.now()}.csv`);
      try {
        let employees: { empNo: string; name: string }[];
        if (!FK_USE_LEGACY) {
          const ids = await FKAttendLogPuller.pullUserIds({
            ip: validatedIp,
            port,
            password: settings.commPassword ?? 0,
          });
          // The device stores ids only; names stay as already entered in the app.
          employees = [...new Set(ids)].map((id) => ({ empNo: String(id), name: "" }));
        } else {
        const pullerPath =
          process.env.FK_USER_PULLER_PATH ??
          path.join(process.cwd(), "scripts", "FKUserPuller.exe");
        const { stdout: output } = await execFileAsync(
          pullerPath,
          ["--ip", validatedIp, "--port", String(port), "--out", tempFile],
          { encoding: "utf-8", timeout: 30000 },
        );
        console.log("[FKUserPuller]", output);

        if (!fs.existsSync(tempFile))
          throw new Error("لم يُنتج الملف — فحص اتصال الجهاز");

        const lines = fs
          .readFileSync(tempFile, "utf-8")
          .trim()
          .split("\n")
          .slice(1);
        employees = [];
        for (const line of lines) {
          const parts = line.trim().split(",");
          if (!parts[0]?.trim()) continue;
          const empNo = parts[0].trim();
          const name = (parts[1] ?? "").trim(); // keep empty if device has no name
          employees.push({ empNo, name });
        }
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

        await AuditLogService.log({
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
        await AuditLogService.log({
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

        await AuditLogService.log({
          action: "fk_device_sync",
          details: {
            recordsSeen: result.recordsSeen,
            recordsInserted: result.recordsInserted,
            recordsSkipped: result.recordsSkipped,
            duration: result.duration,
          },
          status: result.success ? "success" : "error",
        });

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error ?? "FK device synchronization failed",
          });
        }

        return {
          success: true,
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
        await AuditLogService.log({
          action: "fk_device_sync",
          details: { error: errorMsg },
          status: "error",
        });
        throw attendanceOperationError(errorMsg);
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
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Device connection test failed",
          });
        }
      } catch (error) {
        throw attendanceOperationError(error);
      }
    }),

  syncNow: makeAttWriteProcedure("/attendance/admin/sync")
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        // FK device (EF10K) — TCP pull
        const result = await FKDeviceSyncService.syncNow(ctx.user.id);

        // ZK device (K40) — TCP pull if enabled and IP set
        const k40 = DeviceSettingsService.getK40Settings();
        const zkIp = process.env.ZK4370_IP || k40.ip || "";
        let zkError: string | null = null;
        if (k40.enabled && k40.zk40Protocol === "tcp" && zkIp) {
          const zkResult = await ZK4370SyncService.pull(
            ctx.user?.id,
            zkIp,
            parseInt(process.env.ZK4370_PORT ?? "", 10) || k40.port || 4370,
            k40.commPassword ?? 0,
          );
          if (!zkResult.success) zkError = zkResult.error ?? "ZK pull failed";
        }

        // Always recompute today so dashboard stat cards reflect current state
        // even when no new punches were inserted (e.g. first run or duplicates)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await dailyMaterializer.recomputeRange(today, today);

        await AuditLogService.log({
          action: "manual_sync_triggered",
          details: {
            inserted: result.recordsInserted,
            seen: result.recordsSeen,
          },
          status: result.success ? "success" : "error",
        });
        if (!result.success || zkError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: !result.success
              ? (result.error ?? "Attendance synchronization failed")
              : `K40: ${zkError}`,
          });
        }
        return {
          success: true,
          error: result.error,
          rowsInserted: result.recordsInserted,
          rowsSeen: result.recordsSeen,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await AuditLogService.log({
          action: "manual_sync_triggered",
          details: { error },
          status: "error",
        });
        throw attendanceOperationError(error);
      }
    }),

  resetSyncHistory: makeAttWriteProcedure("/attendance/admin/sync")
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        await resetSyncHistory();
        await AuditLogService.log({
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
        await AuditLogService.log({
          action: "sync_history_reset",
          details: { error },
          status: "error",
        });
        throw attendanceOperationError(err);
      }
    }),

  resetFkSyncHistory: makeAttWriteProcedure(["/attendance/admin/sync", "/attendance/admin/device", "/attendance/settings"])
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        await resetFkSyncHistory();
        await AuditLogService.log({
          action: "fk_sync_history_reset",
          details: { triggeredBy: ctx.user.id },
          status: "success",
        });
        return {
          success: true,
          message:
            "FK sync reset to 2026-01-01. The next sync imports records from 2026 onward only.",
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await AuditLogService.log({
          action: "fk_sync_history_reset",
          details: { error },
          status: "error",
        });
        throw attendanceOperationError(err);
      }
    }),

  resetZkSyncHistory: makeAttWriteProcedure(["/attendance/admin/sync", "/attendance/admin/device", "/attendance/settings"])
    .input(z.object({}).optional())
    .mutation(async ({ ctx }) => {
      try {
        await resetZkSyncHistory();
        await AuditLogService.log({
          action: "zk_sync_history_reset",
          details: { triggeredBy: ctx.user.id },
          status: "success",
        });
        return {
          success: true,
          message:
            "ZK sync reset to 2026-01-01. The next sync imports records from 2026 onward only.",
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await AuditLogService.log({
          action: "zk_sync_history_reset",
          details: { error },
          status: "error",
        });
        throw attendanceOperationError(err);
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
        await AuditLogService.log({
          action: "device_sync_triggered",
          details: {
            recordsImported: result.recordsImported,
            recordsSkipped: result.recordsSkipped,
          },
          status: result.status === "completed" ? "success" : "error",
        });

        if (result.status !== "completed") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error ?? "Device synchronization failed",
          });
        }

        return {
          success: true,
          status: result.status,
          recordsImported: result.recordsImported,
          recordsSkipped: result.recordsSkipped,
          error: result.error,
          completedAt: result.completedAt?.toISOString(),
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        await AuditLogService.log({
          action: "device_sync_triggered",
          details: { error },
          status: "error",
        });
        throw attendanceOperationError(err);
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

        await AuditLogService.log({
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
        await AuditLogService.log({
          action: "device_sync_initialized",
          details: { deviceIp: input.deviceIp, error },
          status: "error",
        });
        throw attendanceOperationError(err);
      }
    }),

  materializeDaily: makeAttWriteProcedure("/attendance")
    .input(
      z
        .object({
          fromDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(), // YYYY-MM-DD, defaults to 30 days ago
          toDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(), // YYYY-MM-DD, defaults to today
        })
        .refine(
          ({ fromDate, toDate }) => {
            if (!fromDate || !toDate) return true;
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
    .mutation(async ({ ctx, input }) => {
      try {
        const toDate = input.toDate ? new Date(input.toDate) : new Date();
        const fromDate = input.fromDate
          ? new Date(input.fromDate)
          : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (toDate < fromDate)
          throw new Error("تاريخ النهاية يجب ألا يسبق البداية");
        if (
          toDate.getTime() - fromDate.getTime() >=
          366 * 24 * 60 * 60 * 1000
        ) {
          throw new Error("الفترة لا يمكن أن تتجاوز 366 يومًا");
        }

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

        await AuditLogService.log({
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
        await AuditLogService.log({
          action: "materialize_daily_triggered",
          details: { error },
          status: "error",
        });
        throw attendanceOperationError(err);
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

        await AuditLogService.log({
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
        await AuditLogService.log({
          action: "generate_monthly_reports",
          details: { year: input.year, month: input.month, error },
          status: "error",
        });
        throw attendanceOperationError(err);
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
};
