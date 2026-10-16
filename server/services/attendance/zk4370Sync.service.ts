/**
 * ZK4370 Sync Service
 * Pull attendance logs from ZKTeco K40 Pro via zkemkeeper.dll COM (32-bit PS1 wrapper).
 */

import crypto from "crypto";
import { ZKDevicePuller as ZK4370LogPuller } from "./zkDevicePuller";
import { ZK4370Client } from "./zk4370Client";
import { DailyMaterializer } from "./dailyMaterializer";
import { getDb } from "../../db";
import {
  attendancePunches,
  attendanceSyncRuns,
  attendanceEmployees,
} from "../../../drizzle/schema";
import { desc, inArray, sql, and, eq } from "drizzle-orm";
import { shouldPersistSyncRun } from "./syncRunPolicy";
import { DeviceSettingsService } from "./deviceSettings.service";
import { getDeviceEndpoint, requireDeviceEndpoint } from "./deviceEndpoint";


const BATCH_SIZE = 500;

export interface ZK4370SyncResult {
  checkpointAdvanced?: boolean;
  success: boolean;
  recordsSeen: number;
  recordsInserted: number;
  recordsSkipped: number;
  maxPunchAt: Date | null;
  error?: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}

export interface ZK4370PushResult {
  success: boolean;
  pushed: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

// Pull

export class ZK4370SyncService {
  static async pull(
    userId?: number,
    ip?: string,
    port?: number,
    commKey = 0,
  ): Promise<ZK4370SyncResult> {
    const { ip: deviceIp, port: devicePort } = requireDeviceEndpoint("zk");
    const startedAt = new Date();
    const result: ZK4370SyncResult = {
      success: false,
      recordsSeen: 0,
      recordsInserted: 0,
      recordsSkipped: 0,
      maxPunchAt: null,
      startedAt,
      completedAt: new Date(),
      durationMs: 0,
    };

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const deviceId = `zk_${deviceIp}`;
      const lastRun = await db
        .select({ hwm: attendanceSyncRuns.highWaterMark })
        .from(attendanceSyncRuns)
        .where(
          and(
            inArray(attendanceSyncRuns.status, ["ok", "partial"] as any),
            eq(attendanceSyncRuns.deviceId as any, deviceId),
          ),
        )
        .orderBy(desc(attendanceSyncRuns.startedAt))
        .limit(1);
      const lastHwm: Date | null = lastRun[0]?.hwm ?? null;
      console.log(`[ZK4370] Last HWM: ${lastHwm?.toISOString() ?? "none"}`);

      const zkPunches = await ZK4370LogPuller.pullLogs(
        deviceIp,
        devicePort,
        commKey,
      );
      DeviceSettingsService.reportK40Connection(true);
      // Normalise to the shape the rest of pull() expects
      const allPunches = zkPunches.map((r) => ({
        enrollNo: r.enrollNo,
        inOutMode: r.inOutMode,
        verifyMode: r.verifyMode,
        timestamp: r.timestamp,
      }));

      const syncStart = lastHwm ?? new Date(2026, 0, 1);
      // Re-read a short boundary window so same-timestamp punches are not
      // skipped by a strict high-water mark; the unique key discards repeats.
      const inclusiveStart = lastHwm
        ? new Date(lastHwm.getTime() - 60_000)
        : syncStart;
      const newPunches = allPunches.filter(
        (r) => r.timestamp >= inclusiveStart,
      );

      const eligiblePunches = newPunches.filter(
        (punch) => punch.timestamp >= syncStart,
      );
      result.recordsSeen = eligiblePunches.length;
      console.log(
        `[ZK4370] Device: ${allPunches.length} total, ${newPunches.length} new`,
      );

      if (eligiblePunches.length === 0) {
        result.success = true;
        result.completedAt = new Date();
        result.durationMs = result.completedAt.getTime() - startedAt.getTime();
        result.maxPunchAt = lastHwm; // carry forward — do NOT advance HWM to now
        await recordSyncRun(db, result, userId, deviceId);
        return result;
      }

      let totalInserted = 0;

      const importedDates = new Set<string>();
      for (let i = 0; i < eligiblePunches.length; i += BATCH_SIZE) {
        const batch = eligiblePunches.slice(i, i + BATCH_SIZE);
        const rows = batch.map((r) => ({
          empCd: r.enrollNo,
          punchAt: r.timestamp,
          direction: (r.inOutMode === 1
            ? "in"
            : r.inOutMode === 0
              ? "out"
              : "unknown") as "in" | "out" | "unknown",
          deviceId: deviceId,
          source: "tcp" as const,
          sourceRowId: `${r.enrollNo}_${r.timestamp.getTime()}`,
          sourceHash: zkSourceHash(
            `${r.enrollNo}|${r.timestamp.toISOString()}|${r.inOutMode}`,
          ),
          importedAt: new Date(),
        }));

        const inserted = await db
          .insert(attendancePunches)
          .ignore()
          .values(rows);

        totalInserted += (inserted as any)[0]?.affectedRows ?? rows.length;

        for (const r of batch) {
          const d = r.timestamp;
          if (d >= syncStart) {
            importedDates.add(
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
            );
          }
        }
      }

      result.recordsInserted = totalInserted;
      result.recordsSkipped = eligiblePunches.length - totalInserted;
      result.maxPunchAt =
        eligiblePunches.reduce<Date | null>(
          (mx, r) => (!mx || r.timestamp > mx ? r.timestamp : mx),
          null,
        ) ?? lastHwm;

      result.checkpointAdvanced =
        !!result.maxPunchAt && (!lastHwm || result.maxPunchAt > lastHwm);
      const empCds = [...new Set(eligiblePunches.map((r) => r.enrollNo))];
      if (empCds.length > 0) {
        const now = new Date();
        await db
          .insert(attendanceEmployees)
          .values(
            empCds.map((empCd) => ({
              empCd,
              fullName: empCd,
              active: true,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onDuplicateKeyUpdate({ set: { updatedAt: now } });
      }

      // Seen-since-HWM dates, not just inserted ones: a failed recompute leaves
      // the HWM behind, so the retry must rebuild those days even with 0 inserts.
      const needsHistoricalRecompute =
        result.recordsInserted > 0 ||
        eligiblePunches.some((punch) => !lastHwm || punch.timestamp > lastHwm);
      if (importedDates.size > 0 && needsHistoricalRecompute) {
        const sorted = Array.from(importedDates).sort();
        const [fy, fm, fd] = sorted[0].split("-").map(Number);
        const [ty, tm, td] = sorted[sorted.length - 1].split("-").map(Number);
        await DailyMaterializer.recomputeRange(
          new Date(fy, fm - 1, fd),
          new Date(ty, tm - 1, td),
          lastHwm ? { empCds } : undefined,
          undefined,
          { recomputeMonthly: true },
        );
      }

      result.success = true;
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();
      console.log(
        `[ZK4370] Pull done: ${result.recordsInserted} inserted, ${result.recordsSkipped} skipped`,
      );

      await recordSyncRun(db, result, userId, deviceId);
      return result;
    } catch (error) {
      DeviceSettingsService.reportK40Connection(
        false,
        error instanceof Error ? error.message : String(error),
      );
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();
      console.error(`[ZK4370] Pull failed: ${result.error}`);
      try {
        const db = await getDb();
        if (db)
          await recordSyncRun(db, result, userId, `zk_${deviceIp}`);
      } catch {
        /* ignore */
      }
      return result;
    }
  }

  // Push

  static async push(
    ip?: string,
    port?: number,
    commKey = 0,
  ): Promise<ZK4370PushResult> {
    const { ip: deviceIp, port: devicePort } = requireDeviceEndpoint("zk");
    const start = Date.now();
    const result: ZK4370PushResult = {
      success: false,
      pushed: 0,
      failed: 0,
      errors: [],
      durationMs: 0,
    };

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employees = await db
        .select({
          empCd: attendanceEmployees.empCd,
          fullName: attendanceEmployees.fullName,
        })
        .from(attendanceEmployees)
        .where(sql`active = 1`);

      const client = new ZK4370Client(deviceIp, devicePort, 10000, commKey);
      await client.connect();
      try {
        for (const e of employees as any[]) {
          const uid = empCdToUid(e.empCd);
          try {
            await client.setUser(uid, e.empCd, e.fullName ?? e.empCd);
            result.pushed++;
          } catch (err) {
            result.failed++;
            result.errors.push(
              `${e.empCd}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      } finally {
        await client.disconnect();
      }

      result.success = result.failed === 0;
      result.durationMs = Date.now() - start;
      console.log(
        `[ZK4370] Push done: ${result.pushed} pushed, ${result.failed} failed`,
      );
      return result;
    } catch (error) {
      result.errors.push(
        error instanceof Error ? error.message : String(error),
      );
      result.durationMs = Date.now() - start;
      return result;
    }
  }

  // Status

  static async testConnection(
    ip?: string,
    port?: number,
    commKey = 0,
  ): Promise<{ ok: boolean; userCount?: number; error?: string }> {
    const { ip: deviceIp, port: devicePort } = requireDeviceEndpoint("zk");
    try {
      const users = await ZK4370LogPuller.pullUsers(
        deviceIp,
        devicePort,
        commKey,
      );
      return { ok: true, userCount: users.length };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  static getDeviceInfo(ip?: string, port?: number) {
    const { ip: deviceIp, port: devicePort } = getDeviceEndpoint("zk");
    return { ip: deviceIp, port: devicePort, deviceId: `zk_${deviceIp}` };
  }
}

// Helpers

export function zkSourceHash(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function empCdToUid(empCd: string): number {
  const n = parseInt(empCd, 10);
  if (!isNaN(n) && n >= 1 && n <= 65535) return n;
  const hash = parseInt(zkSourceHash(empCd).slice(-4), 16);
  return (hash % 65534) + 1;
}

async function recordSyncRun(
  db: any,
  result: ZK4370SyncResult,
  userId?: number,
  deviceId?: string,
): Promise<void> {
  if (!shouldPersistSyncRun(result)) return;
  try {
    await db.insert(attendanceSyncRuns).values({
      startedAt: result.startedAt,
      finishedAt: result.completedAt,
      source: "tcp",
      trigger: userId ? "manual" : "cron",
      triggeredBy: userId,
      rowsSeen: result.recordsSeen,
      rowsInserted: result.recordsInserted,
      rowsSkipped: result.recordsSkipped,
      rowsQuarantined: 0,
      status: result.success ? "ok" : "failed",
      error: result.error,
      highWaterMark: result.maxPunchAt ?? result.completedAt,
      deviceId,
    } as any);
  } catch (err) {
    console.error(`[ZK4370] Failed to record sync run: ${err}`);
  }
}
