import { and, desc, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import { followupItems, followupSheets, patients } from "../../drizzle/schema";

export type FollowupSaveInput = {
  patientId: number;
  sheetType: typeof followupSheets.$inferInsert.sheetType;
  followupItems: Array<
    Omit<
      typeof followupItems.$inferInsert,
      "id" | "followupSheetId" | "createdAt" | "updatedAt"
    > & { itemId?: number }
  >;
};

export async function savePatientFollowups(
  connection: MySql2Database,
  input: FollowupSaveInput,
) {
  return connection.transaction(async (transaction) => {
    // Serialize sheet allocation across concurrent saves for the same patient.
    const [patient] = await transaction
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, input.patientId))
      .for("update");
    if (!patient)
      throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
    const sheets = await transaction
      .select()
      .from(followupSheets)
      .where(
        and(
          eq(followupSheets.patientId, input.patientId),
          eq(followupSheets.sheetType, input.sheetType),
        ),
      )
      .orderBy(desc(followupSheets.version), desc(followupSheets.id));
    const sheetIds = sheets.map((sheet) => sheet.id);
    const storedItems =
      sheetIds.length > 0
        ? await transaction
            .select({
              id: followupItems.id,
              followupSheetId: followupItems.followupSheetId,
              tableIndex: followupItems.tableIndex,
            })
            .from(followupItems)
            .where(inArray(followupItems.followupSheetId, sheetIds))
        : [];
    let latestSheet = sheets[0];
    let savedSheet = latestSheet;
    for (const submitted of input.followupItems) {
      const { itemId, ...measurements } = submitted;
      if (itemId) {
        const existing = storedItems.find((item) => item.id === itemId);
        if (!existing)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Followup does not belong to this patient and sheet type",
          });
        await transaction
          .update(followupItems)
          .set({ ...measurements, tableIndex: existing.tableIndex })
          .where(eq(followupItems.id, existing.id));
        savedSheet = sheets.find(
          (sheet) => sheet.id === existing.followupSheetId,
        )!;
        continue;
      }
      if (!measurements.followupDate) continue;
      const occupied = new Set(
        storedItems
          .filter((item) => item.followupSheetId === latestSheet?.id)
          .map((item) => item.tableIndex),
      );
      let tableIndex = [0, 1, 2, 3].find((index) => !occupied.has(index));
      if (!latestSheet || tableIndex === undefined) {
        const version = (latestSheet?.version ?? 0) + 1;
        const [header] = await transaction.insert(followupSheets).values({
          patientId: input.patientId,
          sheetType: input.sheetType,
          version,
        });
        if (!header.insertId)
          throw new Error("Failed to create followup sheet");
        latestSheet = {
          id: header.insertId,
          patientId: input.patientId,
          sheetType: input.sheetType,
          version,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        sheets.push(latestSheet);
        tableIndex = 0;
      }
      const [header] = await transaction.insert(followupItems).values({
        ...measurements,
        followupSheetId: latestSheet.id,
        tableIndex,
      });
      storedItems.push({
        id: header.insertId,
        followupSheetId: latestSheet.id,
        tableIndex,
      });
      savedSheet = latestSheet;
    }
    return {
      success: true as const,
      sheetId: savedSheet?.id ?? null,
      version: savedSheet?.version ?? null,
    };
  });
}
