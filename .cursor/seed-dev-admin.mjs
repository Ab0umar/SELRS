import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire("/workspace/package.json");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const envPath = path.join(os.homedir(), ".selrs-local.env");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const username = env.SELRS_DEV_ADMIN_USER;
const password = env.SELRS_DEV_ADMIN_PASSWORD;
if (!env.DATABASE_URL || !username || !password) {
  throw new Error("Local dev admin settings are incomplete");
}

const permissionsFile = fs.readFileSync(
  "/workspace/client/src/lib/page-permissions.ts",
  "utf8",
);
const pageIds = [
  ...new Set(
    [...permissionsFile.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]),
  ),
];
if (!pageIds.includes("/patient-data/edit")) {
  throw new Error("Could not read page permission ids");
}

const hash = await bcrypt.hash(password, 10);
const conn = await mysql.createConnection(env.DATABASE_URL);
try {
  const [existing] = await conn.query(
    "SELECT id FROM users WHERE username = ? LIMIT 1",
    [username],
  );
  let userId = existing[0]?.id;
  if (!userId) {
    const [inserted] = await conn.query(
      "INSERT INTO users (username, password, name, role, branch, shift, isActive, authVersion) VALUES (?, ?, ?, 'admin', 'both', 1, 1, 1)",
      [username, hash, "Dev Admin"],
    );
    userId = inserted.insertId;
  }

  await conn.query("DELETE FROM user_permissions WHERE userId = ?", [userId]);
  await conn.query("INSERT INTO user_permissions (userId, pageId) VALUES ?", [
    pageIds.map((pageId) => [userId, pageId]),
  ]);

  const [state] = await conn.query(
    "SELECT id FROM userPageStates WHERE userId = ? AND page = ? LIMIT 1",
    [userId, "__security_password_change__"],
  );
  const changed = JSON.stringify({ changedAt: "2026-01-01T00:00:00.000Z" });
  if (state[0]?.id) {
    await conn.query("UPDATE userPageStates SET data = ? WHERE id = ?", [
      changed,
      state[0].id,
    ]);
  } else {
    await conn.query(
      "INSERT INTO userPageStates (userId, page, data) VALUES (?, ?, ?)",
      [userId, "__security_password_change__", changed],
    );
  }

  console.log(
    JSON.stringify({ ok: true, userId, permissions: pageIds.length }),
  );
} finally {
  await conn.end();
}
