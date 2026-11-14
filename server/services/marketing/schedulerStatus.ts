import { eq } from "drizzle-orm";
import { getDb, getSystemSetting, updateSystemSettings } from "../../db";
import { aiMarketingScheduleStatus } from "../../../drizzle/schema";
import type { MarketingPageRole } from "./page.service";

export async function readMarketingSchedulerStatus(
  pageRole: MarketingPageRole,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .select()
    .from(aiMarketingScheduleStatus)
    .where(eq(aiMarketingScheduleStatus.pageRole, pageRole))
    .limit(1);
  return {
    schedulerStatus: row?.status ?? "idle",
    lastSchedulerRun: row?.lastRun ?? null,
    lastSkip: await readMarketingSchedulerSkip(pageRole),
  };
}
export async function setMarketingSchedulerStatus(
  pageRole: MarketingPageRole,
  status: "idle" | "running" | "error",
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const lastRun = status === "running" ? undefined : new Date();
  await db
    .insert(aiMarketingScheduleStatus)
    .values({ pageRole, status, lastRun })
    .onDuplicateKeyUpdate({ set: { status, ...(lastRun ? { lastRun } : {}) } });
}

const skipKey = (pageRole: MarketingPageRole) =>
  `marketing_scheduler_skip_${pageRole}`;

/** Last reason the scheduler skipped this page; shown with the scheduler status. */
export async function recordMarketingSchedulerSkip(
  pageRole: MarketingPageRole,
  reason: string,
) {
  try {
    await updateSystemSettings(skipKey(pageRole), {
      reason,
      at: new Date().toISOString(),
    });
  } catch {
    console.error("[marketing-scheduler] Could not record skip reason");
  }
}

async function readMarketingSchedulerSkip(pageRole: MarketingPageRole) {
  try {
    const row = await getSystemSetting(skipKey(pageRole));
    if (!row?.value) return null;
    const value = JSON.parse(String(row.value)) as {
      reason?: unknown;
      at?: unknown;
    };
    return typeof value.reason === "string" && typeof value.at === "string"
      ? { reason: value.reason, at: value.at }
      : null;
  } catch {
    return null;
  }
}
