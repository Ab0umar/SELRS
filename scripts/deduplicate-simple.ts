import "dotenv/config";
import mysql from "mysql2/promise";

async function dedupSimple() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[Dedup] Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("[Dedup] Simple deduplication - deleting duplicates one by one...");

  const conn = await mysql.createConnection(databaseUrl);

  try {
    let totalDeleted = 0;

    while (true) {
      // Find one file with duplicates
      const [files] = await conn.query(`
        SELECT file_name, COUNT(*) as cnt FROM blackice_uploads
        WHERE file_name IS NOT NULL AND file_name != ''
        GROUP BY file_name HAVING cnt > 1
        LIMIT 1
      `) as any;

      if (!files || files.length === 0) {
        console.log(`[Dedup] ✓ No more duplicates! Total deleted: ${totalDeleted}`);
        break;
      }

      const fileName = files[0].file_name;
      const count = files[0].cnt;

      // Delete all but the first (lowest ID)
      const result = await conn.query(`
        DELETE FROM blackice_uploads
        WHERE file_name = ? AND id NOT IN (
          SELECT id FROM (
            SELECT MIN(id) as id FROM blackice_uploads WHERE file_name = ?
          ) as keep
        )
      `, [fileName, fileName]);

      const deleted = (result as any)[0]?.affectedRows ?? 0;
      totalDeleted += deleted;

      if (totalDeleted % 100 === 0) {
        console.log(`[Dedup] Deleted ${totalDeleted} rows so far...`);
      }

      if (deleted === 0) break;
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

dedupSimple();
