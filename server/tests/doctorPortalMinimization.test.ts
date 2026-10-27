import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  externalDoctorReferrals,
  externalDoctors,
  patients,
} from "../../drizzle/schema";

vi.mock("../_core/s3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../_core/s3")>()),
  listObjectsInS3: vi.fn().mockResolvedValue([]),
}));

const { appRouter } = await import("../routers");
const { cleanupTables, getTestDb } = await import("./setup");

describe.sequential("doctorPortal.getPatientImages", () => {
  const tables = [
    "external_doctors",
    "external_doctor_referrals",
    "external_doctor_access_logs",
    "patients",
  ];
  beforeEach(async () => {
    const db = await getTestDb();
    await cleanupTables(db, ...tables);
    await db.insert(externalDoctors).values({
      id: 501,
      username: "ext.one",
      passwordHash: "x",
      fullName: "Ext One",
    });
    await db.insert(patients).values({
      patientCode: "MIN-1",
      fullName: "Min Patient",
      phone: "01012345678",
      address: "Secret street 1",
      allergies: "penicillin",
      branch: "examinations",
    });
    await db
      .insert(externalDoctorReferrals)
      .values({ externalDoctorId: 501, patientCode: "MIN-1" });
  });
  afterEach(async () => cleanupTables(await getTestDb(), ...tables));

  it("returns clinical fields but not phone or address", async () => {
    const caller = appRouter.createCaller({
      req: { ip: "198.51.100.9", headers: {}, socket: {} } as any,
      res: {} as any,
      user: null,
      patientSession: null,
      doctorSession: { doctorId: 501, username: "ext.one" },
    });
    const result = await caller.doctorPortal.getPatientImages({ patientCode: "MIN-1" });
    expect(result.patient).toMatchObject({
      fullName: "Min Patient",
      allergies: "penicillin",
    });
    expect(result.patient).not.toHaveProperty("phone");
    expect(result.patient).not.toHaveProperty("address");
    expect(JSON.stringify(result)).not.toContain("Secret street");
    expect(JSON.stringify(result)).not.toContain("01012345678");
  });
});
