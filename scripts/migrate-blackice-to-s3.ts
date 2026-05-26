import "dotenv/config";
import mysql from "mysql2/promise";
import { uploadToS3 } from "../server/_core/s3";

async function migrateBlackIceToS3() {
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsS3Bucket = process.env.AWS_S3_BUCKET;
  const awsRegion = process.env.AWS_REGION || "me-central-1";
  const databaseUrl = process.env.DATABASE_URL;

  if (!awsAccessKeyId || !awsSecretAccessKey || !awsS3Bucket) {
    console.error("[S3 Migration] Missing AWS credentials. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET");
    process.exit(1);
  }

  if (!databaseUrl) {
    console.error("[S3 Migration] Missing DATABASE_URL");
    process.exit(1);
  }

  console.log("[S3 Migration] Starting blackice_uploads migration to S3...");
  console.log(`[S3 Migration] Using bucket: ${awsS3Bucket} in region: ${awsRegion}`);

  const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  try {
    const conn = await pool.getConnection();

    // Check if s3_key column exists, if not add it
    try {
      await conn.query("SELECT s3_key FROM blackice_uploads LIMIT 1");
    } catch {
      console.log("[S3 Migration] Adding s3_key column...");
      await conn.query(
        "ALTER TABLE blackice_uploads ADD COLUMN s3_key VARCHAR(255) AFTER file_name"
      );
    }

    // Get total count
    const [[{ total }]] = await conn.query("SELECT COUNT(*) as total FROM blackice_uploads WHERE s3_key IS NULL");
    console.log(`[S3 Migration] Found ${total} records to migrate`);

    let processed = 0;
    let failed = 0;
    const batchSize = 10;

    while (processed < total) {
      const [rows] = await conn.query(
        `SELECT id, file_name, mime_type, file_data FROM blackice_uploads
         WHERE s3_key IS NULL ORDER BY id ASC LIMIT ?`,
        [batchSize]
      );

      if ((rows as any[]).length === 0) break;

      for (const row of rows as any[]) {
        try {
          if (!row.file_data || row.file_data.length === 0) {
            console.log(`[S3 Migration] Skipping ${row.id} (empty file)`);
            await conn.query("UPDATE blackice_uploads SET s3_key = ? WHERE id = ?", [
              "EMPTY",
              row.id,
            ]);
            processed++;
            continue;
          }

          const s3Key = `blackice/${row.id}/${row.file_name || "document"}`;
          const mimeType = row.mime_type || "application/octet-stream";

          // Upload to S3
          await uploadToS3(s3Key, row.file_data, mimeType);

          // Update DB to store S3 key (keep file_data for now in case of rollback)
          await conn.query(
            "UPDATE blackice_uploads SET s3_key = ? WHERE id = ?",
            [s3Key, row.id]
          );

          processed++;
          if (processed % 100 === 0) {
            console.log(`[S3 Migration] Processed ${processed}/${total}`);
          }
        } catch (error: any) {
          failed++;
          console.error(`[S3 Migration] Failed to migrate ${row.id}: ${String(error?.message ?? error)}`);
        }
      }
    }

    console.log(
      `[S3 Migration] Complete: ${processed} migrated, ${failed} failed out of ${total}`
    );

    if (failed === 0) {
      console.log("[S3 Migration] Successfully migrated all files to S3!");
      console.log("[S3 Migration] file_data, ocr_text, plain_text columns still contain old data");
      console.log("[S3 Migration] When ready, you can clean up with:");
      console.log("  ALTER TABLE blackice_uploads MODIFY COLUMN file_data LONGBLOB NULL;");
      console.log("  UPDATE blackice_uploads SET file_data = NULL, ocr_text = NULL, plain_text = NULL WHERE s3_key IS NOT NULL;");
      console.log("  OPTIMIZE TABLE blackice_uploads;");
    }

    conn.release();
  } finally {
    await pool.end();
  }
}

migrateBlackIceToS3().catch((error) => {
  console.error("[S3 Migration] Fatal error:", error);
  process.exit(1);
});
