import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), available: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    authTokens = { create: mocks.create };
  },
  AudioTranscriptionConfigMode: { VERBATIM: "VERBATIM" },
  Modality: { TEXT: "TEXT" },
}));
vi.mock("../services/ai/medicalGemini", () => ({
  assertMedicalGeminiAvailable: mocks.available,
}));
vi.mock("../services/medical-vocabulary", () => ({
  readMedicalVocabulary: async () => ({
    phrases: ["Cataract", "TOBRIN", "OCT Macula"],
  }),
}));
import { medicalGeminiSpeechToken } from "../services/ai/geminiSpeech";
afterEach(() => vi.resetAllMocks());
describe("Gemini medical speech credentials", () => {
  it("issues a single-use token locked to verbatim transcription and catalog vocabulary", async () => {
    mocks.create.mockResolvedValue({ name: "auth_tokens/temporary" });
    const result = await medicalGeminiSpeechToken();
    expect(result.token).toBe("auth_tokens/temporary");
    expect(mocks.available).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledWith({
      config: expect.objectContaining({
        uses: 1,
        liveConnectConstraints: {
          model: "gemini-3.5-transcribe-live",
          config: result.config,
        },
      }),
    });
    expect(result.config.inputAudioTranscription).toEqual({
      mode: "VERBATIM",
      languageCodes: [],
      customVocabulary: ["Cataract", "TOBRIN", "OCT Macula"],
    });
    expect(result).not.toHaveProperty("apiKey");
  });
  it("does not bypass the clinical approval gate", async () => {
    mocks.available.mockImplementation(() => {
      throw new Error("Approval required");
    });
    await expect(medicalGeminiSpeechToken()).rejects.toThrow(
      "Approval required",
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("does not expose provider errors or credentials", async () => {
    mocks.create.mockRejectedValue(new Error("secret-key private response"));
    await expect(medicalGeminiSpeechToken()).rejects.toThrow(
      "Gemini Live could not connect",
    );
  });
});
