import { afterEach, describe, expect, it, vi } from "vitest";
import {
  availableGeminiModels,
  isPublicWebsiteAddress,
  previewWebsite,
  publicWebsiteUrl,
  websiteText,
} from "../services/auto-reply/ai-configuration";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("AI configuration and public website sources", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.1",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])("rejects non-public address %s", (address) =>
    expect(isPublicWebsiteAddress(address)).toBe(false),
  );
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])(
    "accepts public address %s",
    (address) => expect(isPublicWebsiteAddress(address)).toBe(true),
  );
  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com:444",
    "https://example.com/?access_token=secret",
  ])("rejects unsafe source URL %s", (url) =>
    expect(() => publicWebsiteUrl(url)).toThrow(),
  );
  it("does not connect to a private host", async () => {
    await expect(previewWebsite("https://127.0.0.1")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(previewWebsite("https://[::1]")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
  it("extracts plain text without scripts or login fields", () =>
    expect(
      websiteText(
        '<title>Center</title><script>secret()</script><form><input value="private"></form><p>Clinic &amp; info &#x627;</p>',
      ),
    ).toBe("Center Clinic & info ا"));
  it("lists only compatible Gemini generation models without returning the API key", async () => {
    vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "fixture-model-list-key");
    const network = vi.fn(async () =>
      Response.json({
        models: [
          {
            name: "models/gemini-3.8-flash",
            displayName: "Gemini",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/gemini-image",
            supportedGenerationMethods: ["generateContent"],
          },
          {
            name: "models/embedding",
            supportedGenerationMethods: ["embedContent"],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", network);
    const rows = await availableGeminiModels();
    expect(rows.map((row) => row.name)).toEqual(["models/gemini-3.8-flash"]);
    expect(JSON.stringify(rows)).not.toContain("fixture-model-list-key");
    expect(network).toHaveBeenCalledTimes(1);
    await availableGeminiModels();
    expect(network).toHaveBeenCalledTimes(1);
  });
});
