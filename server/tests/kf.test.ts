import { eq } from "drizzle-orm";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  kfExaminations,
  kfFollowups,
  kfOperations,
  kfPatients,
  kfVisits,
} from "../../drizzle/schema";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";
import { seedKfPatient } from "./helpers/db";
import { cleanupTables, getTestDb } from "./setup";

const TEST_NID = "12345678901234";

async function resetKfTables() {
  const db = await getTestDb();
  await cleanupTables(
    db,
    "kf_followups",
    "kf_operations",
    "kf_examinations",
    "kf_visits",
    "kf_patients",
  );
}

async function seedExistingPatient() {
  const db = await getTestDb();
  return seedKfPatient(db, {
    fullName: "KF Existing Patient",
    nationalId: TEST_NID,
  });
}

describe.sequential("KF patient and procedure mutations", () => {
  beforeEach(async () => {
    await resetKfTables();
  });

  afterEach(async () => {
    await resetKfTables();
  });

  it("kfCreatePatient happy path creates patient with KF code", async () => {
    const db = await getTestDb();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    const result = await caller.kf.createPatient({
      fullName: "KF New Patient",
      nationalId: "99887766554433",
      age: 36,
    });

    expect(result.kfId).toBeGreaterThan(0);
    expect(result.kfCode).toMatch(/^KF-\d{4}$/);

    const [row] = await db
      .select()
      .from(kfPatients)
      .where(eq(kfPatients.kfId, result.kfId))
      .limit(1);

    expect(row).toBeTruthy();
    expect(row?.fullName).toBe("KF New Patient");
    expect(row?.kfCode).toBe(result.kfCode);
  });

  it("kfCreatePatient duplicate NID returns error", async () => {
    const caller = appRouter.createCaller(makeCallerAs("admin"));
    await seedExistingPatient();

    await expect(
      caller.kf.createPatient({
        fullName: "KF Duplicate Patient",
        nationalId: TEST_NID,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("national ID"),
    });
  });

  it("kfCreateVisit for existing patient returns visit record", async () => {
    const db = await getTestDb();
    const { kfId } = await seedExistingPatient();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    const result = await caller.kf.createVisit({
      kfPatientId: kfId,
      visitDate: "2026-03-10",
      visitType: "consultation",
      doctorName: "Dr. KF",
      status: "scheduled",
      notes: "initial visit",
    });

    expect(result.kfVisitId).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(kfVisits)
      .where(eq(kfVisits.kfVisitId, result.kfVisitId))
      .limit(1);

    expect(row?.kfPatientId).toBe(kfId);
    expect(row?.visitType).toBe("consultation");
    expect(row?.doctorName).toBe("Dr. KF");
  });

  it("kfCreateExamination returns examination record", async () => {
    const db = await getTestDb();
    const { kfId } = await seedExistingPatient();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    const visit = await caller.kf.createVisit({
      kfPatientId: kfId,
      visitDate: "2026-03-11",
    });

    const result = await caller.kf.createExamination({
      kfPatientId: kfId,
      kfVisitId: visit.kfVisitId,
      examDate: "2026-03-11",
      rightVa: "6/9",
      leftVa: "6/12",
      diagnosis: "test diagnosis",
      plan: "test plan",
      notes: "exam note",
    });

    expect(result.kfExamId).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(kfExaminations)
      .where(eq(kfExaminations.kfExamId, result.kfExamId))
      .limit(1);

    expect(row?.kfPatientId).toBe(kfId);
    expect(row?.kfVisitId).toBe(visit.kfVisitId);
    expect(row?.rightVa).toBe("6/9");
    expect(row?.leftVa).toBe("6/12");
  });

  it("kfCreateOperation returns operation record", async () => {
    const db = await getTestDb();
    const { kfId } = await seedExistingPatient();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    const visit = await caller.kf.createVisit({
      kfPatientId: kfId,
      visitDate: "2026-03-12",
    });

    const result = await caller.kf.createOperation({
      kfPatientId: kfId,
      kfVisitId: visit.kfVisitId,
      opDate: "2026-03-12",
      opType: "cataract",
      eye: "right",
      doctorName: "Dr. KF",
      status: "scheduled",
      notes: "operation note",
    });

    expect(result.kfOpId).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(kfOperations)
      .where(eq(kfOperations.kfOpId, result.kfOpId))
      .limit(1);

    expect(row?.kfPatientId).toBe(kfId);
    expect(row?.kfVisitId).toBe(visit.kfVisitId);
    expect(row?.opType).toBe("cataract");
    expect(row?.eye).toBe("right");
  });

  it("kfCreateFollowup returns followup record", async () => {
    const db = await getTestDb();
    const { kfId } = await seedExistingPatient();
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    const visit = await caller.kf.createVisit({
      kfPatientId: kfId,
      visitDate: "2026-03-13",
    });
    const operation = await caller.kf.createOperation({
      kfPatientId: kfId,
      kfVisitId: visit.kfVisitId,
      opDate: "2026-03-13",
      opType: "refractive",
      status: "scheduled",
    });

    const result = await caller.kf.createFollowup({
      kfPatientId: kfId,
      kfVisitId: visit.kfVisitId,
      kfOpId: operation.kfOpId,
      followupDate: "2026-03-20",
      notes: "followup note",
      status: "scheduled",
    });

    expect(result.kfFollowupId).toBeGreaterThan(0);

    const [row] = await db
      .select()
      .from(kfFollowups)
      .where(eq(kfFollowups.kfFollowupId, result.kfFollowupId))
      .limit(1);

    expect(row?.kfPatientId).toBe(kfId);
    expect(row?.kfVisitId).toBe(visit.kfVisitId);
    expect(row?.kfOpId).toBe(operation.kfOpId);
    expect(row?.followupDate).toBeDefined();
  });

  it("accountant role can create KF patient", async () => {
    const caller = appRouter.createCaller(makeCallerAs("accountant"));

    const result = await caller.kf.createPatient({
      fullName: "KF Accountant Patient",
      nationalId: "88776655443322",
    });

    expect(result.kfId).toBeGreaterThan(0);
    expect(result.kfCode).toMatch(/^KF-\d{4}$/);
  });

  it("viewer role cannot create KF patient", async () => {
    const caller = appRouter.createCaller(makeCallerAs("viewer"));

    await expect(
      caller.kf.createPatient({
        fullName: "KF Unauthorized Patient",
        nationalId: "77665544332211",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
