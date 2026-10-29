import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertMedicalGeminiAvailable,
  extractGeminiProposals,
  medicalGeminiOptions,
  GeminiDocumentationError,
  geminiDocumentationFailure,
} from "../services/ai/medicalGemini";
import { medicalProposalRequestSchema } from "../../shared/medical-assistant";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional Gemini documentation provider", () => {
  it("reports an HTTP failure without exposing provider response text or retrying", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const network = vi.fn().mockResolvedValue(new Response("sensitive provider response",{status:400}));
    vi.stubGlobal("fetch",network);
    let failure: unknown;
    try { await extractGeminiProposals("synthetic fixture"); } catch (error) {failure=error;}
    expect(failure).toBeInstanceOf(GeminiDocumentationError);
    expect(geminiDocumentationFailure(failure)).toMatchObject({code:"http_400"});
    expect(geminiDocumentationFailure(failure).message).not.toContain("sensitive provider response");
    expect(network).toHaveBeenCalledTimes(1);
  });
  it("retains known usage even if the returned proposal envelope is invalid", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 12 },
              candidates: [],
            }),
          ),
        ),
    );
    const usage = vi.fn();
    await expect(
      extractGeminiProposals("synthetic", undefined, usage),
    ).rejects.toThrow();
    expect(usage).toHaveBeenCalledWith({ inputTokens: 80, outputTokens: 12 });
  });
  it("keeps usage unknown when a successful response omits accounting metadata", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              candidates: [
                {
                  finishReason: "STOP",
                  content: {
                    parts: [{ text: '{"proposals":[],"warnings":[]}' }],
                  },
                },
              ],
            }),
          ),
        ),
    );
    const usage = vi.fn();
    await extractGeminiProposals("synthetic", undefined, usage);
    expect(usage).not.toHaveBeenCalled();
  });
  it("keeps Manus as the request default", () => {
    const request = medicalProposalRequestSchema.parse({
      recording: { kind: "field", label: "Complaint", transcript: "fictional" },
      consentConfirmed: true,
    });
    expect(request.provider).toBe("manus");
  });

  it.each([undefined, "false", "1", "TRUE"])(
    "blocks clinical use with approval %s before any network request",
    (approval) => {
      vi.stubEnv("MEDICAL_GEMINI_CLINICAL_APPROVED", approval);
      vi.stubEnv("GEMINI_API_KEY", "test-key");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      expect(() => assertMedicalGeminiAvailable()).toThrow(
        "disabled pending confirmation",
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("does not expose credentials in provider status", () => {
    vi.stubEnv("GEMINI_API_KEY", "private-key");
    expect(JSON.stringify(medicalGeminiOptions())).not.toContain("private-key");
  });

  it("uses JSON generation and excludes thinking text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  { text: "internal", thought: true },
                  { text: '{"proposals":[],"warnings":[]}' },
                ],
              },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await extractGeminiProposals("synthetic fixture")).toEqual({
      proposals: [],
      warnings: [],
    });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.thinkingConfig).toEqual({thinkingLevel:"LOW"});
    const schema = request.generationConfig.responseJsonSchema;
    expect(schema.properties.proposals.maxItems).toBeUndefined();
    expect(schema.properties.proposals.items.properties.medications.maxItems).toBeUndefined();
    expect(request.tools).toBeUndefined();
  });
  it("uses the selected Gemini model and reports its actual usage", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fixture-key");
    const network = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ text: '{"proposals":[],"warnings":[]}' }],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 42,
            candidatesTokenCount: 11,
            thoughtsTokenCount: 3,
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", network);
    const usage = vi.fn();
    await extractGeminiProposals(
      "fictional transcript",
      "gemini-selected",
      usage,
    );
    expect(network.mock.calls[0][0]).toContain(
      "gemini-selected:generateContent",
    );
    expect(usage).toHaveBeenCalledWith({ inputTokens: 42, outputTokens: 14 });
  });

  it("does not reflect provider error bodies", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("private transcript", { status: 403 })),
    );
    await expect(extractGeminiProposals("synthetic")).rejects.toThrow(
      "HTTP 403",
    );
  });

  it("rejects truncated output", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: "MAX_TOKENS",
                content: { parts: [{ text: "{}" }] },
              },
            ],
          }),
        ),
      ),
    );
    await expect(extractGeminiProposals("synthetic")).rejects.toThrow(
      "incomplete",
    );
  });
});
