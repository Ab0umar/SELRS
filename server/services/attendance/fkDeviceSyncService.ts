/**
 * FK Device Sync Service
 * Syncs punch data from FK device to MySQL via FKOldLogPuller.exe
 */

import { FKAttendLogPuller, FKPunch } from './fkAttendLogPuller';
import { DailyMaterializer } from './dailyMaterializer';
import { getDb } from '../../db';
import { attendancePunches, attendanceSyncRuns } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const BATCH_SIZE = 500;

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

      // Step 2: Batch import with INSERT IGNORE for deduplication
      console.log('[FKSync] Importing punches with deduplication...');
      const affected = new Set<string>();
      let totalInserted = 0;

      for (let i = 0; i < fkPunches.length; i += BATCH_SIZE) {
        const batch = fkPunches.slice(i, i + BATCH_SIZE);
        const rows = batch.map((punch) => ({
          empCd: String(punch.enrollNo),
          punchAt: punch.timestamp,
          direction: (punch.inOutMode === 1 ? 'in' : 'out') as 'in' | 'out' | 'unknown',
          deviceId: 'fk_device',
          source: 'tcp' as const,
          sourceRowId: `${punch.enrollNo}_${punch.timestamp.getTime()}`,
          sourceHash: this.hashRecord(`${punch.enrollNo}|${punch.timestamp.toISOString()}|${punch.inOutMode}`),
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
          const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          affected.add(dateKey);
        }
      }

      result.recordsInserted = totalInserted;
      result.recordsSkipped = fkPunches.length - totalInserted;

      console.log(
        `[FKSync] Import complete: ${result.recordsInserted} inserted, ${result.recordsSkipped} skipped`
      );

      // Step 3: Recompute daily records for affected dates
      if (result.recordsInserted > 0 && affected.size > 0) {
        console.log(`[FKSync] Recomputing daily attendance for ${affected.size} affected dates...`);

        const sorted = Array.from(affected).sort();
        const [fy, fm, fd] = sorted[0].split('-').map(Number);
        const [ty, tm, td] = sorted[sorted.length - 1].split('-').map(Number);
        const minDate = new Date(fy, fm - 1, fd);
        const maxDate = new Date(ty, tm - 1, td + 1); // exclusive end

        await DailyMaterializer.recomputeRange(minDate, maxDate);
        console.log(`[FKSync] Recomputed from ${sorted[0]} to ${sorted[sorted.length - 1]}`);
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
