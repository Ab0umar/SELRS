/**
 * Marketing generation and publishing scheduler
 *
 * Runs hourly via node-cron.  On each fire it checks:
 *   1. autoPublish setting is enabled
 *   2. Current Cairo hour matches publishHour
 *   3. Today is Saturday / Tuesday / Thursday and the day is enabled
 *   4. No non-failed post already exists for that day today (duplicate guard)
 *
 * Starts a persisted Manus job; the worker publishes scheduled posts after generation.
 */

import cron from "node-cron";
import { eq, and, gte } from "drizzle-orm";
import { count as drizzleCount } from "drizzle-orm";
import { getDb } from "../../db";
import {
  marketingPosts,
  marketingSettings,
  marketingLogs,
} from "../../../drizzle/schema";
import { pickTopic, type PostDay } from "./topicRotation";
import { startManusGeneration } from "./manusGeneration.service";
import { getMarketingPageTarget, type MarketingPageRole } from "./page.service";

// ─── Day mapping ──────────────────────────────────────────────────────────────

/** JS getDay() → PostDay.  Only Sat/Tue/Thu are scheduled. */
const JS_DAY_TO_POST_DAY: Record<number, PostDay> = {
  6: "saturday",
  2: "tuesday",
  4: "thursday",
};

const CAIRO_TIME_ZONE = "Africa/Cairo";
const CAIRO_WEEKDAY_TO_JS_DAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getCairoScheduleParts(date = new Date()): {
  jsDay: number;
  hour: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = parts.find((part) => part.type === "hour")?.value;
  const jsDay =
    weekday === undefined ? -1 : (CAIRO_WEEKDAY_TO_JS_DAY[weekday] ?? -1);
  return { jsDay, hour: hour === undefined ? -1 : Number(hour) };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function log(
  postId: number | null,
  action: string,
  status: "success" | "error" | "info",
  message: string,
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(marketingLogs).values({ postId, action, status, message });
  } catch {}
}

async function setSchedulerStatus(status: "idle" | "running" | "error") {
  try {
    const db = await getDb();
    if (!db) return;
    const [row] = await db
      .select({ id: marketingSettings.id })
      .from(marketingSettings)
      .limit(1);
    if (!row) return;
    await db
      .update(marketingSettings)
      .set({
        schedulerStatus: status,
        ...(status !== "running" ? { lastSchedulerRun: new Date() } : {}),
      })
      .where(eq(marketingSettings.id, row.id));
  } catch {}
}

// ─── Public: compute next scheduled time ─────────────────────────────────────

export function getNextScheduledTime(settings: {
  saturdayEnabled: boolean;
  tuesdayEnabled: boolean;
  thursdayEnabled: boolean;
  publishHour: number;
}): { day: PostDay; date: Date } | null {
  const candidates: Array<{ jsDay: number; day: PostDay }> = [
    { jsDay: 6, day: "saturday" as PostDay },
    { jsDay: 2, day: "tuesday" as PostDay },
    { jsDay: 4, day: "thursday" as PostDay },
  ];
  const enabled = candidates.filter(({ day }) =>
    day === "saturday"
      ? settings.saturdayEnabled
      : day === "tuesday"
        ? settings.tuesdayEnabled
        : settings.thursdayEnabled,
  );

  if (enabled.length === 0) return null;

  const now = new Date();
  const firstHour = new Date(now);
  firstHour.setMinutes(0, 0, 0);
  for (let offset = 0; offset <= 24 * 14; offset++) {
    const candidate = new Date(firstHour);
    candidate.setHours(firstHour.getHours() + offset);
    if (candidate <= now) continue;
    const cairo = getCairoScheduleParts(candidate);
    if (cairo.hour !== settings.publishHour) continue;
    const match = enabled.find((d) => d.jsDay === cairo.jsDay);
    if (match) return { day: match.day, date: candidate };
  }
  return null;
}

// ─── Core run function ────────────────────────────────────────────────────────

export interface SchedulerRunResult {
  ok: boolean;
  skipped?: string;
  postId?: number;
  published?: boolean;
  error?: string;
  jobId?: string;
}

export async function runScheduledPost(
  day: PostDay,
  pageRole: MarketingPageRole = "center",
): Promise<SchedulerRunResult> {
  const db = await getDb();
  if (!db) return { ok: false, error: "Database not available" };

  const pageTarget = await getMarketingPageTarget(pageRole);
  if (!pageTarget) {
    return {
      ok: false,
      error:
        pageRole === "doctor"
          ? "اربط صفحة الدكتور قبل تفعيل النشر التلقائي"
          : "اربط صفحة المركز قبل تفعيل النشر التلقائي",
    };
  }

  // Day enabled?
  const dayEnabled =
    day === "saturday"
      ? pageTarget.saturdayEnabled
      : day === "tuesday"
        ? pageTarget.tuesdayEnabled
        : pageTarget.thursdayEnabled;

  if (!dayEnabled) {
    return { ok: true, skipped: `Day "${day}" is disabled in settings` };
  }

  // Duplicate guard: non-failed post already exists today for this day?
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayPosts = await db
    .select({ id: marketingPosts.id, status: marketingPosts.status })
    .from(marketingPosts)
    .where(
      and(
        eq(marketingPosts.postDay, day),
        eq(marketingPosts.pageRole, pageRole),
        gte(marketingPosts.createdAt, todayStart),
      ),
    );

  const existing = todayPosts.filter((p: any) => p.status !== "failed");
  if (existing.length > 0) {
    return {
      ok: true,
      skipped: `Post already exists for ${day} today (id: ${existing[0]!.id})`,
    };
  }

  await setSchedulerStatus("running");
  await log(
    null,
    "scheduler_run",
    "info",
    `Starting scheduled post for ${day}`,
  );

  try {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Cairo",
    });
    const { createHash } = await import("node:crypto");
    const requestId = createHash("sha256")
      .update(`marketing:${today}:${day}:${pageRole}`)
      .digest("hex")
      .slice(0, 32);
    const id = `${requestId.slice(0, 8)}-${requestId.slice(8, 12)}-4${requestId.slice(13, 16)}-a${requestId.slice(17, 20)}-${requestId.slice(20, 32)}`;
    const [countRow] = await db
      .select({ total: drizzleCount() })
      .from(marketingPosts)
      .where(
        and(
          eq(marketingPosts.postDay, day),
          eq(marketingPosts.pageRole, pageRole),
        ),
      );
    const result = await startManusGeneration({
      requestId: id,
      topic: pickTopic(day, countRow?.total ?? 0, pageTarget.topicDirection),
      postDay: day,
      pageRole,
      createdBy: null,
    });
    await setSchedulerStatus("idle");
    return { ok: true, jobId: result.jobId, published: false };
  } catch (error) {
    await setSchedulerStatus("error");
    return {
      ok: false,
      error: error instanceof Error ? error.message : "تعذر بدء التوليد",
    };
  }
}

// ─── Cron initializer ─────────────────────────────────────────────────────────

let initialized = false;

export function initMarketingScheduler(): void {
  if (initialized) return;
  initialized = true;

  // Fire at minute 0 of every hour; inner logic checks day + hour against settings
  cron.schedule("0 * * * *", async () => {
    try {
      const db = await getDb();
      if (!db) return;

      const now = getCairoScheduleParts();
      const postDay = JS_DAY_TO_POST_DAY[now.jsDay];
      if (!postDay) return;
      for (const pageRole of ["center", "doctor"] as const) {
        const pageTarget = await getMarketingPageTarget(pageRole);
        if (!pageTarget?.autoPublish || now.hour !== pageTarget.publishHour)
          continue;
        await runScheduledPost(postDay, pageRole);
      }
    } catch (err) {
      console.error("[marketing-scheduler] Cron error:", err);
    }
  });

  console.log(
    "[marketing-scheduler] Initialized — fires hourly, checks autoPublish + day settings",
  );
}
