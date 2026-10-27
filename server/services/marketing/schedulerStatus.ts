import { eq } from "drizzle-orm";
import { getDb } from "../../db";
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
