import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let connection: mysql.Connection | null = null;

export async function getTestDb() {
  const url = process.env.DATABASE_TEST_URL ?? process.env.DATABASE_URL!;
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
