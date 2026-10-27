import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  read: vi.fn(),
  extract: vi.fn(),
  operation: vi.fn(),
  create: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  MediaResolution: { MEDIA_RESOLUTION_HIGH: "HIGH" },
  GoogleGenAI: class {
    models = { generateContent: mocks.generate };
  },
}));
vi.mock("../services/marketing/manusClient", async (original) => ({
  ...(await original<typeof import("../services/marketing/manusClient")>()),
  readManusTask: mocks.read,
  createManusTask: mocks.create,
  downloadManusFile: mocks.download,
}));
vi.mock("../services/ai/medicalGemini", () => ({
  assertMedicalGeminiAvailable: vi.fn(),
  medicalGeminiOptions: () => ({ model: "gemini-review" }),
  extractGeminiProposals: mocks.extract,
}));
vi.mock("../services/ai/operations", () => ({
  readAiOperation: mocks.operation,
  trackedAiOperation: vi.fn(),
}));
import { AiGateway } from "../services/ai/gateway";
import {
  AiManagementStore,
  AiManagementError,
} from "../services/ai/managementStore";
import { readAiManagementProbe } from "../services/ai/management";
import { startMedicalProposals } from "../services/ai/medical";
let owner = 990000;
beforeEach(() => {
  owner++;
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("AI module review regressions", () => {
  it("settles a validated Manus medical task even after the client leaves", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(AiManagementStore.prototype, "reserve").mockResolvedValue({
        workload: "medical.documentation",
        provider: "manus",
        model: "lite",
        enabled: true,
        dailyRequests: 10,
        dailyTokens: 100000,
        maxConcurrent: 2,
      });
      vi.spyOn(AiManagementStore.prototype, "attachTask").mockResolvedValue(
        undefined,
      );
      const complete = vi
        .spyOn(AiManagementStore.prototype, "complete")
        .mockResolvedValue(undefined);
      mocks.create.mockResolvedValue({ task_id: "medical-review" });
      mocks.read.mockResolvedValue({
        status: "stopped",
        has_running_background_jobs: false,
        credit_usage: 2,
        attachments: [
          {
            filename: "medical-proposals.json",
            url: "https://files.manuscdn.com/review.json",
          },
        ],
      });
      mocks.download.mockResolvedValue(
        Buffer.from(JSON.stringify({ proposals: [], warnings: [] })),
      );
      const { jobId } = await startMedicalProposals(
        owner,
        { kind: "field", label: "Complaints", transcript: "مثال خيالي" },
        [],
        "manus",
        "central",
        "lite",
      );
      expect(complete).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(2501);
      expect(complete).toHaveBeenCalledWith(
        jobId,
        { inputTokens: 0, outputTokens: 0, status: "success" },
        2,
      );
      expect(mocks.create).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
  it("preserves valid Gemini output while explicitly reporting unavailable accounting", async () => {
    vi.stubEnv("GEMINI_API_KEY", "review-only");
    mocks.generate.mockResolvedValue({
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: '{"ok":true}' }] } },
      ],
    });
    const usage = vi.fn();
    expect(
      await new AiGateway(usage).generateJson({
        workload: "marketing.text",
        model: "gemini-review",
        instruction: "synthetic",
        input: "synthetic",
        schema: z.object({ ok: z.literal(true) }),
        jsonSchema: { type: "object" },
      }),
    ).toEqual({ ok: true });
    expect(usage).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", usageKnown: false }),
    );
  });
  it("never reads or settles another workflow through the probe reader", async () => {
    const store = new AiManagementStore(async () => {
      throw new Error("No real DB access allowed");
    });
    const find = vi.spyOn(store, "findRequest");
    const complete = vi.spyOn(store, "complete");
    mocks.operation.mockResolvedValue(null);
    expect(
      await readAiManagementProbe(
        store,
        "00000000-0000-4000-8000-000000000123",
        owner,
      ),
    ).toBeNull();
    expect(mocks.operation).toHaveBeenCalledWith(
      expect.any(String),
      "probe",
      owner,
    );
    expect(find).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
  it("resolves a preflight rejection without reading the remote provider", async () => {
    const store = new AiManagementStore(async () => {
      throw new Error("Unexpected SQL");
    });
    mocks.operation.mockResolvedValue({ state: "rejected", context: {} });
    expect(
      await readAiManagementProbe(
        store,
        "00000000-0000-4000-8000-000000000124",
        owner,
      ),
    ).toEqual({ state: "rejected" });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("enforces a disabled central medical profile even when the caller asks for current", async () => {
    const reserve = vi
      .spyOn(AiManagementStore.prototype, "reserve")
      .mockRejectedValue(new AiManagementError("disabled"));
    await expect(
      startMedicalProposals(
        owner,
        { kind: "field", label: "Complaints", transcript: "مثال خيالي" },
        [],
        "gemini",
        "current",
        "gemini-review",
      ),
    ).rejects.toThrow("disabled");
    expect(reserve).toHaveBeenCalledWith(
      expect.any(String),
      "medical.documentation",
      "gemini",
      expect.any(Number),
      "gemini-review",
      "gemini",
    );
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it("settles Gemini medical usage without client polling and retries accounting independently", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(AiManagementStore.prototype, "reserve").mockResolvedValue({
        workload: "medical.documentation",
        provider: "gemini",
        model: "gemini-review",
        enabled: true,
        dailyRequests: 10,
        dailyTokens: 100000,
        maxConcurrent: 2,
      });
      const complete = vi
        .spyOn(AiManagementStore.prototype, "complete")
        .mockRejectedValueOnce(new Error("temporary persistence failure"))
        .mockResolvedValue(undefined);
      mocks.extract.mockImplementation(async (_prompt, _model, onUsage) => {
        onUsage({ inputTokens: 7, outputTokens: 4 });
        return { proposals: [], warnings: [] };
      });
      const { jobId } = await startMedicalProposals(
        owner,
        { kind: "field", label: "Complaints", transcript: "مثال مراجعة خيالي" },
        [],
        "gemini",
        "central",
        "gemini-review",
      );
      await vi.advanceTimersByTimeAsync(1);
      expect(complete).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(5000);
      expect(complete).toHaveBeenCalledTimes(2);
      expect(complete).toHaveBeenLastCalledWith(
        jobId,
        {
          inputTokens: 7,
          outputTokens: 4,
          status: "success",
          usageKnown: true,
        },
        null,
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
