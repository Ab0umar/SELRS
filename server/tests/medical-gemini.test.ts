import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertMedicalGeminiAvailable,
  extractGeminiProposals,
  medicalGeminiOptions,
} from "../services/medical-gemini";
import { medicalProposalRequestSchema } from "../../shared/medical-assistant";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional Gemini documentation provider", () => {
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
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
    expect(request.tools).toBeUndefined();
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
      vi
        .fn()
        .mockResolvedValue(
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
      "incomplete or blocked",
    );
  });
});
