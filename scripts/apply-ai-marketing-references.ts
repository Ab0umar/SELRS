import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";
assert.ok(process.argv.includes("--apply"));
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
try {
  const [existing] = await connection.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='ai_marketing_jobs' AND COLUMN_NAME='reference_ids'",
  );
  assert.equal(existing.length, 0);
  await connection.query(
    await readFile(
      new URL("../drizzle/ai_marketing_references.sql", import.meta.url),
      "utf8",
    ),
  );
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "ai_marketing_references.sql",
  ]);
  console.log(
    JSON.stringify({
      applied: true,
      referenceAssetsChanged: false,
      providerSettingsChanged: false,
    }),
  );
} finally {
  await connection.end();
}
