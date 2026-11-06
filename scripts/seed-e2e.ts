import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { userPermissions, users } from "../drizzle/schema";

// Admins get no page permissions by default, and medical.createPatient checks
// for one, so the e2e admin needs it granted explicitly.
const E2E_PAGE_PERMISSIONS = ["/patient-data/edit"];

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
  let userId = existing?.id;
  if (userId) {
    console.log(`E2E user already exists: ${username}`);
  } else {
    const [result] = await db.insert(users).values({
      username,
      password: await bcrypt.hash(password, 10),
      name: "E2E Test User",
      role: "admin",
      branch: "examinations",
    });
    userId = Number((result as { insertId?: number }).insertId);
    console.log(`Created E2E user: ${username}`);
  }
  if (!userId) throw new Error("Unable to resolve the E2E user id");
  await db
    .insert(userPermissions)
    .ignore()
    .values(
      E2E_PAGE_PERMISSIONS.map((pageId) => ({ userId: userId!, pageId })),
    );
  console.log(
    `Granted E2E page permissions: ${E2E_PAGE_PERMISSIONS.join(", ")}`,
  );
}

// getDb() keeps a connection pool open, so exit explicitly once the seed is done.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed-e2e] Failed:", error);
    process.exit(1);
  });
