import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { patients } from "../../drizzle/schema";
import { appRouter } from "../routers";
import { cleanupTables, getTestDb } from "./setup";

const caller = () =>
  appRouter.createCaller({
    req: {
      ip: "198.51.100.7",
      protocol: "https",
      headers: {},
      socket: { remoteAddress: "198.51.100.7" },
    } as any,
    res: { clearCookie() {} } as any,
    user: null,
    patientSession: null,
    doctorSession: null,
  });

describe.sequential("patientPortal.login", () => {
  const tables = ["patients", "patient_portal_sessions", "login_rate_limits"];
  beforeEach(async () => {
    const db = await getTestDb();
    await cleanupTables(db, ...tables);
    await db.insert(patients).values([
      { patientCode: "FAM-1", fullName: "Parent", phone: "01012345678", branch: "examinations" },
      { patientCode: "FAM-2", fullName: "Child", phone: "01012345678", branch: "examinations" },
    ]);
  });
  afterEach(async () => cleanupTables(await getTestDb(), ...tables));

  it("lets each family member sharing a phone sign in with their own code", async () => {
    const parent = await caller().patientPortal.login({ phone: "01012345678", patientCode: "FAM-1" });
    const child = await caller().patientPortal.login({ phone: "01012345678", patientCode: "fam-2 " });
    expect(parent.patient.name).toBe("Parent");
    expect(child.patient.name).toBe("Child");
  });

  it("answers unknown phone and wrong code identically", async () => {
    const unknownPhone = await caller()
      .patientPortal.login({ phone: "01099999999", patientCode: "FAM-1" })
      .catch((e) => e);
    const wrongCode = await caller()
      .patientPortal.login({ phone: "01012345678", patientCode: "NOPE" })
      .catch((e) => e);
    expect(unknownPhone.code).toBe("UNAUTHORIZED");
    expect(wrongCode.code).toBe("UNAUTHORIZED");
    expect(unknownPhone.message).toBe(wrongCode.message);
  });
});
