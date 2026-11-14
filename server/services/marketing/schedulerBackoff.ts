// In-memory: a server restart resets the backoff and allows an immediate attempt.
export const MARKETING_RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
] as const;

type Entry = { day: string; failures: number; nextAt: number };
const entries = new Map<string, Entry>();

function cairoDay(now: number) {
  return new Date(now).toLocaleDateString("en-CA", {
    timeZone: "Africa/Cairo",
  });
}

/** False while the page waits out its backoff, or after the last delay until tomorrow. */
export function marketingStartAllowed(pageRole: string, now = Date.now()) {
  const entry = entries.get(pageRole);
  if (!entry || entry.day !== cairoDay(now)) return true;
  if (entry.failures > MARKETING_RETRY_DELAYS_MS.length) return false;
  return now >= entry.nextAt;
}

export function recordMarketingStartFailure(
  pageRole: string,
  now = Date.now(),
) {
  const day = cairoDay(now);
  const previous = entries.get(pageRole);
  const failures = previous?.day === day ? previous.failures + 1 : 1;
  const delay = MARKETING_RETRY_DELAYS_MS[failures - 1];
  entries.set(pageRole, {
    day,
    failures,
    nextAt: delay === undefined ? Number.POSITIVE_INFINITY : now + delay,
  });
}

export function clearMarketingStartFailures(pageRole: string) {
  entries.delete(pageRole);
}
