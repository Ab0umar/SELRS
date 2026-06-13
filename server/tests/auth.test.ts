import { describe, expect, it, vi } from "vitest";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", async () => {
  const actual = await vi.importActual<typeof import("../db")>("../db");
  return {
    ...actual,
    getDb: vi.fn(async () => undefined),
    getEffectiveUserPermissions: vi.fn(async () => []),
  };
});

vi.mock("child_process", async () => {
  const actual = await vi.importActual<typeof import("child_process")>(
    "child_process",
  );
  return {
    ...actual,
    execSync: vi.fn(() => ""),
  };
});

const { appRouter } = await import("../routers");

describe("Role-based procedure protection", () => {
  it("calling a protectedProcedure with no auth throws UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller({
      req: {
        protocol: "https",
        headers: {},
      } as any,
      res: {
        clearCookie() {},
      } as any,
      user: null,
      patientSession: null,
      doctorSession: null,
    });

    await expect(caller.auth.updateProfile({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("calling attendance write procedure as viewer role throws FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCallerAs("viewer"));

    await expect(
      caller.attendance.createLeave({
        empCd: "TEST-EMP-001",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-01",
        type: "annual",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("calling KF write procedure without KF permission throws FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await expect(
      caller.kf.createPatient({
        fullName: "Test Patient",
        age: 30,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("calling admin procedure as non-admin throws FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCallerAs("nurse"));

    await expect(caller.attendance.listUserMappings()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("calling with correct role succeeds", async () => {
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await expect(caller.accounting.triggerAccSync()).resolves.toEqual({
      success: true,
    });
  });
});
