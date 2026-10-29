import { afterAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";
import { getTestDb } from "./setup";
import {
  patients,
  visits,
  examinations,
  autorefractometryData,
  doctorReports,
  sheetEntries,
  glassesRecords,
  pentacamResults,
  afterRefractionData,
  visitComplaints,
  visitSymptoms,
  visitDiagnoses,
  visitDiagnosisCodes,
  visitSymptomCodes,
  visitTreatmentPlans,
  visitDecisions,
  visitMedicalHistory,
  airPuffMeasurements,
  examinationFindings,
  examinationProcedurePlans,
  fundusFindings,
  medications,
  tests,
  prescriptions,
  prescriptionItems,
  testRequests,
  testRequestItems,
} from "../../drizzle/schema";

const patientIds: number[] = [];
const medicationIds: number[] = [];
const testIds: number[] = [];
const doctor = appRouter.createCaller(makeCallerAs("doctor"));
async function fixture() {
  const db = await getTestDb();
  const [patient] = await db.insert(patients).values({
    patientCode: `CANON-${Date.now()}-${patientIds.length}`,
    fullName: "Synthetic canonical test",
  });
  patientIds.push(patient.insertId);
  const [visit] = await db.insert(visits).values({
    patientId: patient.insertId,
    visitDate: new Date("2026-03-15T12:00:00"),
    visitType: "examination",
    branch: "examinations",
  });
  return { db, patientId: patient.insertId, visitId: visit.insertId };
}
afterAll(async () => {
  if (!patientIds.length) return;
  const db = await getTestDb();
  const rx = await db
    .select({ id: prescriptions.id })
    .from(prescriptions)
    .where(inArray(prescriptions.patientId, patientIds));
  if (rx.length)
    await db.delete(prescriptionItems).where(
      inArray(
        prescriptionItems.prescriptionId,
        rx.map((row) => row.id),
      ),
    );
  const requests = await db
    .select({ id: testRequests.id })
    .from(testRequests)
    .where(inArray(testRequests.patientId, patientIds));
  if (requests.length)
    await db.delete(testRequestItems).where(
      inArray(
        testRequestItems.testRequestId,
        requests.map((row) => row.id),
      ),
    );
  for (const table of [
    prescriptions,
    testRequests,
    visitDiagnosisCodes,
    visitSymptomCodes,
    visitComplaints,
    visitSymptoms,
    visitDiagnoses,
    visitTreatmentPlans,
    visitDecisions,
    visitMedicalHistory,
    airPuffMeasurements,
    examinationFindings,
    examinationProcedurePlans,
    fundusFindings,
    autorefractometryData,
    afterRefractionData,
    glassesRecords,
    pentacamResults,
    doctorReports,
    sheetEntries,
    examinations,
    visits,
    patients,
  ]) {
    await db
      .delete(table)
      .where(
        inArray(table === patients ? patients.id : table.patientId, patientIds),
      );
  }
  if (medicationIds.length)
    await db.delete(medications).where(inArray(medications.id, medicationIds));
  if (testIds.length) await db.delete(tests).where(inArray(tests.id, testIds));
});
describe.sequential("canonical clinical storage", () => {
  it("does not count retired investigation JSON as current completion data", async () => {
    const { db, patientId, visitId } = await fixture();
    await db.insert(examinations).values({
      patientId,
      visitId,
      radiologyLabsNotes: "Retired investigation note",
    });
    const storage = await import("../db");
    const queue = await storage.getTodayVisitsByQueueStatus("2026-03-15");
    const row = queue.find((item) => item.id === visitId);
    expect(row).toBeDefined();
    expect(Number(row!.hasQueueCompletionData)).toBe(0);
  });
  it("keeps symptom-only updates out of the complaint table", async () => {
    const { db, patientId, visitId } = await fixture();
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitId,
      symptoms: "Synthetic tearing",
    });
    expect(
      await db
        .select()
        .from(visitComplaints)
        .where(eq(visitComplaints.visitId, visitId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(visitSymptoms)
        .where(eq(visitSymptoms.visitId, visitId)),
    ).toMatchObject([{ symptoms: "Synthetic tearing" }]);
  });

  it("rolls the examination form and sheet metadata back when an order is invalid", async () => {
    const { db, patientId, visitId } = await fixture();
    const [med] = await db
      .insert(medications)
      .values({ name: "Removed form medication", type: "drops" });
    await db.delete(medications).where(eq(medications.id, med.insertId));
    await expect(
      doctor.medical.saveExaminationForm({
        patientId,
        visitId,
        visitDate: "2026-03-15",
        visitType: "examination",
        data: {
          diagnosis: "Must roll back",
          sphereOD: "-2",
          medicalChecklist: { glaucomaTreatment: true },
          treatment: [med.insertId],
        },
      }),
    ).rejects.toThrow();
    expect(
      await db
        .select()
        .from(examinations)
        .where(eq(examinations.visitId, visitId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(visitDiagnoses)
        .where(eq(visitDiagnoses.visitId, visitId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(sheetEntries)
        .where(eq(sheetEntries.visitId, visitId)),
    ).toHaveLength(0);
    await doctor.medical.saveExaminationForm({
      patientId,
      visitId,
      visitDate: "2026-03-15",
      visitType: "examination",
      data: {
        diagnosis: "Canonical form diagnosis",
        historyNotes: "Synthetic medical history",
        treatmentPlan: "Synthetic narrative treatment plan",
        sphereOD: "-2",
        iopOD: "19",
        medicalChecklist: { glaucomaTreatment: true },
        pentacam: { od: { k1: "43", ax2: "120" } },
      },
    });
    const admin = appRouter.createCaller(makeCallerAs("admin"));
    const audit = await admin.medical.getDataSourceAuditStatus({ patientId });
    expect(audit).toMatchObject({
      checked: true,
      autoref: { sphereOD: "-2", iopOD: "19" },
      pentacam: { k1OD: "43" },
      doctorReport: {
        diagnosis: "Canonical form diagnosis",
        treatment: "Synthetic narrative treatment plan",
      },
      checklistNormalized: { glaucomaTreatment: true },
    });
  });

  it("saves a visit, catalog prescription and tests once and retains omitted instructions", async () => {
    const { db, patientId, visitId } = await fixture();
    const [med] = await db
      .insert(medications)
      .values({ name: "Synthetic canonical eye drops", type: "drops" });
    medicationIds.push(med.insertId);
    const [test] = await db
      .insert(tests)
      .values({ name: "Synthetic canonical investigation", type: "lab" });
    testIds.push(test.insertId);
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitId,
      visitDate: "2026-03-15",
      chiefComplaint: "Blurred vision",
      symptoms: "Tearing",
      diagnosis: "Cataract",
      autoref: { od: { s: "1", ucva: "6/12", bcva: "6/9" } },
      iop: { od: "18" },
      medicationItems: [
        {
          medicationId: med.insertId,
          dosage: "1 drop",
          frequency: "Daily",
          instructions: "Synthetic instructions",
        },
      ],
      tests: JSON.stringify([test.insertId]),
    });
    const [complaint] = await db
      .select()
      .from(visitComplaints)
      .where(eq(visitComplaints.visitId, visitId));
    expect(complaint.complaint).toBe("Blurred vision");
    const [symptoms] = await db
      .select()
      .from(visitSymptoms)
      .where(eq(visitSymptoms.visitId, visitId));
    expect(symptoms.symptoms).toBe("Tearing");
    expect(
      await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.visitId, visitId)),
    ).toHaveLength(1);
    expect(
      await db
        .select()
        .from(testRequests)
        .where(eq(testRequests.visitId, visitId)),
    ).toHaveLength(1);
    await doctor.medical.saveMedicalVisit({
      patientId,
      visitId,
      medicationItems: [{ medicationId: med.insertId }],
    });
    const [header] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.visitId, visitId));
    const [item] = await db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, header.id));
    expect(item).toMatchObject({
      medicationId: med.insertId,
      dosage: "1 drop",
      frequency: "Daily",
      instructions: "Synthetic instructions",
    });
    expect(
      await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.visitId, visitId)),
    ).toHaveLength(1);
    const sheet = JSON.parse(
      (await doctor.medical.getSheetEntry({
        patientId,
        visitId,
        sheetType: "consultant",
      }))!,
    );
    expect(sheet).toMatchObject({
      symptoms: "Tearing",
      diagnosisText: "Cataract",
      consultantExam: { complains: "Blurred vision" },
      examData: { autorefraction: { od: { bcva: "6/9", airPuff1: "18" } } },
    });
  });
  it("rolls the whole visit back when a selected catalog medication no longer exists", async () => {
    const { db, patientId, visitId } = await fixture();
    const [med] = await db
      .insert(medications)
      .values({ name: "Removed synthetic medication", type: "drops" });
    await db.delete(medications).where(eq(medications.id, med.insertId));
    await expect(
      doctor.medical.saveMedicalVisit({
        patientId,
        visitId,
        chiefComplaint: "Must roll back",
        diagnosis: "Must roll back",
        medicationItems: [{ medicationId: med.insertId }],
      }),
    ).rejects.toThrow("no longer exists");
    expect(
      await db
        .select()
        .from(examinations)
        .where(eq(examinations.visitId, visitId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(visitComplaints)
        .where(eq(visitComplaints.visitId, visitId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(visitDiagnoses)
        .where(eq(visitDiagnoses.visitId, visitId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.visitId, visitId)),
    ).toHaveLength(0);
  });
  it("shares sheet diagnosis and measurements with patient records and preserves an explicit clear", async () => {
    const { db, patientId, visitId } = await fixture();
    await doctor.medical.saveSheetEntry({
      patientId,
      visitId,
      sheetType: "consultant",
      content: JSON.stringify({
        visitId,
        diagnosisText: "Cataract",
        finalDecisionText: "Review",
        examData: { autorefraction: { od: { ucva: "6/12", iop: "18" } } },
      }),
    });
    const reports = await db
      .select()
      .from(doctorReports)
      .where(eq(doctorReports.visitId, visitId));
    const [diagnosis] = await db
      .select()
      .from(visitDiagnoses)
      .where(eq(visitDiagnoses.visitId, visitId));
    expect(diagnosis?.diagnosis).toBe("Cataract");
    expect(reports[0]?.diagnosis).toBeNull();
    const records = await doctor.medical.getExaminationsByPatient({
      patientId,
    });
    expect(records[0]?.ucvaOD).toBe("6/12");
    await doctor.medical.updateDoctorReport({
      reportId: reports[0].id,
      diagnosis: "",
      recommendations: "",
    });
    const sheet = JSON.parse(
      (await doctor.medical.getSheetEntry({
        patientId,
        visitId,
        sheetType: "consultant",
      }))!,
    );
    expect(sheet.diagnosisText).toBe("");
    expect(sheet.finalDecisionText).toBe("");
  });
  it("saves the explicitly selected examination visit instead of another visit on the same day", async () => {
    const { db, patientId, visitId } = await fixture();
    const [second] = await db.insert(visits).values({
      patientId,
      visitDate: new Date("2026-03-15T12:00:00"),
      visitType: "followup",
      branch: "examinations",
    });
    await expect(
      doctor.medical.saveExaminationForm({
        patientId,
        visitDate: "2026-03-15",
        visitType: "examination",
        data: { diagnosis: "Ambiguous" },
      }),
    ).rejects.toThrow("Multiple visits");
    await doctor.medical.saveExaminationForm({
      patientId,
      visitId: second.insertId,
      visitDate: "2026-03-15",
      visitType: "followup",
      data: { diagnosis: "Selected visit" },
    });
    const reports = await db
      .select()
      .from(doctorReports)
      .where(eq(doctorReports.patientId, patientId));
    expect(reports[0]?.visitId).toBe(second.insertId);
    expect(reports.some((row) => row.visitId === visitId)).toBe(false);
  });
});
