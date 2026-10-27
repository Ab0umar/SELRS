import { and, isNotNull, lt, or } from "drizzle-orm";
import {
  authSessions,
  loginRateLimits,
  patientPortalOtps,
  patientPortalSessions,
} from "../../drizzle/schema";
import { getDb } from "../db";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes rows that can never be used again: elapsed rate-limit windows,
 * expired or long-revoked staff sessions, expired patient OTPs and patient
 * portal sessions that expired more than 30 days ago (kept a while so a late
 * push still resolves).
 */
export async function purgeExpiredRows(now = new Date()) {
  const db = await getDb();
  if (!db) return null;

  const count = (result: any) => Number(result?.[0]?.affectedRows ?? 0);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);
  const dayAgo = new Date(now.getTime() - DAY_MS);

  return {
    loginRateLimits: count(
      await db.delete(loginRateLimits).where(lt(loginRateLimits.resetAt, now)),
    ),
    authSessions: count(
      await db
        .delete(authSessions)
        .where(
          or(
            lt(authSessions.expiresAt, weekAgo),
            and(
              isNotNull(authSessions.revokedAt),
              lt(authSessions.revokedAt, weekAgo),
            ),
          ),
        ),
    ),
    patientPortalOtps: count(
      await db
        .delete(patientPortalOtps)
        .where(lt(patientPortalOtps.expiresAt, dayAgo)),
    ),
    patientPortalSessions: count(
      await db
        .delete(patientPortalSessions)
        .where(lt(patientPortalSessions.expiresAt, monthAgo)),
    ),
  };
}

export function startExpiredRowsPurge(intervalMs = 6 * 60 * 60 * 1000) {
  const run = () =>
    purgeExpiredRows().catch((err) =>
      console.error("[purge] failed:", String(err?.message ?? err)),
    );
  void run();
  return setInterval(run, intervalMs).unref();
}
