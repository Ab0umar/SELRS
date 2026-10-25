import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
assert.ok(process.argv.includes("--apply"));
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
try {
  const sql = await readFile(
    new URL("../drizzle/ai_whatsapp_copy.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql.split(";").filter((s) => s.trim()))
    await connection.query(statement);
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "ai_whatsapp_copy.sql",
  ]);
  console.log(
    JSON.stringify({
      applied: true,
      sendingChanged: false,
      profileEnabled: false,
    }),
  );
} finally {
  await connection.end();
}
