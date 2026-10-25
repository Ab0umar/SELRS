import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
assert.ok(process.argv.includes("--apply"));
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
try {
  const sql = await readFile(
    new URL("../drizzle/whatsapp_confirmations.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql.split(";").filter((s) => s.trim()))
    await connection.query(statement);
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "whatsapp_confirmations.sql",
  ]);
  console.log(
    JSON.stringify({
      applied: true,
      messagesSent: 0,
      existingBookingsChanged: false,
    }),
  );
} finally {
  await connection.end();
}
