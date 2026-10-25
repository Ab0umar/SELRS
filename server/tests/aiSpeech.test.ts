import { afterEach, describe, expect, it, vi } from "vitest";
import { medicalSpeechToken } from "../services/ai/speech";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("central medical speech exchange", () => {
  it("rejects an invalid region before any request", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "synthetic-key");
    vi.stubEnv("AZURE_SPEECH_REGION", "invalid.example/");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(medicalSpeechToken()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("exchanges a short-lived token through the configured Azure resource", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "synthetic-key");
    vi.stubEnv("AZURE_SPEECH_REGION", "eastus");
    const fetch = vi.fn().mockResolvedValue(new Response("synthetic-token"));
    vi.stubGlobal("fetch", fetch);
    expect(await medicalSpeechToken()).toEqual({
      token: "synthetic-token",
      region: "eastus",
    });
    expect(fetch.mock.calls[0][0]).toBe(
      "https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken",
    );
  });
  it("does not expose a provider error body or key", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "synthetic-private-key");
    vi.stubEnv("AZURE_SPEECH_REGION", "eastus");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("synthetic-private-body", { status: 403 }),
        ),
    );
    await expect(medicalSpeechToken()).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message:
        "Azure Speech could not connect. Check the server Speech resource settings.",
    });
  });
});
