/**
 * Attendance Sync Scheduler
 * Two-tier cron: every 2 min during business hours, every 15 min off-hours
 * Non-blocking: errors logged, server startup not affected
 */

import { FKDeviceSyncService } from "../services/attendance/fkDeviceSyncService";
import { FKAttendLogPuller } from "../services/attendance/fkAttendLogPuller";
import { ZK4370SyncService } from "../services/attendance/zk4370Sync.service";
import { DeviceSettingsService } from "../services/attendance/deviceSettings.service";
import { dailyMaterializer } from "../services/attendance/dailyMaterializer";
import { pruneAttendanceSyncRuns } from "../services/attendance/syncRunRetention";

function asBool(value: unknown, fallback = false): boolean {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

let started = false;
let lastNightlyRecomputeDate = ""; // YYYY-MM-DD; in-memory marker (recompute is idempotent)

const ATTENDANCE_ENABLED = asBool(process.env.ATTENDANCE_ENABLED, true);
// The EF10K already streams real-time punches, so its scheduled pull is opt-in.
// The K40 (ZK) over TCP/IP has no push channel and must be pulled.
const FK_AUTOSYNC = asBool(process.env.ATTENDANCE_FK_AUTOSYNC, false);
const BUSINESS_HOURS_START = toNumber(
  process.env.ATTENDANCE_BIZ_HOURS_START,
  8,
); // 08:00
const BUSINESS_HOURS_END = toNumber(process.env.ATTENDANCE_BIZ_HOURS_END, 17); // 17:00
const BIZ_INTERVAL_MS = toNumber(
  process.env.ATTENDANCE_SYNC_BIZ_INTERVAL_MS,
  2 * 60_000,
); // 2 min
const OFFHOURS_INTERVAL_MS = toNumber(
  process.env.ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS,
  15 * 60_000,
); // 15 min

function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

function getCurrentIntervalMs(): number {
  return isBusinessHours() ? BIZ_INTERVAL_MS : OFFHOURS_INTERVAL_MS;
}

const NIGHTLY_RETRY_MS = 60 * 60 * 1000;
let lastNightlyAttemptAt = 0;

async function runNightlyRecomputeIfDue(): Promise<void> {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (now.getHours() < 2 || lastNightlyRecomputeDate === todayStr) return;
  // After a failure, retry at most once an hour instead of on every tick.
  if (now.getTime() - lastNightlyAttemptAt < NIGHTLY_RETRY_MS) return;
  lastNightlyAttemptAt = now.getTime();

  try {
    await pruneAttendanceSyncRuns();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const rowsWritten = await dailyMaterializer.recomputeRange(
      sevenDaysAgo,
      now,
      undefined,
      undefined,
      { recomputeMonthly: true },
    );
    console.log(
      `[attendance] nightly recompute done: rowsWritten=${rowsWritten}`,
    );
    lastNightlyRecomputeDate = todayStr;
  } catch (err) {
    console.error(
      "[attendance] nightly recompute error:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

let nightlyStarted = false;

/**
 * Nightly materialization only (no device pulls). Without it, absence rows for
 * days nobody punched after an employee's shift started are never written, and
 * payroll under-deducts. Safe to run while the device scheduler stays off.
 */
export function startAttendanceNightlyRecompute() {
  if (nightlyStarted || !ATTENDANCE_ENABLED) return;
  nightlyStarted = true;
  const timer = setInterval(
    () => {
      void runNightlyRecomputeIfDue();
    },
    10 * 60_000,
  );
  timer.unref?.();
  console.log("[attendance] nightly recompute scheduler started");
}

export function startAttendanceSyncScheduler() {
  if (started) return;
  started = true;

  if (!ATTENDANCE_ENABLED) {
    console.log("[attendance] disabled, scheduler not started");
    return;
  }

  const fkAvailable = FK_AUTOSYNC && FKAttendLogPuller.isPullerAvailable();
  if (FK_AUTOSYNC && !fkAvailable) {
    console.warn(
      `[attendance:fk] FKOldLogPuller.exe not found at ${FKAttendLogPuller.getPullerPath()}, FK sync disabled`,
    );
  }

  let running = false;

  const tick = async () => {
    if (running) {
      console.debug("[attendance] sync already running, skipping tick");
      return;
    }

    const interval = getCurrentIntervalMs();
    const nextRunAt = new Date(Date.now() + interval).toISOString();
    console.debug(`[attendance] next sync scheduled for ${nextRunAt}`);

    try {
      running = true;

      // FK device (EF10K) — TCP pull
      if (fkAvailable && DeviceSettingsService.getSettings().enabled) {
        try {
          const fkResult = await FKDeviceSyncService.syncNow();
          if (fkResult.success) {
            console.log(
              `[attendance:fk] sync ok: inserted=${fkResult.recordsInserted} seen=${fkResult.recordsSeen} skipped=${fkResult.recordsSkipped}`,
            );
          } else {
            console.error(`[attendance:fk] sync failed: ${fkResult.error}`);
          }
        } catch (fkErr) {
          console.error(
            "[attendance:fk] sync error:",
            fkErr instanceof Error ? fkErr.message : String(fkErr),
          );
        }
      }

      // ZK device (K40 Pro) — TCP pull if enabled and configured
      const k40 = DeviceSettingsService.getK40Settings();
      const zkIp = process.env.ZK4370_IP || k40.ip || "";
      if (k40.enabled && k40.zk40Protocol === "tcp" && zkIp) {
        try {
          const zkResult = await ZK4370SyncService.pull(
            undefined,
            zkIp,
            k40.port ?? 4370,
            k40.commPassword ?? 0,
          );
          if (zkResult.success) {
            console.log(
              `[attendance:zk] sync ok: inserted=${zkResult.recordsInserted} seen=${zkResult.recordsSeen} skipped=${zkResult.recordsSkipped}`,
            );
          } else {
            console.error(`[attendance:zk] sync failed: ${zkResult.error}`);
          }
        } catch (zkErr) {
          console.error(
            "[attendance:zk] sync error:",
            zkErr instanceof Error ? zkErr.message : String(zkErr),
          );
        }
      }
    } catch (err) {
      console.error(
        "[attendance] sync error:",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      running = false;
    }

    // Nightly safety-net recompute at 02:30 (last 7 days)
    await runNightlyRecomputeIfDue();

    // Schedule next tick
    setTimeout(tick, getCurrentIntervalMs());
  };

  // Start first tick
  console.log(
    `[attendance] scheduler started: business=${BIZ_INTERVAL_MS}ms off-hours=${OFFHOURS_INTERVAL_MS}ms`,
  );
  setTimeout(tick, getCurrentIntervalMs());
}
