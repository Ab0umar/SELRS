import "dotenv/config";
import mysql from "mysql2/promise";

async function deduplicateBatch() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[Dedup] Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("[Dedup] Starting batch deduplication...");

  const conn = await mysql.createConnection(databaseUrl);

  try {
    let totalDeleted = 0;
    const batchSize = 500;

    while (true) {
      // Delete one batch of duplicates
      const result = await conn.query(`
        DELETE FROM blackice_uploads
        WHERE id IN (
          SELECT id FROM (
            SELECT id FROM blackice_uploads
            WHERE file_name IN (
              SELECT file_name FROM blackice_uploads
              WHERE file_name IS NOT NULL AND file_name != ''
              GROUP BY file_name HAVING COUNT(*) > 1
            )
            AND id NOT IN (
              SELECT MIN(id) FROM blackice_uploads
              WHERE file_name IS NOT NULL AND file_name != ''
              GROUP BY file_name
            )
            LIMIT ?
          ) as batch
        )
      `, [batchSize]);

      const deleted = (result as any)[0]?.affectedRows ?? 0;
      totalDeleted += deleted;

      console.log(`[Dedup] Batch deleted: ${deleted} rows (total: ${totalDeleted})`);

      if (deleted < batchSize) {
        // No more duplicates to delete
        break;
      }
    }

    console.log(`[Dedup] ✓ Complete! Deleted ${totalDeleted} duplicate rows`);
    console.log("[Dedup] Now run: pnpm s3:migrate-blackice");

  } catch (error: any) {
    console.error("[Dedup] Error:", error?.message ?? error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

deduplicateBatch();
