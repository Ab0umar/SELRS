import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
assert.ok(process.argv.includes("--apply"));
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
try {
  await connection.query(
    await readFile(
      new URL("../drizzle/ai_medical_documentation.sql", import.meta.url),
      "utf8",
    ),
  );
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "ai_medical_documentation.sql",
  ]);
  console.log(
    JSON.stringify({
      applied: true,
      defaultEngine: "current",
      clinicalGeminiChanged: false,
    }),
  );
} finally {
  await connection.end();
}
