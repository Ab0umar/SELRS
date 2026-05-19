/**
 * Attendance Sync Engine
 * Manages incremental sync from AttendanceSource to MySQL
 * - HWM tracking (high water mark for dedup)
 * - Advisory locking for concurrency safety
 * - Employee mirror UPSERT
 * - Punch INSERT IGNORE (dedup via unique constraint)
 * - Sync run logging
 * - Triggers daily materializer on success
 */

import { getDb } from '../../db';
import { attendanceSyncRuns } from '../../../drizzle/schema';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { AttendanceSource } from './sources/AttendanceSource';
import { createAttendanceSource } from './sources/sourceFactory';
import { EmployeesService } from './employees.service';
import { PunchesService } from './punches.service';
import { dailyMaterializer } from './dailyMaterializer';

const SYNC_LOCK_NAME = 'attendance_sync';
const SAFETY_WINDOW_MINUTES = parseInt(process.env.ATTENDANCE_SAFETY_WINDOW_MIN ?? '120', 10) || 120;

export interface SyncTrigger {
  trigger: 'cron' | 'manual';
  triggeredBy?: number; // user ID for manual triggers
}

export interface SyncResult {
  runId: number;
  status: 'running' | 'ok' | 'partial' | 'failed' | 'locked';
  rowsInserted?: number;
  rowsSeen?: number;
  hwm?: Date | null;
  error?: string;
}

/**
 * Execute a single sync run
 * Returns immediately with run status (advisory lock prevents overlap)
 */
export async function runSyncOnce(
  trigger: SyncTrigger,
  source: AttendanceSource = createAttendanceSource()
): Promise<SyncResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const startedAt = new Date();
  let runId: number | null = null;
  let acquired = false;

  try {
    // Try to acquire advisory lock (0 timeout = non-blocking)
    const lockResult = await db.execute(sql`SELECT GET_LOCK(${SYNC_LOCK_NAME}, 0) as lockAcquired`);
    acquired = (lockResult as any)?.[0]?.lockAcquired === 1;

    if (!acquired) {
      // Lock not acquired - another sync is running
      runId = await createSyncRun(db, {
        startedAt,
        finishedAt: new Date(),
        source: source.name,
        trigger: trigger.trigger,
        triggeredBy: trigger.triggeredBy,
        status: 'locked',
        error: null,
      });
      return { runId, status: 'locked' };
    }

    // Create sync run record
    runId = await createSyncRun(db, {
      startedAt,
      source: source.name,
      trigger: trigger.trigger,
      triggeredBy: trigger.triggeredBy,
      status: 'running',
      error: null,
    });

    // Load previous HWM and apply safety window rewind
    const prevHwm = await getLastHwm(db, source.name);
    const safetyRewindMs = SAFETY_WINDOW_MINUTES * 60 * 1000;
    const sinceLocal = prevHwm && prevHwm instanceof Date ? new Date(prevHwm.getTime() - safetyRewindMs) : new Date(0);

    // Sync employees first
    let rowsSeen = 0;
    let rowsInserted = 0;
    let rowsSkipped = 0;
    let rowsQuarantined = 0;
    let maxPunchAt: Date | null = null;
    let status: 'ok' | 'partial' | 'failed' = 'ok';
    let errorMsg: string | null = null;

    try {
      // Stream employees from source
      for await (const emp of source.fetchEmployees()) {
        await EmployeesService.upsertEmployee(emp);
      }

      // Ensure unknown employee placeholder exists
      await EmployeesService.insertUnknownPlaceholder();

      // Stream and insert punches
      for await (const record of source.fetchPunchesSince(sinceLocal)) {
        rowsSeen++;

        if (record.kind === 'quarantine') {
          rowsQuarantined++;
          console.warn(`[attendance:sync] Quarantined: ${record.reason} (${record.rowRef})`);
          continue;
        }

        const punch = record.row;

        // Try to insert (dedup via UNIQUE constraint + source_hash)
        const inserted = await PunchesService.insertPunchIgnore(punch, source.name);
        if (inserted) {
          rowsInserted++;
          if (!maxPunchAt || punch.punchAt > maxPunchAt) {
            maxPunchAt = punch.punchAt;
          }
        } else {
          rowsSkipped++;
        }
      }

      // Update HWM if we saw any punches
      if (maxPunchAt) {
        await updateHwm(db, runId, maxPunchAt);
      }

      // Determine final status
      if (rowsQuarantined > 0) {
        status = 'partial';
      }
    } catch (err) {
      status = 'failed';
      errorMsg = sanitizeError(err);
      console.error('[attendance:sync] Sync error:', err);
    }

    // Trigger materializer on success (partial is still ok)
    if (status !== 'failed' && maxPunchAt) {
      try {
        await dailyMaterializer.recomputeRange(
          new Date(sinceLocal.getFullYear(), sinceLocal.getMonth(), sinceLocal.getDate()),
          new Date()
        );
      } catch (matErr) {
        console.error('[attendance:sync] Materializer error:', matErr);
        status = 'partial';
      }
    }

    // Close sync run
    await finishSyncRun(db, runId, {
      status,
      error: errorMsg,
      rowsSeen,
      rowsInserted,
      rowsSkipped,
      rowsQuarantined,
      finishedAt: new Date(),
    });

    return {
      runId,
      status,
      rowsInserted,
      rowsSeen,
      hwm: maxPunchAt,
    };
  } catch (err) {
    // Catastrophic error - try to log run
    const fatalMsg = sanitizeError(err);
    if (runId) {
      try {
        await finishSyncRun(db, runId, {
          status: 'failed',
          error: fatalMsg,
          finishedAt: new Date(),
        });
      } catch {
        // Ignore further errors
      }
    }
    return { runId: runId ?? -1, status: 'failed', error: fatalMsg };
  } finally {
    // Always release lock and close source
    if (acquired) {
      try {
        await db.execute(sql`SELECT RELEASE_LOCK(${SYNC_LOCK_NAME})`);
      } catch {
        // Ignore release errors
      }
    }
    try {
      await source.close();
    } catch {
      // Ignore close errors
    }
  }
}

// ============ Private Helpers ============

async function createSyncRun(
  db: any,
  data: {
    startedAt: Date;
    source: 'access' | 'tcp';
    trigger: 'cron' | 'manual';
    triggeredBy?: number;
    status: 'running' | 'locked' | 'ok' | 'partial' | 'failed';
    error?: string | null;
    finishedAt?: Date;
  }
): Promise<number> {
  const now = new Date();
  const result = await db.insert(attendanceSyncRuns).values({
    startedAt: data.startedAt,
    source: data.source,
    trigger: data.trigger,
    triggeredBy: data.triggeredBy ?? null,
    status: data.status,
    error: data.error ?? null,
    finishedAt: data.finishedAt ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const insertId = (result as any)?.[0]?.insertId ?? (result as any)?.insertId;
  return insertId ?? 0;
}

async function finishSyncRun(
  db: any,
  runId: number,
  data: {
    status: 'ok' | 'partial' | 'failed';
    error?: string | null;
    rowsSeen?: number;
    rowsInserted?: number;
    rowsSkipped?: number;
    rowsQuarantined?: number;
    finishedAt: Date;
  }
): Promise<void> {
  await db
    .update(attendanceSyncRuns)
    .set({
      status: data.status,
      error: data.error ?? null,
      rowsSeen: data.rowsSeen ?? undefined,
      rowsInserted: data.rowsInserted ?? undefined,
      rowsSkipped: data.rowsSkipped ?? undefined,
      rowsQuarantined: data.rowsQuarantined ?? undefined,
      finishedAt: data.finishedAt,
      updatedAt: new Date(),
    })
    .where(eq(attendanceSyncRuns.id, runId));
}

async function getLastHwm(db: any, source: 'access' | 'tcp'): Promise<Date | null> {
  const result = await db
    .select({ highWaterMark: attendanceSyncRuns.highWaterMark })
    .from(attendanceSyncRuns)
    .where(
      and(
        eq(attendanceSyncRuns.source, source),
        inArray(attendanceSyncRuns.status, ['ok', 'partial'])
      )
    )
    .orderBy(desc(attendanceSyncRuns.startedAt))
    .limit(1);

  return result[0]?.highWaterMark ?? null;
}

async function updateHwm(db: any, runId: number, hwm: Date): Promise<void> {
  await db
    .update(attendanceSyncRuns)
    .set({
      highWaterMark: hwm,
      updatedAt: new Date(),
    })
    .where(eq(attendanceSyncRuns.id, runId));
}

function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    // Remove sensitive paths and env values
    let msg = err.message;
    msg = msg.replace(/[A-Z]:\\[^\s"']+/g, '(path)');
    msg = msg.replace(/\/[^\s"']+/g, '(path)');
    return msg;
  }
  return 'Unknown error during sync';
}
