import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

assert.ok(
  process.argv.includes("--apply"),
  "Pass --apply to add AI provider request bindings",
);
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.query(
    await readFile(
      new URL("../drizzle/ai_provider_bindings.sql", import.meta.url),
      "utf8",
    ),
  );
  await connection.execute(
    "INSERT IGNORE INTO schema_migrations (name) VALUES (?)",
    ["ai_provider_bindings.sql"],
  );
  console.log(
    "AI provider binding table is ready; existing provider settings were not changed.",
  );
} finally {
  await connection.end();
}
