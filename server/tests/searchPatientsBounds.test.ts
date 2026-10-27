import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { patients, sheetEntries } from "../../drizzle/schema";
import * as db from "../db";
import { likeContains } from "../lib/likeEscape";
import { cleanupTables, getTestDb } from "./setup";

async function reset() {
  await cleanupTables(await getTestDb(), "sheet_entries", "patients");
}

async function seed(rows: Array<{ patientCode: string; fullName: string; phone?: string }>) {
  const testDb = await getTestDb();
  for (const row of rows) {
    await testDb.insert(patients).values({ ...row, branch: "examinations" });
  }
}

describe("likeContains", () => {
  it("makes LIKE wildcards and the escape character literal", () => {
    expect(likeContains("50%_off")).toBe("%50" + "\\%" + "\\_" + "off%");
    expect(likeContains("a" + "\\")).toBe("%a" + "\\\\" + "%");
  });
});

describe.sequential("searchPatients is bounded", () => {
  beforeEach(reset);
  afterEach(reset);

  it("returns nothing for an empty or one-character term instead of the whole table", async () => {
    await seed([
      { patientCode: "S-1", fullName: "Ali Hassan", phone: "01011111111" },
      { patientCode: "S-2", fullName: "Sara Adel", phone: "01022222222" },
    ]);
    expect(await db.searchPatients("")).toEqual([]);
    expect(await db.searchPatients("   ")).toEqual([]);
    expect(await db.searchPatients("%")).toEqual([]);
    expect(await db.searchPatients("a")).toEqual([]);
  });

  it("treats % and _ typed by the user literally", async () => {
    await seed([
      { patientCode: "S-3", fullName: "Ali Hassan" },
      { patientCode: "S-4", fullName: "Name_With_Underscore" },
    ]);
    expect(await db.searchPatients("%%")).toEqual([]);
    expect(await db.searchPatients("__")).toEqual([]);
    const hits = await db.searchPatients("e_W");
    expect(hits.map((p: any) => p.patientCode)).toEqual(["S-4"]);
  });

  it("caps the number of rows and returns the newest first", async () => {
    await seed(
      Array.from({ length: 12 }, (_, i) => ({
        patientCode: `CAP-${String(i).padStart(2, "0")}`,
        fullName: `Common Name ${i}`,
      })),
    );
    const capped = await db.searchPatients("Common", undefined, undefined, 5);
    expect(capped).toHaveLength(5);
    expect(capped[0].patientCode).toBe("CAP-11");
    const all = await db.searchPatients("Common");
    expect(all).toHaveLength(12);
  });

  it("filters by sheet type without loading id lists", async () => {
    await seed([
      { patientCode: "SH-1", fullName: "Sheet Lasik One" },
      { patientCode: "SH-2", fullName: "Sheet Plain Two" },
    ]);
    const testDb = await getTestDb();
    const [lasik] = await db.searchPatients("Lasik One");
    await testDb.insert(sheetEntries).values({
      patientId: lasik.id,
      sheetType: "lasik",
      content: "{}",
    } as any);
    const hits = await db.searchPatients("Sheet", "lasik");
    expect(hits.map((p: any) => p.patientCode)).toEqual(["SH-1"]);
  });
});
