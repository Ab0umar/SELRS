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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue([
      "action/followup-queue",
    ]);
  });

  it.each(["doctor", "nurse", "technician", "manager", "reception", "accountant"])(
    "allows %s with the followup queue permission",
    async (role) => {
      await expect(api.createCaller(makeCallerAs(role)).add(input)).resolves.toEqual({
        success: true,
        visitId: 42,
      });
    },
  );

  it.each(["doctor", "nurse", "reception", "accountant", "manager"])(
    "rejects %s without the followup queue permission",
    async (role) => {
      vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue([]);
      await expect(api.createCaller(makeCallerAs(role)).add(input)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(db.createVisit).not.toHaveBeenCalled();
      expect(db.updateVisit).not.toHaveBeenCalled();
    },
  );

  it.each(["action/followup-queue:r", "action/followup-queue:rw"])(
    "accepts the permission token %s used by permission settings",
    async (permission) => {
      vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue([permission]);
      await expect(api.createCaller(makeCallerAs("doctor")).add(input)).resolves.toEqual({
        success: true,
        visitId: 42,
      });
    },
  );

  it("allows an administrator without an explicit permission", async () => {
    vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue([]);
    await expect(api.createCaller(makeCallerAs("admin")).add(input)).resolves.toEqual({
      success: true,
      visitId: 42,
    });
  });

  it("rejects an unauthenticated caller before touching the queue", async () => {
    const context = makeCallerAs("doctor");
    context.user = null;
    await expect(api.createCaller(context).add(input)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(db.createVisit).not.toHaveBeenCalled();
  });

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
