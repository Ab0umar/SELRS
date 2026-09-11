import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", () => ({
  rolloverPreviousQueueVisitsAsTreated: vi.fn().mockResolvedValue(undefined),
  autoAdvanceQueuePatients: vi.fn().mockResolvedValue(undefined),
  getTodayVisitsByQueueStatus: vi.fn().mockResolvedValue([]),
}));
import * as db from "../db";
import { router } from "../_core/procedures";
import { medicalExaminationsRoutes } from "../routers/medical-examinations";

const api = router({
  queue: medicalExaminationsRoutes.getTodayPatientsByQueueStatus,
});
const caller = () => api.createCaller(makeCallerAs("reception"));
const date = "2026-09-11";
const visit = (
  id: number,
  patientId: number,
  queueStatus: string,
  visitType = "consultation",
) => ({
  id,
  patientId,
  queueStatus,
  visitType,
  patientFullName: "Test patient",
  visitDate: date,
});

describe("combined daily queue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs preparation and the database read once for all stages", async () => {
    vi.mocked(db.getTodayVisitsByQueueStatus).mockResolvedValue([
      visit(1, 1, "checkedIn"),
      visit(2, 2, "pentacam"),
      visit(3, 3, "treated"),
    ]);
    expect(await caller().queue({ date })).toHaveLength(3);
    expect(
      db.rolloverPreviousQueueVisitsAsTreated,
    ).toHaveBeenCalledExactlyOnceWith(date);
    expect(db.autoAdvanceQueuePatients).toHaveBeenCalledExactlyOnceWith(date);
    expect(db.getTodayVisitsByQueueStatus).toHaveBeenCalledExactlyOnceWith(
      date,
      undefined,
    );
  });

  it("retains legacy status-filtered requests", async () => {
    vi.mocked(db.getTodayVisitsByQueueStatus).mockResolvedValue([]);
    await caller().queue({ date, queueStatus: "clinic1" });
    expect(db.getTodayVisitsByQueueStatus).toHaveBeenCalledExactlyOnceWith(
      date,
      "clinic1",
    );
  });

  it("keeps each stage while preferring followups within the same stage", async () => {
    vi.mocked(db.getTodayVisitsByQueueStatus).mockResolvedValue([
      visit(1, 7, "checkedIn"),
      visit(2, 7, "checkedIn", "followup"),
      visit(3, 7, "treated"),
    ]);
    const rows = await caller().queue({ date });
    expect(rows.map((row) => row.visitId)).toEqual([2, 3]);
  });

  it("surfaces storage failure rather than returning an empty queue", async () => {
    vi.mocked(db.getTodayVisitsByQueueStatus).mockRejectedValueOnce(
      new Error("unavailable"),
    );
    await expect(caller().queue({ date })).rejects.toThrow();
  });

  it("rejects unauthenticated access before preparing the queue", async () => {
    const ctx = makeCallerAs("reception");
    ctx.user = null;
    await expect(api.createCaller(ctx).queue({ date })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(db.getTodayVisitsByQueueStatus).not.toHaveBeenCalled();
    expect(db.autoAdvanceQueuePatients).not.toHaveBeenCalled();
  });
});
