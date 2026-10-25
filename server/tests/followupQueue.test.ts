import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", () => ({
  getEffectiveUserPermissions: vi.fn().mockResolvedValue([]),
  getPatientById: vi.fn().mockResolvedValue({ id: 7, branch: "examinations" }),
  getNextAlternatingClinicNo: vi.fn().mockResolvedValue(1),
  createVisit: vi.fn().mockResolvedValue({ insertId: 42 }),
  updateVisit: vi.fn().mockResolvedValue(undefined),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
import * as db from "../db";
import { router } from "../_core/procedures";
import { medicalExaminationsRoutes } from "../routers/medical-examinations";

const api = router({ add: medicalExaminationsRoutes.addFollowupToQueue });
const input = { patientId: 7, visitDate: "2026-10-25" };

describe("same-day followup queue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requeues the returned same-day visit without replacing its clinical data", async () => {
    await expect(
      api.createCaller(makeCallerAs("reception")).add(input),
    ).resolves.toEqual({ success: true, visitId: 42 });
    expect(db.createVisit).toHaveBeenCalledTimes(1);
    expect(db.updateVisit).toHaveBeenCalledWith(42, {
      visitType: "followup",
      queueStatus: "clinic1",
      movedToClinicAt: expect.any(Date),
      treatedAt: null,
    });
  });

  it("uses the allocated second clinic for the same visit", async () => {
    vi.mocked(db.getNextAlternatingClinicNo).mockResolvedValueOnce(2);
    await api.createCaller(makeCallerAs("reception")).add(input);
    expect(db.updateVisit).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ queueStatus: "clinic2" }),
    );
  });

  it("does not update a visit when creation or reuse returns no identifier", async () => {
    vi.mocked(db.createVisit).mockResolvedValueOnce({ insertId: null });
    await expect(
      api.createCaller(makeCallerAs("reception")).add(input),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(db.updateVisit).not.toHaveBeenCalled();
  });

  it("rejects a missing patient before touching the queue", async () => {
    vi.mocked(db.getPatientById).mockResolvedValueOnce(undefined);
    await expect(
      api.createCaller(makeCallerAs("reception")).add(input),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.createVisit).not.toHaveBeenCalled();
  });
});
