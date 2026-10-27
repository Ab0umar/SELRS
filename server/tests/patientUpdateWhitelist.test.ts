import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { patients } from "../../drizzle/schema";
import { patientRouter } from "../routers/patient";
import {
  PATIENT_UPDATABLE_FIELDS,
  patientUpdatesSchema,
} from "../routers/_medical/patient-update-fields";
import { eq } from "drizzle-orm";
import { makeCallerAs } from "./helpers/auth";
import { cleanupTables, getTestDb } from "./setup";

describe("patientUpdatesSchema", () => {
  it("keeps only editable columns", () => {
    const parsed = patientUpdatesSchema.parse({
      fullName: "Ali",
      phone: "010",
      id: 999,
      patientCode: "X1",
      createdAt: "2001-01-01",
      updatedAt: "2001-01-01",
      isManuallyLocked: true,
    });
    expect(parsed).toEqual({ fullName: "Ali", phone: "010" });
  });

  it("does not list identity or audit columns as editable", () => {
    for (const field of ["id", "patientCode", "createdAt", "updatedAt"]) {
      expect(PATIENT_UPDATABLE_FIELDS).not.toContain(field);
    }
  });

  it("accepts the shapes the screens send", () => {
    expect(
      patientUpdatesSchema.parse({
        age: null,
        dateOfBirth: "1990-02-03",
        address: null,
        status: "followup",
        doctorCode: "D1",
        doctorId: "abc",
      }),
    ).toMatchObject({ age: null, status: "followup" });
  });
});

describe.sequential("patient.updatePatient", () => {
  beforeEach(async () => {
    await cleanupTables(await getTestDb(), "patients");
  });
  afterEach(async () => {
    await cleanupTables(await getTestDb(), "patients");
  });

  it("cannot rewrite the primary key or creation time", async () => {
    const db = await getTestDb();
    await db
      .insert(patients)
      .values({ patientCode: "W-1", fullName: "Before", branch: "examinations" });
    const [row] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientCode, "W-1"));

    const caller = patientRouter.createCaller(makeCallerAs("reception"));
    await caller.updatePatient({
      patientId: row.id,
      updates: {
        fullName: "After",
        id: row.id + 1000,
        createdAt: "2001-01-01",
      } as any,
    });

    const [after] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientCode, "W-1"));
    expect(after.id).toBe(row.id);
    expect(after.fullName).toBe("After");
    expect(after.createdAt.getTime()).toBe(row.createdAt.getTime());
  });
});
