import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
assert.ok(
  process.argv.includes("--apply"),
  "Pass --apply to add AI operation tracking and per-page scheduler status",
);
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const name of [
    "ai_provider_bindings.sql",
    "ai_module_review_fixes.sql",
    "ai_marketing_recovery_fixes.sql",
  ]) {
    const source = await readFile(
      new URL(`../drizzle/${name}`, import.meta.url),
      "utf8",
    );
    for (const statement of source.split(";").filter((sql) => sql.trim()))
      await connection.query(statement);
    await connection.execute(
      "INSERT IGNORE INTO schema_migrations (name) VALUES (?)",
      [name],
    );
  }
  console.log(
    "AI request tracking and per-page scheduler status are ready. Provider profiles were preserved.",
  );
} finally {
  await connection.end();
}
