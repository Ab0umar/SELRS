import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";
import {
  marketingTopicIdentity,
  marketingTopicKey,
} from "../server/services/marketing/topicIdentity";
assert.ok(process.argv.includes("--apply"), "Explicit --apply required");
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
try {
  const [existing] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='marketing_topic_publications'",
  );
  assert.equal(
    existing.length,
    0,
    "Inspect existing history before reapplying",
  );
  await connection.query(
    await readFile(
      new URL("../drizzle/marketing_topic_publications.sql", import.meta.url),
      "utf8",
    ),
  );
  const [posts] = await connection.query<RowDataPacket[]>(
    "SELECT id,topic,title FROM marketing_posts WHERE status='published' OR published_at IS NOT NULL OR (fb_post_id IS NOT NULL AND TRIM(fb_post_id)<>'') ORDER BY id",
  );
  await connection.beginTransaction();
  for (const post of posts) {
    const topic = String(post.topic || post.title).trim();
    if (!topic) continue;
    await connection.execute(
      "INSERT IGNORE INTO marketing_topic_publications (topic_key,normalized_topic,post_id,state) VALUES (?,?,?,'published')",
      [marketingTopicKey(topic), marketingTopicIdentity(topic), post.id],
    );
  }
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "marketing_topic_publications.sql",
  ]);
  await connection.commit();
  const [counts] = await connection.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS topics FROM marketing_topic_publications",
  );
  console.log(
    JSON.stringify({
      historicalPosts: posts.length,
      retiredTopics: Number(counts[0].topics),
      existingPostsChanged: false,
    }),
  );
} finally {
  await connection.end();
}
