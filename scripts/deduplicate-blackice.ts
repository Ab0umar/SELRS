import "dotenv/config";
import mysql from "mysql2/promise";

async function deduplicateBlackIce() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[Dedup] Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("[Dedup] Starting blackice_uploads deduplication...");

  const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  try {
    const conn = await pool.getConnection();

    // Get count before
    const [[{ before }]] = await conn.query("SELECT COUNT(*) as before FROM blackice_uploads");
    console.log(`[Dedup] Total rows before: ${before}`);

    // Find duplicates: keep first ID of each file_name, delete the rest
    // This assumes file_name is unique per patient/file
    console.log("[Dedup] Identifying duplicates by file_name...");

    const duplicateQuery = `
      DELETE FROM blackice_uploads
      WHERE id NOT IN (
        SELECT MIN(id) FROM (
          SELECT MIN(id) as id FROM blackice_uploads
          WHERE file_name IS NOT NULL AND file_name != ''
          GROUP BY file_name
        ) as t
      )
      AND file_name IS NOT NULL
      AND file_name != ''
    `;

    console.log("[Dedup] Deleting duplicate rows...");
    const result = await conn.query(duplicateQuery);
    const deleted = (result as any)[0]?.affectedRows ?? 0;
    console.log(`[Dedup] Deleted ${deleted} duplicate rows`);

    // Get count after
    const [[{ after }]] = await conn.query("SELECT COUNT(*) as after FROM blackice_uploads");
    console.log(`[Dedup] Total rows after: ${after}`);
    console.log(`[Dedup] Reduction: ${before} → ${after} (${deleted} deleted)`);

    if (deleted > 0) {
      console.log("[Dedup] Optimizing table...");
      await conn.query("OPTIMIZE TABLE blackice_uploads");
      console.log("[Dedup] Table optimized");
    }

    console.log("[Dedup] ✓ Deduplication complete!");
    console.log("[Dedup] Now you can run: pnpm s3:migrate-blackice");

    conn.release();
  } finally {
    await pool.end();
  }
}

deduplicateBlackIce().catch((error) => {
  console.error("[Dedup] Fatal error:", error);
  process.exit(1);
});
