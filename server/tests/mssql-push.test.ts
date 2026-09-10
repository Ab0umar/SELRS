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

describe.sequential("MSSQL push wiring", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(mssqlPatients.insertPatientToMssql).mockImplementation(
      async (input) => ({
        inserted: true,
        patientCode: input.patientCode || "MSSQL-TEST-001",
        trNo: 9001,
      }),
    );
    vi.mocked(mssqlPatients.upsertPatientToMssql).mockResolvedValue({
      upserted: true,
    });
    vi.mocked(mssqlPatients.createOrSyncPatientFromMssql).mockResolvedValue({
      patientId: 1,
      created: false,
    });
    vi.mocked(mssqlPatients.syncSinglePatientFromMssql).mockResolvedValue({
      synced: true,
    });
    await resetTables();
    await db.setUserPermissions(123, ["/quick-entry", "/ops/mssql-add"]);
  });

  afterEach(async () => {
    await db.setUserPermissions(123, []);
    await resetTables();
    vi.restoreAllMocks();
  });

  it("createPatient new patient pushes to MSSQL with matching patientCode", async () => {
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result = await caller.medical.createPatient({
      fullName: "Push Patient One",
      phone: "01080000001",
      branch: "examinations",
      serviceType: "consultant",
    });

    expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledTimes(1);
    expect(result.mssqlLinked).toBe(false);
    expect(result.mssqlPending).toBe(true);
    expect(result.patientCode).toBeTruthy();
    expect(
      vi.mocked(mssqlPatients.insertPatientToMssql).mock.calls[0]?.[0],
    ).toBeDefined();
  });

  it("createPatient new patient push failure does not break patient creation", async () => {
    vi.mocked(mssqlPatients.insertPatientToMssql).mockRejectedValueOnce(
      new Error("MSSQL down"),
    );
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result = await caller.medical.createPatient({
      fullName: "Push Patient Two",
      phone: "01080000002",
      branch: "examinations",
      serviceType: "consultant",
    });

    expect(result.success).toBe(true);
    expect(result.patientId).toBeGreaterThan(0);
    expect(result.mssqlLinked).toBe(false);
  });

  it("createPatient existing patient pushes with existing patientCode", async () => {
    const existing = await seedPatient({
      patientCode: "PUSH-EXIST-001",
      fullName: "Existing Push Patient",
      phone: "01080000003",
    });
    expect(existing?.patientCode).toBe("PUSH-EXIST-001");
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result = await caller.medical.createPatient({
      fullName: "Existing Push Patient",
      phone: "01080000003",
      branch: "examinations",
      serviceType: "consultant",
    });

    expect(result.reused).toBe(true);
    expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(mssqlPatients.insertPatientToMssql).mock.calls[0]?.[0]
        ?.patientCode,
    ).toBe("PUSH-EXIST-001");
  });

  it("createPatient skips push when MSSQL push flag is disabled", async () => {
    const original = process.env.MSSQL_PUSH_NEW_PATIENTS_ENABLED;
    process.env.MSSQL_PUSH_NEW_PATIENTS_ENABLED = "false";
    try {
      vi.mocked(mssqlPatients.insertPatientToMssql).mockResolvedValueOnce({
        inserted: false,
        note: "MSSQL_PUSH_NEW_PATIENTS_ENABLED=false",
      });
      const caller = appRouter.createCaller(makeCallerAs("reception"));
      const result = await caller.medical.createPatient({
        fullName: "Push Patient Four",
        phone: "01080000004",
        branch: "examinations",
        serviceType: "consultant",
      });

      expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledTimes(1);
      expect(result.mssqlLinked).toBe(false);
    } finally {
      if (original === undefined) {
        delete process.env.MSSQL_PUSH_NEW_PATIENTS_ENABLED;
      } else {
        process.env.MSSQL_PUSH_NEW_PATIENTS_ENABLED = original;
      }
    }
  });

  it("createPatientFromExamination new patient with no services pushes once", async () => {
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result = await caller.medical.createPatientFromExamination({
      fullName: "Exam Push Patient One",
      phone: "01080000005",
      serviceType: "consultant",
      locationType: "center",
    });

    expect(result.patientCode).toBeTruthy();
    expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(mssqlPatients.insertPatientToMssql).mock.calls[0]?.[0],
    ).toBeDefined();
  });

  it("createPatientFromExamination rejects a reported MSSQL failure", async () => {
    vi.mocked(mssqlPatients.insertPatientToMssql).mockResolvedValueOnce({
      inserted: false,
      note: "MSSQL rejected the write",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await expect(
      caller.medical.createPatientFromExamination({
        fullName: "Rejected Exam Patient",
        phone: "01080000015",
        serviceType: "consultant",
        locationType: "center",
      }),
    ).rejects.toThrow("MSSQL rejected the write");

    expect(await db.getPatientByCode("0001")).toBeFalsy();
  });

  it("createPatientFromExamination new patient with two services pushes twice", async () => {
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await caller.medical.createPatientFromExamination({
      fullName: "Exam Push Patient Two",
      phone: "01080000006",
      serviceType: "consultant",
      locationType: "center",
      services: [
        { code: "S1", qty: 1, price: 100, discount: 0 },
        { code: "S2", qty: 1, price: 200, discount: 0 },
      ],
    });

    expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(mssqlPatients.insertPatientToMssql).mock.calls[0]?.[0]
        ?.serviceCode,
    ).toBe("S1");
    expect(
      vi.mocked(mssqlPatients.insertPatientToMssql).mock.calls[1]?.[0]
        ?.serviceCode,
    ).toBe("S2");
  });

  it("createPatientFromExamination existing patient pushes with existing patientCode", async () => {
    const existing = await seedPatient({
      patientCode: "PUSH-EXIST-002",
      fullName: "Exam Existing Push Patient",
      phone: "01080000007",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await caller.medical.createPatientFromExamination({
      patientId: Number(existing?.id),
      fullName: "Exam Existing Push Patient",
      phone: "01080000007",
      serviceType: "consultant",
      locationType: "center",
    });

    expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(mssqlPatients.insertPatientToMssql).mock.calls[0]?.[0],
    ).toBeDefined();
  });

  it("rejects an identity match without an explicit patient selection before any write", async () => {
    const existing = await seedPatient({
      patientCode: "MATCH-001",
      fullName: "Matching Patient",
      phone: "01080000019",
    });
    await db.updatePatient(existing.id, {
      age: 31,
      address: "Original address",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));
    await expect(
      caller.medical.createPatientFromExamination({
        fullName: "Matching Patient",
        age: 31,
        phone: "01080000019",
        address: "Must not replace old data",
        locationType: "center",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mssqlPatients.insertPatientToMssql).not.toHaveBeenCalled();
    expect(mssqlPatients.createOrSyncPatientFromMssql).not.toHaveBeenCalled();
    expect((await db.getPatientById(existing.id))?.address).toBe(
      "Original address",
    );
  });

  it.each(["overlapping", "after-first-save"] as const)(
    "preserves two registrations sharing a suggested code: %s",
    async (schedule) => {
      // Exercise the real router and MySQL persistence; simulate only MSSQL.
      const saved = new Map<string, { fullName: string; phone: string }>();
      let sequence = 120;
      let signalFirst!: () => void;
      let releaseFirst!: () => void;
      const firstReached = new Promise<void>((resolve) => {
        signalFirst = resolve;
      });
      const firstReleased = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      vi.mocked(mssqlPatients.insertPatientToMssql).mockImplementation(
        async (input) => {
          const code = input.allocatePatientCode
            ? String(++sequence)
            : input.patientCode;
          saved.set(code, {
            fullName: input.fullName,
            phone: input.phone ?? "",
          });
          if (input.fullName === "Reception First") {
            signalFirst();
            if (schedule === "overlapping") await firstReleased;
          } else {
            releaseFirst();
          }
          return { inserted: true, patientCode: code, trNo: sequence };
        },
      );
      vi.mocked(mssqlPatients.createOrSyncPatientFromMssql).mockImplementation(
        async (code) => {
          const row = saved.get(code)!;
          const existing = await db.getPatientByCode(code);
          if (existing) {
            await db.updatePatient(existing.id, row);
            return { patientId: existing.id, created: false };
          }
          const created = await seedPatient({ patientCode: code, ...row });
          return { patientId: created.id, created: true };
        },
      );
      const caller = appRouter.createCaller(makeCallerAs("reception"));
      const first = caller.medical.createPatientFromExamination({
        patientCode: "121",
        fullName: "Reception First",
        phone: "01080000021",
        locationType: "center",
      });
      if (schedule === "overlapping") await firstReached;
      else await first;
      const second = caller.medical.createPatientFromExamination({
        patientCode: "121",
        fullName: "Reception Second",
        phone: "01080000022",
        locationType: "center",
      });
      const results = await Promise.all([first, second]);
      expect(results.map((r) => r.patientCode)).toEqual(["121", "122"]);
      expect(results[0].id).not.toBe(results[1].id);
      expect((await db.getPatientById(results[0].id))?.fullName).toBe(
        "Reception First",
      );
      expect((await db.getPatientById(results[1].id))?.fullName).toBe(
        "Reception Second",
      );
    },
  );

  it("ignores a stale prefilled code when registering a different new patient", async () => {
    await seedPatient({
      patientCode: "PUSH-STALE-001",
      fullName: "First Reception Patient",
      phone: "01080000017",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await caller.medical.createPatientFromExamination({
      // This is the code the second receptionist saw before the first save.
      patientCode: "PUSH-STALE-001",
      fullName: "Second Reception Patient",
      phone: "01080000018",
      serviceType: "consultant",
      locationType: "center",
    });

    expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledWith(
      expect.objectContaining({ patientCode: "", allocatePatientCode: true }),
    );
  });

  it("updatePatient pushes to MSSQL with matching patientCode and updated fullName", async () => {
    const created = await seedPatient({
      patientCode: "PUSH-UPD-001",
      fullName: "Update Push Patient",
      phone: "01080000008",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result = await caller.medical.updatePatient({
      patientId: Number(created?.id ?? 0),
      updates: { fullName: "Updated Name" },
    });

    expect(result.success).toBe(true);
    expect(mssqlPatients.upsertPatientToMssql).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(mssqlPatients.upsertPatientToMssql).mock.calls[0]?.[0]
        ?.patientCode,
    ).toBe("PUSH-UPD-001");
    expect(
      vi.mocked(mssqlPatients.upsertPatientToMssql).mock.calls[0]?.[0]
        ?.fullName,
    ).toBe("Updated Name");
    expect(mssqlPatients.syncSinglePatientFromMssql).toHaveBeenCalledWith(
      "PUSH-UPD-001",
    );
  });

  it("updatePatient rejects MSSQL failure without changing MySQL", async () => {
    vi.mocked(mssqlPatients.upsertPatientToMssql).mockRejectedValueOnce(
      new Error("MSSQL down"),
    );
    const created = await seedPatient({
      patientCode: "PUSH-UPD-002",
      fullName: "Update Push Patient Two",
      phone: "01080000009",
    });
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await expect(
      caller.medical.updatePatient({
        patientId: Number(created?.id ?? 0),
        updates: { fullName: "Updated Name Again" },
      }),
    ).rejects.toThrow("MSSQL down");

    const unchanged = await db.getPatientById(Number(created?.id ?? 0));
    expect(unchanged?.fullName).toBe("Update Push Patient Two");
  });

  it("createPatient forwards serviceCode to MSSQL push", async () => {
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await caller.medical.createPatient({
      fullName: "Push Patient Ten",
      phone: "01080000010",
      branch: "examinations",
      serviceType: "consultant",
      serviceCode: "SVC-001",
    });

    expect(mssqlPatients.insertPatientToMssql).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(mssqlPatients.insertPatientToMssql).mock.calls[0]?.[0]
        ?.serviceCode,
    ).toBe("SVC-001");
  });
});
