import "dotenv/config";
import mysql from "mysql2/promise";

async function deduplicateBlackIce() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[Dedup] Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("[Dedup] Starting blackice_uploads deduplication...");

  const conn = await mysql.createConnection(databaseUrl);

  try {
    console.log("[Dedup] Deleting duplicate rows (keeping first occurrence)...");

    // Simple approach: delete rows where ID is not the minimum for that file_name
    const result = await conn.query(
      `DELETE FROM blackice_uploads
       WHERE file_name IN (
         SELECT file_name FROM (
           SELECT file_name FROM blackice_uploads
           WHERE file_name IS NOT NULL AND file_name != ''
           GROUP BY file_name HAVING COUNT(*) > 1
         ) as dups
       )
       AND id NOT IN (
         SELECT id FROM (
           SELECT MIN(id) as id FROM blackice_uploads
           WHERE file_name IS NOT NULL AND file_name != ''
           GROUP BY file_name
         ) as keep
       )`
    );

    const deleted = (result as any)[0]?.affectedRows ?? 0;
    console.log(`[Dedup] ✓ Deleted ${deleted} duplicate rows`);
    console.log("[Dedup] ✓ Deduplication complete!");
    console.log("[Dedup] Now run: pnpm s3:migrate-blackice");

  } catch (error: any) {
    console.error("[Dedup] Error:", error?.message ?? error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

deduplicateBlackIce();
