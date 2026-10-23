import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../server/db";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from "../drizzle/encryptedText";

/**
 * Encrypts Facebook tokens that were stored as plaintext (or base64) before the
 * columns became encrypted. New writes are encrypted automatically, so this is
 * only needed once for rows that already exist. Re-running skips rows that are
 * already encrypted.
 *
 * Back up the database first. If SECRETS_ENCRYPTION_KEY is set, keep it with the
 * backup: without it (or JWT_SECRET when no dedicated key is used) these values
 * cannot be recovered and the pages must be reconnected.
 *
 * Usage:
 *   pnpm tsx scripts/encrypt-stored-secrets.ts          (dry run)
 *   pnpm tsx scripts/encrypt-stored-secrets.ts --apply
 */

const APPLY = process.argv.includes("--apply");

const TARGETS = [
  { table: "marketing_settings", column: "fb_access_token" },
  { table: "marketing_settings", column: "fb_pending_pages" },
  { table: "marketing_facebook_pages", column: "access_token" },
] as const;

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let pending = 0;
  let converted = 0;

  for (const { table, column } of TARGETS) {
    const [rows] = (await db.execute(
      sql.raw(`SELECT id, \`${column}\` AS value FROM \`${table}\``),
    )) as unknown as [Array<{ id: number; value: string | null }>];

    let plain = 0;
    let encrypted = 0;
    for (const row of rows) {
      const value = row.value;
      if (!value) continue;
      if (isEncryptedSecret(value)) {
        encrypted += 1;
        continue;
      }
      plain += 1;
      pending += 1;
      if (!APPLY) continue;

      const next = encryptSecret(value);
      if (decryptSecret(next) !== value) {
        throw new Error(`${table}.${column} id=${row.id}: round-trip check failed`);
      }
      await db.execute(
        sql`UPDATE ${sql.raw(`\`${table}\``)} SET ${sql.raw(`\`${column}\``)} = ${next} WHERE id = ${row.id}`,
      );
      converted += 1;
    }
    console.log(
      `${table}.${column}: ${rows.length} rows, ${plain} plaintext, ${encrypted} already encrypted`,
    );
  }

  console.log(
    APPLY
      ? `Encrypted ${converted} value(s).`
      : `Dry run: ${pending} value(s) would be encrypted. Re-run with --apply.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
