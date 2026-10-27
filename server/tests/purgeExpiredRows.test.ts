import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authSessions,
  loginRateLimits,
  patientPortalOtps,
} from "../../drizzle/schema";
import { purgeExpiredRows } from "../lib/purgeExpiredRows";
import { cleanupTables, getTestDb } from "./setup";

const NOW = new Date("2026-06-15T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * 86400000);

describe.sequential("purgeExpiredRows", () => {
  const tables = ["login_rate_limits", "auth_sessions", "patient_portal_otps"];
  beforeEach(async () => cleanupTables(await getTestDb(), ...tables));
  afterEach(async () => cleanupTables(await getTestDb(), ...tables));

  it("removes dead rows and keeps live ones", async () => {
    const db = await getTestDb();
    await db.insert(loginRateLimits).values([
      { key: "old", attempts: 3, resetAt: daysAgo(1) },
      { key: "live", attempts: 3, resetAt: daysAhead(1) },
    ]);
    await db.insert(authSessions).values([
      { id: "expired", userId: 1, expiresAt: daysAgo(10) },
      { id: "recent-expired", userId: 1, expiresAt: daysAgo(1) },
      { id: "revoked-old", userId: 1, expiresAt: daysAhead(5), revokedAt: daysAgo(8) },
      { id: "revoked-new", userId: 1, expiresAt: daysAhead(5), revokedAt: daysAgo(1) },
      { id: "live", userId: 1, expiresAt: daysAhead(5) },
    ] as any);
    await db.insert(patientPortalOtps).values([
      { phone: "010", code: "111111", expiresAt: daysAgo(2) },
      { phone: "011", code: "222222", expiresAt: daysAhead(1) },
    ]);

    const result = await purgeExpiredRows(NOW);
    expect(result).toMatchObject({ loginRateLimits: 1, authSessions: 2, patientPortalOtps: 1 });

    const left = (await db.select().from(authSessions)).map((r: any) => r.id).sort();
    expect(left).toEqual(["live", "recent-expired", "revoked-new"]);
    expect((await db.select().from(loginRateLimits)).map((r: any) => r.key)).toEqual(["live"]);
    expect(await db.select().from(patientPortalOtps)).toHaveLength(1);
  });
});
