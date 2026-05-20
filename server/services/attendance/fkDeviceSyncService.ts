/**
 * FK Device Sync Service
 * Syncs punch data from FK device to MySQL via FKOldLogPuller.exe
 */

import { FKAttendLogPuller, FKPunch } from './fkAttendLogPuller';
import { DailyMaterializer } from './dailyMaterializer';
import { getDb } from '../../db';
import { attendancePunches, attendanceSyncRuns } from '../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

export interface SyncResult {
  success: boolean;
  recordsSeen: number;
  recordsInserted: number;
  recordsSkipped: number;
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
    deviceConfig?: any
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
      if (!db) throw new Error('Database not available');

      // Step 1: Pull logs from device
      console.log('[FKSync] Pulling logs from device...');
      const fkPunches = await FKAttendLogPuller.pullLogs(deviceConfig);
      result.recordsSeen = fkPunches.length;
      console.log(`[FKSync] Received ${fkPunches.length} punch records from device`);

      if (fkPunches.length === 0) {
        console.log('[FKSync] No new records to import');
        result.success = true;
        result.completedAt = new Date();
        result.duration = result.completedAt.getTime() - startedAt.getTime();
        await this.recordSyncRun(db, result, userId);
        return result;
      }

      // Step 2: Import punches with deduplication
      console.log('[FKSync] Importing punches with deduplication...');
      const affected = new Set<Date>();

      for (const punch of fkPunches) {
        const inserted = await this.insertPunchWithDedup(db, punch);
        if (inserted) {
          result.recordsInserted++;
          // Track affected dates for daily materialization
          const date = new Date(punch.timestamp);
          date.setHours(0, 0, 0, 0);
          affected.add(date);
        } else {
          result.recordsSkipped++;
        }
      }

      console.log(
        `[FKSync] Import complete: ${result.recordsInserted} inserted, ${result.recordsSkipped} skipped`
      );

      // Step 3: Recompute daily records for affected dates
      if (result.recordsInserted > 0 && affected.size > 0) {
        console.log(
          `[FKSync] Recomputing daily attendance for ${affected.size} affected dates...`
        );

        const dates = Array.from(affected).sort(
          (a, b) => a.getTime() - b.getTime()
        );
        const minDate = dates[0];
        const maxDate = new Date(dates[dates.length - 1]);
        maxDate.setDate(maxDate.getDate() + 1); // Include end date

        await DailyMaterializer.recomputeRange(minDate, maxDate);
        console.log(
          `[FKSync] Recomputed daily records from ${minDate.toDateString()} to ${maxDate.toDateString()}`
        );
      }

      result.success = true;
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      console.log(
        `[FKSync] ✓ Sync completed successfully in ${result.duration}ms`
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
   * Insert punch record with deduplication
   * Returns true if inserted, false if duplicate
   */
  private static async insertPunchWithDedup(
    db: any,
    punch: FKPunch
  ): Promise<boolean> {
    try {
      // Create source hash for deduplication
      const sourceHash = this.hashRecord(
        `${punch.enrollNo}|${punch.timestamp.toISOString()}|${punch.inOutMode}`
      );

      // Check if already exists
      const existing = await db
        .select()
        .from(attendancePunches)
        .where(eq(attendancePunches.sourceHash, sourceHash))
        .limit(1);

      if (existing.length > 0) {
        return false; // Duplicate
      }

      // Insert new punch
      await db.insert(attendancePunches).values({
        empCd: String(punch.enrollNo),
        punchAt: punch.timestamp,
        direction: punch.inOutMode === 1 ? 1 : 0,
        deviceId: 'fk623',
        source: 'fk_device',
        sourceRowId: `${punch.enrollNo}_${punch.timestamp.getTime()}`,
        sourceHash: sourceHash,
        importedAt: new Date(),
      });

      return true;
    } catch (error: any) {
      // Check for duplicate key error
      if (
        error?.code === 'ER_DUP_ENTRY' ||
        error?.errno === 1062 ||
        error?.message?.includes('Duplicate entry')
      ) {
        return false; // Duplicate
      }
      throw error;
    }
  }

  /**
   * Record sync run in database
   */
  private static async recordSyncRun(
    db: any,
    result: SyncResult,
    userId?: number
  ): Promise<void> {
    try {
      await db.insert(attendanceSyncRuns).values({
        startedAt: result.startedAt,
        finishedAt: result.completedAt,
        source: 'fk',
        trigger: 'manual',
        triggeredBy: userId,
        rowsSeen: result.recordsSeen,
        rowsInserted: result.recordsInserted,
        rowsSkipped: result.recordsSkipped,
        rowsQuarantined: 0,
        status: result.success ? 'ok' : 'failed',
        error: result.error,
        highWaterMark: result.completedAt,
      });
    } catch (error) {
      console.error(
        `[FKSync] Failed to record sync run: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Create SHA1 hash for deduplication
   */
  private static hashRecord(data: string): string {
    return crypto.createHash('sha1').update(data).digest('hex');
  }
}

/**
 * Quick sync trigger function
 */
export async function syncFromFKDevice(userId?: number): Promise<SyncResult> {
  return FKDeviceSyncService.syncNow(userId);
}
