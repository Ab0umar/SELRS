import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

const updateWhere = vi.fn().mockResolvedValue(undefined);
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));

vi.mock("../db", () => ({
  getEffectiveUserPermissions: vi.fn().mockResolvedValue([]),
  getDb: vi.fn(),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "../db";
import { salaryRouter } from "../routers/salary";

function callerWith(permissions: string[]) {
  vi.mocked(db.getEffectiveUserPermissions).mockResolvedValue(permissions);
  return salaryRouter.createCaller(makeCallerAs("accountant"));
}

describe("salary basic write permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateWhere.mockResolvedValue(undefined);
    updateSet.mockImplementation(() => ({ where: updateWhere }));
    update.mockImplementation(() => ({ set: updateSet }));
    vi.mocked(db.getDb).mockResolvedValue({ update } as never);
  });

  it("does not let a penalties clerk rewrite base salary", async () => {
    await expect(
      callerWith(["/salary/penalties:rw"]).updateBasic({
        id: 7,
        basicAmount: 1,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getDb).not.toHaveBeenCalled();
  });

  it("lets a penalties clerk update the insurance deduction only", async () => {
    await expect(
      callerWith(["/salary/penalties:rw"]).setInsuranceDeduction({
        id: 7,
        insuranceDeduction: 125.5,
      }),
    ).resolves.toEqual({ success: true });
    expect(updateSet).toHaveBeenCalledWith({ insuranceDeduction: "125.5" });
    expect(updateWhere).toHaveBeenCalledTimes(1);
    expect(db.logAuditEvent).toHaveBeenCalledWith(
      expect.any(Number),
      "SALARY_INSURANCE_DEDUCTION",
      "salary_basics",
      7,
      { insuranceDeduction: 125.5 },
    );
  });

  it("does not let a read-only penalties clerk change the insurance deduction", async () => {
    await expect(
      callerWith(["/salary/penalties:r"]).setInsuranceDeduction({
        id: 7,
        insuranceDeduction: 10,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.getDb).not.toHaveBeenCalled();
  });

  it("still lets a basics editor change base salary", async () => {
    await expect(
      callerWith(["/salary/basics:rw"]).updateBasic({
        id: 7,
        basicAmount: 4000,
      }),
    ).resolves.toEqual({ success: true });
    expect(updateSet).toHaveBeenCalledWith({ basicAmount: "4000" });
  });
});
