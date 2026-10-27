import { sql, type SQL } from "drizzle-orm";

/** `login_rate_limits.key` is varchar(255); user-controlled parts (username, phone) must not overflow it. */
export const RATE_LIMIT_KEY_MAX = 255;

export function normalizeRateLimitKey(key: string): string {
  return key.slice(0, RATE_LIMIT_KEY_MAX);
}

/**
 * Single-statement counter: the increment happens inside MySQL, so concurrent
 * attempts (for example a tRPC batch, which runs its calls in parallel) each
 * add one instead of all reading the same stale value and writing the same
 * `attempts + 1`. An expired window restarts at 1 with a fresh reset time.
 * Assignments run left to right, so `attempts` still sees the old `reset_at`.
 */
export function buildConsumeRateLimitSql(
  key: string,
  now: Date,
  windowMs: number,
): SQL {
  const resetAt = new Date(now.getTime() + windowMs);
  return sql`INSERT INTO login_rate_limits (\`key\`, attempts, reset_at)
    VALUES (${normalizeRateLimitKey(key)}, 1, ${resetAt})
    ON DUPLICATE KEY UPDATE
      attempts = IF(reset_at > ${now}, attempts + 1, 1),
      reset_at = IF(reset_at > ${now}, reset_at, VALUES(reset_at))`;
}
