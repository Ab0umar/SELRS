import { beforeEach, describe, expect, it, vi } from "vitest";
import { initTRPC } from "@trpc/server";

const mocks = vi.hoisted(() => ({
  azure: vi.fn(),
  gemini: vi.fn(),
  latest: vi.fn(),
}));
vi.mock("../_core/trpc", () => ({ router: initTRPC.create().router }));
vi.mock("../_core/procedures", () => ({
  medicalAssistantProcedure: initTRPC.create().procedure,
  adminProcedure: initTRPC.create().procedure,
}));
vi.mock("../services/ai/speech", () => ({ medicalSpeechToken: mocks.azure }));
vi.mock("../services/ai/geminiSpeech", () => ({
  medicalGeminiSpeechToken: mocks.gemini,
}));
vi.mock("../services/ai/medicalSettings", () => ({
  readMedicalAssistantSettings: vi.fn(),
  saveMedicalAssistantSettings: vi.fn(),
  assertSelectedSpeechProvider: vi.fn(),
}));
vi.mock("../services/ai/medical", () => ({
  startMedicalProposals: vi.fn(),
  readMedicalProposals: vi.fn(),
  latestMedicalJob: mocks.latest,
}));
import { medicalAssistantRouter } from "../routers/medical-assistant";

const caller = (id: number) =>
  medicalAssistantRouter.createCaller({ user: { id } } as never);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.azure.mockResolvedValue({ token: "temporary-token", region: "westeurope" });
  mocks.gemini.mockResolvedValue({ token: "temporary-token" });
  mocks.latest.mockResolvedValue(null);
});

describe("medical assistant speech tokens", () => {
  it("requires recording consent", async () => {
    await expect(
      caller(1).speechToken({ consentConfirmed: false } as never),
    ).rejects.toThrow();
    expect(mocks.azure).not.toHaveBeenCalled();
  });

  it("allows 30 tokens per user per hour across both providers", async () => {
    const user = caller(2);
    for (let index = 0; index < 15; index++) {
      await user.speechToken({ consentConfirmed: true });
      await user.geminiSpeechToken({ consentConfirmed: true });
    }
    await expect(
      user.speechToken({ consentConfirmed: true }),
    ).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: expect.stringContaining("30 مرة في الساعة"),
    });
    await expect(
      user.geminiSpeechToken({ consentConfirmed: true }),
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.azure).toHaveBeenCalledTimes(15);
    expect(mocks.gemini).toHaveBeenCalledTimes(15);
    // Another user keeps their own allowance.
    await expect(
      caller(3).speechToken({ consentConfirmed: true }),
    ).resolves.toEqual({ token: "temporary-token", region: "westeurope" });
  });

  it("frees the allowance an hour later", async () => {
    vi.useFakeTimers();
    try {
      const user = caller(4);
      for (let index = 0; index < 30; index++)
        await user.speechToken({ consentConfirmed: true });
      await expect(
        user.speechToken({ consentConfirmed: true }),
      ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
      vi.advanceTimersByTime(60 * 60_000 + 1);
      await expect(
        user.speechToken({ consentConfirmed: true }),
      ).resolves.toHaveProperty("token");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("latest medical AI job", () => {
  it("looks up only the calling user's jobs", async () => {
    await caller(5).latestJob({ patientId: 9, visitId: 11 });
    expect(mocks.latest).toHaveBeenCalledWith(5, 9, 11);
  });

  it("rejects extra keys and an empty patient id", async () => {
    await expect(
      caller(5).latestJob({ patientId: 9, ownerId: 1 } as never),
    ).rejects.toThrow();
    await expect(caller(5).latestJob({ patientId: 0 })).rejects.toThrow();
    expect(mocks.latest).not.toHaveBeenCalled();
  });
});
