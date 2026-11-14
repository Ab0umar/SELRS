import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  settle: vi.fn(),
  status: "draft" as string,
  updates: [] as unknown[],
  deleted: 0,
  logs: [] as unknown[],
}));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDb: mocks.db,
}));
vi.mock("../services/marketing/topicHistory", async (original) => ({
  ...(await original<typeof import("../services/marketing/topicHistory")>()),
  settleTopicForPost: mocks.settle,
}));
vi.mock("../_core/env", () => ({ ENV: {} }));
import { marketingRouter } from "../routers/marketing";
import { makeCallerAs } from "./helpers/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updates.length = 0;
  mocks.logs.length = 0;
  mocks.deleted = 0;
  const db = {
    select: () => {
      const query = {
        from: () => query,
        where: () => query,
        for: async () => [{ status: mocks.status }],
      };
      return query;
    },
    update: () => ({
      set: (value: unknown) => {
        mocks.updates.push(value);
        return { where: async () => undefined };
      },
    }),
    delete: () => ({
      where: async () => {
        mocks.deleted++;
      },
    }),
    insert: () => ({
      values: async (value: unknown) => {
        mocks.logs.push(value);
      },
    }),
    transaction: async (callback: (tx: unknown) => unknown) => callback(db),
  };
  mocks.db.mockResolvedValue(db);
});

const remove = () =>
  marketingRouter.createCaller(makeCallerAs("admin")).deletePost({ id: 3 });

describe("deletePost rules", () => {
  it("refuses a post in publishing", async () => {
    mocks.status = "publishing";
    await expect(remove()).rejects.toThrow("قيد النشر");
    expect(mocks.deleted).toBe(0);
  });
  it("releases a draft's topic, fails its pending jobs and logs the user", async () => {
    mocks.status = "draft";
    await remove();
    expect(mocks.settle).toHaveBeenCalledWith(expect.anything(), 3, "released");
    expect(mocks.updates).toContainEqual(
      expect.objectContaining({ state: "failed" }),
    );
    expect(mocks.deleted).toBe(1);
    expect(mocks.logs).toContainEqual(
      expect.objectContaining({
        action: "delete_post",
        message: expect.stringMatching(/by user \d+/),
      }),
    );
  });
  it("deletes a published post without touching topics or jobs", async () => {
    mocks.status = "published";
    await remove();
    expect(mocks.settle).not.toHaveBeenCalled();
    expect(mocks.updates).toEqual([]);
    expect(mocks.deleted).toBe(1);
  });
});
