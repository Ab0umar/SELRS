import "dotenv/config";
import fs from "node:fs/promises";
import mysql from "mysql2/promise";
if (!process.argv.includes("--apply"))
  throw new Error("Pass --apply to enable Grok marketing schema");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const sql = await fs.readFile(
    new URL("../drizzle/ai_grok_marketing.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean))
    await connection.query(statement);
  await connection.execute(
    "INSERT IGNORE INTO schema_migrations (name) VALUES (?)",
    ["ai_grok_marketing.sql"],
  );
  console.log(
    "Grok schema enabled; existing providers, models and schedules unchanged",
  );
} finally {
  await connection.end();
}
