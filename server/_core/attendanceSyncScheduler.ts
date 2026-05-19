/**
 * Attendance Sync Scheduler
 * Two-tier cron: every 2 min during business hours, every 15 min off-hours
 * Non-blocking: errors logged, server startup not affected
 */

import { runSyncOnce } from '../services/attendance/syncEngine';

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

const ATTENDANCE_ENABLED = asBool(process.env.ATTENDANCE_ENABLED, false);
const ATTENDANCE_ACCESS_PATH = process.env.ATTENDANCE_ACCESS_PATH ?? '';
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

  if (!ATTENDANCE_ENABLED || !ATTENDANCE_ACCESS_PATH) {
    console.log('[attendance] disabled or not configured, scheduler not started');
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
      const result = await runSyncOnce({ trigger: 'cron' });
      if (result.status === 'ok' || result.status === 'partial') {
        console.log(
          `[attendance] sync ${result.status}: runId=${result.runId} inserted=${result.rowsInserted} seen=${result.rowsSeen}`
        );
      } else if (result.status === 'locked') {
        console.debug(`[attendance] sync locked (another run in progress)`);
      } else {
        console.error(
          `[attendance] sync ${result.status}: runId=${result.runId} error=${result.error}`
        );
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
