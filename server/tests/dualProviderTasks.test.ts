import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
vi.mock("../services/ai/providers/manus", async (original) => ({
  ...(await original<typeof import("../services/ai/providers/manus")>()),
  createManusTask: vi.fn(),
  readManusTask: vi.fn(),
  downloadManusFile: vi.fn(),
}));
import {
  createManusTask,
  readManusTask,
  downloadManusFile,
  ManusRequestError,
} from "../services/ai/providers/manus";
import {
  AiManagementStore,
  profileSchema,
} from "../services/ai/managementStore";
import {
  AiTaskPending,
  AiTaskExpired,
  jsonTaskHash,
  readManusJson,
} from "../services/ai/manusJson";
import { managedReplyPreview } from "../services/ai/replyPreview";
import { jobFailure } from "../services/auto-reply/worker";
import { ProviderError, proposeReply } from "../services/auto-reply/providers";
import { defaultAutoReplySettings } from "../../shared/auto-reply";

const id = "00000000-0000-4000-8000-000000000001";
const request = {
  instruction: "Use approved facts only. Return JSON text,handoff,sourceIds.",
  input: '{"message":"مرحبا"}',
};
const task = {
  ...request,
  workload: "reply.live" as const,
  schema: z.object({
    text: z.string(),
    handoff: z.boolean(),
    sourceIds: z.array(z.number()),
  }),
};
function record() {
  return {
    provider: "manus" as const,
    workload: "reply.live" as const,
    model: "max",
    state: "running" as const,
    task_id: "known-task",
    created_ms: Date.now(),
    input_hash: jsonTaskHash(task),
  };
}
let store: AiManagementStore;
beforeEach(() => {
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
  store = new AiManagementStore(async () => {
    throw new Error("Unexpected database call");
  });
  vi.spyOn(store, "findRequest").mockResolvedValue(null);
  vi.spyOn(store, "reserve").mockResolvedValue({
    workload: "reply.live",
    provider: "manus",
    model: "max",
    enabled: true,
    dailyRequests: 10,
    dailyTokens: 100000,
    maxConcurrent: 2,
  });
  vi.spyOn(store, "bindRequest").mockResolvedValue(undefined);
  vi.spyOn(store, "boundRequest").mockResolvedValue(record());
  vi.spyOn(store, "attachTask").mockResolvedValue(undefined);
  vi.spyOn(store, "markUncertain").mockResolvedValue(undefined);
  vi.spyOn(store, "complete").mockResolvedValue(undefined);
  vi.mocked(createManusTask).mockResolvedValue({ task_id: "known-task" });
  vi.mocked(readManusTask).mockResolvedValue({
    status: "running",
    attachments: [],
    has_running_background_jobs: true,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("both providers in every section", () => {
  it("keeps an existing Manus request bound to its original task after profile changes", async () => {
    vi.mocked(store.findRequest).mockResolvedValue({
      provider: "manus",
      state: "running",
      task_id: "known-task",
    });
    vi.mocked(store.reserve).mockRejectedValue(
      new Error("Must not reserve a different provider"),
    );
    await expect(
      managedReplyPreview(id, store, "reply.live")(request),
    ).rejects.toBeInstanceOf(AiTaskPending);
    expect(store.reserve).not.toHaveBeenCalled();
    expect(createManusTask).not.toHaveBeenCalled();
    expect(readManusTask).toHaveBeenCalledWith("known-task");
  });
  it.each([
    "reply.live",
    "reply.preview",
    "whatsapp.marketing",
    "medical.documentation",
  ] as const)("accepts valid Manus and Gemini models for %s", (workload) => {
    for (const choice of [
      { provider: "manus", model: "max" },
      { provider: "gemini", model: "gemini-selected" },
    ])
      expect(
        profileSchema.safeParse({
          workload,
          ...choice,
          enabled: true,
          dailyRequests: 10,
          dailyTokens: 100000,
          maxConcurrent: 2,
        }).success,
      ).toBe(true);
  });
  it("creates one Manus task, resumes it across calls and validates the final reply", async () => {
    const generate = managedReplyPreview(id, store, "reply.live");
    await expect(generate(request)).rejects.toBeInstanceOf(AiTaskPending);
    expect(createManusTask).toHaveBeenCalledWith(
      expect.stringContaining("response.json"),
      { agentProfile: "max" },
    );
    vi.mocked(store.findRequest).mockResolvedValue({
      provider: "manus",
      state: "running",
      task_id: "known-task",
    });
    await expect(generate(request)).rejects.toBeInstanceOf(AiTaskPending);
    vi.mocked(readManusTask).mockResolvedValue({
      status: "stopped",
      has_running_background_jobs: false,
      credit_usage: 2,
      attachments: [
        {
          filename: "response.json",
          url: "https://files.manuscdn.com/response.json",
        },
      ],
    });
    vi.mocked(downloadManusFile).mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          text: "أهلًا، نقدر نساعدك إزاي؟",
          handoff: false,
          sourceIds: [],
        }),
      ),
    );
    expect(await generate(request)).toMatchObject({
      reply: { handoff: false },
      usage: { model: "manus:max" },
    });
    expect(createManusTask).toHaveBeenCalledTimes(1);
    expect(store.reserve).toHaveBeenCalledTimes(1);
    expect(store.complete).toHaveBeenCalledWith(
      id,
      { inputTokens: 0, outputTokens: 0, status: "success" },
      2,
    );
  });
  it("does not rebill after an ambiguous task creation", async () => {
    vi.mocked(createManusTask).mockRejectedValueOnce(
      new Error("network ambiguity"),
    );
    const generate = managedReplyPreview(id, store, "reply.live");
    await expect(generate(request)).rejects.toThrow("network ambiguity");
    vi.mocked(store.findRequest).mockResolvedValue({
      provider: "manus",
      state: "uncertain",
      task_id: null,
    });
    vi.mocked(store.boundRequest).mockResolvedValue({
      ...record(),
      task_id: null,
    });
    await expect(generate(request)).rejects.toThrow("unavailable");
    expect(createManusTask).toHaveBeenCalledTimes(1);
  });
  it("rejects changed content under the same paid request ID before polling", async () => {
    await expect(
      readManusJson(id, { ...task, input: "different message" }, store),
    ).rejects.toThrow("duplicate");
    expect(readManusTask).not.toHaveBeenCalled();
  });
  it("keeps polling the known task after a transient read failure", async () => {
    vi.mocked(readManusTask).mockRejectedValueOnce(
      new ManusRequestError("temporary", true),
    );
    await expect(readManusJson(id, task, store)).rejects.toBeInstanceOf(
      AiTaskPending,
    );
    expect(createManusTask).not.toHaveBeenCalled();
    expect(store.markUncertain).not.toHaveBeenCalled();
  });
  it("records an explicit failed task without treating it as another generation attempt", async () => {
    vi.mocked(readManusTask).mockResolvedValue({
      status: "error",
      credit_usage: 1,
      attachments: [],
    });
    await expect(readManusJson(id, task, store)).rejects.toThrow(
      "AI_TASK_FAILED",
    );
    expect(store.complete).toHaveBeenCalledWith(
      id,
      { inputTokens: 0, outputTokens: 0, status: "failed" },
      1,
    );
    expect(createManusTask).not.toHaveBeenCalled();
    expect(
      jobFailure(new ProviderError("CENTRAL_AI_FAILED", false, false), 1).state,
    ).toBe("failed");
  });
  it("bounds pending tasks and preserves unknown paid outcomes", async () => {
    vi.mocked(store.boundRequest).mockResolvedValue({
      ...record(),
      created_ms: Date.now() - 11 * 60_000,
    });
    await expect(readManusJson(id, task, store)).rejects.toBeInstanceOf(
      AiTaskExpired,
    );
    expect(store.markUncertain).toHaveBeenCalledWith(id);
    expect(createManusTask).not.toHaveBeenCalled();
    expect(
      jobFailure(new ProviderError("CENTRAL_AI_PENDING", true, false, 15), 8)
        .state,
    ).toBe("retry");
    expect(
      jobFailure(new ProviderError("CENTRAL_AI_PENDING", true, false, 15), 40)
        .state,
    ).toBe("unknown");
  });
  it("recovers a completed old task without creating another paid task", async () => {
    vi.mocked(store.boundRequest).mockResolvedValue({
      ...record(),
      created_ms: Date.now() - 11 * 60_000,
    });
    vi.mocked(readManusTask).mockResolvedValue({
      status: "stopped",
      has_running_background_jobs: false,
      attachments: [
        {
          filename: "response.json",
          url: "https://files.manuscdn.com/response.json",
        },
      ],
    });
    vi.mocked(downloadManusFile).mockResolvedValue(
      Buffer.from(
        JSON.stringify({ text: "Recovered", handoff: false, sourceIds: [] }),
      ),
    );
    await expect(readManusJson(id, task, store)).resolves.toBeDefined();
    expect(store.complete).toHaveBeenCalled();
    expect(createManusTask).not.toHaveBeenCalled();
  });
  it("runs the common reply policy without requiring a Gemini key for Manus", async () => {
    vi.stubEnv("AUTO_REPLY_GEMINI_KEY", "");
    const generate = vi.fn(async () => ({
      reply: { text: "أهلًا بيك", sourceIds: [], handoff: false },
      usage: { model: "manus:max", inputTokens: 0, outputTokens: 0 },
      finishReason: "STOP",
    }));
    const result = await proposeReply(
      {
        channel: "whatsapp",
        text: "مرحبا",
        context: [],
        settings: defaultAutoReplySettings,
        knowledge: [],
      },
      generate,
    );
    expect(generate).toHaveBeenCalledOnce();
    expect(result.model).toBe("manus:max");
    expect(result.handoff).toBe(false);
  });
});
