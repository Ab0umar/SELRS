import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  settings: new Map<string, unknown>(),
}));
vi.mock("../db", () => {
  const query = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: async () => mocks.rows,
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve(mocks.rows).then(resolve),
  };
  return {
    getDb: async () => ({ select: () => query }),
    getSystemSetting: async (key: string) =>
      mocks.settings.has(key)
        ? { value: JSON.stringify(mocks.settings.get(key)) }
        : null,
    updateSystemSettings: async (key: string, value: unknown) => {
      mocks.settings.set(key, value);
    },
  };
});
vi.mock("../services/marketing/page.service", () => ({
  getMarketingPageTarget: async () => ({ accessToken: "test-only" }),
}));
import {
  readMarketingPostStats,
  refreshMarketingPostStats,
  topicPerformance,
} from "../services/marketing/postInsights";

const fetchMock = vi.fn();
beforeEach(() => {
  mocks.settings.clear();
  mocks.rows = [
    {
      id: 1,
      fbPostId: "p_1",
      pageRole: "center",
      topic: "جفاف العين",
      title: "t",
    },
    { id: 2, fbPostId: "p_2", pageRole: "center", topic: "الليزك", title: "t" },
  ];
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const graph = (body: unknown, ok = true) => ({
  ok,
  json: async () => body,
});

describe("post performance", () => {
  it("stores reach and engagement per post", async () => {
    fetchMock.mockResolvedValue(
      graph({
        insights: {
          data: [{ name: "post_impressions_unique", values: [{ value: 500 }] }],
        },
        reactions: { summary: { total_count: 20 } },
        comments: { summary: { total_count: 3 } },
        shares: { count: 2 },
      }),
    );
    const stats = await refreshMarketingPostStats();
    expect(stats.state).toBe("ok");
    expect(stats.posts["1"]).toEqual({
      reach: 500,
      reactions: 20,
      comments: 3,
      shares: 2,
    });
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("undefined");
  });

  it("marks the feature unavailable when the token lacks read_insights", async () => {
    fetchMock.mockResolvedValue(
      graph({ error: { message: "requires read_insights", code: 10 } }, false),
    );
    const stats = await refreshMarketingPostStats();
    expect(stats.state).toBe("unavailable");
    expect(stats.reason).toContain("read_insights");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((await readMarketingPostStats()).state).toBe("unavailable");
    expect(await topicPerformance()).toEqual({ best: [], worst: [] });
  });

  it("ranks topics by engagement for the planner", async () => {
    mocks.settings.set("marketing_post_stats_v1", {
      state: "ok",
      reason: null,
      fetchedAt: new Date().toISOString(),
      posts: {
        "1": { reach: 100, reactions: 30, comments: 5, shares: 5 },
        "2": { reach: 1000, reactions: 10, comments: 0, shares: 0 },
      },
    });
    expect(await topicPerformance()).toEqual({
      best: ["جفاف العين"],
      worst: ["الليزك"],
    });
  });
});
