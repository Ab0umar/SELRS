import { and, eq, isNotNull, ne, or } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { getDb } from "../../db";
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
  const db = reader ?? (await getDb());
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ topic: marketingPosts.topic, title: marketingPosts.title })
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
    .select({ topic: marketingTopicPublications.normalizedTopic })
    .from(marketingTopicPublications);
  return [
    ...rows.map(
      (row: { topic: string | null; title: string }) =>
        row.topic?.trim() || row.title,
    ),
    ...history.map((row: { topic: string }) => row.topic),
  ];
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
