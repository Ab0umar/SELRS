/**
 * Marketing generation and publishing scheduler
 *
 * Runs hourly via node-cron.  On each fire it checks:
 *   1. autoPublish setting is enabled
 *   2. Current Cairo hour matches publishHour
 *   3. Today matches the page calendar and the topic slot is enabled
 *   4. No non-failed post already exists for that day today (duplicate guard)
 *
 * Starts a persisted Manus job; the worker publishes scheduled posts after generation.
 */

import cron from "node-cron";
import {
  claimMarketingSchedule,
  marketingSchedulerProviders,
} from "../ai/marketingScheduler";
import { generateCentralMarketingDraft } from "../ai/marketingDraft";
import { publishMarketingPost } from "./publish.service";
import {
  MARKETING_SCHEDULE,
  marketingSlotForWeekday,
} from "../../../shared/marketingSchedule";
import { eq, and, gte } from "drizzle-orm";
import { count as drizzleCount } from "drizzle-orm";
import { getDb } from "../../db";
import {
  marketingPosts,
  marketingSettings,
  marketingLogs,
} from "../../../drizzle/schema";
import { pickUnpublishedTopic, type PostDay } from "./topicRotation";
import { publishedMarketingTopics } from "./topicHistory";
import { startManusGeneration } from "./manusGeneration.service";
import { getMarketingPageTarget, type MarketingPageRole } from "./page.service";

// ─── Day mapping ──────────────────────────────────────────────────────────────

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
  pageRole?: MarketingPageRole;
}): { day: PostDay; date: Date } | null {
  const candidates: Array<{ jsDay: number; day: PostDay }> = [
    {
      jsDay: MARKETING_SCHEDULE[settings.pageRole ?? "center"].saturday.jsDay,
      day: "saturday",
    },
    {
      jsDay: MARKETING_SCHEDULE[settings.pageRole ?? "center"].tuesday.jsDay,
      day: "tuesday",
    },
    {
      jsDay: MARKETING_SCHEDULE[settings.pageRole ?? "center"].thursday.jsDay,
      day: "thursday",
    },
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
    const topic = pickUnpublishedTopic(
      day,
      countRow?.total ?? 0,
      await publishedMarketingTopics(),
      pageTarget.topicDirection,
    );
    if (!topic) {
      await setSchedulerStatus("idle");
      return {
        ok: true,
        skipped: "كل موضوعات هذه الفئة سبق نشرها؛ أضف موضوعات جديدة",
      };
    }
    const claim = await claimMarketingSchedule(id, pageRole);
    if (!claim.claimed) {
      await setSchedulerStatus("idle");
      return {
        ok: true,
        skipped:
          "This page/day generation is already reserved; inspect its existing job",
        jobId: id,
      };
    }
    const generationInput = {
      requestId: id,
      topic,
      postDay: day,
      pageRole,
    };
    if (claim.provider === "central") {
      const result = await generateCentralMarketingDraft(generationInput, null);
      if (result.state !== "completed" || !result.postId)
        throw new Error(
          "توليد الجدولة غير محسوم؛ راجع المهمة قبل المحاولة مرة أخرى",
        );
      const currentTarget = await getMarketingPageTarget(pageRole);
      const currentProvider = (await marketingSchedulerProviders()).find(
        (setting) => setting.pageRole === pageRole,
      )?.provider;
      let published = false;
      if (
        currentTarget?.autoPublish &&
        currentTarget.pageId === pageTarget.pageId &&
        currentProvider === "central"
      ) {
        await publishMarketingPost(result.postId, pageRole);
        published = true;
      }
      await setSchedulerStatus("idle");
      return {
        ok: true,
        jobId: result.jobId,
        postId: result.postId,
        published,
      };
    }
    const result = await startManusGeneration({
      ...generationInput,
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
      for (const pageRole of ["center", "doctor"] as const) {
        const postDay = marketingSlotForWeekday(pageRole, now.jsDay);
        if (!postDay) continue;
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
