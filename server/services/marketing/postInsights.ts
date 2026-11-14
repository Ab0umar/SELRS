import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { getDb, getSystemSetting, updateSystemSettings } from "../../db";
import { marketingPosts } from "../../../drizzle/schema";
import { marketingGraphVersion } from "./facebookPublisher.service";
import { getMarketingPageTarget, type MarketingPageRole } from "./page.service";

const STATS_KEY = "marketing_post_stats_v1";
const LOOKBACK_MS = 60 * 24 * 60 * 60 * 1000;
const REFRESH_MS = 24 * 60 * 60 * 1000;

export type PostStat = {
  reach: number | null;
  reactions: number;
  comments: number;
  shares: number;
};
export type MarketingPostStats = {
  // "unavailable": the page token lacks read_insights (or cannot read the post).
  state: "never" | "ok" | "unavailable";
  reason: string | null;
  fetchedAt: string | null;
  posts: Record<string, PostStat>;
};

export async function readMarketingPostStats(): Promise<MarketingPostStats> {
  try {
    const row = await getSystemSetting(STATS_KEY);
    if (row?.value) return JSON.parse(String(row.value)) as MarketingPostStats;
  } catch {}
  return { state: "never", reason: null, fetchedAt: null, posts: {} };
}

class InsightsPermissionError extends Error {}

type GraphPost = {
  insights?: {
    data?: Array<{ name?: string; values?: Array<{ value?: unknown }> }>;
  };
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
  error?: { message?: string; code?: number };
};

async function readPostStat(
  fbPostId: string,
  accessToken: string,
): Promise<PostStat> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields:
      "insights.metric(post_impressions_unique),reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0),shares",
  });
  const res = await fetch(
    `https://graph.facebook.com/${marketingGraphVersion()}/${encodeURIComponent(fbPostId)}?${params}`,
    { signal: AbortSignal.timeout(20000) },
  );
  const data = (await res.json().catch(() => ({}))) as GraphPost;
  // 10 / 200-299: missing permission; 190: token rejected.
  const code = data.error?.code ?? 0;
  if (code === 10 || code === 190 || (code >= 200 && code < 300))
    throw new InsightsPermissionError(
      code === 190
        ? "رفض Facebook رمز الصفحة؛ أعد ربط الصفحة"
        : "رمز الصفحة لا يملك صلاحية read_insights",
    );
  if (!res.ok || data.error) throw new Error("Facebook insights read failed");
  const reach = data.insights?.data?.find(
    (metric) => metric.name === "post_impressions_unique",
  )?.values?.[0]?.value;
  return {
    reach: typeof reach === "number" ? reach : null,
    reactions: data.reactions?.summary?.total_count ?? 0,
    comments: data.comments?.summary?.total_count ?? 0,
    shares: data.shares?.count ?? 0,
  };
}

/** Reads reach and engagement for posts published in the last 60 days. */
export async function refreshMarketingPostStats(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const posts = await db
    .select({
      id: marketingPosts.id,
      fbPostId: marketingPosts.fbPostId,
      pageRole: marketingPosts.pageRole,
    })
    .from(marketingPosts)
    .where(
      and(
        eq(marketingPosts.status, "published"),
        isNotNull(marketingPosts.fbPostId),
        gte(marketingPosts.publishedAt, new Date(now.getTime() - LOOKBACK_MS)),
      ),
    )
    .orderBy(desc(marketingPosts.publishedAt))
    .limit(100);
  const previous = await readMarketingPostStats();
  const stats: MarketingPostStats = {
    state: "ok",
    reason: null,
    fetchedAt: now.toISOString(),
    posts: { ...previous.posts },
  };
  const tokens = new Map<MarketingPageRole, string | null>();
  for (const post of posts as Array<{
    id: number;
    fbPostId: string | null;
    pageRole: MarketingPageRole | null;
  }>) {
    const pageRole = post.pageRole ?? "center";
    if (!tokens.has(pageRole))
      tokens.set(
        pageRole,
        (await getMarketingPageTarget(pageRole))?.accessToken ?? null,
      );
    const token = tokens.get(pageRole);
    if (!token || !post.fbPostId) continue;
    try {
      stats.posts[String(post.id)] = await readPostStat(post.fbPostId, token);
    } catch (error) {
      if (error instanceof InsightsPermissionError) {
        stats.state = "unavailable";
        stats.reason = error.message;
        break;
      }
      // One unreadable post (deleted on Facebook, timeout) does not stop the rest.
    }
  }
  await updateSystemSettings(STATS_KEY, stats);
  return stats;
}

function engagementRate(stat: PostStat) {
  const engaged = stat.reactions + stat.comments + stat.shares;
  return stat.reach ? engaged / stat.reach : engaged;
}

/** Best and worst topics by engagement, as planner data. Empty when stats are unavailable. */
export async function topicPerformance(limit = 5) {
  const stats = await readMarketingPostStats();
  if (stats.state !== "ok") return { best: [], worst: [] };
  const ids = Object.keys(stats.posts).map(Number);
  if (ids.length < 2) return { best: [], worst: [] };
  const db = await getDb();
  if (!db) return { best: [], worst: [] };
  const rows = (await db
    .select({
      id: marketingPosts.id,
      topic: marketingPosts.topic,
      title: marketingPosts.title,
    })
    .from(marketingPosts)
    .where(eq(marketingPosts.status, "published"))) as Array<{
    id: number;
    topic: string | null;
    title: string;
  }>;
  const ranked = rows
    .filter((row) => stats.posts[String(row.id)])
    .map((row) => ({
      topic: row.topic || row.title,
      rate: engagementRate(stats.posts[String(row.id)]!),
    }))
    .sort((a, b) => b.rate - a.rate);
  const count = Math.min(limit, Math.floor(ranked.length / 2));
  return {
    best: ranked.slice(0, count).map((entry) => entry.topic),
    worst: ranked.slice(-count).map((entry) => entry.topic),
  };
}

let timer: ReturnType<typeof setInterval> | undefined;
/** Hourly check that refreshes stats once a day. */
export function initMarketingPostStatsWorker() {
  if (timer) return;
  timer = setInterval(
    () => {
      void (async () => {
        const stats = await readMarketingPostStats();
        if (
          stats.fetchedAt &&
          Date.now() - Date.parse(stats.fetchedAt) < REFRESH_MS
        )
          return;
        await refreshMarketingPostStats();
      })().catch(() =>
        console.error("[marketing] Could not refresh post performance"),
      );
    },
    60 * 60 * 1000,
  );
  timer.unref();
}
