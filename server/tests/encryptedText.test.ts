import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from "../../drizzle/encryptedText";
import { marketingFacebookPages, marketingSettings } from "../../drizzle/schema";

const originalKey = process.env.SECRETS_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
  else process.env.SECRETS_ENCRYPTION_KEY = originalKey;
  vi.restoreAllMocks();
});

describe("stored secret encryption", () => {
  it("round-trips a token, including non-ASCII text", () => {
    for (const token of ["EAAB-page-token_123", "توكن ✓ 🔐", "x".repeat(5000)]) {
      const stored = encryptSecret(token);
      expect(stored).not.toContain(token);
      expect(isEncryptedSecret(stored)).toBe(true);
      expect(decryptSecret(stored)).toBe(token);
    }
  });

  it("uses a fresh IV, so equal inputs give different ciphertext", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("does not encrypt twice", () => {
    const once = encryptSecret("token");
    expect(encryptSecret(once)).toBe(once);
  });

  it("reads legacy plaintext values unchanged", () => {
    expect(decryptSecret("EAAB-legacy-plaintext")).toBe("EAAB-legacy-plaintext");
    expect(isEncryptedSecret("EAAB-legacy-plaintext")).toBe(false);
  });

  it("returns an empty string for tampered ciphertext instead of throwing", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const stored = encryptSecret("token");
    const tampered = stored.slice(0, -2) + (stored.endsWith("AA") ? "BB" : "AA");
    expect(decryptSecret(tampered)).toBe("");
    expect(decryptSecret("enc:v1:not-base64-!!")).toBe("");
  });

  it("cannot be decrypted with a different key", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.SECRETS_ENCRYPTION_KEY = "first-key-first-key-first-key-123456";
    const stored = encryptSecret("token");
    expect(decryptSecret(stored)).toBe("token");

    process.env.SECRETS_ENCRYPTION_KEY = "other-key-other-key-other-key-123456";
    expect(decryptSecret(stored)).toBe("");
  });

  it("falls back to JWT_SECRET when no dedicated key is set", () => {
    delete process.env.SECRETS_ENCRYPTION_KEY;
    const stored = encryptSecret("token");
    expect(decryptSecret(stored)).toBe("token");
  });
});

describe("encrypted Facebook token columns", () => {
  const columns = [
    ["marketing_settings.fb_access_token", marketingSettings.fbAccessToken],
    ["marketing_settings.fb_pending_pages", marketingSettings.fbPendingPages],
    ["marketing_facebook_pages.access_token", marketingFacebookPages.accessToken],
  ] as const;

  it.each(columns)("%s encrypts on write and decrypts on read", (_name, column) => {
    const written = column.mapToDriverValue("EAAB-secret") as string;
    expect(written).not.toContain("EAAB-secret");
    expect(isEncryptedSecret(written)).toBe(true);
    expect(column.mapFromDriverValue(written)).toBe("EAAB-secret");
  });

  it.each(columns)("%s still reads rows stored before encryption", (_name, column) => {
    expect(column.mapFromDriverValue("EAAB-legacy")).toBe("EAAB-legacy");
  });

  it.each(columns)("%s keeps the column type as text", (_name, column) => {
    expect(column.getSQLType()).toBe("text");
  });
});
