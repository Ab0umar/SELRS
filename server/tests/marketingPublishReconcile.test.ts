import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  settle: vi.fn(),
  readPosts: vi.fn(),
  rows: [] as unknown[][],
  updates: [] as unknown[],
  inserts: [] as unknown[],
}));
vi.mock("../services/marketing/pageBranding", () => ({
  prepareMarketingPublication: vi.fn(),
}));
vi.mock("../services/marketing/topicHistory", () => ({
  reserveTopicPublication: vi.fn(),
  confirmTopicPublication: vi.fn(),
  releaseTopicPublication: vi.fn(),
  settleTopicForPost: mocks.settle,
}));
vi.mock("../_core/env", () => ({ ENV: {} }));
vi.mock("../services/marketing/facebookPublisher.service", () => {
  class FacebookPublishError extends Error {}
  return {
    FacebookPublishError,
    publishPostToFacebook: vi.fn(),
    readRecentPagePosts: mocks.readPosts,
  };
});
vi.mock("../db", () => {
  const chain = () => {
    const rows = mocks.rows.shift() ?? [];
    const query = {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: () => query,
      for: () => query,
      then: (resolve: (value: unknown[]) => unknown) =>
        Promise.resolve(rows).then(resolve),
    };
    return query;
  };
  const db = {
    select: chain,
    update: () => ({
      set: (value: unknown) => {
        mocks.updates.push(value);
        return { where: async () => undefined };
      },
    }),
    insert: () => ({
      values: async (value: unknown) => {
        mocks.inserts.push(value);
      },
    }),
    transaction: async (callback: (tx: unknown) => unknown) => callback(db),
  };
  return { getDb: async () => db };
});
import {
  reconcilePublishingPost,
  resolvePublishingPost,
} from "../services/marketing/publish.service";

const claimedAt = new Date("2026-11-14T08:00:00Z");
const post = {
  id: 5,
  status: "publishing",
  pageRole: "center",
  title: "عنوان",
  content: "نص المنشور التثقيفي",
  cta: "احجز الآن",
  hashtags: "#عيون",
  updatedAt: claimedAt,
};
const page = { pageId: "page-1", accessToken: "test-only" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updates.length = 0;
  mocks.inserts.length = 0;
});

describe("reconciling a post stuck in publishing", () => {
  it("marks the post published when the page has the prepared message after the claim", async () => {
    // post, claim log, page, then the post again inside the transaction
    mocks.rows = [[post], [{ createdAt: claimedAt }], [page], [post]];
    mocks.readPosts.mockResolvedValue([
      {
        id: "page-1_99",
        message: "نص المنشور التثقيفي\n\nاحجز الآن\n\n#عيون\n\nالعنوان والهاتف",
        createdTime: new Date("2026-11-14T08:00:30Z"),
      },
    ]);
    const result = await reconcilePublishingPost(5, 7);
    expect(result).toEqual({ state: "published", fbPostId: "page-1_99" });
    expect(mocks.updates).toContainEqual(
      expect.objectContaining({ status: "published", fbPostId: "page-1_99" }),
    );
    expect(mocks.settle).toHaveBeenCalledWith(
      expect.anything(),
      5,
      "published",
    );
    expect(mocks.inserts).toContainEqual(
      expect.objectContaining({ message: expect.stringContaining("user 7") }),
    );
  });

  it("asks for a manual choice when no page post matches", async () => {
    mocks.rows = [[post], [{ createdAt: claimedAt }], [page]];
    mocks.readPosts.mockResolvedValue([
      {
        id: "other",
        message: "منشور آخر",
        createdTime: new Date("2026-11-14T08:01:00Z"),
      },
    ]);
    const result = await reconcilePublishingPost(5, 7);
    expect(result.state).toBe("unmatched");
    expect(mocks.updates).toEqual([]);
  });

  it("asks for a manual choice when the token cannot read posts", async () => {
    mocks.rows = [[post], [{ createdAt: claimedAt }], [page]];
    mocks.readPosts.mockRejectedValue(new Error("permission"));
    expect((await reconcilePublishingPost(5, 7)).state).toBe("unmatched");
  });

  it("'it was published' marks it published and confirms the topic", async () => {
    mocks.rows = [[post], [{ createdAt: claimedAt }], [post]];
    await resolvePublishingPost(5, "published", 7);
    expect(mocks.updates).toContainEqual(
      expect.objectContaining({ status: "published" }),
    );
    expect(mocks.settle).toHaveBeenCalledWith(
      expect.anything(),
      5,
      "published",
    );
  });

  it("'it was not' returns it to draft and releases the topic", async () => {
    mocks.rows = [[post], [{ createdAt: claimedAt }], [post]];
    await resolvePublishingPost(5, "not_published", 7);
    expect(mocks.updates).toContainEqual({ status: "draft" });
    expect(mocks.settle).toHaveBeenCalledWith(expect.anything(), 5, "released");
    expect(mocks.inserts).toContainEqual(
      expect.objectContaining({
        action: "publish_reconcile",
        message: expect.stringContaining("user 7"),
      }),
    );
  });

  it("refuses posts that are not in publishing", async () => {
    mocks.rows = [[{ ...post, status: "draft" }]];
    await expect(resolvePublishingPost(5, "published", 7)).rejects.toThrow();
  });
});
