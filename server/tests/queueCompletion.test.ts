import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", () => ({
  getEffectiveUserPermissions: vi.fn().mockResolvedValue([]),
  visitHasQueueCompletionData: vi.fn().mockResolvedValue(true),
  updateVisitQueueStatus: vi.fn().mockResolvedValue(undefined),
  getVisitDateIsoById: vi.fn().mockResolvedValue("2026-10-13"),
  cascadeQueueStatus: vi.fn().mockResolvedValue(undefined),
  autoAdvanceQueuePatients: vi.fn().mockResolvedValue(undefined),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
import * as db from "../db";
import { router } from "../_core/procedures";
import { medicalExaminationsRoutes } from "../routers/medical-examinations";

const api = router({ complete: medicalExaminationsRoutes.updateVisitQueueStatus });
const input = { visitId: 42, queueStatus: "treated" as const };

describe("daily queue completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.visitHasQueueCompletionData).mockResolvedValue(true);
  });

  it.each(["doctor", "nurse", "technician", "reception", "accountant", "manager", "admin"])("allows %s to complete a visit with saved clinical data", async role => {
    await expect(api.createCaller(makeCallerAs(role)).complete(input)).resolves.toEqual({ success: true });
    expect(db.visitHasQueueCompletionData).toHaveBeenCalledWith(42);
    expect(db.updateVisitQueueStatus).toHaveBeenCalledWith(42, "treated", 123);
    expect(db.cascadeQueueStatus).toHaveBeenCalledWith("2026-10-13");
  });

  it("keeps the visit open when it has no saved data", async () => {
    vi.mocked(db.visitHasQueueCompletionData).mockResolvedValue(false);
    await expect(api.createCaller(makeCallerAs("doctor")).complete(input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.updateVisitQueueStatus).not.toHaveBeenCalled();
    expect(db.cascadeQueueStatus).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated completion", async () => {
    const ctx = makeCallerAs("doctor");
    ctx.user = null;
    await expect(api.createCaller(ctx).complete(input)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(db.updateVisitQueueStatus).not.toHaveBeenCalled();
  });

  it("rejects accounts without queue access", async () => {
    await expect(api.createCaller(makeCallerAs("patient")).complete(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.visitHasQueueCompletionData).not.toHaveBeenCalled();
  });

  it("does not grant doctors unrelated queue transitions", async () => {
    await expect(api.createCaller(makeCallerAs("doctor")).complete({ visitId: 42, queueStatus: "next" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.updateVisitQueueStatus).not.toHaveBeenCalled();
  });
});
