/**
 * Marketing generation and publishing scheduler
 *
 * Checks enabled slots on startup and every five minutes. Each check requires:
 *   1. autoPublish setting is enabled
 *   2. The current Cairo day has reached publishHour
 *   3. Today matches the page calendar and the topic slot is enabled
 *   4. No non-failed post already exists for that day today (duplicate guard)
 *
 * Starts a persisted Manus job; the worker publishes scheduled posts after generation.
 */

import cron from "node-cron";
import { setMarketingSchedulerStatus } from "./schedulerStatus";
import {
  claimMarketingSchedule,
  releaseUnusedMarketingSchedule,
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
import type { MarketingPageTarget } from "./page.service";

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

export function getDueMarketingSlot(
  settings: Pick<
    MarketingPageTarget,
    | "pageRole"
    | "autoPublish"
    | "publishHour"
    | "saturdayEnabled"
    | "tuesdayEnabled"
    | "thursdayEnabled"
  >,
  date = new Date(),
): PostDay | null {
  if (!settings.autoPublish) return null;
  const now = getCairoScheduleParts(date);
  if (now.hour < settings.publishHour) return null;
  const day = marketingSlotForWeekday(settings.pageRole, now.jsDay);
  const enabled =
    day === "saturday"
      ? settings.saturdayEnabled
      : day === "tuesday"
        ? settings.tuesdayEnabled
        : day === "thursday" && settings.thursdayEnabled;
  return day && enabled ? day : null;
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

  let unusedClaim: { id: string; provider: "manus" | "central" } | undefined;
  let generationAccepted = false;
  const onAccepted = async () => {
    generationAccepted = true;
  };
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
      return {
        ok: true,
        skipped: "كل موضوعات هذه الفئة سبق نشرها؛ أضف موضوعات جديدة",
      };
    }
    const claim = await claimMarketingSchedule(id, pageRole);
    if (!claim.claimed) {
      return {
        ok: true,
        skipped:
          "This page/day generation is already reserved; inspect its existing job",
        jobId: id,
      };
    }
    unusedClaim = { id, provider: claim.provider };
    await setMarketingSchedulerStatus(pageRole, "running");
    await log(
      null,
      "scheduler_run",
      "info",
      `Starting scheduled post for ${day}`,
    );
    const generationInput = {
      requestId: id,
      topic,
      postDay: day,
      pageRole,
    };
    if (claim.provider === "central") {
      const result = await generateCentralMarketingDraft(
        generationInput,
        null,
        onAccepted,
      );
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
        await publishMarketingPost(result.postId, pageRole, {
          pageId: pageTarget.pageId,
          requireAutoPublish: true,
          schedulerProvider: "central",
        });
        published = true;
      }
      await setMarketingSchedulerStatus(pageRole, "idle");
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
      onAccepted,
    });
    await setMarketingSchedulerStatus(pageRole, "idle");
    return { ok: true, jobId: result.jobId, published: false };
  } catch (error) {
    try {
      await setMarketingSchedulerStatus(pageRole, "error");
    } finally {
      if (unusedClaim && !generationAccepted)
        await releaseUnusedMarketingSchedule(
          unusedClaim.id,
          unusedClaim.provider,
        );
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "تعذر بدء التوليد",
    };
  }
}

// ─── Cron initializer ─────────────────────────────────────────────────────────

let initialized = false;
let marketingCatchupRunning = false;

async function checkDueMarketingPosts() {
  if (marketingCatchupRunning) return;
  marketingCatchupRunning = true;
  try {
    for (const pageRole of ["center", "doctor"] as const) {
      try {
        const target = await getMarketingPageTarget(pageRole);
        if (!target) continue;
        const day = getDueMarketingSlot(target);
        if (!day) continue;
        const result = await runScheduledPost(day, pageRole);
        if (!result.ok)
          await log(
            null,
            "scheduler_run",
            "error",
            result.error ?? "Scheduled generation failed",
          );
      } catch (error) {
        console.error(
          `[marketing-scheduler] Could not check ${pageRole}`,
          error,
        );
      }
    }
  } finally {
    marketingCatchupRunning = false;
  }
}

export function initMarketingScheduler(): void {
  if (initialized) return;
  initialized = true;

  // Repeated checks cover downtime; durable page/day claims prevent duplicate work.
  cron.schedule("*/5 * * * *", checkDueMarketingPosts, {
    timezone: CAIRO_TIME_ZONE,
  });
  void checkDueMarketingPosts();

  console.log(
    "[marketing-scheduler] Initialized — startup and five-minute same-day catch-up",
  );
}
