import "dotenv/config";
import { eq, and } from "drizzle-orm";
import * as db from "../server/db";
import {
  examinations,
  autorefractometryData,
  afterRefractionData,
  glassesRecords,
  pentacamResults,
  doctorReports,
  prescriptions,
  prescriptionItems,
  testRequests,
  testRequestItems,
} from "../drizzle/schema";

const visitIds = process.argv.slice(2).map(Number).filter(Number.isFinite);
const conn = await db.getDb();
if (!conn) throw new Error("Database not available");

const summarize = (row: Record<string, unknown> | undefined) =>
  row
    ? Object.fromEntries(
        Object.entries(row).filter(([key, value]) =>
          !["id", "visitId", "patientId", "examinationId", "createdAt", "updatedAt"].includes(key) &&
          value !== null && value !== undefined && String(value).trim() !== "",
        ),
      )
    : null;

for (const visitId of visitIds) {
  const [exam, autoref, afterRef, glasses, pentacam, reports, rx, tests] = await Promise.all([
    conn.select().from(examinations).where(eq(examinations.visitId, visitId)),
    conn.select().from(autorefractometryData).innerJoin(examinations, eq(autorefractometryData.examinationId, examinations.id)).where(eq(examinations.visitId, visitId)),
    conn.select().from(afterRefractionData).innerJoin(examinations, eq(afterRefractionData.examinationId, examinations.id)).where(eq(examinations.visitId, visitId)),
    conn.select().from(glassesRecords).innerJoin(examinations, eq(glassesRecords.examinationId, examinations.id)).where(eq(examinations.visitId, visitId)),
    conn.select().from(pentacamResults).where(eq(pentacamResults.visitId, visitId)),
    conn.select().from(doctorReports).where(eq(doctorReports.visitId, visitId)),
    conn.select().from(prescriptions).where(eq(prescriptions.visitId, visitId)),
    conn.select().from(testRequests).where(eq(testRequests.visitId, visitId)),
  ]);
  const rxItems = rx.length ? await conn.select().from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, rx[0].prescriptions.id)) : [];
  const testItems = tests.length ? await conn.select().from(testRequestItems).where(eq(testRequestItems.testRequestId, tests[0].testRequests.id)) : [];
  console.log(JSON.stringify({
    visitId,
    examinations: exam.map((row) => summarize(row as Record<string, unknown>)),
    autoref: autoref.map((row) => summarize(row.autorefractometryData as Record<string, unknown>)),
    afterRef: afterRef.map((row) => summarize(row.afterRefractionData as Record<string, unknown>)),
    glasses: glasses.map((row) => summarize(row.glassesRecords as Record<string, unknown>)),
    pentacam: pentacam.map((row) => summarize(row as Record<string, unknown>)),
    reports: reports.map((row) => summarize(row as Record<string, unknown>)),
    prescriptions: rx.map((row) => summarize(row as Record<string, unknown>)),
    prescriptionItems: rxItems.map((row) => summarize(row as Record<string, unknown>)),
    testRequests: tests.map((row) => summarize(row as Record<string, unknown>)),
    testRequestItems: testItems.map((row) => summarize(row as Record<string, unknown>)),
  }, null, 2));
}
