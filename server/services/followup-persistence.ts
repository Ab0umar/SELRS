import { and, desc, eq, inArray } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import {
  followupItems,
  followupSheets,
  patients,
  visits,
} from "../../drizzle/schema";
import { persistClinicalSheet } from "./clinical-sheet";
import { clinicalDate } from "../../shared/clinical-record";

export type FollowupSaveInput = {
  patientId: number;
  doctorId?: number;
  role?: string;
  sheetType: typeof followupSheets.$inferInsert.sheetType;
  followupItems: Array<
    Omit<
      typeof followupItems.$inferInsert,
      "id" | "followupSheetId" | "createdAt" | "updatedAt"
    > & { itemId?: number; clinicalContent?: Record<string, unknown> }
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
              visitId: followupItems.visitId,
            })
            .from(followupItems)
            .where(inArray(followupItems.followupSheetId, sheetIds))
        : [];
    let latestSheet = sheets[0];
    let savedSheet = latestSheet;
    const savedItems: Array<{ itemId: number; visitId: number }> = [];
    for (const submitted of input.followupItems) {
      const { itemId, clinicalContent, ...submittedFields } = submitted;
      const existingItem = itemId
        ? storedItems.find((item) => item.id === itemId)
        : undefined;
      if (itemId && !existingItem)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Followup does not belong to this patient and sheet type",
        });
      if (!submittedFields.followupDate && !existingItem) continue;
      const parse = (value: unknown): Record<string, unknown> => {
        if (value === null || value === undefined) return {};
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      };
      const content: Record<string, unknown> = {
        ...clinicalContent,
        formData: {
          examinationDate: clinicalDate(submittedFields.followupDate),
        },
      };
      const auto: Record<string, Record<string, unknown>> = { od: {}, os: {} };
      const findings: Record<string, unknown> = {};
      for (const eye of ["OD", "OS"] as const) {
        const refraction = parse(submittedFields[`refrac${eye}`]);
        const fields = auto[eye.toLowerCase()];
        for (const [source, target] of Object.entries({
          s: "s",
          c: "c",
          a: "axis",
          axis: "axis",
        }))
          if (Object.hasOwn(refraction, source))
            fields[target] = refraction[source];
        for (const [source, target] of Object.entries({
          va: "ucva",
          iop: "iop",
        }))
          if (Object.hasOwn(submittedFields, `${source}${eye}`))
            fields[target] = submittedFields[`${source}${eye}` as "vaOD"];
        const flap = parse(submittedFields[`flap${eye}`]);
        for (const [source, target] of Object.entries({
          edges: "flapEdges",
          bed: "flapBed",
        }))
          if (Object.hasOwn(flap, source))
            findings[`${target}${eye}`] = String(flap[source] ?? "");
      }
      content.examData = {
        autorefraction: auto,
        ...((clinicalContent?.examData as Record<string, unknown>) ?? {}),
      };
      if (submittedFields.treatment !== undefined)
        content.treatmentPlan = submittedFields.treatment;
      if (submittedFields.notes !== undefined)
        content.officeNotes = submittedFields.notes;
      if (Object.keys(findings).length) content.followupFindings = findings;
      if (submittedFields.operationType)
        content.operationDetails = {
          type: submittedFields.operationType,
          date: submittedFields.operationDate,
          eyes: {
            right: submittedFields.rightEye,
            left: submittedFields.leftEye,
          },
        };
      const clinical = await persistClinicalSheet(
        transaction,
        {
          patientId: input.patientId,
          visitId:
            submittedFields.visitId ?? existingItem?.visitId ?? undefined,
          sheetType: "followup",
          content: JSON.stringify(content),
        },
        { doctorId: input.doctorId ?? 0, role: input.role ?? "doctor" },
      );
      const measurements = {
        visitId: clinical.visitId,
        followupName: submittedFields.followupName,
        rightEye: submittedFields.rightEye,
        leftEye: submittedFields.leftEye,
        tableIndex: submittedFields.tableIndex,
      };
      if (submittedFields.followupDate)
        await transaction
          .update(visits)
          .set({ visitDate: submittedFields.followupDate })
          .where(
            and(
              eq(visits.id, clinical.visitId),
              eq(visits.patientId, input.patientId),
            ),
          );
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
        savedItems.push({ itemId: existing.id, visitId: clinical.visitId });
        continue;
      }
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
        visitId: clinical.visitId,
      });
      storedItems.push({
        id: header.insertId,
        followupSheetId: latestSheet.id,
        tableIndex,
        visitId: clinical.visitId,
      });
      savedSheet = latestSheet;
      savedItems.push({ itemId: header.insertId, visitId: clinical.visitId });
    }
    return {
      success: true as const,
      sheetId: savedSheet?.id ?? null,
      version: savedSheet?.version ?? null,
      items: savedItems,
    };
  });
}
