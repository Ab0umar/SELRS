import type { MySql2Database } from "drizzle-orm/mysql2";
import type { InvestigationInput } from "../../shared/clinical-catalog-items";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { visits, sheetEntries } from "../../drizzle/schema";
import {
  persistClinicalSheet,
  type ClinicalSheetInput,
} from "./clinical-sheet";
import {
  persistVisitPrescription,
  persistVisitTestRequests,
  type PrescriptionInput,
} from "./prescription-persistence";

export type ClinicalVisitInput = ClinicalSheetInput & {
  visitType?: "examination" | "followup";
  appointmentId?: number;
  visitDate?: Date;
  prescriptionItems?: PrescriptionInput["items"];
  testItems?: InvestigationInput[];
  sheetMetadataTypes?: Array<
    "consultant" | "specialist" | "lasik" | "external"
  >;
};

export function saveClinicalVisit(
  connection: MySql2Database,
  input: ClinicalVisitInput,
  actor: { doctorId: number; role: string },
) {
  return connection.transaction(async (transaction) => {
    const saved = await persistClinicalSheet(transaction, input, actor);
    const header: {
      visitType?: "examination" | "followup";
      appointmentId?: number;
      visitDate?: Date;
    } = {};
    if (input.visitType !== undefined) header.visitType = input.visitType;
    if (input.appointmentId !== undefined)
      header.appointmentId = input.appointmentId;
    if (input.visitDate !== undefined) {
      const day = input.visitDate.toISOString().slice(0, 10);
      const [current] = await transaction
        .select({ day: sql<string>`DATE_FORMAT(${visits.visitDate}, '%Y-%m-%d')` })
        .from(visits)
        .where(eq(visits.id, saved.visitId))
        .limit(1);
      // Only moving the visit to another day can collide; a patient may have
      // two visits on the same day and either one must still save.
      const [conflictingVisit] =
        current?.day === day
          ? []
          : await transaction
              .select({ id: visits.id })
              .from(visits)
              .where(
                and(
                  eq(visits.patientId, input.patientId),
                  ne(visits.id, saved.visitId),
                  sql`DATE(${visits.visitDate}) = ${day}`,
                ),
              )
              .limit(1);
      if (conflictingVisit)
        throw new TRPCError({
          code: "CONFLICT",
          message: "للمريض زيارة أخرى في التاريخ المحدد. اخترها من قائمة الزيارات.",
        });
      header.visitDate = input.visitDate;
    }
    if (Object.keys(header).length)
      await transaction
        .update(visits)
        .set(header)
        .where(
          and(
            eq(visits.id, saved.visitId),
            eq(visits.patientId, input.patientId),
          ),
        );
    const [visit] = await transaction
      .select({ visitDate: visits.visitDate })
      .from(visits)
      .where(eq(visits.id, saved.visitId))
      .limit(1);
    const recordDate = visit.visitDate;
    const identity = {
      patientId: input.patientId,
      visitId: saved.visitId,
      date: recordDate.toISOString().slice(0, 10),
    };
    if (input.prescriptionItems !== undefined)
      await persistVisitPrescription(transaction, {
        ...identity,
        doctorId: actor.doctorId,
        items: input.prescriptionItems,
      });
    if (input.testItems !== undefined)
      await persistVisitTestRequests(transaction, {
        ...identity,
        items: input.testItems,
      });
    if (input.sheetMetadataTypes?.length) {
      const content = JSON.parse(input.content);
      for (const sheetType of input.sheetMetadataTypes) {
        const [existing] = await transaction
          .select({ id: sheetEntries.id, content: sheetEntries.content })
          .from(sheetEntries)
          .where(
            and(
              eq(sheetEntries.patientId, input.patientId),
              eq(sheetEntries.visitId, saved.visitId),
              eq(sheetEntries.sheetType, sheetType),
            ),
          )
          .orderBy(desc(sheetEntries.id))
          .limit(1);
        const metadata = existing ? JSON.parse(existing.content) : {};
        const record = {
          visitId: saved.visitId,
          updatedAt: new Date(),
          content: JSON.stringify({
            visitId: saved.visitId,
            signatures: content.signatures ?? metadata.signatures,
            layout: metadata.layout,
            printLayout: metadata.printLayout,
            operationId: metadata.operationId,
          }),
        };
        if (existing)
          await transaction
            .update(sheetEntries)
            .set(record)
            .where(eq(sheetEntries.id, existing.id));
        else
          await transaction
            .insert(sheetEntries)
            .values({ ...record, patientId: input.patientId, sheetType });
      }
    }
    return saved;
  });
}
