import "dotenv/config";
import mysql from "mysql2/promise";

async function previewDeduplicate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[Preview] Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("[Preview] Analyzing blackice_uploads for duplicates...\n");

  const conn = await mysql.createConnection(databaseUrl);

  try {
    // Get total count
    const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM blackice_uploads") as any;
    console.log(`✓ Total rows: ${total}`);

    // Get unique file count (lightweight)
    const [[{ unique }]] = await conn.query(
      "SELECT COUNT(DISTINCT file_name) as unique FROM blackice_uploads WHERE file_name != ''"
    ) as any;
    console.log(`✓ Unique files: ${unique}`);
    console.log(`✓ Duplicates: ${total - unique}`);
    console.log(`\n=== Summary ===`);
    console.log(`Before: ${total} rows`);
    console.log(`After:  ${unique} rows`);
    console.log(`Delete: ${total - unique} rows`);
    console.log(`\nIf this looks correct, run: pnpm s3:dedup-blackice`);

  } finally {
    await conn.end();
  }
}

previewDeduplicate().catch((error) => {
  console.error("[Preview] Error:", error);
  process.exit(1);
});
