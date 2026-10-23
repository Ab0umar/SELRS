import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import {
  existsSync,
  readFileSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const credentialsSchema = z.object({
  token: z.string().min(20),
  phoneId: z.string().regex(/^\d+$/),
  wabaId: z.string().regex(/^\d+$/),
  attemptId: z.string().uuid(),
});
export type CoexistenceCredentials = z.infer<typeof credentialsSchema>;
function key() {
  const value = process.env.AUTO_REPLY_CREDENTIAL_KEY ?? "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new Error("COEXISTENCE_KEY_MISSING");
  return Buffer.from(value, "hex");
}
export function sealCoexistence(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from("selrs-auto-reply-coexistence-v1"));
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}
export function openCoexistence(value: string): unknown {
  const data = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAAD(Buffer.from("selrs-auto-reply-coexistence-v1"));
  decipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]).toString("utf8"),
  );
}
function credentialPath() {
  return resolve(
    process.env.AUTO_REPLY_CREDENTIAL_FILE || ".auto-reply/whatsapp.enc",
  );
}
export function readCoexistenceCredentials(): CoexistenceCredentials | null {
  if (!existsSync(credentialPath())) return null;
  // A damaged vault must fail closed instead of silently selecting a different number.
  try {
    return credentialsSchema.parse(
      openCoexistence(readFileSync(credentialPath(), "utf8")),
    );
  } catch {
    throw new Error("COEXISTENCE_VAULT_UNAVAILABLE");
  }
}
export function saveCoexistenceCredentials(value: CoexistenceCredentials) {
  const path = credentialPath();
  const encrypted = sealCoexistence(credentialsSchema.parse(value));
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(temp, encrypted, { mode: 0o600, flag: "wx" });
  renameSync(temp, path);
}
