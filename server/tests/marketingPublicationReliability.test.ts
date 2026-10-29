import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../services/marketing/equipmentAssets",async original=>({...await original<typeof import("../services/marketing/equipmentAssets")>(),readEquipmentPhoto:vi.fn().mockResolvedValue(null)}));
vi.mock("../services/marketing/pageBranding",()=>({readMarketingPageBranding:vi.fn().mockResolvedValue({pageRole:"center",pageId:"1",name:"Fixture",address:"Fixture address",phone:"000",logo:Buffer.alloc(0)}),brandMarketingImageUrl:vi.fn(async(url:string)=>url),prepareMarketingPublication:vi.fn(async(message:string,imageUrl:string|null)=>({message,imageUrl}))}));
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  reserve: vi.fn(),
  release: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("../db", () => ({ getDb: mocks.db }));
vi.mock("../services/marketing/topicHistory", () => ({
  reserveTopicPublication: mocks.reserve,
  releaseTopicPublication: mocks.release,
  confirmTopicPublication: mocks.confirm,
}));
import {
  marketingPosts,
  marketingSettings,
  marketingFacebookPages,
  aiMarketingScheduler,
} from "../../drizzle/schema";
import { publishMarketingPost } from "../services/marketing/publish.service";
import { publishPostToFacebook } from "../services/marketing/facebookPublisher.service";
let post: {
  id: number;
  title: string;
  content: string;
  pageRole: "center";
  status: string;
  imageUrl: string | null;
};
let page: {
  pageId: string;
  accessToken: string;
  connected: boolean;
  autoPublish: boolean;
  thursdayEnabled?: boolean;
};
let schedulerProvider: "manus" | "central";
function chain(rows: unknown[]) {
  const query = {
    where: () => query,
    limit: () => query,
    for: () => query,
    then: (resolve: (rows: unknown[]) => unknown) =>
      Promise.resolve(rows).then(resolve),
  };
  return query;
}
beforeEach(() => {
  vi.clearAllMocks();
  schedulerProvider = "manus";
  post = {
    id: 42,
    title: "خيالي",
    content: "نص خيالي",
    pageRole: "center",
    status: "draft",
    imageUrl: null,
  };
  page = {
    pageId: "page-a",
    accessToken: "review-only",
    connected: true,
    autoPublish: true,
  };
  const db = {
    select: () => ({
      from: (table: unknown) =>
        chain(
          table === marketingPosts
            ? [post]
            : table === marketingFacebookPages
              ? [page]
              : table === aiMarketingScheduler
                ? [{ provider: schedulerProvider }]
                : table === marketingSettings
                  ? [{ id: 1 }]
                  : [],
        ),
    }),
    insert: () => ({ values: vi.fn().mockResolvedValue(undefined) }),
    update: () => ({
      set: (patch: object) => ({
        where: async () => {
          Object.assign(post, patch);
        },
      }),
    }),
    transaction: async (work: (tx: unknown) => Promise<unknown>) => work(db),
  };
  mocks.db.mockResolvedValue(db);
  mocks.reserve.mockResolvedValue("topic-key");
  mocks.release.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());
describe("publication outcome and target binding", () => {
  it.each(["provider", "slot"])(
    "blocks a scheduled send when its %s changes before the publication claim",
    async (changed) => {
      if (changed === "provider") schedulerProvider = "central";
      else page.thursdayEnabled = false;
      const network = vi.fn();
      vi.stubGlobal("fetch", network);
      await expect(
        publishMarketingPost(42, "center", {
          pageId: "page-a",
          requireAutoPublish: true,
          schedulerProvider: "manus",
        }),
      ).rejects.toThrow("الجدولة");
      expect(post.status).toBe("draft");
      expect(network).not.toHaveBeenCalled();
    },
  );
  it.each([null, "/image.png"])(
    "retains publishing state after a 500 for image %s",
    async (image) => {
      post.imageUrl = image;
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ error: { message: "server error" } }),
              { status: 500 },
            ),
          ),
      );
      await expect(publishMarketingPost(42)).rejects.toMatchObject({
        uncertain: true,
      });
      expect(post.status).toBe("publishing");
      expect(mocks.release).not.toHaveBeenCalled();
    },
  );
  it("a definite 400 rejection safely releases the publication claim", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { message: "invalid input" } }),
            { status: 400 },
          ),
        ),
    );
    await expect(publishMarketingPost(42)).rejects.toMatchObject({
      uncertain: false,
    });
    expect(post.status).toBe("draft");
    expect(mocks.release).toHaveBeenCalled();
  });
  it.each([null, "/image.png"])(
    "does not invent a publication ID for an incomplete success, image %s",
    async (image) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
      );
      await expect(
        publishPostToFacebook(
          "page",
          "review-only",
          "synthetic",
          image,
          "https://example.com",
        ),
      ).rejects.toMatchObject({ uncertain: true });
    },
  );
  it.each(["page-b", "disabled"])(
    "keeps the draft when a scheduled target changes: %s",
    async (change) => {
      if (change === "disabled") page.autoPublish = false;
      else page.pageId = change;
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      await expect(
        publishMarketingPost(42, "center", {
          pageId: "page-a",
          requireAutoPublish: true,
        }),
      ).rejects.toThrow("تغيرت صفحة");
      expect(post.status).toBe("draft");
      expect(fetch).not.toHaveBeenCalled();
      expect(mocks.reserve).not.toHaveBeenCalled();
    },
  );
});
