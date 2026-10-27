import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  finish: vi.fn(),
  regenerate: vi.fn(),
  job: {} as Record<string, unknown>,
  post: {} as Record<string, unknown>,
  context: [] as unknown[],
  legacy: [] as unknown[],
}));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDb: mocks.db,
}));
vi.mock("node:fs/promises", () => ({
  default: {
    stat: vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("missing"), { code: "ENOENT" }),
      ),
  },
}));
vi.mock("../services/ai/marketingDraft", async (original) => ({
  ...(await original<typeof import("../services/ai/marketingDraft")>()),
  finishCentralMarketingDraft: mocks.finish,
  regenerateCentralMarketingImage: mocks.regenerate,
}));
vi.mock("../services/marketing/topicHistory", async (original) => ({
  ...(await original<typeof import("../services/marketing/topicHistory")>()),
  assertMarketingTopicAvailable: vi.fn().mockResolvedValue(undefined),
}));
import {
  aiMarketingJobs,
  aiMarketingJobContext,
  marketingPosts,
  marketingGenerationJobs,
} from "../../drizzle/schema";
import { AiManagementStore } from "../services/ai/managementStore";
import {
  marketingPostSnapshot,
  generateCentralMarketingDraft,
} from "../services/ai/marketingDraft";
import {
  marketingRecoveryPlan,
  recoverCentralMarketing,
} from "../services/ai/marketingRecovery";
function chain(rows: unknown[]) {
  const query = {
    where: () => query,
    limit: () => query,
    orderBy: () => query,
    for: () => query,
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve(rows).then(resolve),
  };
  return query;
}
const id = "00000000-0000-4000-8000-000000000002";
const retryId = "00000000-0000-4000-8000-000000000003";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.legacy = [];
  vi.stubEnv("GEMINI_API_KEY", "review-only");
  vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
  mocks.post = {
    id: 42,
    status: "draft",
    title: "خيالي",
    topic: "خيالي",
    content: "نص خيالي",
    pageRole: "doctor",
  };
  mocks.job = {
    id,
    kind: "image",
    topic: "خيالي",
    pageRole: "doctor",
    postDay: "tuesday",
    state: "uncertain",
    postId: 42,
    sourcePostId: 42,
    postSnapshot: marketingPostSnapshot(mocks.post),
    referenceIds: null,
    errorCode: "image_failed",
    createdBy: 1,
    createdAt: new Date(),
  };
  mocks.context = [
    { jobId: id, provider: "gemini", imageModel: "gemini-original-image" },
  ];
  const db = {
    select: () => ({
      from: (table: unknown) =>
        chain(
          table === aiMarketingJobs
            ? [mocks.job]
            : table === marketingPosts
              ? [mocks.post]
              : table === marketingGenerationJobs
                ? mocks.legacy
                : table === aiMarketingJobContext
                  ? mocks.context
                  : [],
        ),
    }),
    update: () => ({
      set: () => ({ where: vi.fn().mockResolvedValue(undefined) }),
    }),
    insert: () => ({ values: vi.fn().mockResolvedValue(undefined) }),
    transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
  };
  mocks.db.mockResolvedValue(db);
  vi.spyOn(AiManagementStore.prototype, "findRequest").mockResolvedValue({
    provider: "gemini",
    state: "failed",
    task_id: null,
    model: "gemini-original-image",
  });
  vi.spyOn(AiManagementStore.prototype, "listProfiles").mockResolvedValue([
    {
      workload: "marketing.image",
      provider: "manus",
      model: "standard",
      enabled: true,
      dailyRequests: 20,
      dailyTokens: 100000,
      maxConcurrent: 2,
    },
  ]);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe("recovery preserves the paid request's selected model", () => {
  it.each(["legacy", "current"])(
    "allows unchanged %s snapshots and blocks a topic-only edit",
    async (version) => {
      if (version === "legacy")
        mocks.job.postSnapshot = createHash("sha256")
          .update(
            JSON.stringify([
              mocks.post.title,
              mocks.post.content,
              mocks.post.idea,
              mocks.post.cta,
              mocks.post.hashtags,
              mocks.post.imagePrompt,
              mocks.post.imageUrl,
              mocks.post.pageRole,
              mocks.post.status,
            ]),
          )
          .digest("hex");
      const original = marketingPostSnapshot(mocks.post);
      await expect(marketingRecoveryPlan(id)).resolves.toMatchObject({
        action: "image_retry",
        imageModel: "gemini-original-image",
      });
      mocks.post.topic = "موضوع مختلف";
      expect(marketingPostSnapshot(mocks.post)).not.toBe(original);
      await expect(marketingRecoveryPlan(id)).resolves.toMatchObject({
        action: "blocked",
        reason: "draft_changed",
      });
      expect(mocks.regenerate).not.toHaveBeenCalled();
    },
  );
  it.each(["starting", "running", "uncertain"])(
    "blocks Gemini recovery while a Manus image is %s",
    async (state) => {
      mocks.job.state = "running";
      mocks.job.executionId = retryId;
      mocks.legacy = [
        { id: "legacy-image", state, jobType: "image", postId: 42 },
      ];
      const reserve = vi.spyOn(AiManagementStore.prototype, "reserve");
      const actual = await vi.importActual<
        typeof import("../services/ai/marketingDraft")
      >("../services/ai/marketingDraft");
      await expect(
        actual.regenerateCentralMarketingImage(
          { requestId: id, postId: 42 },
          1,
          retryId,
          "original-image",
        ),
      ).rejects.toThrow("AI management: capacity");
      expect(reserve).not.toHaveBeenCalled();
    },
  );
  it("returns an existing request without resolving a new model from changed profiles", async () => {
    mocks.job.kind = "post";
    expect(
      await generateCentralMarketingDraft(
        {
          requestId: id,
          topic: "خيالي",
          pageRole: "doctor",
          postDay: "tuesday",
        },
        1,
      ),
    ).toMatchObject({ jobId: id, state: "uncertain" });
    expect(AiManagementStore.prototype.listProfiles).not.toHaveBeenCalled();
  });
  it.each(["post", "image"])(
    "retries the original Gemini model for %s while the saved provider remains Manus",
    async (kind) => {
      mocks.job.kind = kind;
      if (kind === "post")
        mocks.job.generatedJson = JSON.stringify({
          title: "خيالي",
          content: "نص خيالي",
          cta: "",
          hashtags: "",
          idea: "خيالي",
          imagePrompt: "eye",
        });
      expect(await marketingRecoveryPlan(id)).toMatchObject({
        action: "image_retry",
        imageModel: "gemini-original-image",
      });
      await recoverCentralMarketing(
        { jobId: id, requestId: retryId, allowImageGeneration: true },
        1,
      );
      if (kind === "post")
        expect(mocks.finish).toHaveBeenCalledWith(
          expect.objectContaining({ imageModel: "gemini-original-image" }),
          1,
          expect.any(Object),
          retryId,
        );
      else
        expect(mocks.regenerate).toHaveBeenCalledWith(
          { requestId: id, postId: 42 },
          1,
          retryId,
          "gemini-original-image",
        );
    },
  );
  it("can recover a legacy job using its recorded provider model", async () => {
    mocks.context = [];
    expect(await marketingRecoveryPlan(id)).toMatchObject({
      action: "image_retry",
      imageModel: "gemini-original-image",
    });
  });
  it("does not silently choose a current model when the original choice is unknown", async () => {
    mocks.context = [];
    vi.mocked(AiManagementStore.prototype.findRequest).mockResolvedValue({
      provider: "gemini",
      state: "failed",
      task_id: null,
    });
    expect(await marketingRecoveryPlan(id)).toMatchObject({
      action: "blocked",
      reason: "original_model_missing",
    });
    expect(mocks.regenerate).not.toHaveBeenCalled();
  });
});
