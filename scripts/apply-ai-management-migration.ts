import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import mysql, { type RowDataPacket } from "mysql2/promise";

assert.ok(
  process.argv.includes("--apply"),
  "Pass --apply to apply the additive AI management migration",
);
assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required");
const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  multipleStatements: true,
});
try {
  const migration = await readFile(
    new URL("../drizzle/ai_core_management.sql", import.meta.url),
    "utf8",
  );
  const [before] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('ai_core_profiles','ai_core_usage')",
  );
  assert.equal(
    before.length,
    0,
    "AI tables already exist; inspect them instead of overwriting configuration",
  );
  await mkdir("outputs/ai-management-activation", { recursive: true });
  await connection.query(migration);
  const [profiles] = await connection.query<RowDataPacket[]>(
    "SELECT workload, provider, model, enabled FROM ai_core_profiles ORDER BY workload",
  );
  assert.equal(profiles.length, 4);
  assert.ok(
    profiles.every((profile) => !profile.enabled),
    "New profiles must remain disabled",
  );
  const [usage] = await connection.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM ai_core_usage",
  );
  assert.equal(Number(usage[0].total), 0);
  await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [
    "ai_core_management.sql",
  ]);
  const report = {
    appliedAt: new Date().toISOString(),
    sha256: createHash("sha256").update(migration).digest("hex"),
    createdTables: ["ai_core_profiles", "ai_core_usage"],
    profiles,
    existingTablesAltered: false,
  };
  await writeFile(
    "outputs/ai-management-activation/migration.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} finally {
  await connection.end();
}
