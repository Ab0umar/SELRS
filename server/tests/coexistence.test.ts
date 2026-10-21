import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  openCoexistence,
  readCoexistenceCredentials,
  saveCoexistenceCredentials,
  sealCoexistence,
} from "../services/auto-reply/coexistence-credentials";
import { parseSignupMessage } from "../../client/src/features/admin/whatsapp-signup";
import {
  historyTimestamp,
  parseCoexistenceChanges,
} from "../services/auto-reply/coexistence-sync";
import { assertCustomerServicePhone } from "../services/auto-reply/coexistence";

const directories: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true });
});
function key() {
  vi.stubEnv("AUTO_REPLY_CREDENTIAL_KEY", "ab".repeat(32));
}
const assets = {
  type: "WA_EMBEDDED_SIGNUP",
  event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  data: { phone_number_id: "123", waba_id: "456" },
};
describe("Coexistence trust boundaries", () => {
  it("accepts Meta assets and rejects suffix spoofing, wrong origin, other completion types and malformed ids", () => {
    expect(
      parseSignupMessage("https://www.facebook.com", JSON.stringify(assets)),
    ).toEqual({ event: assets.event, phoneId: "123", wabaId: "456" });
    for (const origin of [
      "https://evilfacebook.com",
      "https://www.facebook.com.evil.test",
      "http://www.facebook.com",
      "null",
    ])
      expect(parseSignupMessage(origin, assets)).toBeNull();
    expect(
      parseSignupMessage("https://www.facebook.com", {
        ...assets,
        event: "FINISH",
      }),
    ).toBeNull();
    expect(
      parseSignupMessage("https://www.facebook.com", {
        ...assets,
        data: { phone_number_id: "../booking", waba_id: "456" },
      }),
    ).toBeNull();
    expect(
      parseSignupMessage("https://www.facebook.com", "invalid JSON"),
    ).toBeNull();
  });
  it("requires an explicitly configured booking guard and rejects the reserved number", () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    expect(() => assertCustomerServicePhone("123")).toThrow(
      "BOOKING_PHONE_GUARD_MISSING",
    );
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123");
    expect(() => assertCustomerServicePhone("123")).toThrow(
      "WHATSAPP_CONFIRMATION_NUMBER_RESERVED",
    );
    expect(() => assertCustomerServicePhone("456")).not.toThrow();
  });
  it("never stores a token as plaintext and authenticates encrypted contents", () => {
    key();
    const value = {
      token: "fixture-customer-service-token",
      phoneId: "123",
      wabaId: "456",
      attemptId: "c082a534-6342-40e1-90da-dcd2de6bf934",
    };
    const dir = mkdtempSync(join(tmpdir(), "selrs-coexistence-test-"));
    directories.push(dir);
    const path = join(dir, "vault.enc");
    vi.stubEnv("AUTO_REPLY_CREDENTIAL_FILE", path);
    saveCoexistenceCredentials(value);
    const ciphertext = readFileSync(path, "utf8");
    expect(ciphertext).not.toContain(value.token);
    expect(readCoexistenceCredentials()).toEqual(value);
    const changed = Buffer.from(ciphertext, "base64");
    changed[changed.length - 1] ^= 1;
    expect(() => openCoexistence(changed.toString("base64"))).toThrow();
    vi.stubEnv("AUTO_REPLY_CREDENTIAL_KEY", "cd".repeat(32));
    expect(() => readCoexistenceCredentials()).toThrow(
      "COEXISTENCE_VAULT_UNAVAILABLE",
    );
  });
  it("rejects weak or missing encryption keys", () => {
    vi.stubEnv("AUTO_REPLY_CREDENTIAL_KEY", "short");
    expect(() => sealCoexistence("token")).toThrow("COEXISTENCE_KEY_MISSING");
  });
  it("isolates synchronization events by WABA and phone", () => {
    const body = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "456",
          changes: [
            {
              field: "history",
              value: { metadata: { phone_number_id: "123" }, history: [] },
            },
            {
              field: "history",
              value: { metadata: { phone_number_id: "999" } },
            },
            { field: "messages", value: {} },
          ],
        },
        { id: "other", changes: [{ field: "account_update", value: {} }] },
      ],
    };
    expect(parseCoexistenceChanges(body, "123", "456")).toHaveLength(1);
    expect(
      parseCoexistenceChanges({ ...body, object: "page" }, "123", "456"),
    ).toEqual([]);
  });
  it("rejects future or invalid history timestamps", () => {
    expect(() => historyTimestamp("NaN")).toThrow();
    expect(() =>
      historyTimestamp(String(Math.floor(Date.now() / 1000) + 100000)),
    ).toThrow();
    expect(historyTimestamp("1700000000").getTime()).toBe(1700000000000);
  });
});
