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
  const [tables] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_marketing_jobs'",
  );
  assert.equal(
    tables.length,
    0,
    "Inspect existing AI marketing jobs table before applying",
  );
  await connection.query(
    await readFile(
      new URL("../drizzle/ai_marketing_jobs.sql", import.meta.url),
      "utf8",
    ),
  );
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "ai_marketing_jobs.sql",
  ]);
  console.log(
    JSON.stringify({
      created: "ai_marketing_jobs",
      existingTablesAltered: false,
    }),
  );
} finally {
  await connection.end();
}
