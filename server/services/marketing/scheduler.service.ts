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
import { planMarketingTopic } from "./topicPlanner";
import {
  recordMarketingSchedulerSkip,
  setMarketingSchedulerStatus,
} from "./schedulerStatus";
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
import { eq, and, gte, lt } from "drizzle-orm";
import { getDb } from "../../db";
import {
  marketingPosts,
  marketingLogs,
  marketingGenerationJobs,
} from "../../../drizzle/schema";
import type { PostDay } from "./topicRotation";
import {
  ORPHANED_START_ERROR,
  startManusGeneration,
} from "./manusGeneration.service";
import { finishScheduledDraft, notifyMarketingAdmins } from "./marketingReview";
import { initScheduledPostWorker } from "./contentCalendar";
import { initMarketingPostStatsWorker } from "./postInsights";
import {
  clearMarketingStartFailures,
  marketingStartAllowed,
  recordMarketingStartFailure,
} from "./schedulerBackoff";
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

/** UTC instant of 00:00 today in Cairo. */
export function cairoDayStart(date = new Date()): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CAIRO_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offset = wall - Math.floor(date.getTime() / 1000) * 1000;
  return new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) -
      offset,
  );
}

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

async function definitelyFailedJob(id: string) {
  const db = await getDb();
  if (!db) return false;
  const [job] = await db
    .select({
      state: marketingGenerationJobs.state,
      error: marketingGenerationJobs.error,
    })
    .from(marketingGenerationJobs)
    .where(eq(marketingGenerationJobs.id, id));
  return (
    job?.state === "failed" &&
    !String(job.error ?? "").startsWith(ORPHANED_START_ERROR)
  );
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
  const todayStart = cairoDayStart();

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

  const planned = await db
    .select({ id: marketingPosts.id, status: marketingPosts.status })
    .from(marketingPosts)
    .where(
      and(
        eq(marketingPosts.pageRole, pageRole),
        gte(marketingPosts.scheduledAt, todayStart),
        lt(
          marketingPosts.scheduledAt,
          new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
        ),
      ),
    );
  // A post planned for today (calendar or "generate this week") fills the slot.
  const existing = [...todayPosts, ...planned].filter(
    (p: any) => p.status !== "failed",
  );
  if (existing.length > 0) {
    await recordMarketingSchedulerSkip(
      pageRole,
      `يوجد منشور لهذا اليوم بالفعل (رقم ${existing[0]!.id})، لذلك لم يبدأ التوليد المجدول`,
    );
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
    const scheduleId = (seed: string) => {
      const hash = createHash("sha256").update(seed).digest("hex").slice(0, 32);
      return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    };
    const seed = `marketing:${today}:${day}:${pageRole}`;
    let id = scheduleId(seed);
    let claim = await claimMarketingSchedule(id, pageRole);
    // One automatic second attempt when the day's job definitely failed.
    if (!claim.claimed && (await definitelyFailedJob(id))) {
      id = scheduleId(`${seed}:retry`);
      claim = await claimMarketingSchedule(id, pageRole);
    }
    if (!claim.claimed) {
      return {
        ok: true,
        skipped:
          "This page/day generation is already reserved; inspect its existing job",
        jobId: id,
      };
    }
    unusedClaim = { id, provider: claim.provider };
    const topic = await planMarketingTopic();
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
      const postId = result.postId;
      const published = await finishScheduledDraft(
        postId,
        pageRole,
        Boolean(
          currentTarget?.autoPublish &&
          currentTarget.pageId === pageTarget.pageId &&
          currentProvider === "central",
        ),
        () =>
          publishMarketingPost(postId, pageRole, {
            pageId: pageTarget.pageId,
            requireAutoPublish: true,
            schedulerProvider: "central",
          }),
      );
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
        if (!marketingStartAllowed(pageRole)) continue;
        const result = await runScheduledPost(day, pageRole);
        if (result.ok) clearMarketingStartFailures(pageRole);
        else recordMarketingStartFailure(pageRole);
        if (!result.ok)
          await notifyMarketingAdmins({
            title: "تعذر التوليد المجدول",
            message: (result.error ?? "فشل التوليد المجدول").slice(0, 300),
            kind: "error",
          });
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
  initScheduledPostWorker();
  initMarketingPostStatsWorker();

  console.log(
    "[marketing-scheduler] Initialized — startup and five-minute same-day catch-up",
  );
}
