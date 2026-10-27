import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { patients } from "../../drizzle/schema";
import * as db from "../db";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";
import { cleanupTables, getTestDb } from "./setup";
import * as mssqlPatients from "../integrations/mssqlPatients";

vi.mock("../integrations/mssqlPatients", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../integrations/mssqlPatients")>();
  return {
    ...actual,
    insertPatientToMssql: vi.fn(),
    upsertPatientToMssql: vi.fn(),
    createOrSyncPatientFromMssql: vi.fn(),
    syncSinglePatientFromMssql: vi.fn(),
  };
});

const seededPatients: Array<{ patientCode: string; phone: string }> = [];

async function resetTables() {
  const testDb = await getTestDb();
  await cleanupTables(
    testDb,
    "patientServiceEntries",
    "visits",
    "patients",
    "user_permissions",
  );
}

async function seedPatient(input: {
  patientCode: string;
  fullName: string;
  phone: string;
}) {
  const testDb = await getTestDb();
  await testDb.insert(patients).values({
    patientCode: input.patientCode,
    fullName: input.fullName,
    phone: input.phone,
    branch: "examinations",
    serviceType: "consultant",
    locationType: "center",
    status: "new",
  });
  const [row] = await testDb
    .select()
    .from(patients)
    .where(eq(patients.patientCode, input.patientCode))
    .limit(1);
  return row;
}

describe.sequential("createPatient identity matching", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(mssqlPatients.insertPatientToMssql).mockImplementation(
      async (input) => ({
        inserted: true,
        patientCode: input.patientCode || "MSSQL-TEST-001",
        trNo: 9001,
      }),
    );
    vi.mocked(mssqlPatients.upsertPatientToMssql).mockResolvedValue({ upserted: true });
    vi.mocked(mssqlPatients.createOrSyncPatientFromMssql).mockResolvedValue({
      patientId: 1,
      created: false,
    });
    vi.mocked(mssqlPatients.syncSinglePatientFromMssql).mockResolvedValue({ synced: true });
    await resetTables();
    await db.setUserPermissions(123, ["/quick-entry", "/ops/mssql-add"]);
  });

  afterEach(async () => {
    await db.setUserPermissions(123, []);
    await resetTables();
    vi.restoreAllMocks();
  });

  it("a relative on the same family phone becomes a NEW patient and the duplicate is reported", async () => {
    const father = await seedPatient({
      patientCode: "ID-FATHER-001",
      fullName: "Mohamed Ahmed Ali",
      phone: "01090000001",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result: any = await caller.medical.createPatient({
      fullName: "Ahmed Mohamed Ahmed",
      phone: "01090000001",
      branch: "examinations",
      serviceType: "consultant",
    });

    expect(result.reused).toBeUndefined();
    expect(result.patientId).not.toBe(father.id);
    expect(result.patientCode).not.toBe("ID-FATHER-001");
    expect(result.possibleDuplicates.map((p: any) => p.patientCode)).toEqual([
      "ID-FATHER-001",
    ]);
    expect(result.possibleDuplicates[0].matchedOn).toBe("phone");
  });

  it("the same name on a different phone is not merged either", async () => {
    const other = await seedPatient({
      patientCode: "ID-NAME-001",
      fullName: "Mahmoud Hassan",
      phone: "01090000002",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result: any = await caller.medical.createPatient({
      fullName: "Mahmoud Hassan",
      phone: "01090000003",
      branch: "examinations",
      serviceType: "consultant",
    });

    expect(result.reused).toBeUndefined();
    expect(result.patientId).not.toBe(other.id);
    expect(result.possibleDuplicates[0]?.matchedOn).toBe("name");
  });

  it("the same name AND phone (even typed with +20) is still recognised as the same patient", async () => {
    const existing = await seedPatient({
      patientCode: "ID-SAME-001",
      fullName: "Sara Ibrahim",
      phone: "01090000004",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result: any = await caller.medical.createPatient({
      fullName: "Sara  Ibrahim",
      phone: "+20 109 0000 004",
      branch: "examinations",
      serviceType: "consultant",
    });

    expect(result.reused).toBe(true);
    expect(result.patientId).toBe(existing.id);
    expect(result.patientCode).toBe("ID-SAME-001");
  });
});
