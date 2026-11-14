import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  affected: 1,
  updates: [] as unknown[],
  settings: new Map<string, unknown>(),
  publish: vi.fn(),
  notify: vi.fn(),
  target: vi.fn(),
}));
vi.mock("../db", () => {
  const query = {
    from: () => query,
    where: () => query,
    limit: async () => mocks.rows,
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve(mocks.rows).then(resolve),
  };
  return {
    getDb: async () => ({
      select: () => query,
      update: () => ({
        set: (value: unknown) => {
          mocks.updates.push(value);
          return { where: async () => [{ affectedRows: mocks.affected }] };
        },
      }),
    }),
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
  getMarketingPageTarget: mocks.target,
}));
vi.mock("../services/marketing/publish.service", () => ({
  publishMarketingPost: mocks.publish,
}));
vi.mock("../services/marketing/marketingReview", () => ({
  notifyMarketingAdmins: mocks.notify,
}));
import {
  cairoSlotTime,
  generateWeekDrafts,
  marketingCalendar,
  plannedMarketingSlot,
  publishDueScheduledPosts,
  upcomingMarketingSlots,
} from "../services/marketing/contentCalendar";

// Saturday 14 November 2026, 10:00 Cairo.
const now = new Date("2026-11-14T08:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows = [];
  mocks.affected = 1;
  mocks.updates.length = 0;
  mocks.settings.clear();
  mocks.target.mockImplementation(async (pageRole: string) =>
    pageRole === "center"
      ? {
          connected: true,
          publishHour: 9,
          saturdayEnabled: true,
          tuesdayEnabled: true,
          thursdayEnabled: false,
        }
      : null,
  );
});

describe("content calendar", () => {
  it("turns a Cairo date and hour into the right instant", () => {
    expect(cairoSlotTime("2026-11-15", 9).toISOString()).toBe(
      "2026-11-15T07:00:00.000Z",
    );
  });
  it("lists only enabled future slots of connected pages", async () => {
    const slots = await upcomingMarketingSlots(7, now);
    // Center: Sunday (saturday slot) and Tuesday; Thursday is disabled; doctor not connected.
    expect(
      slots.map((slot) => [slot.pageRole, slot.slot, slot.at.toISOString()]),
    ).toEqual([
      ["center", "saturday", "2026-11-15T07:00:00.000Z"],
      ["center", "tuesday", "2026-11-17T07:00:00.000Z"],
    ]);
  });
  it("generates one draft per empty slot, remembers the slot and avoids repeats", async () => {
    mocks.rows = [
      {
        id: 9,
        title: "t",
        topic: "x",
        status: "scheduled",
        pageRole: "center",
        scheduledAt: new Date("2026-11-15T07:00:00Z"),
      },
    ];
    const generate = vi.fn(async () => ({ topic: "موضوع جديد" }));
    const result = await generateWeekDrafts(generate, now);
    expect(result).toEqual({ started: 1, failed: 0 });
    expect(generate).toHaveBeenCalledOnce();
    const [{ requestId, slot }] = generate.mock.calls[0] as unknown as [
      { requestId: string; slot: string },
    ];
    expect(slot).toBe("tuesday");
    expect((await plannedMarketingSlot(requestId))?.toISOString()).toBe(
      "2026-11-17T07:00:00.000Z",
    );
    // A repeated request while those drafts are still generating starts nothing.
    expect(await generateWeekDrafts(generate, now)).toEqual({
      started: 0,
      failed: 0,
    });
    expect(generate).toHaveBeenCalledOnce();
  });
  it("starts only the named slot and marks it as generating", async () => {
    const generate = vi.fn(async () => ({ topic: "موضوع" }));
    const result = await generateWeekDrafts(generate, now, {
      pageRole: "center",
      date: "2026-11-15",
    });
    expect(result).toEqual({ started: 1, failed: 0 });
    const [{ slot }] = generate.mock.calls[0] as unknown as [{ slot: string }];
    expect(slot).toBe("saturday");
    const calendar = await marketingCalendar(7, now);
    expect(
      calendar.slots.map((entry) => [entry.date, entry.generating]),
    ).toEqual([
      ["2026-11-15", true],
      ["2026-11-17", true],
    ]);
  });
});

describe("scheduled post worker", () => {
  it("claims a due post by moving it to draft, then publishes it once", async () => {
    mocks.rows = [{ id: 4, pageRole: "doctor", topic: "t", title: "t" }];
    mocks.publish.mockResolvedValue({ fbPostId: "1" });
    await publishDueScheduledPosts(now);
    expect(mocks.updates).toEqual([{ status: "draft" }]);
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(4, "doctor");
    expect(mocks.notify).toHaveBeenCalledOnce();
  });
  it("skips a post another worker already claimed", async () => {
    mocks.rows = [{ id: 4, pageRole: "center", topic: "t", title: "t" }];
    mocks.affected = 0;
    await publishDueScheduledPosts(now);
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it("publishes to the page the claimed row has now", async () => {
    mocks.rows = [{ id: 4, pageRole: "center", topic: "t", title: "t" }];
    mocks.publish.mockImplementation(async () => {
      mocks.rows = [];
      return { fbPostId: "1" };
    });
    await publishDueScheduledPosts(now);
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith(4, "center");
  });
  it("notifies when a pre-Facebook check refuses the post", async () => {
    mocks.rows = [{ id: 4, pageRole: "center", topic: "t", title: "t" }];
    mocks.publish.mockRejectedValue(new Error("انتظر اكتمال توليد الصورة"));
    await publishDueScheduledPosts(now);
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "error", postId: 4 }),
    );
  });
});
