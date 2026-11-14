import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: vi.fn(),
  target: vi.fn(),
  claim: vi.fn(),
  release: vi.fn(),
  plan: vi.fn(),
  start: vi.fn(),
  jobRows: [] as unknown[],
}));
vi.mock("../db", () => ({ getDb: mocks.db }));
vi.mock("../services/marketing/page.service", () => ({
  getMarketingPageTarget: mocks.target,
}));
vi.mock("../services/ai/marketingScheduler", () => ({
  claimMarketingSchedule: mocks.claim,
  releaseUnusedMarketingSchedule: mocks.release,
  marketingSchedulerProviders: async () => [
    { pageRole: "center", provider: "manus" },
  ],
}));
vi.mock("../services/marketing/topicPlanner", () => ({
  planMarketingTopic: mocks.plan,
}));
vi.mock("../services/marketing/schedulerStatus", () => ({
  setMarketingSchedulerStatus: vi.fn(),
  recordMarketingSchedulerSkip: vi.fn(),
}));
vi.mock("../services/ai/marketingDraft", () => ({
  generateCentralMarketingDraft: vi.fn(),
}));
vi.mock("../services/marketing/publish.service", () => ({
  publishMarketingPost: vi.fn(),
}));
vi.mock("../services/marketing/manusGeneration.service", () => ({
  ORPHANED_START_ERROR: "orphaned",
  startManusGeneration: mocks.start,
}));
import { runScheduledPost } from "../services/marketing/scheduler.service";
import {
  clearMarketingStartFailures,
  marketingStartAllowed,
  recordMarketingStartFailure,
} from "../services/marketing/schedulerBackoff";

function chain(rows: () => unknown[]) {
  const query = {
    from: () => query,
    where: () => query,
    then: (resolve: (value: unknown[]) => unknown) =>
      Promise.resolve(rows()).then(resolve),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.jobRows = [];
  let call = 0;
  mocks.db.mockResolvedValue({
    // The first two selects are the duplicate guards; later ones read the job.
    select: () => chain(() => (call++ < 2 ? [] : mocks.jobRows)),
    insert: () => ({ values: async () => undefined }),
  });
  mocks.target.mockResolvedValue({
    pageRole: "center",
    pageId: "page-a",
    autoPublish: true,
    saturdayEnabled: true,
    tuesdayEnabled: true,
    thursdayEnabled: true,
    publishHour: 9,
  });
  mocks.plan.mockResolvedValue("موضوع جديد للتجربة");
  mocks.start.mockResolvedValue({ jobId: "job", topic: "موضوع" });
});

describe("scheduled generation retry", () => {
  it("makes one second attempt with a distinct id after a definite failure", async () => {
    mocks.jobRows = [{ state: "failed", error: "Manus rejected the task" }];
    mocks.claim
      .mockResolvedValueOnce({ provider: "manus", claimed: false })
      .mockResolvedValueOnce({ provider: "manus", claimed: true });
    const result = await runScheduledPost("saturday", "center");
    expect(result.ok).toBe(true);
    const [first, second] = mocks.claim.mock.calls.map((call) => call[0]);
    expect(second).not.toBe(first);
    expect(mocks.start).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: second }),
    );
  });

  it("does not retry after an uncertain outcome", async () => {
    mocks.jobRows = [{ state: "uncertain", error: null }];
    mocks.claim.mockResolvedValue({ provider: "manus", claimed: false });
    const result = await runScheduledPost("saturday", "center");
    expect(result.skipped).toContain("already reserved");
    expect(mocks.claim).toHaveBeenCalledOnce();
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("does not retry an orphaned start, whose Manus task may exist", async () => {
    mocks.jobRows = [{ state: "failed", error: "orphaned; check Manus" }];
    mocks.claim.mockResolvedValue({ provider: "manus", claimed: false });
    await runScheduledPost("saturday", "center");
    expect(mocks.claim).toHaveBeenCalledOnce();
  });

  it("allows only one second attempt per day", async () => {
    mocks.jobRows = [{ state: "failed", error: "rejected" }];
    mocks.claim.mockResolvedValue({ provider: "manus", claimed: false });
    const result = await runScheduledPost("saturday", "center");
    expect(mocks.claim).toHaveBeenCalledTimes(2);
    expect(result.skipped).toContain("already reserved");
    expect(mocks.start).not.toHaveBeenCalled();
  });
});

describe("pre-planned posts", () => {
  it("skips the slot when a post is already planned for today", async () => {
    let call = 0;
    mocks.db.mockResolvedValue({
      select: () =>
        chain(() => (call++ === 1 ? [{ id: 12, status: "draft" }] : [])),
      insert: () => ({ values: async () => undefined }),
    });
    const result = await runScheduledPost("saturday", "center");
    expect(result.skipped).toContain("id: 12");
    expect(mocks.claim).not.toHaveBeenCalled();
  });
});

describe("pre-acceptance backoff", () => {
  it("waits 5 minutes, 30 minutes, 2 hours, then stops until tomorrow", () => {
    const page = "backoff-test";
    clearMarketingStartFailures(page);
    // 08:00 UTC is 10:00 or 11:00 in Cairo, far from midnight.
    const start = Date.parse("2026-11-14T08:00:00Z");
    const minute = 60 * 1000;
    expect(marketingStartAllowed(page, start)).toBe(true);
    recordMarketingStartFailure(page, start);
    expect(marketingStartAllowed(page, start + 4 * minute)).toBe(false);
    expect(marketingStartAllowed(page, start + 5 * minute)).toBe(true);
    const second = start + 5 * minute;
    recordMarketingStartFailure(page, second);
    expect(marketingStartAllowed(page, second + 29 * minute)).toBe(false);
    expect(marketingStartAllowed(page, second + 30 * minute)).toBe(true);
    const third = second + 30 * minute;
    recordMarketingStartFailure(page, third);
    expect(marketingStartAllowed(page, third + 119 * minute)).toBe(false);
    expect(marketingStartAllowed(page, third + 120 * minute)).toBe(true);
    const fourth = third + 120 * minute;
    recordMarketingStartFailure(page, fourth);
    expect(marketingStartAllowed(page, fourth + 6 * 60 * minute)).toBe(false);
    expect(
      marketingStartAllowed(page, Date.parse("2026-11-15T08:00:00Z")),
    ).toBe(true);
  });
});
