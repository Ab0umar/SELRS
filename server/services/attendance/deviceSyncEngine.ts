import { getDb } from "../../db";
import { attendancePunches, attendanceSyncRuns } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { ZKTecoDevice } from "./zktecoDevice";
import { DailyMaterializer } from "./dailyMaterializer";

/**
 * Direct Device Sync Engine
 * Syncs punch data directly from ZKTeco device to MySQL
 * Replaces Taratus.exe + Access DB approach
 */

interface DeviceSyncConfig {
  deviceIp: string;
  devicePort?: number;
  syncIntervalMinutes?: number;
  enableAutoSync?: boolean;
}

interface SyncRun {
  startedAt: Date;
  completedAt?: Date;
  status: "running" | "completed" | "failed";
  recordsImported: number;
  recordsSkipped: number;
  error?: string;
}

export class DeviceSyncEngine {
  private config: DeviceSyncConfig;
  private device: ZKTecoDevice | null = null;
  private currentSync: SyncRun | null = null;
  private lastSyncTime: Date | null = null;
  private autoSyncInterval: NodeJS.Timeout | null = null;

  constructor(config: DeviceSyncConfig) {
    this.config = {
      devicePort: 5005,
      syncIntervalMinutes: 60,
      enableAutoSync: false,
      ...config,
    };
  }

  /**
   * Initialize device connection and start auto-sync if enabled
   */
  async initialize(): Promise<boolean> {
    try {
      this.device = new ZKTecoDevice({
        ip: this.config.deviceIp,
        port: this.config.devicePort || 5005,
        timeout: 10000,
      });

      await this.device.connect();
      console.log(
        `✓ Connected to ZKTeco device at ${this.config.deviceIp}:${this.config.devicePort}`
      );

      if (this.config.enableAutoSync) {
        this.startAutoSync();
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize device sync:", error);
      return false;
    }
  }

  /**
   * Perform a single sync run
   * Fetches punches from device and imports to MySQL
   */
  async syncNow(): Promise<SyncRun> {
    if (!this.device) {
      throw new Error("Device not initialized");
    }

    this.currentSync = {
      startedAt: new Date(),
      status: "running",
      recordsImported: 0,
      recordsSkipped: 0,
    };

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Load last successful sync time from most recent successful sync run
      const lastRun = await db
        .select()
        .from(attendanceSyncRuns)
        .where(eq(attendanceSyncRuns.source, "tcp"))
        .orderBy(desc(attendanceSyncRuns.highWaterMark))
        .limit(1);

      this.lastSyncTime = lastRun[0]?.highWaterMark ?? new Date(0);

      // Fetch punches from device
      console.log(
        `Fetching punches from device since ${this.lastSyncTime.toISOString()}`
      );
      const punches = await this.device!.getPunchRecords(this.lastSyncTime);

      console.log(`Device returned ${punches.length} punch records`);

      // Import to MySQL
      for (const punch of punches) {
        const imported = await this.insertPunchIgnore(
          db,
          punch.empNo,
          punch.punchDateTime,
          punch.direction === "in" ? 1 : 0,
          "zkTeco",
          punch.empNo // sourceRowId = empNo for device data
        );

        if (imported) {
          this.currentSync.recordsImported++;
        } else {
          this.currentSync.recordsSkipped++;
        }
      }

      // Record sync run and update high-water mark
      const now = new Date();
      const minPunchTime = punches.length > 0
        ? punches.reduce((min, p) => p.punchDateTime < min ? p.punchDateTime : min, punches[0].punchDateTime)
        : now;

      await db.insert(attendanceSyncRuns).values({
        startedAt: this.currentSync.startedAt,
        finishedAt: now,
        source: "tcp",
        trigger: "manual",
        rowsSeen: punches.length,
        rowsInserted: this.currentSync.recordsImported,
        rowsSkipped: this.currentSync.recordsSkipped,
        rowsQuarantined: 0,
        status: this.currentSync.recordsImported > 0 ? "ok" : "ok",
        highWaterMark: minPunchTime,
      });

      // Rebuild daily records for affected dates
      if (this.currentSync.recordsImported > 0) {
        const maxDate = new Date();
        await DailyMaterializer.recomputeRange(minPunchTime, maxDate);
        console.log(`Recomputed daily records from ${minPunchTime} to ${maxDate}`);
      }

      this.currentSync.completedAt = new Date();
      this.currentSync.status = "completed";

      console.log(
        `✓ Sync completed: ${this.currentSync.recordsImported} imported, ${this.currentSync.recordsSkipped} skipped`
      );

      return this.currentSync;
    } catch (error) {
      this.currentSync.status = "failed";
      this.currentSync.error = error instanceof Error ? error.message : String(error);
      this.currentSync.completedAt = new Date();

      console.error("Sync failed:", error);
      throw error;
    }
  }

  /**
   * Insert punch if not duplicate (CRC-based dedup)
   */
  private async insertPunchIgnore(
    db: any,
    empCd: string,
    punchAt: Date,
    direction: number,
    source: string,
    sourceRowId: string
  ): Promise<boolean> {
    try {
      const sourceHash = this.hashRecord(
        `${empCd}|${punchAt.toISOString()}|${sourceRowId}`
      );

      await db.insert(attendancePunches).values({
        empCd,
        punchAt,
        direction,
        deviceId: "zkTeco",
        source,
        sourceRowId,
        sourceHash,
        importedAt: new Date(),
      });

      return true;
    } catch (error: any) {
      // Duplicate entry (ER_DUP_ENTRY)
      if (error?.code === "ER_DUP_ENTRY" || error?.errno === 1062) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Simple hash for deduplication
   */
  private hashRecord(data: string): string {
    const crypto = require("crypto");
    return crypto.createHash("sha1").update(data).digest("hex");
  }

  /**
   * Start automatic sync at regular intervals
   */
  private startAutoSync(): void {
    const intervalMs = (this.config.syncIntervalMinutes || 60) * 60 * 1000;

    this.autoSyncInterval = setInterval(async () => {
      try {
        await this.syncNow();
      } catch (error) {
        console.error("Auto-sync failed:", error);
      }
    }, intervalMs);

    console.log(
      `Auto-sync enabled every ${this.config.syncIntervalMinutes} minutes`
    );
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log("Auto-sync stopped");
    }
  }

  /**
   * Get current sync status
   */
  getCurrentSyncStatus(): SyncRun | null {
    return this.currentSync;
  }

  /**
   * Disconnect from device
   */
  disconnect(): void {
    this.stopAutoSync();
    if (this.device) {
      this.device.disconnect();
      this.device = null;
    }
  }
}

/**
 * Global device sync instance
 */
let deviceSyncInstance: DeviceSyncEngine | null = null;

/**
 * Initialize global device sync
 */
export async function initializeDeviceSync(
  config: DeviceSyncConfig
): Promise<DeviceSyncEngine> {
  if (deviceSyncInstance) {
    return deviceSyncInstance;
  }

  deviceSyncInstance = new DeviceSyncEngine(config);
  const success = await deviceSyncInstance.initialize();

  if (!success) {
    throw new Error("Failed to initialize device sync");
  }

  return deviceSyncInstance;
}

/**
 * Get global device sync instance
 */
export function getDeviceSyncEngine(): DeviceSyncEngine | null {
  return deviceSyncInstance;
}
