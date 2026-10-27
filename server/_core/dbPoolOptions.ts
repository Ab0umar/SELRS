function intFromEnv(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Pool sizing for the main MySQL connection. `queueLimit` is bounded so a
 * stalled database makes new requests fail fast instead of queueing forever.
 */
export function getDbPoolOptions(env: NodeJS.ProcessEnv = process.env) {
  const connectionLimit = intFromEnv(env.DB_POOL_LIMIT, 20, 2, 100);
  return {
    connectionLimit,
    maxIdle: Math.min(connectionLimit, 10),
    idleTimeout: 60_000,
    waitForConnections: true,
    queueLimit: intFromEnv(env.DB_POOL_QUEUE_LIMIT, 200, 1, 10_000),
  };
}
