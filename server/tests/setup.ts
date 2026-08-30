import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let connection: mysql.Connection | null = null;
const configuredProductionUrl = String(process.env.DATABASE_URL ?? "").trim();

export async function getTestDb() {
  const url = String(process.env.DATABASE_TEST_URL ?? "").trim();
  const productionUrl = configuredProductionUrl;
  if (!url) {
    throw new Error(
      "DATABASE_TEST_URL is required for backend tests. Refusing to use DATABASE_URL.",
    );
  }
  if (productionUrl) {
    const testTarget = new URL(url);
    const productionTarget = new URL(productionUrl);
    const sameDatabase =
      testTarget.hostname === productionTarget.hostname &&
      (testTarget.port || "3306") === (productionTarget.port || "3306") &&
      testTarget.pathname === productionTarget.pathname;
    if (sameDatabase) {
      throw new Error(
        "DATABASE_TEST_URL points to the production database. Refusing destructive test cleanup.",
      );
    }
  }
  process.env.DATABASE_URL = url;
  if (!connection) {
    connection = await mysql.createConnection(url);
  }
  return drizzle(connection);
}

export async function cleanupTables(
  db: ReturnType<typeof drizzle>,
  ...tableNames: string[]
) {
  for (const tableName of tableNames) {
    await db.execute(`TRUNCATE TABLE \`${tableName}\`` as any);
  }
}
