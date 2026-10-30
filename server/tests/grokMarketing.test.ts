import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiGateway } from "../services/ai/gateway";
import { profileSchema } from "../services/ai/managementStore";
import { configuredMarketingAssistant } from "../../shared/marketing-assistant";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const request = {
  workload: "marketing.text" as const,
  model: "grok-4.7",
  instruction: "Write marketing JSON",
  input: "Synthetic topic",
  schema: z.object({ ok: z.literal(true) }),
  jsonSchema: {},
};
describe("Grok marketing integration", () => {
  it("routes text through xAI and records the actual provider", async () => {
    vi.stubEnv("XAI_API_KEY", "test-private-key");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              { finish_reason: "stop", message: { content: '{"ok":true}' } },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 4 },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const usage = vi.fn();
    expect(await new AiGateway(usage).generateJson(request)).toEqual({
      ok: true,
    });
    expect(fetch.mock.calls[0][0]).toBe("https://api.x.ai/v1/chat/completions");
    expect(usage).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "grok",
        model: "grok-4.7",
        status: "success",
        usageKnown: true,
      }),
    );
    expect(JSON.stringify(usage.mock.calls)).not.toContain("test-private-key");
  });
  it("does not retry a rejected paid request", async () => {
    vi.stubEnv("XAI_API_KEY", "test-private-key");
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response("rejected", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    await expect(new AiGateway(vi.fn()).generateJson(request)).rejects.toThrow(
      "provider",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    "reply.live",
    "medical.synthetic",
    "medical.documentation",
    "whatsapp.marketing",
  ] as const)("rejects Grok for %s before contacting xAI", async (workload) => {
    vi.stubEnv("XAI_API_KEY", "test-private-key");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      new AiGateway(vi.fn()).generateJson({ ...request, workload }),
    ).rejects.toThrow("configuration");
    expect(fetch).not.toHaveBeenCalled();
    expect(
      profileSchema.safeParse({
        workload,
        provider: "grok",
        model: "grok-4.7",
        enabled: true,
        dailyRequests: 10,
        dailyTokens: 100000,
        maxConcurrent: 1,
      }).success,
    ).toBe(false);
  });
  it("preserves unknown image usage while returning validated image bytes", async () => {
    vi.stubEnv("XAI_API_KEY", "test-private-key");
    const bytes = Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      Buffer.alloc(40),
    ]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ data: [{ b64_json: bytes.toString("base64") }] }),
          ),
        ),
    );
    const usage = vi.fn();
    const result = await new AiGateway(usage).generateImage({
      ...request,
      workload: "marketing.image",
      model: "grok-imagine-image-2.0",
    });
    expect(result.bytes).toEqual(bytes);
    expect(usage).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "grok", usageKnown: false }),
    );
  });
  it("restores configured Grok text and image models together", () => {
    expect(
      configuredMarketingAssistant([
        {
          workload: "marketing.text",
          provider: "grok",
          model: "grok-4.7",
          enabled: true,
        },
        {
          workload: "marketing.image",
          provider: "grok",
          model: "grok-imagine-image-2.0",
          enabled: true,
        },
      ]),
    ).toEqual({
      provider: "grok",
      model: "grok-4.7",
      imageModel: "grok-imagine-image-2.0",
    });
  });
});
