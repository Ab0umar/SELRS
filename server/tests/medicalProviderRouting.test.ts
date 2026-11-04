import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  start: vi
    .fn()
    .mockResolvedValue({ jobId: "00000000-0000-4000-8000-000000000001" }),
}));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getSystemSetting: async () => null,
}));
vi.mock("../services/ai/medical", () => ({
  startMedicalProposals: mocks.start,
  readMedicalProposals: vi.fn(),
}));
vi.mock("../services/medical-vocabulary", () => ({
  readMedicalVocabulary: async () => ({ entries: [] }),
}));
import { AiManagementStore } from "../services/ai/managementStore";
import { medicalAssistantRouter } from "../routers/medical-assistant";
import { aiManagementRouter } from "../routers/aiManagement";
import { makeCallerAs } from "./helpers/auth";
const input = {
  recording: {
    kind: "field" as const,
    label: "Complaints",
    transcript: "مثال خيالي فقط",
  },
  consentConfirmed: true as const,
  provider: "gemini" as const,
  model: "gemini-selected",
};
beforeEach(() => {
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
  vi.spyOn(AiManagementStore.prototype, "listProfiles").mockResolvedValue([
    {
      workload: "medical.documentation",
      provider: "gemini",
      model: "gemini-selected",
      enabled: true,
      dailyRequests: 20,
      dailyTokens: 100000,
      maxConcurrent: 1,
    },
  ]);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("medical provider routing", () => {
  it("dispatches to the selected central provider and model", async () => {
    await medicalAssistantRouter
      .createCaller(makeCallerAs("doctor"))
      .startProposals(input);
    expect(mocks.start).toHaveBeenCalledWith(
      expect.any(Number),
      input.recording,
      [],
      "gemini",
      "current",
      "gemini-selected",
    );
  });
  it("rejects a stale consent/provider selection before sending a transcript", async () => {
    await expect(
      medicalAssistantRouter
        .createCaller(makeCallerAs("doctor"))
        .startProposals({ ...input, provider: "manus", model: "lite" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("uses the saved provider for the medical synthetic route rather than hard-coded Manus", async () => {
    await aiManagementRouter
      .createCaller(makeCallerAs("admin"))
      .startMedicalSynthetic();
    expect(mocks.start).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ kind: "field" }),
      [],
      "gemini",
      "central",
      "gemini-selected",
    );
  });
});
