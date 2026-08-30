import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";

async function main() {
  const username = process.env.E2E_USER?.trim();
  const password = process.env.E2E_PASS;
  if (!username || !password) {
    throw new Error("E2E_USER and E2E_PASS are required for the CI seed");
  }
  const db = await getDb();
  if (!db) throw new Error("Unable to connect to the test database");
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (existing) {
    console.log(`E2E user already exists: ${username}`);
    return;
  }
  await db.insert(users).values({
    username,
    password: await bcrypt.hash(password, 10),
    name: "E2E Test User",
    role: "admin",
    branch: "examinations",
  });
  console.log(`Created E2E user: ${username}`);
}

main().catch((error) => {
  console.error("[seed-e2e] Failed:", error);
  process.exit(1);
});
