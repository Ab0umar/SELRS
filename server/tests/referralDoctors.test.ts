import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";
import { referralDoctorsRouter } from "../routers/referralDoctors";

const mock = vi.hoisted(() => ({
  getDb: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  values: vi.fn(),
  set: vi.fn(),
}));
vi.mock("../db", () => ({ getDb: mock.getDb }));
const doctor = {
  name: "د. أحمد",
  specialty: "الشبكية",
  hospital: "مستشفى العيون",
  schedule: "السبت",
  address: "القاهرة",
};

describe("outgoing referral doctor API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.getDb.mockResolvedValue({
      select: mock.select,
      insert: mock.insert,
      update: mock.update,
    });
    mock.select.mockReturnValue({
      from: () => ({
        orderBy: async () => [{ id: 1, ...doctor }],
        where: () => ({ limit: async () => [{ id: 1 }] }),
      }),
    });
    mock.insert.mockReturnValue({ values: mock.values });
    mock.values.mockResolvedValue([{ insertId: 7 }]);
    mock.update.mockReturnValue({ set: mock.set });
    mock.set.mockReturnValue({ where: async () => undefined });
  });

  it("allows medical staff to load the directory", async () => {
    expect(
      await referralDoctorsRouter.createCaller(makeCallerAs("doctor")).list(),
    ).toEqual([{ id: 1, ...doctor }]);
  });
  it("rejects unauthenticated callers before touching the database", async () => {
    const context = makeCallerAs("doctor");
    context.user = null;
    await expect(
      referralDoctorsRouter.createCaller(context).list(),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mock.getDb).not.toHaveBeenCalled();
  });
  it("restricts directory changes to administrators", async () => {
    await expect(
      referralDoctorsRouter.createCaller(makeCallerAs("doctor")).save(doctor),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mock.getDb).not.toHaveBeenCalled();
  });
  it("creates a directory doctor with all five fields", async () => {
    expect(
      await referralDoctorsRouter
        .createCaller(makeCallerAs("admin"))
        .save(doctor),
    ).toEqual({ id: 7 });
    expect(mock.values).toHaveBeenCalledWith(doctor);
  });
  it("updates the selected directory doctor without inserting another one", async () => {
    expect(
      await referralDoctorsRouter
        .createCaller(makeCallerAs("admin"))
        .save({ id: 1, ...doctor }),
    ).toEqual({ id: 1 });
    expect(mock.set).toHaveBeenCalledWith(doctor);
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it("does not silently update a missing doctor", async () => {
    mock.select.mockReturnValue({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    });
    await expect(
      referralDoctorsRouter
        .createCaller(makeCallerAs("admin"))
        .save({ id: 1, ...doctor }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mock.update).not.toHaveBeenCalled();
  });
});
