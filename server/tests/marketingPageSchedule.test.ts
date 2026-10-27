import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  target: vi.fn(),
  run: vi.fn(),
  next: vi.fn(),
  status: vi.fn(),
}));
vi.mock("../services/marketing/schedulerStatus", () => ({
  readMarketingSchedulerStatus: mocks.status,
}));
vi.mock("../db", async (original) => ({
  ...(await original<typeof import("../db")>()),
  getDb: mocks.db,
}));
vi.mock("../services/marketing/page.service", () => ({
  getMarketingPageTarget: mocks.target,
}));
vi.mock("../services/marketing/scheduler.service", () => ({
  runScheduledPost: mocks.run,
  getNextScheduledTime: mocks.next,
}));
import { marketingRouter } from "../routers/marketing";
import { makeCallerAs } from "./helpers/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.status.mockResolvedValue({
    schedulerStatus: "error",
    lastSchedulerRun: new Date("2026-10-26T14:00:00Z"),
  });
  const query = { from: vi.fn(), limit: vi.fn() };
  query.from.mockReturnValue(query);
  query.limit.mockResolvedValue([{ autoPublish: false, publishHour: 9 }]);
  mocks.db.mockResolvedValue({
    select: () => query,
    insert: () => ({ values: vi.fn().mockResolvedValue(undefined) }),
  });
  mocks.target.mockResolvedValue({
    connected: true,
    autoPublish: true,
    publishHour: 17,
    saturdayEnabled: false,
    tuesdayEnabled: true,
    thursdayEnabled: false,
  });
  mocks.next.mockReturnValue({
    day: "tuesday",
    date: new Date("2026-10-26T14:00:00Z"),
  });
  mocks.run.mockResolvedValue({ ok: true });
});

describe("page-scoped marketing scheduling", () => {
  it("updates only the selected page when toggling auto-publish", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    mocks.db.mockResolvedValue({
      select: () => ({
        from: () => ({ where: () => ({ limit: async () => [{ id: 12 }] }) }),
      }),
      update: () => ({ set }),
    });
    await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .setPageAutoPublish({ pageRole: "doctor", autoPublish: true });
    expect(mocks.target).toHaveBeenCalledWith("doctor");
    expect(set).toHaveBeenCalledExactlyOnceWith({ autoPublish: true });
    expect(where).toHaveBeenCalledOnce();
  });
  it("rejects activation of an unconnected page", async () => {
    mocks.target.mockResolvedValue(null);
    await expect(
      marketingRouter
        .createCaller(makeCallerAs("admin"))
        .setPageAutoPublish({ pageRole: "doctor", autoPublish: true }),
    ).rejects.toThrow("اربط الصفحة");
  });
  it("reads the doctor's enabled slots and time instead of the legacy center settings", async () => {
    const result = await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .getSchedulerStatus({ pageRole: "doctor" });
    expect(mocks.target).toHaveBeenCalledWith("doctor");
    expect(mocks.next).toHaveBeenCalledWith({
      pageRole: "doctor",
      saturdayEnabled: false,
      tuesdayEnabled: true,
      thursdayEnabled: false,
      publishHour: 17,
    });
    expect(result).toMatchObject({
      autoPublish: true,
      publishHour: 17,
      saturdayEnabled: false,
      schedulerStatus: "error",
    });
    expect(mocks.status).toHaveBeenCalledWith("doctor");
  });
  it("runs the selected page and slot", async () => {
    await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .runSchedulerNow({ pageRole: "doctor", day: "thursday" });
    expect(mocks.run).toHaveBeenCalledWith("thursday", "doctor");
  });
  it("keeps center as the default for existing callers", async () => {
    await marketingRouter
      .createCaller(makeCallerAs("admin"))
      .runSchedulerNow({ day: "saturday" });
    expect(mocks.run).toHaveBeenCalledWith("saturday", "center");
  });
});
