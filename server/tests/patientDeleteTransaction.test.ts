import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { patients, visits } from "../../drizzle/schema";
import { getDb, deletePatient, deletePatientWithAllData } from "../db";
import { cleanupTables, getTestDb } from "./setup";

async function seedPatient(code: string) {
  const db = await getTestDb();
  await db.insert(patients).values({ patientCode: code, fullName: "Del", branch: "examinations" });
  const [p] = await db.select().from(patients).where(eq(patients.patientCode, code));
  await db.insert(visits).values({ patientId: p.id, visitDate: new Date() } as any);
  return p.id as number;
}

describe.sequential("patient deletion is atomic", () => {
  beforeEach(async () => {
    const db = await getTestDb();
    await cleanupTables(db, "visits", "patients");
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    const db = await getTestDb();
    await cleanupTables(db, "visits", "patients");
  });

  it("removes the patient and its visits", async () => {
    const id = await seedPatient("DEL-1");
    await deletePatient(id);
    const db = await getTestDb();
    expect(await db.select().from(patients).where(eq(patients.id, id))).toHaveLength(0);
    expect(await db.select().from(visits).where(eq(visits.patientId, id))).toHaveLength(0);
  });

  it("rolls back the visit deletes when the patient row delete fails", async () => {
    const id = await seedPatient("DEL-2");
    const appDb: any = await getDb();
    const original = appDb.transaction.bind(appDb);
    vi.spyOn(appDb, "transaction").mockImplementation((fn: any) =>
      original((tx: any) => {
        const del = tx.delete.bind(tx);
        tx.delete = (table: unknown) => {
          if (table === patients) throw new Error("boom");
          return del(table);
        };
        return fn(tx);
      }),
    );

    await expect(deletePatient(id)).rejects.toThrow("boom");

    const db = await getTestDb();
    expect(await db.select().from(patients).where(eq(patients.id, id))).toHaveLength(1);
    expect(await db.select().from(visits).where(eq(visits.patientId, id))).toHaveLength(1);
  });

  it("deletePatientWithAllData keeps the patient row", async () => {
    const id = await seedPatient("DEL-3");
    await deletePatientWithAllData(id);
    const db = await getTestDb();
    expect(await db.select().from(patients).where(eq(patients.id, id))).toHaveLength(1);
    expect(await db.select().from(visits).where(eq(visits.patientId, id))).toHaveLength(0);
  });
});
