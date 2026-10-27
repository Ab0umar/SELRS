import { beforeAll, describe, expect, it } from "vitest";
import { medicalRouter } from "../routers/medical";
import { makeCallerAs } from "./helpers/auth";
import { getTestDb } from "./setup";

const callers = (role: string) => {
  const c: any = medicalRouter.createCaller(makeCallerAs(role));
  return {
    createMedication: () => c.createMedication({ name: "x" }),
    deleteDisease: () => c.deleteDisease({ id: 1 }),
    deletePrescription: () => c.deletePrescription({ id: 1 }),
    deleteMedicalReport: () => c.deleteMedicalReport({ id: 1 }),
    getAuditLogs: () => c.getAuditLogs({}),
  };
};

describe("clinical manager-only procedures", () => {
  beforeAll(async () => {
    await getTestDb();
  });

  it("rejects accountant and reception", async () => {
    for (const role of ["accountant", "reception"]) {
      for (const [name, call] of Object.entries(callers(role))) {
        await expect(call(), `${role}:${name}`).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
    }
  });

  it("lets a manager past the role gate", async () => {
    for (const call of Object.values(callers("manager"))) {
      const error: any = await call().then(() => null, (e: any) => e);
      expect(error?.code).not.toBe("FORBIDDEN");
      expect(error?.code).not.toBe("UNAUTHORIZED");
    }
  });
});
