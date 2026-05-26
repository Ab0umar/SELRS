import "dotenv/config";
import mysql from "mysql2/promise";

async function previewDeduplicate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[Preview] Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("[Preview] Analyzing blackice_uploads for duplicates...\n");

  const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  try {
    const conn = await pool.getConnection();

    // Get total count
    const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM blackice_uploads");
    console.log(`Total rows: ${total}`);

    // Get unique file count
    const [[{ unique }]] = await conn.query(
      "SELECT COUNT(DISTINCT file_name) as unique FROM blackice_uploads WHERE file_name IS NOT NULL AND file_name != ''"
    );
    console.log(`Unique files: ${unique}`);
    console.log(`Duplicates to delete: ${total - unique}\n`);

    // Show examples of duplicates
    console.log("Examples of duplicates (will keep first ID, delete rest):\n");
    const [examples] = await conn.query(`
      SELECT
        file_name,
        COUNT(*) as copies,
        GROUP_CONCAT(id ORDER BY id) as all_ids,
        MIN(id) as keep_id,
        GROUP_CONCAT(IF(id != MIN(id), id, NULL)) as delete_ids
      FROM blackice_uploads
      WHERE file_name IS NOT NULL AND file_name != ''
      GROUP BY file_name
      HAVING COUNT(*) > 1
      LIMIT 10
    `) as any;

    for (const row of examples) {
      console.log(`File: ${row.file_name}`);
      console.log(`  Copies: ${row.copies}`);
      console.log(`  Keep ID: ${row.keep_id}`);
      console.log(`  Delete IDs: ${row.delete_ids}`);
      console.log("");
    }

    // Statistics
    console.log("\n=== Summary ===");
    console.log(`Before: ${total} rows`);
    console.log(`After:  ${unique} rows (estimated)`);
    console.log(`Delete: ${total - unique} rows`);

    conn.release();
  } finally {
    await pool.end();
  }
}

previewDeduplicate().catch((error) => {
  console.error("[Preview] Error:", error);
  process.exit(1);
});
