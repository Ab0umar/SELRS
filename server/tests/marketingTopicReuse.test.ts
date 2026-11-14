import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  months: null as string | null,
  posts: [] as unknown[],
  history: [] as unknown[],
}));
vi.mock("../db", () => ({
  getDb: vi.fn(),
  getSystemSetting: async () =>
    mocks.months === null ? null : { value: mocks.months },
}));
import {
  marketingTopicHistory,
  topicReuseCutoff,
} from "../services/marketing/topicHistory";

function reader() {
  let call = 0;
  return {
    select: () => {
      const rows = call++ === 0 ? mocks.posts : mocks.history;
      const query = {
        from: () => query,
        where: () => query,
        then: (resolve: (value: unknown[]) => unknown) =>
          Promise.resolve(rows).then(resolve),
      };
      return query;
    },
  } as never;
}

const old = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
const fresh = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

beforeEach(() => {
  mocks.months = null;
  mocks.posts = [
    { topic: "جفاف العين", title: "t", publishedAt: old },
    { topic: "الماء الأزرق", title: "t", publishedAt: fresh },
  ];
  mocks.history = [
    { topic: "جفاف العين", state: "published", createdAt: old },
    { topic: "الليزك", state: "publishing", createdAt: old },
  ];
});

describe("topic reuse window", () => {
  it("defaults to 0: every published topic blocks forever", async () => {
    const history = await marketingTopicHistory(reader());
    expect(history.reusable).toEqual([]);
    expect(history.blocking).toContain("جفاف العين");
  });
  it("frees topics published before the window, never pending ones", async () => {
    mocks.months = "12";
    const history = await marketingTopicHistory(reader());
    expect(history.reusable).toEqual(["جفاف العين"]);
    expect(history.blocking).not.toContain("جفاف العين");
    expect(history.blocking).toEqual(
      expect.arrayContaining(["الماء الأزرق", "الليزك"]),
    );
  });
  it("keeps a topic blocked when a recent post repeats it", async () => {
    mocks.months = "12";
    mocks.posts.push({ topic: "جفاف العين", title: "t", publishedAt: fresh });
    const history = await marketingTopicHistory(reader());
    expect(history.reusable).toEqual([]);
  });
  it("ignores invalid settings", async () => {
    mocks.months = '"abc"';
    expect((await marketingTopicHistory(reader())).reusable).toEqual([]);
    expect(topicReuseCutoff(0)).toBeNull();
  });
});
