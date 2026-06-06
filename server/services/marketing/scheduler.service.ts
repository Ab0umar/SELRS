/**
 * Marketing Auto-publish Scheduler
 *
 * Runs hourly via node-cron.  On each fire it checks:
 *   1. autoPublish setting is enabled
 *   2. Current hour matches publishHour
 *   3. Today is Saturday / Tuesday / Thursday and the day is enabled
 *   4. No non-failed post already exists for that day today (duplicate guard)
 *
 * If all pass → generate content → generate image → publish (or save draft).
 * Every step is logged to marketing_logs; failures never crash the server.
 */

import cron from "node-cron";
import { eq, and, gte } from "drizzle-orm";
import { count as drizzleCount } from "drizzle-orm";
import { getDb } from "../../db";
import {
  marketingPosts,
  marketingSettings,
  marketingBrandProfile,
  marketingLogs,
} from "../../../drizzle/schema";
import { generateMarketingContent } from "./contentGenerator.service";
import { generateMarketingImage, MarketingImageConfigError } from "./imageGenerator.service";
import { publishPostToFacebook } from "./facebookPublisher.service";
import { pickTopic, type PostDay } from "./topicRotation";
import { ENV } from "../../_core/env";

// ─── Day mapping ──────────────────────────────────────────────────────────────

/** JS getDay() → PostDay.  Only Sat/Tue/Thu are scheduled. */
const JS_DAY_TO_POST_DAY: Record<number, PostDay> = {
  6: "saturday",
  2: "tuesday",
  4: "thursday",
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function log(
  postId: number | null,
  action: string,
  status: "success" | "error" | "info",
  message: string
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
    const [row] = await db.select({ id: marketingSettings.id }).from(marketingSettings).limit(1);
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
    day === "saturday" ? settings.saturdayEnabled
    : day === "tuesday" ? settings.tuesdayEnabled
    : settings.thursdayEnabled
  );

  if (enabled.length === 0) return null;

  const now = new Date();
  for (let offset = 0; offset <= 14; offset++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(settings.publishHour, 0, 0, 0);

    // Skip if this slot is already past
    if (candidate <= now) continue;

    const match = enabled.find((d) => d.jsDay === candidate.getDay());
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
}

export async function runScheduledPost(day: PostDay): Promise<SchedulerRunResult> {
  const db = await getDb();
  if (!db) return { ok: false, error: "Database not available" };

  // Load settings
  const [settings] = await db.select().from(marketingSettings).limit(1);
  if (!settings) return { ok: false, error: "No settings row found" };

  // Day enabled?
  const dayEnabled =
    day === "saturday" ? settings.saturdayEnabled
    : day === "tuesday" ? settings.tuesdayEnabled
    : settings.thursdayEnabled;

  if (!dayEnabled) {
    return { ok: true, skipped: `Day "${day}" is disabled in settings` };
  }

  // Duplicate guard: non-failed post already exists today for this day?
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayPosts = await db
    .select({ id: marketingPosts.id, status: marketingPosts.status })
    .from(marketingPosts)
    .where(and(eq(marketingPosts.postDay, day), gte(marketingPosts.createdAt, todayStart)));

  const existing = todayPosts.filter((p) => p.status !== "failed");
  if (existing.length > 0) {
    return {
      ok: true,
      skipped: `Post already exists for ${day} today (id: ${existing[0]!.id})`,
    };
  }

  await setSchedulerStatus("running");
  await log(null, "scheduler_run", "info", `Starting scheduled post for ${day}`);

  let postId = 0;

  try {
    // Topic selection (round-robin)
    const [countRow] = await db
      .select({ total: drizzleCount() })
      .from(marketingPosts)
      .where(eq(marketingPosts.postDay, day));
    const usedCount = countRow?.total ?? 0;
    const topic = pickTopic(day, usedCount);

    // Brand profile
    const [brandRow] = await db.select().from(marketingBrandProfile).limit(1);

    // Generate content
    const clinicName = settings.clinicName ?? "مركزك لطب العيون";
    let generated;
    try {
      generated = await generateMarketingContent(topic, day, brandRow ?? null, clinicName, usedCount);
    } catch (err) {
      await log(null, "scheduler_generate_content", "error", String(err));
      await setSchedulerStatus("error");
      return { ok: false, error: `Content generation failed: ${String(err)}` };
    }

    // Save draft
    const [result] = await db.insert(marketingPosts).values({
      title: generated.title,
      content: generated.content,
      topic,
      idea: generated.idea,
      cta: generated.cta,
      hashtags: generated.hashtags,
      imagePrompt: generated.imagePrompt,
      platform: "facebook",
      postDay: day,
      status: "draft",
      createdBy: null, // system-generated
    });
    postId = (result as { insertId?: number }).insertId ?? 0;
    await log(postId, "scheduler_create_post", "success", `Draft created — topic: ${topic}`);

    // Generate image (best-effort — don't fail post if image fails)
    let imageUrl: string | null = null;
    if (generated.imagePrompt) {
      try {
        imageUrl = await generateMarketingImage(generated.imagePrompt, postId);
        await db.update(marketingPosts).set({ imageUrl }).where(eq(marketingPosts.id, postId));
        await log(postId, "scheduler_generate_image", "success", `Image saved: ${imageUrl}`);
      } catch (err) {
        await log(
          postId,
          "scheduler_generate_image",
          "error",
          err instanceof MarketingImageConfigError ? "No image API configured" : String(err)
        );
      }
    }

    // Publish to Facebook (or keep as draft)
    let published = false;

    if (settings.autoPublish && settings.fbConnected && settings.fbPageId && settings.fbAccessToken) {
      try {
        const message = [
          generated.content,
          generated.cta ? `\n\n${generated.cta}` : "",
          generated.hashtags ? `\n\n${generated.hashtags}` : "",
        ]
          .join("")
          .trim();

        const appOrigin = ENV.fbAppOrigin || "https://selrs.cc";
        const { fbPostId } = await publishPostToFacebook(
          settings.fbPageId,
          settings.fbAccessToken,
          message,
          imageUrl,
          appOrigin
        );

        await db
          .update(marketingPosts)
          .set({ status: "published", publishedAt: new Date() })
          .where(eq(marketingPosts.id, postId));

        await log(postId, "scheduler_publish", "success", `Published — FB post id: ${fbPostId}`);
        published = true;
      } catch (err) {
        await db
          .update(marketingPosts)
          .set({ status: "failed" })
          .where(eq(marketingPosts.id, postId));
        await log(postId, "scheduler_publish", "error", `Facebook publish failed: ${String(err)}`);
      }
    } else {
      const reason = !settings.autoPublish
        ? "auto-publish disabled"
        : "Facebook not connected";
      await log(postId, "scheduler_skip_publish", "info", `Saved as draft — ${reason}`);
    }

    await setSchedulerStatus("idle");
    await log(
      postId,
      "scheduler_run",
      "success",
      `Run complete for ${day}${published ? " — published to Facebook" : " — saved as draft"}`
    );

    return { ok: true, postId, published };
  } catch (err) {
    await setSchedulerStatus("error");
    if (postId) {
      await db
        .update(marketingPosts)
        .set({ status: "failed" })
        .where(eq(marketingPosts.id, postId))
        .catch(() => {});
    }
    await log(postId || null, "scheduler_run", "error", String(err));
    return { ok: false, error: String(err) };
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

      const [settings] = await db.select().from(marketingSettings).limit(1);
      if (!settings?.autoPublish) return;

      const now = new Date();
      if (now.getHours() !== settings.publishHour) return;

      const postDay = JS_DAY_TO_POST_DAY[now.getDay()];
      if (!postDay) return;

      await runScheduledPost(postDay);
    } catch (err) {
      console.error("[marketing-scheduler] Cron error:", err);
    }
  });

  console.log("[marketing-scheduler] Initialized — fires hourly, checks autoPublish + day settings");
}
