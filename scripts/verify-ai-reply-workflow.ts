import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import mysql from "mysql2/promise";
const database = `selrs_ai_reply_test_${randomUUID().replaceAll("-", "")}`;
assert.match(database, /^selrs_ai_reply_test_[a-f0-9]{32}$/);
const connection = await mysql.createConnection(process.env.DATABASE_URL!);
const uri = new URL(process.env.DATABASE_URL!);
uri.pathname = `/${database}`;
try {
  await connection.query(`CREATE DATABASE \`${database}\``);
  const child = spawn(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "vitest.backend.config.ts",
      "server/tests/autoReply.integration.test.ts",
    ],
    {
      stdio: "inherit",
      env: { ...process.env, DATABASE_TEST_URL: uri.toString() },
    },
  );
  const code = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", resolve);
  });
  assert.equal(code, 0);
  console.log(
    JSON.stringify({
      ok: true,
      database,
      productionDataChanged: false,
      network: "simulated Gemini and Meta; real durable worker and SQL",
    }),
  );
} finally {
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
}
