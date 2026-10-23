import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { customType } from "drizzle-orm/mysql-core";

// AES-256-GCM for secrets stored in the database (OAuth/page access tokens).
// The column stays TEXT, so no migration is needed. Values without the prefix
// are legacy plaintext: they are read as-is and encrypted the next time they
// are written (see scripts/encrypt-stored-secrets.ts to convert them at once).
const PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(): Buffer {
  // A dedicated key lets JWT_SECRET rotate without losing stored tokens; the
  // fallback keeps this working with the secrets that already exist.
  const source = process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY or JWT_SECRET is required to protect stored tokens",
    );
  }
  return Buffer.from(
    hkdfSync("sha256", source, "selrs-secrets", "stored-secrets-v1", 32),
  );
}

export function encryptSecret(plain: string): string {
  if (plain.startsWith(PREFIX)) return plain;
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** Returns "" when the value cannot be decrypted (wrong key or tampering). */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      raw.subarray(0, IV_BYTES),
    );
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    console.error(
      "[secrets] Could not decrypt a stored secret; was SECRETS_ENCRYPTION_KEY or JWT_SECRET changed?",
    );
    return "";
  }
}

export function isEncryptedSecret(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

export const encryptedText = customType<{ data: string; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value) {
    return value ? encryptSecret(value) : value;
  },
  fromDriver(value) {
    return value ? decryptSecret(value) : value;
  },
});
