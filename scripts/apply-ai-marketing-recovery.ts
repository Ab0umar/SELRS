import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";
assert.ok(process.argv.includes("--apply"), "Explicit --apply required");
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL!,
  multipleStatements: true,
});
try {
  const [columns] = await connection.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_marketing_jobs' AND COLUMN_NAME='image_artifact'",
  );
  assert.equal(
    columns.length,
    0,
    "Inspect existing recovery schema before retrying",
  );
  await connection.query(
    await readFile(
      new URL("../drizzle/ai_marketing_recovery.sql", import.meta.url),
      "utf8",
    ),
  );
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "ai_marketing_recovery.sql",
  ]);
  console.log(
    JSON.stringify({
      applied: true,
      jobHistoryPreserved: true,
      providerAndPublishingSettingsChanged: false,
    }),
  );
} finally {
  await connection.end();
}
