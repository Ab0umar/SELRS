import { and, eq, isNotNull, ne, or } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { getDb, getSystemSetting } from "../../db";
import {
  marketingPosts,
  marketingTopicPublications,
} from "../../../drizzle/schema";
import { marketingTopicIdentity, marketingTopicKey } from "./topicIdentity";

type TopicReader = Pick<MySql2Database, "select">;
export class PublishedMarketingTopicError extends Error {
  constructor() {
    super("الموضوع سبق نشره أو نشره جارٍ؛ اختر موضوعًا جديدًا");
  }
}
type TopicWriter = Pick<
  MySql2Database,
  "select" | "insert" | "update" | "delete"
>;
export async function publishedMarketingTopics(
  reader?: TopicReader,
): Promise<string[]> {
  return (await marketingTopicHistory(reader)).blocking;
}

/** Owner setting; 0 (the default) means a published topic never becomes reusable. */
export async function marketingTopicReuseMonths(): Promise<number> {
  try {
    const row = await getSystemSetting("marketing_topic_reuse_months");
    const months = Number(JSON.parse(String(row?.value ?? "0")));
    return Number.isInteger(months) && months > 0 && months <= 120 ? months : 0;
  } catch {
    return 0;
  }
}

export function topicReuseCutoff(months: number, now = new Date()) {
  if (!months) return null;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

/**
 * Splits topic history by the reuse window. Posts are dated by publishedAt and
 * reservations by their creation time; anything undated or still publishing blocks.
 */
export async function marketingTopicHistory(reader?: TopicReader) {
  const db = reader ?? (await getDb());
  if (!db) throw new Error("Database not available");
  const cutoff = topicReuseCutoff(await marketingTopicReuseMonths());
  const rows = await db
    .select({
      topic: marketingPosts.topic,
      title: marketingPosts.title,
      publishedAt: marketingPosts.publishedAt,
    })
    .from(marketingPosts)
    .where(
      or(
        eq(marketingPosts.status, "published"),
        isNotNull(marketingPosts.publishedAt),
        and(
          isNotNull(marketingPosts.fbPostId),
          ne(marketingPosts.fbPostId, ""),
        ),
      ),
    );
  const history = await db
    .select({
      topic: marketingTopicPublications.normalizedTopic,
      state: marketingTopicPublications.state,
      createdAt: marketingTopicPublications.createdAt,
    })
    .from(marketingTopicPublications);
  const entries = [
    ...rows.map(
      (row: {
        topic: string | null;
        title: string;
        publishedAt?: Date | null;
      }) => ({
        topic: row.topic?.trim() || row.title,
        date: row.publishedAt ?? null,
        pending: false,
      }),
    ),
    ...history.map(
      (row: { topic: string; state?: string; createdAt?: Date | null }) => ({
        topic: row.topic,
        date: row.createdAt ?? null,
        pending: row.state === "publishing",
      }),
    ),
  ];
  const isOld = (entry: (typeof entries)[number]) =>
    Boolean(cutoff && !entry.pending && entry.date && entry.date < cutoff);
  const blocking = entries.filter((entry) => !isOld(entry)).map((e) => e.topic);
  const blocked = new Set(blocking.map(marketingTopicIdentity));
  const reusable = [
    ...new Set(
      entries
        .filter((entry) => isOld(entry))
        .map((entry) => entry.topic)
        .filter((topic) => !blocked.has(marketingTopicIdentity(topic))),
    ),
  ];
  return { blocking, reusable, cutoff };
}
export async function assertMarketingTopicAvailable(
  topic: string,
  reader?: TopicReader,
) {
  const identity = marketingTopicIdentity(topic);
  if (
    (await publishedMarketingTopics(reader)).some(
      (published) => marketingTopicIdentity(published) === identity,
    )
  )
    throw new PublishedMarketingTopicError();
}
async function reserveInTransaction(
  tx: TopicWriter,
  post: { id: number; topic: string | null; title: string },
) {
  const topic = post.topic?.trim() || post.title;
  await assertMarketingTopicAvailable(topic, tx);
  const topicKey = marketingTopicKey(topic);
  await tx
    .insert(marketingTopicPublications)
    .values({
      topicKey,
      normalizedTopic: marketingTopicIdentity(topic),
      postId: post.id,
      state: "publishing",
    })
    .onDuplicateKeyUpdate({ set: { topicKey } });
  const [owner] = await tx
    .select()
    .from(marketingTopicPublications)
    .where(eq(marketingTopicPublications.topicKey, topicKey))
    .for("update");
  const cutoff = topicReuseCutoff(await marketingTopicReuseMonths());
  if (
    owner &&
    owner.postId !== post.id &&
    owner.state === "published" &&
    cutoff &&
    owner.createdAt < cutoff
  ) {
    // Outside the reuse window: this post takes over the old reservation.
    await tx
      .update(marketingTopicPublications)
      .set({ postId: post.id, state: "publishing", createdAt: new Date() })
      .where(eq(marketingTopicPublications.topicKey, topicKey));
    return topicKey;
  }
  if (!owner || owner.postId !== post.id || owner.state === "published")
    throw new Error("الموضوع سبق نشره أو محجوز للنشر؛ لن يُنشر مرة أخرى");
  return topicKey;
}
export async function reserveTopicPublication(post: {
  id: number;
  topic: string | null;
  title: string;
}) {
  if (!process.env.DATABASE_URL) throw new Error("Database not available");
  // A separate committed connection survives publication rollback without exhausting the outer transaction pool.
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    timezone: "local",
    connectTimeout: 30000,
  });
  try {
    return await drizzle(connection).transaction((tx) =>
      reserveInTransaction(tx, post),
    );
  } finally {
    await connection.end();
  }
}
export async function confirmTopicPublication(
  tx: TopicWriter,
  topicKey: string,
  postId: number,
) {
  await tx
    .update(marketingTopicPublications)
    .set({ state: "published" })
    .where(
      and(
        eq(marketingTopicPublications.topicKey, topicKey),
        eq(marketingTopicPublications.postId, postId),
      ),
    );
}
export async function releaseTopicPublication(
  tx: TopicWriter,
  topicKey: string,
  postId: number,
) {
  await tx
    .delete(marketingTopicPublications)
    .where(
      and(
        eq(marketingTopicPublications.topicKey, topicKey),
        eq(marketingTopicPublications.postId, postId),
        eq(marketingTopicPublications.state, "publishing"),
      ),
    );
}

/** Confirms or releases whatever topic reservation a post still holds in state publishing. */
export async function settleTopicForPost(
  tx: TopicWriter,
  postId: number,
  outcome: "published" | "released",
) {
  const pending = and(
    eq(marketingTopicPublications.postId, postId),
    eq(marketingTopicPublications.state, "publishing"),
  );
  if (outcome === "published")
    await tx
      .update(marketingTopicPublications)
      .set({ state: "published" })
      .where(pending);
  else await tx.delete(marketingTopicPublications).where(pending);
}
