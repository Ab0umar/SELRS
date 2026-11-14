import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { getDb, getSystemSetting, updateSystemSettings } from "../../db";
import { marketingPosts } from "../../../drizzle/schema";
import {
  MARKETING_SCHEDULE,
  type MarketingScheduleSlot,
} from "../../../shared/marketingSchedule";
import { getMarketingPageTarget, type MarketingPageRole } from "./page.service";
import { publishMarketingPost } from "./publish.service";
import { notifyMarketingAdmins } from "./marketingReview";

const CAIRO = "Africa/Cairo";
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGES = ["center", "doctor"] as const;
const SLOTS = ["saturday", "tuesday", "thursday"] as const;

function cairoParts(date: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: CAIRO,
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
}

/** yyyy-MM-dd of the instant in Cairo. */
export function cairoDate(date: Date) {
  const parts = cairoParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The instant that is `hour`:00 in Cairo on the Cairo date `day` (yyyy-MM-dd). */
export function cairoSlotTime(day: string, hour: number) {
  const noon = new Date(`${day}T12:00:00Z`);
  const parts = cairoParts(noon);
  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
  );
  const offset = wall - noon.getTime();
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, hour) - offset);
}

function jsDayOf(day: string) {
  return new Date(`${day}T12:00:00Z`).getUTCDay();
}

export type CalendarSlot = {
  pageRole: MarketingPageRole;
  slot: MarketingScheduleSlot;
  at: Date;
};

/** Enabled slots of connected pages between now and `days` ahead. */
export async function upcomingMarketingSlots(
  days: number,
  now = new Date(),
): Promise<CalendarSlot[]> {
  const slots: CalendarSlot[] = [];
  for (const pageRole of PAGES) {
    const target = await getMarketingPageTarget(pageRole);
    if (!target?.connected) continue;
    for (let offset = 0; offset <= days; offset++) {
      const day = cairoDate(new Date(now.getTime() + offset * DAY_MS));
      const slot = SLOTS.find(
        (key) => MARKETING_SCHEDULE[pageRole][key].jsDay === jsDayOf(day),
      );
      if (!slot) continue;
      const enabled =
        slot === "saturday"
          ? target.saturdayEnabled
          : slot === "tuesday"
            ? target.tuesdayEnabled
            : target.thursdayEnabled;
      const at = cairoSlotTime(day, target.publishHour);
      if (enabled && at > now) slots.push({ pageRole, slot, at });
    }
  }
  return slots.sort((a, b) => a.at.getTime() - b.at.getTime());
}

type CalendarPostRow = {
  id: number;
  title: string;
  topic: string | null;
  status: string;
  pageRole: MarketingPageRole | null;
  scheduledAt: Date | null;
};

/** Posts placed on a date: scheduled posts, and drafts generated for a slot. */
export async function marketingCalendar(days = 14, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const end = new Date(now.getTime() + (days + 1) * DAY_MS);
  const start = new Date(now.getTime() - DAY_MS);
  const posts = await db
    .select({
      id: marketingPosts.id,
      title: marketingPosts.title,
      topic: marketingPosts.topic,
      status: marketingPosts.status,
      pageRole: marketingPosts.pageRole,
      scheduledAt: marketingPosts.scheduledAt,
    })
    .from(marketingPosts)
    .where(
      and(
        gte(marketingPosts.scheduledAt, start),
        lt(marketingPosts.scheduledAt, end),
        inArray(marketingPosts.status, [
          "draft",
          "scheduled",
          "publishing",
          "published",
        ]),
      ),
    );
  const slots = await upcomingMarketingSlots(days, now);
  return {
    slots: slots.map((slot) => {
      const date = cairoDate(slot.at);
      return {
        ...slot,
        at: slot.at.toISOString(),
        date,
        generating: slotHeld(`${slot.pageRole}:${date}`),
      };
    }),
    posts: (posts as CalendarPostRow[]).map((post) => ({
      ...post,
      pageRole: post.pageRole ?? "center",
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
      date: post.scheduledAt ? cairoDate(post.scheduledAt) : null,
    })),
  };
}

// Jobs have no column for their target slot; the planned time lives in a setting.
const plannedKey = (jobId: string) => `marketing_planned_slot_${jobId}`;

export async function plannedMarketingSlot(jobId: string) {
  try {
    const row = await getSystemSetting(plannedKey(jobId));
    if (!row?.value) return null;
    const at = new Date(JSON.parse(String(row.value)));
    return Number.isNaN(at.getTime()) ? null : at;
  } catch {
    return null;
  }
}

export type WeekGenerator = (input: {
  requestId: string;
  pageRole: MarketingPageRole;
  slot: MarketingScheduleSlot;
  avoid: string[];
}) => Promise<{ topic: string }>;

// Slots whose generation has started but whose draft is not saved yet. In memory: a restart clears it.
const SLOT_HOLD_MS = 3 * 60 * 60 * 1000;
const heldSlots = new Map<string, number>();
const slotHeld = (key: string) => (heldSlots.get(key) ?? 0) > Date.now();

/**
 * Starts one draft per empty enabled slot in the next 7 days, or only the
 * slot named by `only`. Returns how many started.
 */
export async function generateWeekDrafts(
  generate: WeekGenerator,
  now = new Date(),
  only?: { pageRole: MarketingPageRole; date: string },
) {
  const calendar = await marketingCalendar(7, now);
  const taken = new Set(
    calendar.posts.map(
      (post: { pageRole: string; date: string | null }) =>
        `${post.pageRole}:${post.date}`,
    ),
  );
  const avoid: string[] = [];
  const started: Array<{ pageRole: MarketingPageRole; date: string }> = [];
  const failed: string[] = [];
  for (const slot of calendar.slots) {
    const key = `${slot.pageRole}:${slot.date}`;
    if (only && (only.pageRole !== slot.pageRole || only.date !== slot.date))
      continue;
    if (taken.has(key)) continue;
    if (slotHeld(key)) continue;
    heldSlots.set(key, Date.now() + SLOT_HOLD_MS);
    const requestId = randomUUID();
    try {
      await updateSystemSettings(plannedKey(requestId), slot.at);
      const { topic } = await generate({
        requestId,
        pageRole: slot.pageRole,
        slot: slot.slot,
        avoid,
      });
      avoid.push(topic);
      started.push({ pageRole: slot.pageRole, date: slot.date });
    } catch (error) {
      heldSlots.delete(key);
      failed.push(
        `${slot.date}: ${error instanceof Error ? error.message : "تعذر البدء"}`,
      );
    }
  }
  if (failed.length)
    await notifyMarketingAdmins({
      title: "تعذر تجهيز بعض مسودات الأسبوع",
      message: failed.join(" | ").slice(0, 300),
      kind: "error",
    });
  return { started: started.length, failed: failed.length };
}

let publishing = false;
/** Publishes scheduled posts whose time has come, through the normal publish claim. */
export async function publishDueScheduledPosts(now = new Date()) {
  if (publishing) return;
  publishing = true;
  try {
    const db = await getDb();
    if (!db) return;
    const due = await db
      .select({
        id: marketingPosts.id,
        pageRole: marketingPosts.pageRole,
        topic: marketingPosts.topic,
        title: marketingPosts.title,
      })
      .from(marketingPosts)
      .where(
        and(
          eq(marketingPosts.status, "scheduled"),
          lte(marketingPosts.scheduledAt, now),
        ),
      )
      .limit(5);
    for (const post of due) {
      // The publish claim only accepts drafts; this flip is the scheduled post's claim.
      const [flip] = await db
        .update(marketingPosts)
        .set({ status: "draft" })
        .where(
          and(
            eq(marketingPosts.id, post.id),
            eq(marketingPosts.status, "scheduled"),
            // A post rescheduled since the query above is no longer due.
            lte(marketingPosts.scheduledAt, now),
          ),
        );
      if (!flip?.affectedRows) continue;
      const [claimed] = await db
        .select({ pageRole: marketingPosts.pageRole })
        .from(marketingPosts)
        .where(eq(marketingPosts.id, post.id))
        .limit(1);
      try {
        await publishMarketingPost(
          post.id,
          claimed?.pageRole ?? post.pageRole ?? "center",
        );
        await notifyMarketingAdmins({
          title: "نُشر منشور مجدول",
          message: `نُشر في موعده: ${post.topic || post.title}`.slice(0, 300),
          kind: "success",
          postId: post.id,
        });
      } catch (error) {
        // Facebook-stage failures are already logged and notified by the publish service.
        if (!(error instanceof Error && "uncertain" in error))
          await notifyMarketingAdmins({
            title: "تعذر نشر منشور مجدول",
            message: `${post.topic || post.title}: ${
              error instanceof Error ? error.message : "خطأ غير معروف"
            }؛ أعيد إلى المسودات`.slice(0, 300),
            kind: "error",
            postId: post.id,
          });
      }
    }
  } finally {
    publishing = false;
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
export function initScheduledPostWorker() {
  if (timer) return;
  const tick = () =>
    void publishDueScheduledPosts().catch(() =>
      console.error("[marketing] Could not publish scheduled posts"),
    );
  // The first check runs a minute after startup, so boot stays quick.
  timer = setInterval(tick, 60_000);
  timer.unref();
}
