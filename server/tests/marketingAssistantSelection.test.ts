import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiManagementStore } from "../services/ai/managementStore";
const calls = vi.hoisted(() => ({
  db: vi.fn(),
  manus: vi.fn(),
  gemini: vi.fn(),
  image: vi.fn(),
  connect: vi.fn(),
}));
vi.mock("../services/ai/operations", () => ({
  trackedAiOperation: (
    _operation: unknown,
    work: (accept: () => Promise<void>) => Promise<unknown>,
  ) => work(async () => {}),
  readAiOperation: vi.fn(),
}));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDb: calls.db,
  getDbConnection: calls.connect,
}));
vi.mock("../services/marketing/manusGeneration.service", async (original) => ({
  ...(await original<
    typeof import("../services/marketing/manusGeneration.service")
  >()),
  startManusGeneration: calls.manus,
}));
vi.mock("../services/ai/marketingDraft", async (original) => ({
  ...(await original<typeof import("../services/ai/marketingDraft")>()),
  generateCentralMarketingDraft: calls.gemini,
  regenerateCentralMarketingImage: calls.image,
}));
import { marketingRouter } from "../routers/marketing";
import { makeCallerAs } from "./helpers/auth";

const input = {
  requestId: "00000000-0000-4000-8000-000000000001",
  topic: "LASIK",
  postDay: "saturday" as const,
  pageRole: "doctor" as const,
};
beforeEach(() => {
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
  vi.clearAllMocks();
  calls.db.mockResolvedValue({});
  calls.connect.mockResolvedValue({
    execute: vi.fn().mockResolvedValue([[]]),
    release: vi.fn(),
  });
  calls.manus.mockResolvedValue({ jobId: input.requestId, topic: input.topic });
  calls.gemini.mockResolvedValue({
    jobId: input.requestId,
    topic: input.topic,
    state: "completed",
    postId: 42,
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("one marketing entry point", () => {
  it("routes the existing image button to its configured Gemini profile", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    vi.spyOn(AiManagementStore.prototype, "listProfiles").mockResolvedValue([
      {
        workload: "marketing.image",
        provider: "gemini",
        model: "gemini-selected-image",
        enabled: true,
        dailyRequests: 20,
        dailyTokens: 100000,
        maxConcurrent: 1,
      },
    ]);
    calls.db.mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 42,
                status: "draft",
                topic: "LASIK",
                postDay: "saturday",
                pageRole: "center",
              },
            ],
          }),
        }),
      }),
    });
    await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .generateImageForPost({ postId: 42, requestId: input.requestId });
    expect(calls.manus).not.toHaveBeenCalled();
    expect(calls.image).toHaveBeenCalledWith(
      { postId: 42, requestId: input.requestId },
      expect.any(Number),
      input.requestId,
      "gemini-selected-image",
    );
    calls.image.mockClear();
    calls.connect.mockResolvedValue({
      execute: vi
        .fn()
        .mockResolvedValue([
          [
            {
              created_by: makeCallerAs("admin").user!.id,
              kind: "image",
              source_post_id: 42,
            },
          ],
        ]),
      release: vi.fn(),
    });
    vi.mocked(AiManagementStore.prototype.listProfiles).mockResolvedValue([]);
    await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .generateImageForPost({ postId: 42, requestId: input.requestId });
    expect(calls.image).not.toHaveBeenCalled();
    expect(calls.manus).not.toHaveBeenCalled();
  });
  it("blocks unavailable configured profiles instead of silently using Manus", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    vi.spyOn(AiManagementStore.prototype, "listProfiles").mockResolvedValue([]);
    await expect(
      marketingRouter.createCaller(makeCallerAs("admin")).generatePost(input),
    ).rejects.toThrow("unavailable");
    expect(calls.manus).not.toHaveBeenCalled();
    expect(calls.gemini).not.toHaveBeenCalled();
  });
  it("uses the configured Gemini profiles when no request override was selected", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    vi.spyOn(AiManagementStore.prototype, "listProfiles").mockResolvedValue(
      ["marketing.text", "marketing.image"].map((workload) => ({
        workload,
        provider: "gemini",
        model:
          workload === "marketing.text"
            ? "gemini-selected"
            : "gemini-selected-image",
        enabled: true,
        dailyRequests: 20,
        dailyTokens: 100000,
        maxConcurrent: 1,
      })) as Awaited<ReturnType<AiManagementStore["listProfiles"]>>,
    );
    await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .generatePost(input);
    expect(calls.manus).not.toHaveBeenCalled();
    expect(calls.gemini).toHaveBeenCalledWith(
      expect.objectContaining({
        textModel: "gemini-selected",
        imageModel: "gemini-selected-image",
      }),
      expect.any(Number),
      expect.any(Function),
    );
  });
  it("keeps the existing Manus workflow as the default", async () => {
    await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .generatePost(input);
    expect(calls.manus).toHaveBeenCalledWith(
      expect.objectContaining({ topic: input.topic, pageRole: "doctor" }),
    );
    expect(calls.gemini).not.toHaveBeenCalled();
  });
  it("forwards the selected Manus model without creating a Gemini job", async () => {
    await marketingRouter.createCaller(makeCallerAs("admin")).generatePost({
      ...input,
      assistant: { provider: "manus", model: "max" },
    });
    expect(calls.manus).toHaveBeenCalledWith(
      expect.objectContaining({ model: "max", pageRole: "doctor" }),
    );
    expect(calls.gemini).not.toHaveBeenCalled();
  });
  it("routes the selected Gemini text and image models through the same entry point", async () => {
    await marketingRouter.createCaller(makeCallerAs("admin")).generatePost({
      ...input,
      assistant: {
        provider: "gemini",
        model: "gemini-selected",
        imageModel: "gemini-selected-image",
      },
    });
    expect(calls.gemini).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: input.requestId,
        textModel: "gemini-selected",
        imageModel: "gemini-selected-image",
        pageRole: "doctor",
      }),
      expect.any(Number),
      expect.any(Function),
    );
    expect(calls.manus).not.toHaveBeenCalled();
  });
  it("denies non-admin provider selection before database or provider access", async () => {
    await expect(
      marketingRouter.createCaller(makeCallerAs("doctor")).generatePost(input),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(calls.db).not.toHaveBeenCalled();
    expect(calls.manus).not.toHaveBeenCalled();
    expect(calls.gemini).not.toHaveBeenCalled();
  });
});
