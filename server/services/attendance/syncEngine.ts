/**
 * Attendance Sync Engine
 *
 * Pulls the configured AttendanceSource (see sources/sourceFactory.ts) into
 * MySQL: employee mirror upsert, punch INSERT IGNORE deduped by the uq_punch
 * unique index, per-run high-water mark, run history, then a daily
 * materializer pass.
 *
 * Concurrency: runSyncOnce holds its own advisory lock, attendance_sync,
 * with a 5s GET_LOCK wait. It is a separate, shorter-fused lock from the
 * materializer's attendance_daily_materializer (120s); do not merge them.
 * On lock timeout the run is recorded with status 'locked' and returned,
 * not thrown. See docs/ATTENDANCE_SYNC.md, "Concurrency and locking".
 */

import { getDb, getDbConnection } from "../../db";
import { attendanceSyncRuns } from "../../../drizzle/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { AttendanceSource } from "./sources/AttendanceSource";
import { createAttendanceSource } from "./sources/sourceFactory";
import { EmployeesService } from "./employees.service";
import { PunchesService } from "./punches.service";
import { dailyMaterializer } from "./dailyMaterializer";

const SYNC_LOCK_NAME = "attendance_sync";
const SAFETY_WINDOW_MINUTES =
  parseInt(process.env.ATTENDANCE_SAFETY_WINDOW_MIN ?? "120", 10) || 120;

/** What started a run: the scheduler passes 'cron'; 'manual' carries the
 * acting user id. */
export interface SyncTrigger {
  trigger: "cron" | "manual";
  triggeredBy?: number; // user ID for manual triggers
}

/** Outcome of one runSyncOnce call. Status values:
 *  - running: run row created, work in flight (persisted state, never
 *    returned to the caller)
 *  - ok: rows synced, nothing quarantined, materializer succeeded
 *  - partial: quarantined source rows, or the materializer failed after
 *    punches were stored (punches are kept; daily rows wait for the next
 *    trigger)
 *  - failed: the source threw, or setup failed before any pull
 *  - locked: another run held attendance_sync; nothing was pulled
 */
export interface SyncResult {
  runId: number;
  status: "running" | "ok" | "partial" | "failed" | "locked";
  rowsInserted?: number;
  rowsSeen?: number;
  hwm?: Date | null;
  error?: string;
}

/**
 * Execute one incremental sync from `source` into MySQL.
 *
 * Locking: GET_LOCK('attendance_sync', 5) on a dedicated getDbConnection().
 * On timeout the run is recorded as 'locked' and returned (never thrown).
 * RELEASE_LOCK errors are swallowed here and the connection goes back to the
 * pool, unlike materializerMutex.ts which destroys it; a failed release can
 * therefore leave a lock-owning session in the pool until it dies.
 *
 * Window: starts from the newest ok/partial high-water mark for this source,
 * rewound by ATTENDANCE_SAFETY_WINDOW_MIN minutes (default 120) so late or
 * drifting rows are re-read (dedup makes that safe). With no mark on record
 * it starts at January 1 of the current year.
 *
 * Materializer: triggered only when the pull did not fail AND at least one
 * punch was inserted; a materializer error downgrades the run to 'partial'.
 * Quarantined source rows also downgrade to 'partial'.
 *
 * The finally block always releases the lock connection and closes the
 * source, even on catastrophic errors.
 *
 * @param trigger Cron or manual provenance, stored on the run row.
 * @param source Attendance source; defaults to the configured adapter.
 *   Injectable for tests.
 * @returns Run id and outcome; runId is -1 when setup failed before a row
 *   could be created.
 * @throws Only when the database itself is unavailable.
 */
export async function runSyncOnce(
  trigger: SyncTrigger,
  source: AttendanceSource = createAttendanceSource(),
): Promise<SyncResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startedAt = new Date();
  let runId: number | null = null;
  let acquired = false;
  let lockConnection: Awaited<ReturnType<typeof getDbConnection>> | null = null;

  try {
    // MySQL advisory locks belong to one connection, so keep this dedicated
    // connection checked out until the matching RELEASE_LOCK call.
    lockConnection = await getDbConnection();
    const [lockRows] = await lockConnection.query(
      "SELECT GET_LOCK(?, 5) AS lockAcquired",
      [SYNC_LOCK_NAME],
    );
    acquired = Number((lockRows as any[])[0]?.lockAcquired) === 1;

    if (!acquired) {
      // Lock not acquired - another sync is running
      runId = await createSyncRun(db, {
        startedAt,
        finishedAt: new Date(),
        source: source.name,
        trigger: trigger.trigger,
        triggeredBy: trigger.triggeredBy,
        status: "locked",
        error: null,
      });
      return { runId, status: "locked" };
    }

    runId = await createSyncRun(db, {
      startedAt,
      source: source.name,
      trigger: trigger.trigger,
      triggeredBy: trigger.triggeredBy,
      status: "running",
      error: null,
    });

    // Load previous HWM and apply safety window rewind
    const prevHwm = await getLastHwm(db, source.name);
    const safetyRewindMs = SAFETY_WINDOW_MINUTES * 60 * 1000;
    // If no HWM exists, start from Jan 1 of current year (2026 only)
    const defaultSince = new Date(new Date().getFullYear(), 0, 1);
    const sinceLocal =
      prevHwm && prevHwm instanceof Date
        ? new Date(prevHwm.getTime() - safetyRewindMs)
        : defaultSince;

    // Sync employees first
    let rowsSeen = 0;
    let rowsInserted = 0;
    let rowsSkipped = 0;
    let rowsQuarantined = 0;
    let maxPunchAt: Date | null = null;
    let status: "ok" | "partial" | "failed" = "ok";
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

        if (record.kind === "quarantine") {
          rowsQuarantined++;
          console.warn(
            `[attendance:sync] Quarantined: ${record.reason} (${record.rowRef})`,
          );
          continue;
        }

        const punch = record.row;

        // Try to insert (dedup via UNIQUE constraint + source_hash)
        const inserted = await PunchesService.insertPunchIgnore(
          punch,
          source.name,
        );
        if (inserted) {
          rowsInserted++;
          if (!maxPunchAt || punch.punchAt > maxPunchAt) {
            maxPunchAt = punch.punchAt;
          }
        } else {
          rowsSkipped++;
        }
      }

      console.log(
        `[attendance:sync] Punch sync summary: rowsSeen=${rowsSeen}, ` +
          `rowsInserted=${rowsInserted}, rowsSkipped=${rowsSkipped}, rowsQuarantined=${rowsQuarantined}`,
      );

      // The mark only advances on newly inserted rows: maxPunchAt is set
      // from inserted punches, so an all-duplicates poll leaves the
      // checkpoint where it was.
      if (maxPunchAt) {
        await updateHwm(db, runId, maxPunchAt);
      }

      // Determine final status
      if (rowsQuarantined > 0) {
        status = "partial";
      }
    } catch (err) {
      status = "failed";
      errorMsg = sanitizeError(err);
      console.error("[attendance:sync] Sync error:", err);
    }

    // Trigger materializer on success (partial is still ok)
    if (status !== "failed" && maxPunchAt) {
      try {
        const recomputeFrom = new Date(
          sinceLocal.getFullYear(),
          sinceLocal.getMonth(),
          sinceLocal.getDate(),
        );
        const recomputeTo = new Date();
        await dailyMaterializer.recomputeRange(
          recomputeFrom,
          recomputeTo,
          undefined,
          undefined,
          { recomputeMonthly: true },
        );
      } catch (matErr) {
        console.error("[attendance:sync] Materializer error:", matErr);
        status = "partial";
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
          status: "failed",
          error: fatalMsg,
          finishedAt: new Date(),
        });
      } catch {
        // Ignore further errors
      }
    }
    return { runId: runId ?? -1, status: "failed", error: fatalMsg };
  } finally {
    // Always release lock and close source
    if (acquired) {
      try {
        await lockConnection?.query("SELECT RELEASE_LOCK(?)", [SYNC_LOCK_NAME]);
      } catch {
        // Ignore release errors
      }
    }
    lockConnection?.release();
    try {
      await source.close();
    } catch {
      // Ignore close errors
    }
  }
}

// Private Helpers

async function createSyncRun(
  db: any,
  data: {
    startedAt: Date;
    source: "access" | "tcp";
    trigger: "cron" | "manual";
    triggeredBy?: number;
    status: "running" | "locked" | "ok" | "partial" | "failed";
    error?: string | null;
    finishedAt?: Date;
  },
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
    status: "ok" | "partial" | "failed";
    error?: string | null;
    rowsSeen?: number;
    rowsInserted?: number;
    rowsSkipped?: number;
    rowsQuarantined?: number;
    finishedAt: Date;
  },
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
    })
    .where(eq(attendanceSyncRuns.id, runId));
}

async function getLastHwm(
  db: any,
  source: "access" | "tcp",
): Promise<Date | null> {
  const result = await db
    .select({ highWaterMark: attendanceSyncRuns.highWaterMark })
    .from(attendanceSyncRuns)
    .where(
      and(
        eq(attendanceSyncRuns.source, source),
        inArray(attendanceSyncRuns.status, ["ok", "partial"]),
      ),
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
    })
    .where(eq(attendanceSyncRuns.id, runId));
}

/** Clear the stored high-water mark on all 'access'-source runs, so the
 * next pull restarts from the default January 1 window. */
export async function resetSyncHistory(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(attendanceSyncRuns)
    .set({
      highWaterMark: null,
    })
    .where(eq(attendanceSyncRuns.source, "access"));
}

/** Pin the fk_ef10k high-water mark to the 2026-01-01 baseline: FK devices
 * return their full on-device history, so the reset must be bounded or the
 * next pull reimports all of it. */
export async function resetFkSyncHistory(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // FK devices return their entire on-device history. Keep the reset bounded
  // so the next pull starts at the attendance system's 2026 baseline.
  const fkResetStart = new Date(2026, 0, 1, 0, 0, 0, 0);
  await db
    .update(attendanceSyncRuns)
    .set({ highWaterMark: fkResetStart })
    .where(eq((attendanceSyncRuns as any).deviceId, "fk_ef10k"));
}

/** Pin the high-water mark of every zk_* device (device id is zk_<ip>) to
 * the 2026-01-01 baseline. */
export async function resetZkSyncHistory(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(attendanceSyncRuns)
    .set({ highWaterMark: new Date(2026, 0, 1, 0, 0, 0, 0) })
    .where(sql`${(attendanceSyncRuns as any).deviceId} LIKE 'zk_%'`);
}

/** Flatten an error for storage in run history, masking absolute Windows
 * and Unix paths so local filesystem layout never reaches the DB. */
function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    // Remove sensitive paths and env values
    let msg = err.message;
    msg = msg.replace(/[A-Z]:\\[^\s"']+/g, "(path)");
    msg = msg.replace(/\/[^\s"']+/g, "(path)");
    return msg;
  }
  return "Unknown error during sync";
}
