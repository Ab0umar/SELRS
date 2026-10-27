import { consumeLoginRateLimit } from "../db";

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

export const GUEST_BOOKING_LIMITS = {
  perIpPerHour: 5,
  perPhonePerDay: 3,
  globalPerHour: 300,
} as const;

export type GuestBookingLimitResult =
  | { allowed: true; firstForPhone: boolean }
  | { allowed: false; scope: "ip" | "phone" | "global" };

/**
 * The booking form is public and each accepted request can message the phone
 * number the visitor typed, so cap it per client, per number and overall.
 * A null counter means the database is unreachable; the insert would fail too.
 */
export async function checkGuestBookingLimits(
  clientIp: string,
  phone: string,
  now = new Date(),
): Promise<GuestBookingLimitResult> {
  const ip = await consumeLoginRateLimit(
    `guest-booking:ip:${clientIp}`,
    now,
    HOUR_MS,
  );
  if (ip !== null && ip > GUEST_BOOKING_LIMITS.perIpPerHour) {
    return { allowed: false, scope: "ip" };
  }
  const perPhone = await consumeLoginRateLimit(
    `guest-booking:phone:${phone}`,
    now,
    DAY_MS,
  );
  if (perPhone !== null && perPhone > GUEST_BOOKING_LIMITS.perPhonePerDay) {
    return { allowed: false, scope: "phone" };
  }
  const all = await consumeLoginRateLimit("guest-booking:all", now, HOUR_MS);
  if (all !== null && all > GUEST_BOOKING_LIMITS.globalPerHour) {
    return { allowed: false, scope: "global" };
  }
  return { allowed: true, firstForPhone: perPhone === null || perPhone === 1 };
}
