import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn(), schedule: vi.fn() }));
vi.mock("node-cron", () => ({ default: { schedule: mocks.schedule } }));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDb: mocks.db,
}));
import {
  getDueMarketingSlot,
  initMarketingScheduler,
} from "../services/marketing/scheduler.service";

const settings = {
  pageRole: "center" as const,
  autoPublish: true,
  publishHour: 9,
  saturdayEnabled: true,
  tuesdayEnabled: true,
  thursdayEnabled: true,
};
describe("same-day automatic marketing catch-up", () => {
  it.each([
    ["2026-10-27T05:59:00Z", "center", null],
    ["2026-10-27T06:00:00Z", "center", "tuesday"],
    ["2026-10-27T08:45:00Z", "center", "tuesday"],
    ["2026-10-27T20:59:00Z", "center", "tuesday"],
    ["2026-10-27T21:00:00Z", "center", null],
    ["2026-10-28T08:00:00Z", "doctor", "thursday"],
    ["2026-10-27T08:00:00Z", "doctor", null],
  ] as const)(
    "resolves %s for %s without backfilling a different day",
    (date, pageRole, due) => {
      expect(
        getDueMarketingSlot({ ...settings, pageRole }, new Date(date)),
      ).toBe(due);
    },
  );
  it("respects the page and slot switches after the planned hour", () => {
    const late = new Date("2026-10-27T08:45:00Z");
    expect(
      getDueMarketingSlot({ ...settings, autoPublish: false }, late),
    ).toBeNull();
    expect(
      getDueMarketingSlot({ ...settings, tuesdayEnabled: false }, late),
    ).toBeNull();
  });
  it("checks on startup, prevents overlapping checks and isolates a page read failure", async () => {
    let rejectFirst!: (error: Error) => void;
    mocks.db
      .mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectFirst = reject;
        }),
      )
      .mockResolvedValue(null);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      initMarketingScheduler();
      expect(mocks.schedule).toHaveBeenCalledWith(
        "*/5 * * * *",
        expect.any(Function),
        { timezone: "Africa/Cairo" },
      );
      const tick = mocks.schedule.mock.calls[0][1] as () => Promise<void>;
      expect(mocks.db).toHaveBeenCalledTimes(1);
      await tick();
      expect(mocks.db).toHaveBeenCalledTimes(1);
      rejectFirst(new Error("temporary database read failure"));
      await vi.waitFor(() => expect(mocks.db).toHaveBeenCalledTimes(2));
      await tick();
      expect(mocks.db).toHaveBeenCalledTimes(4);
      initMarketingScheduler();
      expect(mocks.schedule).toHaveBeenCalledTimes(1);
    } finally {
      error.mockRestore();
      info.mockRestore();
    }
  });
});
