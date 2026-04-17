import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("Fixing database collation issues...\n");

    // Get the database name from connection
    const [databases] = await conn.query(`SELECT DATABASE() as db`) as any[];
    const dbName = databases[0].db;
    console.log(`Database: ${dbName}\n`);

    // Convert database to utf8mb4_unicode_ci
    await conn.query(`ALTER DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ Database collation fixed\n`);

    // Get all tables
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [dbName]
    ) as any[];

    console.log(`Converting ${tables.length} tables...\n`);

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      try {
        // Convert table
        await conn.query(
          `ALTER TABLE \`${tableName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`✓ ${tableName}`);
      } catch (err: any) {
        console.error(`✗ ${tableName}: ${err.message.slice(0, 80)}`);
      }
    }

    console.log(`\n✓ Collation fix complete`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
