import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  posts: [] as Array<{ imageUrl: string | null }>,
  unlink: vi.fn(async () => undefined),
}));
vi.mock("node:fs/promises", () => ({
  default: { unlink: mocks.unlink, readdir: vi.fn(async () => []) },
}));
vi.mock("../_core/env", () => ({ ENV: { marketingImageDir: "imgs" } }));
vi.mock("../db", () => ({
  getDb: async () => ({
    select: () => ({ from: async () => mocks.posts }),
  }),
}));
import path from "node:path";
import { removeMarketingDraftFiles } from "../services/marketing/imageCleanup";

const digest = "0123456789abcdef0123";
const branded = `/uploads/marketing/branded-v3-center-1-abc-${digest}.png`;
const removed = () =>
  mocks.unlink.mock.calls.map((call: unknown[]) =>
    path.basename(String(call[0])),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.posts = [];
});

describe("draft image cleanup", () => {
  it("removes the branded file and its source when nothing else uses them", async () => {
    await removeMarketingDraftFiles({
      postId: 1,
      imageUrl: branded,
      extra: ["manus-job-1.png"],
    });
    expect(removed()).toEqual(
      expect.arrayContaining([
        `branded-v3-center-1-abc-${digest}.png`,
        `branding-source-${digest}.png`,
        "manus-job-1.png",
      ]),
    );
  });
  it("keeps a branded file another post still references", async () => {
    mocks.posts = [{ imageUrl: branded }];
    await removeMarketingDraftFiles({
      postId: 1,
      imageUrl: branded,
      extra: [],
    });
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
  it("never removes reference designs or equipment photos", async () => {
    await removeMarketingDraftFiles({
      postId: 1,
      imageUrl: "/uploads/marketing/reference-designs/device.jpg",
      extra: [],
    });
    expect(mocks.unlink).not.toHaveBeenCalled();
  });
});
