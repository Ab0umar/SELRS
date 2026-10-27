import { beforeAll, describe, expect, it } from "vitest";
import { opHistoryRouter } from "../routers/opHistory";
import { makeCallerAs } from "./helpers/auth";
import { getTestDb } from "./setup";

const reads = (role: string) => {
  const caller = opHistoryRouter.createCaller(makeCallerAs(role));
  return {
    getTypeCounts: () => caller.getTypeCounts(),
    getServiceCodeMappings: () => caller.getServiceCodeMappings(),
    getLinkedOperationTypes: () => caller.getLinkedOperationTypes({ patientId: 1 }),
  };
};

describe("opHistory read access", () => {
  beforeAll(async () => {
    await getTestDb();
  });

  it.each(["worker", "supervisor"])("blocks the %s role from patient lists", async (role) => {
    for (const call of Object.values(reads(role))) {
      await expect(call()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("still lets clinical staff read", async () => {
    await expect(reads("doctor").getTypeCounts()).resolves.toBeDefined();
  });
});
