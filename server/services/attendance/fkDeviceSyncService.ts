/**
 * FK Device Sync Service
 * Syncs punch data from FK device to MySQL via FKOldLogPuller.exe
 */

import { FKAttendLogPuller, FKPunch, FKDeviceConfig } from "./fkAttendLogPuller";
import { DeviceSettingsService } from "./deviceSettings.service";
import { DailyMaterializer } from "./dailyMaterializer";
import { getDb } from "../../db";
import {
  attendancePunches,
  attendanceSyncRuns,
  attendanceEmployees,
} from "../../../drizzle/schema";
import { sql, eq, desc, inArray, and, gte, lte } from "drizzle-orm";
import crypto from "crypto";

const BATCH_SIZE = 500;

export interface SyncResult {
  success: boolean;
  recordsSeen: number;
  recordsInserted: number;
  recordsSkipped: number;
  maxPunchAt?: Date | null; // max punch timestamp among processed punches
  error?: string;
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
}

export class FKDeviceSyncService {
  /**
   * Execute full sync: pull from device, deduplicate, import to MySQL
   */
  static async syncNow(
    userId?: number,
    deviceConfig?: any,
  ): Promise<SyncResult> {
    const startedAt = new Date();
    const result: SyncResult = {
      success: false,
      recordsSeen: 0,
      recordsInserted: 0,
      recordsSkipped: 0,
      startedAt,
      completedAt: new Date(),
      duration: 0,
    };

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Step 0: Load last successful HWM — scoped to this device only
      const lastRun = await db
        .select({ hwm: attendanceSyncRuns.highWaterMark })
        .from(attendanceSyncRuns)
        .where(and(
          inArray(attendanceSyncRuns.status, ["ok", "partial"] as any),
          eq(attendanceSyncRuns.deviceId as any, "fk_ef10k"),
        ))
        .orderBy(desc(attendanceSyncRuns.startedAt))
        .limit(1);
      const lastHwm: Date | null = lastRun[0]?.hwm ?? null;
      console.log(
        `[FKSync] Last HWM: ${lastHwm?.toISOString() ?? "none (first run)"}`,
      );

      // Step 1: Pull logs from device (always returns all records from device memory)
      console.log("[FKSync] Pulling logs from device...");
      const settings = DeviceSettingsService.getSettings();
      const resolvedConfig = {
        ip: settings.ip || undefined,
        port: settings.port || undefined,
        protocol: settings.fkProtocol ?? 0,
        password: settings.commPassword ?? 0,
        ...deviceConfig,
      };
      const allPunches = await this.pullLogsWithProtocolFallback(resolvedConfig);
      // Filter to new punches only (after last HWM)
      const fkPunches = lastHwm
        ? allPunches.filter((p) => p.timestamp > lastHwm)
        : allPunches;
      result.recordsSeen = fkPunches.length;
      console.log(
        `[FKSync] Device returned ${allPunches.length} total, ${fkPunches.length} new since HWM`,
      );

      if (fkPunches.length === 0) {
        console.log("[FKSync] No new records to import");
        result.success = true;
        result.completedAt = new Date();
        result.duration = result.completedAt.getTime() - startedAt.getTime();
        // Carry forward existing HWM — do NOT advance to now or future punches get skipped
        result.maxPunchAt = lastHwm;
        await this.recordSyncRun(db, result, userId);
        return result;
      }

      // Step 2: Batch import with INSERT IGNORE for deduplication
      console.log("[FKSync] Importing punches with deduplication...");
      const affected = new Set<string>();
      let totalInserted = 0;

      // The device's own InOutMode flag is unreliable on this hardware (every
      // punch often reports the same mode) — infer in/out instead by
      // alternating chronologically per employee per day, continuing from
      // however many punches that employee already has that day. This is
      // cosmetic only (rulesEngine derives firstIn/lastOut from timestamps,
      // not this field) but keeps the raw-logs/live-board direction badges
      // meaningful.
      const directionByRowId = await this.inferDirections(db, fkPunches);

      for (let i = 0; i < fkPunches.length; i += BATCH_SIZE) {
        const batch = fkPunches.slice(i, i + BATCH_SIZE);
        const rows = batch.map((punch) => ({
          empCd: String(punch.enrollNo),
          punchAt: punch.timestamp,
          direction: (directionByRowId.get(
            `${punch.enrollNo}_${punch.timestamp.getTime()}`,
          ) ?? (punch.inOutMode === 1 ? "in" : "out")) as
            | "in"
            | "out"
            | "unknown",
          deviceId: "fk_ef10k",
          source: "tcp" as const,
          sourceRowId: `${punch.enrollNo}_${punch.timestamp.getTime()}`,
          sourceHash: this.hashRecord(
            `${punch.enrollNo}|${punch.timestamp.toISOString()}|${punch.inOutMode}`,
          ),
          importedAt: new Date(),
        }));

        // INSERT IGNORE skips duplicates via unique index (uq_punch)
        const inserted = await db
          .insert(attendancePunches)
          .values(rows)
          .onDuplicateKeyUpdate({ set: { importedAt: sql`importedAt` } });

        const rowsInserted = (inserted as any)[0]?.affectedRows ?? rows.length;
        totalInserted += rowsInserted;

        // Track affected dates
        for (const punch of batch) {
          const d = punch.timestamp;
          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          affected.add(dateKey);
        }
      }

      result.recordsInserted = totalInserted;
      result.recordsSkipped = fkPunches.length - totalInserted;
      // Track max punch timestamp for HWM (only among newly processed punches)
      result.maxPunchAt = fkPunches.reduce<Date | null>(
        (max, p) => (!max || p.timestamp > max ? p.timestamp : max),
        null,
      );

      console.log(
        `[FKSync] Import complete: ${result.recordsInserted} inserted, ${result.recordsSkipped} skipped`,
      );

      // Step 3: Auto-register any new employee codes seen in this sync batch
      // attendance_employees must be populated for the materializer to process punches
      const uniqueEmpCds = [
        ...new Set(fkPunches.map((p) => String(p.enrollNo))),
      ];
      if (uniqueEmpCds.length > 0) {
        const now = new Date();
        await db
          .insert(attendanceEmployees)
          .values(
            uniqueEmpCds.map((empCd) => ({
              empCd,
              fullName: empCd,
              active: true,
              createdAt: now,
              updatedAt: now,
            })),
          )
          .onDuplicateKeyUpdate({ set: { updatedAt: now } });
        console.log(
          `[FKSync] Ensured ${uniqueEmpCds.length} employee records in attendance_employees`,
        );
      }

      // Step 4: Recompute daily records for affected dates
      // Always recompute today so dashboard reflects current punch state,
      // even when all punches were duplicates (0 inserted).
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      if (result.recordsInserted > 0 && affected.size > 0) {
        console.log(
          `[FKSync] Recomputing daily attendance for ${affected.size} affected dates...`,
        );

        const sorted = Array.from(affected).sort();
        const [fy, fm, fd] = sorted[0].split("-").map(Number);
        const [ty, tm, td] = sorted[sorted.length - 1].split("-").map(Number);
        const minDate = new Date(fy, fm - 1, fd);
        const maxDate = new Date(ty, tm - 1, td + 1); // exclusive end

        // Extend range to include today if not already covered
        const from = minDate < todayStart ? minDate : todayStart;
        const to = maxDate > todayEnd ? maxDate : todayEnd;

        await DailyMaterializer.recomputeRange(from, to);
        console.log(
          `[FKSync] Recomputed from ${sorted[0]} to ${sorted[sorted.length - 1]}`,
        );
      } else {
        // No new punches — still recompute today so live status stays accurate
        await DailyMaterializer.recomputeRange(todayStart, todayEnd);
        console.log(`[FKSync] No new punches — recomputed today only`);
      }

      result.success = true;
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      console.log(
        `[FKSync] ✓ Sync completed successfully in ${result.duration}ms`,
      );

      // Record sync run
      await this.recordSyncRun(db, result, userId);

      return result;
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      console.error(`[FKSync] Sync failed: ${result.error}`);

      // Record failed sync run
      try {
        const db = await getDb();
        if (db) {
          await this.recordSyncRun(db, result, userId);
        }
      } catch (e) {
        console.error(`[FKSync] Failed to record sync run: ${e}`);
      }

      return result;
    }
  }

  /**
   * Infer in/out direction per punch by alternating chronologically within
   * each employee's day, continuing the parity from punches already stored
   * for that employee/day. Keyed by `${enrollNo}_${timestamp.getTime()}`
   * (matches the sourceRowId built for each row below).
   */
  private static async inferDirections(
    db: any,
    punches: FKPunch[],
  ): Promise<Map<string, "in" | "out">> {
    const directionByRowId = new Map<string, "in" | "out">();
    if (punches.length === 0) return directionByRowId;

    const dateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const groups = new Map<string, FKPunch[]>();
    for (const p of punches) {
      const key = `${p.enrollNo}|${dateKey(p.timestamp)}`;
      const group = groups.get(key);
      if (group) group.push(p);
      else groups.set(key, [p]);
    }

    const empCds = [...new Set(punches.map((p) => String(p.enrollNo)))];
    const timestamps = punches.map((p) => p.timestamp.getTime());
    const rangeStart = new Date(Math.min(...timestamps));
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(Math.max(...timestamps));
    rangeEnd.setHours(23, 59, 59, 999);

    const existingRows = await db
      .select({
        empCd: attendancePunches.empCd,
        punchAt: attendancePunches.punchAt,
      })
      .from(attendancePunches)
      .where(
        and(
          inArray(attendancePunches.empCd, empCds),
          gte(attendancePunches.punchAt, rangeStart),
          lte(attendancePunches.punchAt, rangeEnd),
        ),
      );

    const existingCounts = new Map<string, number>();
    for (const row of existingRows as any[]) {
      const key = `${row.empCd}|${dateKey(new Date(row.punchAt))}`;
      existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
    }

    for (const [key, group] of groups) {
      const sorted = [...group].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      );
      const startCount = existingCounts.get(key) ?? 0;
      sorted.forEach((p, idx) => {
        const rowId = `${p.enrollNo}_${p.timestamp.getTime()}`;
        directionByRowId.set(
          rowId,
          (startCount + idx) % 2 === 0 ? "in" : "out",
        );
      });
    }

    return directionByRowId;
  }

  /**
   * Record sync run in database
   */
  private static async recordSyncRun(
    db: any,
    result: SyncResult,
    userId?: number,
  ): Promise<void> {
    try {
      await db.insert(attendanceSyncRuns).values({
        startedAt: result.startedAt,
        finishedAt: result.completedAt,
        source: "tcp",
        trigger: "manual",
        triggeredBy: userId,
        rowsSeen: result.recordsSeen,
        rowsInserted: result.recordsInserted,
        rowsSkipped: result.recordsSkipped,
        rowsQuarantined: 0,
        status: result.success ? "ok" : "failed",
        error: result.error,
        highWaterMark: result.maxPunchAt ?? result.completedAt,
        deviceId: "fk_ef10k",
      } as any);
    } catch (error) {
      console.error(
        `[FKSync] Failed to record sync run: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Pull logs using the configured protocol; on connect failure, retry once with
   * the other protocol value (0/1) and persist it as the working setting so
   * subsequent syncs don't keep failing on a stale/wrong protocol.
   */
  private static async pullLogsWithProtocolFallback(
    resolvedConfig: Partial<FKDeviceConfig>,
  ): Promise<FKPunch[]> {
    try {
      return await FKAttendLogPuller.pullLogs(resolvedConfig);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!/connect failed/i.test(msg)) throw error;

      const altProtocol = resolvedConfig.protocol === 1 ? 0 : 1;
      console.warn(
        `[FKSync] Connect failed with protocol=${resolvedConfig.protocol}, retrying with protocol=${altProtocol}`,
      );
      const punches = await FKAttendLogPuller.pullLogs({
        ...resolvedConfig,
        protocol: altProtocol,
      });

      console.log(`[FKSync] Retry succeeded — persisting fkProtocol=${altProtocol}`);
      await DeviceSettingsService.updateSettings({
        deviceId: 1,
        fkProtocol: altProtocol as 0 | 1,
      });

      return punches;
    }
  }

  /**
   * Create SHA1 hash for deduplication
   */
  private static hashRecord(data: string): string {
    return crypto.createHash("sha1").update(data).digest("hex");
  }
}

/**
 * Quick sync trigger function
 */
export async function syncFromFKDevice(userId?: number): Promise<SyncResult> {
  return FKDeviceSyncService.syncNow(userId);
}
