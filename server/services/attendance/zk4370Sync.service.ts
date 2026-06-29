/**
 * ZK4370 Sync Service
 * Pull attendance logs from ZKTeco K40 Pro via zkemkeeper.dll COM (32-bit PS1 wrapper).
 */

import crypto from "crypto";
import { ZK4370LogPuller } from "./zk4370LogPuller";
import { ZK4370Client } from "./zk4370Client";
import { DailyMaterializer } from "./dailyMaterializer";
import { getDb } from "../../db";
import {
  attendancePunches,
  attendanceSyncRuns,
  attendanceEmployees,
} from "../../../drizzle/schema";
import { desc, inArray, sql, and, eq } from "drizzle-orm";

const DEVICE_IP   = process.env.ZK4370_IP   ?? "192.168.1.170";
const DEVICE_PORT = parseInt(process.env.ZK4370_PORT ?? "4370", 10);
const DEVICE_ID   = `zk4370_${DEVICE_IP}`;

const BATCH_SIZE = 500;

export interface ZK4370SyncResult {
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

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

export class ZK4370SyncService {
  static async pull(userId?: number, ip?: string, port?: number, commKey = 0): Promise<ZK4370SyncResult> {
    const deviceIp = ip ?? DEVICE_IP;
    const devicePort = port ?? DEVICE_PORT;
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
        .where(and(
          inArray(attendanceSyncRuns.status, ["ok", "partial"] as any),
          eq(attendanceSyncRuns.deviceId as any, deviceId),
        ))
        .orderBy(desc(attendanceSyncRuns.startedAt))
        .limit(1);
      const lastHwm: Date | null = lastRun[0]?.hwm ?? null;
      console.log(`[ZK4370] Last HWM: ${lastHwm?.toISOString() ?? "none"}`);

      const zkPunches = await ZK4370LogPuller.pullLogs(deviceIp, devicePort, commKey);
      // Normalise to the shape the rest of pull() expects
      const allPunches = zkPunches.map((r) => ({
        enrollNo: r.enrollNo,
        inOutMode: r.inOutMode,
        verifyMode: r.verifyMode,
        timestamp: r.timestamp,
      }));

      const newPunches = lastHwm
        ? allPunches.filter((r) => r.timestamp > lastHwm)
        : allPunches;

      result.recordsSeen = newPunches.length;
      console.log(`[ZK4370] Device: ${allPunches.length} total, ${newPunches.length} new`);

      if (newPunches.length === 0) {
        result.success = true;
        result.completedAt = new Date();
        result.durationMs = result.completedAt.getTime() - startedAt.getTime();
        result.maxPunchAt = lastHwm; // carry forward — do NOT advance HWM to now
        await recordSyncRun(db, result, userId, deviceId);
        return result;
      }

      const affected = new Set<string>();
      let totalInserted = 0;

      for (let i = 0; i < newPunches.length; i += BATCH_SIZE) {
        const batch = newPunches.slice(i, i + BATCH_SIZE);
        const rows = batch.map((r) => ({
          empCd:       r.enrollNo,
          punchAt:     r.timestamp,
          direction:   (r.inOutMode === 1 ? "in" : r.inOutMode === 0 ? "out" : "unknown") as "in" | "out" | "unknown",
          deviceId:    `zk4370_${deviceIp}`,
          source:      "tcp" as const,
          sourceRowId: `${r.enrollNo}_${r.timestamp.getTime()}`,
          sourceHash:  sha1(`${r.enrollNo}|${r.timestamp.toISOString()}|${r.inOutMode}`),
          importedAt:  new Date(),
        }));

        const inserted = await db
          .insert(attendancePunches)
          .values(rows)
          .onDuplicateKeyUpdate({ set: { importedAt: sql`importedAt` } });

        totalInserted += (inserted as any)[0]?.affectedRows ?? rows.length;

        for (const r of batch) {
          const d = r.timestamp;
          affected.add(
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          );
        }
      }

      result.recordsInserted = totalInserted;
      result.recordsSkipped  = newPunches.length - totalInserted;
      result.maxPunchAt = newPunches.reduce<Date | null>(
        (mx, r) => (!mx || r.timestamp > mx ? r.timestamp : mx),
        null,
      );

      const empCds = [...new Set(newPunches.map((r) => r.enrollNo))];
      if (empCds.length > 0) {
        const now = new Date();
        await db
          .insert(attendanceEmployees)
          .values(empCds.map((empCd) => ({ empCd, fullName: empCd, active: true, createdAt: now, updatedAt: now })))
          .onDuplicateKeyUpdate({ set: { updatedAt: now } });
      }

      if (result.recordsInserted > 0 && affected.size > 0) {
        const sorted = Array.from(affected).sort();
        const [fy, fm, fd] = sorted[0].split("-").map(Number);
        const [ty, tm, td] = sorted[sorted.length - 1].split("-").map(Number);
        await DailyMaterializer.recomputeRange(
          new Date(fy, fm - 1, fd),
          new Date(ty, tm - 1, td + 1),
        );
      }

      result.success = true;
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();
      console.log(`[ZK4370] Pull done: ${result.recordsInserted} inserted, ${result.recordsSkipped} skipped`);

      await recordSyncRun(db, result, userId, deviceId);
      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();
      result.durationMs = result.completedAt.getTime() - startedAt.getTime();
      console.error(`[ZK4370] Pull failed: ${result.error}`);
      try {
        const db = await getDb();
        if (db) await recordSyncRun(db, result, userId, `zk_${ip ?? DEVICE_IP}`);
      } catch { /* ignore */ }
      return result;
    }
  }

  // ---------------------------------------------------------------------------
  // Push
  // ---------------------------------------------------------------------------

  static async push(ip?: string, port?: number): Promise<ZK4370PushResult> {
    const deviceIp = ip ?? DEVICE_IP;
    const devicePort = port ?? DEVICE_PORT;
    const start = Date.now();
    const result: ZK4370PushResult = { success: false, pushed: 0, failed: 0, errors: [], durationMs: 0 };

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const employees = await db
        .select({ empCd: attendanceEmployees.empCd, fullName: attendanceEmployees.fullName })
        .from(attendanceEmployees)
        .where(sql`active = 1`);

      const client = new ZK4370Client(deviceIp, devicePort);
      await client.connect();
      try {
        for (const e of employees as any[]) {
          const uid = empCdToUid(e.empCd);
          try {
            await client.setUser(uid, e.empCd, e.fullName ?? e.empCd);
            result.pushed++;
          } catch (err) {
            result.failed++;
            result.errors.push(`${e.empCd}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } finally {
        await client.disconnect();
      }

      result.success = result.failed === 0;
      result.durationMs = Date.now() - start;
      console.log(`[ZK4370] Push done: ${result.pushed} pushed, ${result.failed} failed`);
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.durationMs = Date.now() - start;
      return result;
    }
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  static async testConnection(ip?: string, port?: number, commKey = 0): Promise<{ ok: boolean; userCount?: number; error?: string }> {
    const deviceIp = ip ?? DEVICE_IP;
    const devicePort = port ?? DEVICE_PORT;
    try {
      const users = await ZK4370LogPuller.pullUsers(deviceIp, devicePort, commKey);
      return { ok: true, userCount: users.length };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  static getDeviceInfo(ip?: string, port?: number) {
    const deviceIp = ip ?? DEVICE_IP;
    const devicePort = port ?? DEVICE_PORT;
    return { ip: deviceIp, port: devicePort, deviceId: `zk4370_${deviceIp}` };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function empCdToUid(empCd: string): number {
  const n = parseInt(empCd, 10);
  if (!isNaN(n) && n >= 1 && n <= 65535) return n;
  const hash = parseInt(sha1(empCd).slice(-4), 16);
  return (hash % 65534) + 1;
}

async function recordSyncRun(db: any, result: ZK4370SyncResult, userId?: number, deviceId?: string): Promise<void> {
  try {
    await db.insert(attendanceSyncRuns).values({
      startedAt:       result.startedAt,
      finishedAt:      result.completedAt,
      source:          "tcp",
      trigger:         "manual",
      triggeredBy:     userId,
      rowsSeen:        result.recordsSeen,
      rowsInserted:    result.recordsInserted,
      rowsSkipped:     result.recordsSkipped,
      rowsQuarantined: 0,
      status:          result.success ? "ok" : "failed",
      error:           result.error,
      highWaterMark:   result.maxPunchAt ?? result.completedAt,
      deviceId,
    } as any);
  } catch (err) {
    console.error(`[ZK4370] Failed to record sync run: ${err}`);
  }
}
