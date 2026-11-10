import { afterAll, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import {
  followupItems,
  followupSheets,
  patients,
  visits,
} from "../../drizzle/schema";
import { getAllFollowupItems } from "../db";
import { getTestDb } from "./setup";

const patientIds: number[] = [];

async function patient(fullName: string) {
  const db = await getTestDb();
  const [row] = await db.insert(patients).values({
    patientCode: `FU-LIST-${Date.now()}-${patientIds.length}`,
    fullName,
    branch: "examinations",
  });
  patientIds.push(row.insertId);
  return { db, patientId: row.insertId };
}

afterAll(async () => {
  if (!patientIds.length) return;
  const db = await getTestDb();
  const sheets = await db
    .select({ id: followupSheets.id })
    .from(followupSheets)
    .where(inArray(followupSheets.patientId, patientIds));
  if (sheets.length)
    await db.delete(followupItems).where(
      inArray(
        followupItems.followupSheetId,
        sheets.map((sheet) => sheet.id),
      ),
    );
  await db
    .delete(followupSheets)
    .where(inArray(followupSheets.patientId, patientIds));
  await db.delete(visits).where(inArray(visits.patientId, patientIds));
  await db.delete(patients).where(inArray(patients.id, patientIds));
});

describe("followup record list", () => {
  it("keeps sheet followups saved on examination visits and queue visits without a sheet", async () => {
    const sheetPatient = await patient("Sheet followup");
    const [examVisit] = await sheetPatient.db.insert(visits).values({
      patientId: sheetPatient.patientId,
      visitDate: new Date("2026-11-02T12:00:00"),
      visitType: "examination",
      branch: "examinations",
    });
    const [plainVisit] = await sheetPatient.db.insert(visits).values({
      patientId: sheetPatient.patientId,
      visitDate: new Date("2026-11-03T12:00:00"),
      visitType: "examination",
      branch: "examinations",
    });
    const [sheet] = await sheetPatient.db.insert(followupSheets).values({
      patientId: sheetPatient.patientId,
      sheetType: "consultant",
    });
    await sheetPatient.db.insert(followupItems).values({
      followupSheetId: sheet.insertId,
      visitId: examVisit.insertId,
      tableIndex: 0,
      followupName: "week one",
    });

    const queued = await patient("Queue followup");
    await queued.db.insert(visits).values({
      patientId: queued.patientId,
      visitDate: new Date("2026-11-04T12:00:00"),
      visitType: "followup",
      branch: "examinations",
    });

    const other = await patient("Other patient");
    const [otherVisit] = await other.db.insert(visits).values({
      patientId: other.patientId,
      visitDate: new Date("2026-11-01T12:00:00"),
      visitType: "examination",
      branch: "examinations",
    });
    const [otherSheet] = await other.db.insert(followupSheets).values({
      patientId: other.patientId,
      sheetType: "lasik",
    });
    await other.db.insert(followupItems).values({
      followupSheetId: otherSheet.insertId,
      visitId: otherVisit.insertId,
      tableIndex: 0,
      followupName: "other sheet",
    });

    const listed = await getAllFollowupItems(50, {
      patientId: sheetPatient.patientId,
    });
    expect(listed.map((row) => row.visitId).sort()).toEqual(
      [examVisit.insertId].sort(),
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      visitId: examVisit.insertId,
      followupName: "week one",
      patientId: sheetPatient.patientId,
    });
    expect(listed.some((row) => row.visitId === plainVisit.insertId)).toBe(
      false,
    );

    const queueRows = await getAllFollowupItems(50, {
      patientId: queued.patientId,
    });
    expect(queueRows).toHaveLength(1);
    expect(queueRows[0]).toMatchObject({
      patientId: queued.patientId,
      followupSheetId: null,
    });

    const otherRows = await getAllFollowupItems(50, {
      patientId: other.patientId,
    });
    expect(otherRows.map((row) => row.patientFullName)).toEqual([
      "Other patient",
    ]);
  });
});
