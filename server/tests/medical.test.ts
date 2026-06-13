import { eq } from "drizzle-orm";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { patients, patientServiceEntries, visits } from "../../drizzle/schema";
import * as db from "../db";
import { makeCallerAs } from "./helpers/auth";
import { cleanupTables, getTestDb } from "./setup";
import { appRouter } from "../routers";

const MEDICAL_PATIENT_CODE = "MED-TEST-001";
const MEDICAL_OTHER_PATIENT_CODE = "MED-TEST-002";

async function resetMedicalTables() {
  const db = await getTestDb();
  await cleanupTables(
    db,
    "patientServiceEntries",
    "visits",
    "patients",
  );
}

async function seedPatient(patientCode: string, fullName: string) {
  const db = await getTestDb();
  const result = await db.insert(patients).values({
    patientCode,
    fullName,
  });
  const id = Number((result as any)?.insertId ?? 0);
  if (id > 0) return { id, patientCode };
  const [row] = await db
    .select()
    .from(patients)
    .where(eq(patients.patientCode, patientCode))
    .limit(1);
  return { id: Number(row?.id ?? 0), patientCode: row?.patientCode ?? patientCode };
}

async function seedVisit(patientId: number) {
  const result = await db.createVisit({
    patientId,
    visitDate: new Date("2026-03-15T08:00:00.000Z"),
    visitType: "consultation",
    branch: "examinations",
    queueStatus: "checkedIn",
    checkedInAt: new Date("2026-03-15T08:00:00.000Z"),
  });
  return Number((result as any)?.insertId ?? 0);
}

describe.sequential("medical patient service and queue mutations", () => {
  beforeEach(async () => {
    await resetMedicalTables();
  });

  afterEach(async () => {
    await resetMedicalTables();
  });

  it("createPatientServiceEntry creates an entry and returns id", async () => {
    const { id: patientId } = await seedPatient(
      MEDICAL_PATIENT_CODE,
      "Medical Patient A",
    );
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    const result = await caller.medical.createPatientServiceEntry({
      patientId,
      serviceCode: "1001",
      serviceName: "Consultation",
      sourceRef: "manual:med:create:1",
      serviceDate: "2026-03-15",
    });

    expect(result.id).toBeGreaterThan(0);
    const [row] = await getTestDb().then((db) =>
      db
        .select()
        .from(patientServiceEntries)
        .where(eq(patientServiceEntries.id, result.id))
        .limit(1),
    );
    expect(row?.patientId).toBe(patientId);
    expect(row?.serviceCode).toBe("1001");
  });

  it("updatePatientServiceEntry updates fields correctly", async () => {
    const { id: patientId } = await seedPatient(
      MEDICAL_PATIENT_CODE,
      "Medical Patient A",
    );
    const caller = appRouter.createCaller(makeCallerAs("reception"));
    const created = await caller.medical.createPatientServiceEntry({
      patientId,
      serviceCode: "1001",
      serviceName: "Consultation",
      sourceRef: "manual:med:update:1",
      serviceDate: "2026-03-15",
    });

    await expect(
      caller.medical.updatePatientServiceEntry({
        id: created.id,
        serviceCode: "1002",
        serviceName: "Updated Service",
        serviceDate: "2026-03-16",
      }),
    ).resolves.toEqual({ success: true });

    const db = await getTestDb();
    const [row] = await db
      .select()
      .from(patientServiceEntries)
      .where(eq(patientServiceEntries.id, created.id))
      .limit(1);
    expect(row?.serviceCode).toBe("1002");
    expect(row?.serviceName).toBe("Updated Service");
    expect(new Date(row?.serviceDate as any).toISOString().slice(0, 10)).toBe(
      "2026-03-16",
    );
  });

  it("deletePatientServiceEntry removes the entry", async () => {
    const { id: patientId } = await seedPatient(
      MEDICAL_PATIENT_CODE,
      "Medical Patient A",
    );
    const caller = appRouter.createCaller(makeCallerAs("reception"));
    const created = await caller.medical.createPatientServiceEntry({
      patientId,
      serviceCode: "1001",
      serviceName: "Consultation",
      sourceRef: "manual:med:delete:1",
      serviceDate: "2026-03-15",
    });

    await expect(
      caller.medical.deletePatientServiceEntry({ id: created.id }),
    ).resolves.toEqual({ success: true });

    const db = await getTestDb();
    const rows = await db
      .select()
      .from(patientServiceEntries)
      .where(eq(patientServiceEntries.id, created.id));
    expect(rows).toHaveLength(0);
  });

  it("setPatientStatus changes patient status field", async () => {
    const { id: patientId } = await seedPatient(
      MEDICAL_PATIENT_CODE,
      "Medical Patient A",
    );
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await expect(
      caller.medical.setPatientStatus({
        patientId,
        status: "followup",
      }),
    ).resolves.toEqual({ success: true });

    const db = await getTestDb();
    const [row] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    expect(row?.status).toBe("followup");
  });

  it("setPatientQueue sets the queue status on the latest visit", async () => {
    const { id: patientId } = await seedPatient(
      MEDICAL_PATIENT_CODE,
      "Medical Patient A",
    );
    const visitId = await seedVisit(patientId);
    const caller = appRouter.createCaller(makeCallerAs("reception"));

    await expect(
      caller.medical.setPatientQueue({
        patientId,
        queueStatus: "clinic",
      }),
    ).resolves.toEqual({ success: true });

    const db = await getTestDb();
    const [row] = await db
      .select()
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);
    expect(row?.queueStatus).toBe("clinic");
    expect(row?.movedToClinicAt).toBeTruthy();
  });

  it("getPatientServiceEntries returns only the requested patient's entries", async () => {
    const first = await seedPatient(MEDICAL_PATIENT_CODE, "Medical Patient A");
    const second = await seedPatient(
      MEDICAL_OTHER_PATIENT_CODE,
      "Medical Patient B",
    );
    const caller = appRouter.createCaller(makeCallerAs("admin"));

    await caller.medical.createPatientServiceEntry({
      patientId: first.id,
      serviceCode: "1001",
      serviceName: "Patient A service",
      sourceRef: "manual:med:list:1",
      serviceDate: "2026-03-15",
    });
    await caller.medical.createPatientServiceEntry({
      patientId: second.id,
      serviceCode: "1002",
      serviceName: "Patient B service",
      sourceRef: "manual:med:list:2",
      serviceDate: "2026-03-15",
    });

    const rows = await caller.medical.getPatientServiceEntries({
      patientId: first.id,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.patientId).toBe(first.id);
    expect(rows[0]?.serviceName).toBe("Patient A service");
  });

  it("unauthorized role cannot mutate patient service entries", async () => {
    const { id: patientId } = await seedPatient(
      MEDICAL_PATIENT_CODE,
      "Medical Patient A",
    );
    const caller = appRouter.createCaller(makeCallerAs("viewer"));

    await expect(
      caller.medical.createPatientServiceEntry({
        patientId,
        serviceCode: "1001",
        serviceName: "Consultation",
        sourceRef: "manual:med:forbidden",
        serviceDate: "2026-03-15",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("createPatient creates a today visit so the patient appears in the checkedIn queue", async () => {
    await db.setUserPermissions(123, ["/quick-entry"]);
    try {
      const caller = appRouter.createCaller(makeCallerAs("reception"));
      const today = new Date().toISOString().split("T")[0];

      const result = await caller.medical.createPatient({
        fullName: "Queue Regression Patient",
        phone: "01099999901",
        branch: "examinations",
        serviceType: "consultant",
      });

      expect(result.patientId).toBeGreaterThan(0);

      const visitsRows = await db.getVisitsByPatient(Number(result.patientId));
      const found = (visitsRows as any[]).find(
        (v) =>
          String(v.queueStatus ?? "") === "checkedIn" &&
          new Date(v.visitDate as any).toISOString().slice(0, 10) === today,
      );
      expect(found).toBeDefined();
      expect(found?.queueStatus).toBe("checkedIn");
    } finally {
      await db.setUserPermissions(123, []);
    }
  });
});
