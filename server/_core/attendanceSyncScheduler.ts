/**
 * Attendance Sync Scheduler
 * Two-tier cron: every 2 min during business hours, every 15 min off-hours
 * Non-blocking: errors logged, server startup not affected
 */

import { FKDeviceSyncService } from '../services/attendance/fkDeviceSyncService';
import { FKAttendLogPuller } from '../services/attendance/fkAttendLogPuller';

function asBool(value: unknown, fallback = false): boolean {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

let started = false;

const ATTENDANCE_ENABLED = asBool(process.env.ATTENDANCE_ENABLED, true);
const BUSINESS_HOURS_START = toNumber(process.env.ATTENDANCE_BIZ_HOURS_START, 8); // 08:00
const BUSINESS_HOURS_END = toNumber(process.env.ATTENDANCE_BIZ_HOURS_END, 17); // 17:00
const BIZ_INTERVAL_MS = toNumber(process.env.ATTENDANCE_SYNC_BIZ_INTERVAL_MS, 2 * 60_000); // 2 min
const OFFHOURS_INTERVAL_MS = toNumber(process.env.ATTENDANCE_SYNC_OFFHOURS_INTERVAL_MS, 15 * 60_000); // 15 min

function isBusinessHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

function getCurrentIntervalMs(): number {
  return isBusinessHours() ? BIZ_INTERVAL_MS : OFFHOURS_INTERVAL_MS;
}

export function startAttendanceSyncScheduler() {
  if (started) return;
  started = true;

  if (!ATTENDANCE_ENABLED) {
    console.log('[attendance] disabled, scheduler not started');
    return;
  }

  if (!FKAttendLogPuller.isPullerAvailable()) {
    console.warn(`[attendance] FKOldLogPuller.exe not found at ${FKAttendLogPuller.getPullerPath()}, scheduler not started`);
    return;
  }

  let running = false;

  const tick = async () => {
    if (running) {
      console.debug('[attendance] sync already running, skipping tick');
      return;
    }

    const interval = getCurrentIntervalMs();
    const nextRunAt = new Date(Date.now() + interval).toISOString();
    console.debug(`[attendance] next sync scheduled for ${nextRunAt}`);

    try {
      running = true;
      const result = await FKDeviceSyncService.syncNow();
      if (result.success) {
        console.log(
          `[attendance] sync ok: inserted=${result.recordsInserted} seen=${result.recordsSeen} skipped=${result.recordsSkipped}`
        );
      } else {
        console.error(`[attendance] sync failed: ${result.error}`);
      }
    } catch (err) {
      console.error('[attendance] sync error:', err instanceof Error ? err.message : String(err));
    } finally {
      running = false;
    }
  };

  // Start first tick
  const initialInterval = getCurrentIntervalMs();
  console.log(
    `[attendance] scheduler started: business=${BIZ_INTERVAL_MS}ms off-hours=${OFFHOURS_INTERVAL_MS}ms`
  );
  setTimeout(tick, initialInterval);
}
