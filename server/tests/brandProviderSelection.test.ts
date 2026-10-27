import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  legacy: vi.fn(),
  readFile: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  MediaResolution: { MEDIA_RESOLUTION_HIGH: "HIGH" },
  GoogleGenAI: class {
    models = { generateContent: mocks.generate };
  },
}));
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = mocks.legacy;
  },
}));
vi.mock("node:fs/promises", () => ({ default: { readFile: mocks.readFile } }));
import { AiManagementStore } from "../services/ai/managementStore";
import {
  analyzeDesignImage,
  buildBrandProfile,
} from "../services/marketing/brandStyleAnalyzer.service";
const style = {
  dominantColors: ["blue"],
  colorMood: "calm",
  layoutStyle: "simple",
  imageComposition: "centered",
  brandingStyle: "clinical",
  medicalVisualStyle: "photo",
  ctaPositioning: "bottom",
  logoPlacementStyle: "top",
  typographyStyle: "Arabic",
  overallAesthetic: "calm",
};
beforeEach(() => {
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
  vi.stubEnv("GEMINI_API_KEY", "fixture");
  const profile = {
    workload: "marketing.text" as const,
    provider: "gemini" as const,
    model: "gemini-configured",
    enabled: true,
    dailyRequests: 20,
    dailyTokens: 100000,
    maxConcurrent: 1,
  };
  vi.spyOn(AiManagementStore.prototype, "listProfiles").mockResolvedValue([
    profile,
  ]);
  vi.spyOn(AiManagementStore.prototype, "reserve").mockResolvedValue(profile);
  vi.spyOn(AiManagementStore.prototype, "complete").mockResolvedValue(
    undefined,
  );
  mocks.readFile.mockResolvedValue(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  mocks.generate.mockResolvedValue({
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: JSON.stringify(style) }] },
      },
    ],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("reference analysis provider selection", () => {
  it("uses the configured Gemini model and central accounting instead of the legacy SDK", async () => {
    expect(await analyzeDesignImage("fixture.png", "image/png")).toEqual(style);
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gemini-configured" }),
    );
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("does not secretly call Gemini when Manus is selected for a vision-only capability", async () => {
    vi.mocked(AiManagementStore.prototype.listProfiles).mockResolvedValue([
      {
        workload: "marketing.text",
        provider: "manus",
        model: "lite",
        enabled: true,
        dailyRequests: 20,
        dailyTokens: 100000,
        maxConcurrent: 1,
      },
    ]);
    await expect(
      analyzeDesignImage("fixture.png", "image/png"),
    ).rejects.toThrow("Gemini فقط");
    await expect(buildBrandProfile([style, style], 2)).rejects.toThrow(
      "Gemini فقط",
    );
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("blocks disabled analysis profiles before requesting a provider", async () => {
    vi.mocked(AiManagementStore.prototype.listProfiles).mockResolvedValue([]);
    await expect(
      analyzeDesignImage("fixture.png", "image/png"),
    ).rejects.toThrow("unavailable");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
