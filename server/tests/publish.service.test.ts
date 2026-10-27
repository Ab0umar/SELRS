import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../services/marketing/topicHistory", () => ({
  reserveTopicPublication: vi.fn(async () => "topic-key"),
  confirmTopicPublication: vi.fn(),
  releaseTopicPublication: vi.fn(),
}));
import {
  reserveTopicPublication,
  confirmTopicPublication,
  releaseTopicPublication,
} from "../services/marketing/topicHistory";

vi.mock("../db", () => ({ getDb: vi.fn() }));
vi.mock("../_core/env", () => ({
  ENV: { fbAppOrigin: "https://selrs.cc" },
}));
vi.mock("../services/marketing/facebookPublisher.service", () => {
  class FacebookPublishError extends Error {
    constructor(
      message: string,
      readonly uncertain = false,
    ) {
      super(message);
    }
  }
  return {
    FacebookPublishError,
    publishPostToFacebook: vi.fn(),
  };
});

import { getDb } from "../db";
import {
  FacebookPublishError,
  publishPostToFacebook,
} from "../services/marketing/facebookPublisher.service";
import {
  MarketingPublishError,
  publishMarketingPost,
} from "../services/marketing/publish.service";

function chain<T>(value: T) {
  const result: {
    from: () => typeof result;
    where: () => typeof result;
    limit: () => typeof result;
    for: () => Promise<T>;
    then: (
      resolve: (value: T) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    from: () => result,
    where: () => result,
    limit: () => result,
    for: () => Promise.resolve(value),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return result;
}

const post = {
  id: 7,
  title: "عنوان",
  content: "نص المنشور",
  cta: "احجز فحصك",
  hashtags: "#عيون",
  imageUrl: "/uploads/marketing/post.png",
  status: "draft",
  fbPostId: null,
};
const settings = {
  fbConnected: true,
  fbPageId: "page-1",
  fbAccessToken: "secret",
};

function createDb(selectValues: unknown[]) {
  const current = { ...post };
  let phase = 0;
  const statusUpdates: unknown[] = [];
  const logEntries: unknown[] = [];
  const tx = {
    select: vi.fn(() =>
      chain(selectValues.shift() ?? (phase > 1 ? [current] : [])),
    ),
    update: vi.fn(() => ({
      set: vi.fn((value: unknown) => {
        statusUpdates.push(value);
        return {
          where: vi.fn(async () => {
            Object.assign(current, value);
            return { affectedRows: 1 };
          }),
        };
      }),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async (value: unknown) => {
        logEntries.push(value);
        return [];
      }),
    })),
  };
  const db = {
    insert: tx.insert,
    transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => {
      phase++;
      return callback(tx);
    }),
  };
  return { db, statusUpdates, logEntries };
}

describe("marketing post publishing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reserveTopicPublication).mockResolvedValue("topic-key");
  });

  it("publishes once and records the Facebook post ID", async () => {
    const { db, statusUpdates, logEntries } = createDb([
      [post],
      [],
      [settings],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as never);
    vi.mocked(publishPostToFacebook).mockResolvedValue({ fbPostId: "fb-7" });

    await expect(publishMarketingPost(7)).resolves.toEqual({
      fbPostId: "fb-7",
    });
    expect(publishPostToFacebook).toHaveBeenCalledWith(
      "page-1",
      "secret",
      "نص المنشور\n\nاحجز فحصك\n\n#عيون",
      "/uploads/marketing/post.png",
      "https://selrs.cc",
    );
    expect(statusUpdates).toEqual([
      { status: "publishing" },
      { status: "published", publishedAt: expect.any(Date), fbPostId: "fb-7" },
    ]);
    expect(confirmTopicPublication).toHaveBeenCalledWith(
      expect.anything(),
      "topic-key",
      7,
    );
    expect(logEntries).toContainEqual(
      expect.objectContaining({ status: "success", action: "publish_post" }),
    );
  });

  it("returns an existing publication without calling Facebook again", async () => {
    const { db } = createDb([
      [{ ...post, status: "published", fbPostId: "fb-old" }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as never);

    await expect(publishMarketingPost(7)).resolves.toEqual({
      fbPostId: "fb-old",
      alreadyPublished: true,
    });
    expect(publishPostToFacebook).not.toHaveBeenCalled();
  });
  it("rejects a previously used topic before contacting Facebook", async () => {
    const { db } = createDb([[post], [], [settings]]);
    vi.mocked(getDb).mockResolvedValue(db as never);
    vi.mocked(reserveTopicPublication).mockRejectedValue(
      new Error("الموضوع سبق نشره"),
    );
    await expect(publishMarketingPost(7)).rejects.toThrow("سبق نشره");
    expect(publishPostToFacebook).not.toHaveBeenCalled();
  });

  it("returns a draft to the queue after a confirmed Facebook failure", async () => {
    const { db, statusUpdates, logEntries } = createDb([
      [post],
      [],
      [settings],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as never);
    vi.mocked(publishPostToFacebook).mockRejectedValue(
      new FacebookPublishError("token expired"),
    );

    await expect(
      publishMarketingPost(7),
    ).rejects.toMatchObject<MarketingPublishError>({
      message: "token expired",
      uncertain: false,
    });
    expect(statusUpdates).toEqual([
      { status: "publishing" },
      { status: "draft" },
    ]);
    expect(logEntries).toContainEqual(
      expect.objectContaining({ status: "error", action: "publish_post" }),
    );
  });

  it("does not contact Facebook while a central image is generating", async () => {
    const { db, statusUpdates } = createDb([
      [post],
      [],
      [settings],
      [],
      [{ id: "central-image" }],
    ]);
    vi.mocked(getDb).mockResolvedValue(db as never);
    await expect(publishMarketingPost(7)).rejects.toThrow("Gemini");
    expect(publishPostToFacebook).not.toHaveBeenCalled();
    expect(statusUpdates).toEqual([]);
  });
  it("keeps publishing state when Facebook result is uncertain", async () => {
    const { db, statusUpdates } = createDb([[post], [], [settings]]);
    vi.mocked(getDb).mockResolvedValue(db as never);
    vi.mocked(publishPostToFacebook).mockRejectedValue(
      new FacebookPublishError("network timeout", true),
    );

    await expect(publishMarketingPost(7)).rejects.toMatchObject({
      uncertain: true,
    });
    expect(statusUpdates).toEqual([{ status: "publishing" }]);
    expect(releaseTopicPublication).not.toHaveBeenCalled();
  });
});
