import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), constructors: vi.fn() }));
vi.mock("@google/genai", () => ({
  MediaResolution: { MEDIA_RESOLUTION_HIGH: "MEDIA_RESOLUTION_HIGH" },
  GoogleGenAI: class {
    models = { generateContent: mocks.generate };
    constructor(options: unknown) {
      mocks.constructors(options);
    }
  },
}));
import { AiGateway } from "../services/ai/gateway";

const jsonRequest = {
  workload: "marketing.text" as const,
  instruction: "trusted instruction",
  input: "synthetic untrusted input",
  schema: z.object({ ok: z.literal(true) }).strict(),
  jsonSchema: { type: "object" },
};
const goodResponse = () => ({
  candidates: [
    { finishReason: "STOP", content: { parts: [{ text: '{"ok":true}' }] } },
  ],
  usageMetadata: {
    promptTokenCount: 10,
    candidatesTokenCount: 5,
    thoughtsTokenCount: 2,
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-central-key");
  vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "test-reply-key");
  vi.stubEnv("AI_GEMINI_TEXT_MODEL", "gemini-3.8-flash");
  vi.stubEnv("AI_GEMINI_IMAGE_MODEL", "gemini-nano-banana-2.1");
  mocks.generate.mockResolvedValue(goodResponse());
});
afterEach(() => vi.unstubAllEnvs());

describe("AI core isolation and validation", () => {
  it("never sends clinical documentation through the general Gemini gateway", async () => {
    await expect(
      new AiGateway(vi.fn()).generateJson({
        ...jsonRequest,
        workload: "medical.documentation",
      }),
    ).rejects.toThrow("configuration");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("keeps visual references out of text and medical requests", async () => {
    const reference = {
      bytes: Buffer.alloc(64),
      mimeType: "image/png" as const,
    };
    await expect(
      new AiGateway(vi.fn()).generateJson({
        ...jsonRequest,
        references: [reference],
      }),
    ).rejects.toThrow("configuration");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("sends validated reference bytes only as bounded image input", async () => {
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
      "base64",
    );
    mocks.generate.mockResolvedValue({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: bytes.toString("base64"),
                },
              },
            ],
          },
        },
      ],
    });
    await new AiGateway(vi.fn()).generateImage({
      workload: "marketing.image",
      instruction: "style only",
      input: "fictional clinic",
      references: [{ bytes, mimeType: "image/png" }],
    });
    expect(
      mocks.generate.mock.calls[0][0].contents[0].parts[1].inlineData.data,
    ).toBe(bytes.toString("base64"));
    expect(mocks.generate.mock.calls[0][0].config.mediaResolution).toBe(
      "MEDIA_RESOLUTION_HIGH",
    );
  });
  it("returns validated JSON and records usage without prompts or keys", async () => {
    const usage = vi.fn();
    expect(await new AiGateway(usage).generateJson(jsonRequest)).toEqual({
      ok: true,
    });
    expect(usage).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        inputTokens: 10,
        outputTokens: 7,
      }),
    );
    expect(JSON.stringify(usage.mock.calls)).not.toMatch(
      /test-central-key|trusted instruction|synthetic untrusted input/,
    );
    const request = mocks.generate.mock.calls[0][0];
    expect(request.config.systemInstruction).toBe(jsonRequest.instruction);
    expect(request.contents[0].parts[0].text).toBe(jsonRequest.input);
    expect(request.config.tools).toBeUndefined();
    expect(mocks.constructors).toHaveBeenCalledWith(
      expect.objectContaining({
        httpOptions: expect.objectContaining({ retryOptions: { attempts: 1 } }),
      }),
    );
  });

  it("does not borrow the marketing key for reply previews", async () => {
    await new AiGateway(vi.fn()).generateJson({
      ...jsonRequest,
      workload: "reply.preview",
    });
    expect(mocks.constructors).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "test-reply-key" }),
    );
    vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "");
    await expect(
      new AiGateway(vi.fn()).generateJson({
        ...jsonRequest,
        workload: "reply.preview",
      }),
    ).rejects.toThrow("configuration");
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it.each(["MAX_TOKENS", "SAFETY"])(
    "rejects %s and never retries",
    async (finishReason) => {
      mocks.generate.mockResolvedValue({
        candidates: [
          { finishReason, content: { parts: [{ text: '{"ok":true}' }] } },
        ],
      });
      await expect(
        new AiGateway(vi.fn()).generateJson(jsonRequest),
      ).rejects.toThrow("invalid_output");
      expect(mocks.generate).toHaveBeenCalledOnce();
    },
  );

  it.each(["not json", '{"ok":false}', '{"ok":true,"unexpected":1}'])(
    "rejects invalid domain output %s",
    async (text) => {
      mocks.generate.mockResolvedValue({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }],
      });
      await expect(
        new AiGateway(vi.fn()).generateJson(jsonRequest),
      ).rejects.toThrow("invalid_output");
    },
  );

  it("redacts upstream errors and releases capacity after failure", async () => {
    mocks.generate.mockRejectedValueOnce({
      status: 429,
      message: "private-secret",
    });
    const gateway = new AiGateway(vi.fn());
    await expect(gateway.generateJson(jsonRequest)).rejects.toThrow(
      "AI provider (429)",
    );
    expect(await gateway.generateJson(jsonRequest)).toEqual({ ok: true });
  });

  it("limits concurrency per workload without blocking other workloads", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.generate.mockImplementation(async () => {
      await pending;
      return goodResponse();
    });
    const gateway = new AiGateway(vi.fn());
    const requests = [
      gateway.generateJson(jsonRequest),
      gateway.generateJson(jsonRequest),
    ];
    try {
      await expect(gateway.generateJson(jsonRequest)).rejects.toThrow(
        "capacity",
      );
      requests.push(
        gateway.generateJson({ ...jsonRequest, workload: "reply.preview" }),
      );
    } finally {
      release();
      await Promise.all(requests);
    }
  });

  it("rejects a claimed image whose bytes are not an image", async () => {
    mocks.generate.mockResolvedValue({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: Buffer.alloc(64).toString("base64"),
                },
              },
            ],
          },
        },
      ],
    });
    await expect(
      new AiGateway(vi.fn()).generateImage({
        ...jsonRequest,
        workload: "marketing.image",
      }),
    ).rejects.toThrow("invalid_output");
  });

  it("returns real image bytes with a token budget sufficient for the verified image output", async () => {
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7V0AAAAASUVORK5CYII=",
      "base64",
    );
    mocks.generate.mockImplementation(async (request) => ({
      candidates: [
        {
          finishReason:
            request.config.maxOutputTokens >= 8192 ? "STOP" : "MAX_TOKENS",
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: bytes.toString("base64"),
                },
              },
            ],
          },
        },
      ],
    }));
    const generated = await new AiGateway(vi.fn()).generateImage({
      workload: "marketing.image",
      instruction: "synthetic image",
      input: "fictional clinic",
    });
    expect(generated.bytes).toEqual(bytes);
    expect(generated.mimeType).toBe("image/png");
  });
});
