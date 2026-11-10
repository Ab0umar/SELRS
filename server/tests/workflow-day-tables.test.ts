import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { diseases, patients } from "../../drizzle/schema";
import {
  visitComplaints,
  visitDecisions,
  visitDiagnoses,
  visitDiagnosisCodes,
  visitMedicalHistory,
  visitSymptoms,
  visitTreatmentPlans,
} from "../../drizzle/clinical";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";
import { getTestDb } from "./setup";

// مسار اليوم: each tab saves with the exact call it makes, and the visit tables
// (which the patient file and the final sheet read) must hold what it saved.
const caller = () => appRouter.createCaller(makeCallerAs("doctor"));
const TABLES = [
  "medicalMigrationConflicts", "visitDiagnosisCodes", "visitSymptomCodes", "visitComplaints",
  "visitSymptoms", "visitDiagnoses", "visitTreatmentPlans", "visitDecisions", "visitMedicalHistory",
  "airPuffMeasurements", "examinationProcedurePlans", "fundusFindings", "examinationFindings",
  "sheet_entries", "prescriptionItems", "prescriptions", "testRequestItems", "testRequests",
  "followupItems", "followupSheets", "afterRefractionData", "glassesRecords", "autorefractometryData",
  "pentacamResults", "doctorReports", "postOpFollowups", "surgeries", "examinations", "visits",
  "patients", "diseases",
];
async function cleanup() {
  const conn = await getTestDb();
  for (const name of TABLES) await conn.execute(`DELETE FROM \`${name}\`` as any);
}
async function column(table: any, visitId: number, name: string) {
  const conn = await getTestDb();
  return (await conn.select().from(table).where(eq(table.visitId, visitId))).map((row: any) => row[name]);
}

describe.sequential("مسار اليوم: every tab saves into the visit tables", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("الفحص ثم التشخيص ثم الشيت النهائي لا يطمسون بعض", async () => {
    const conn = await getTestDb();
    await conn.insert(patients).values({ patientCode: "DAY-001", fullName: "Day Flow" });
    const [patient] = await conn.select().from(patients).where(eq(patients.patientCode, "DAY-001")).limit(1);
    const patientId = Number(patient.id);
    await conn.insert(diseases).values({ name: "Cataract", abbrev: "CAT" });
    const [disease] = await conn.select().from(diseases).limit(1);
    const api = caller().medical;

    // تاب القياسات: first save opens the visit.
    const opened: any = await api.saveMedicalVisit({
      patientId,
      visitDate: "2026-11-10",
      autoref: { od: { s: "-1.00", c: "-0.50", axis: "90", ucva: "6/12" }, os: { s: "-2.00", c: "", axis: "", ucva: "6/18" } },
      iop: { od: "14", os: "15" },
      after: { od: { s: "-0.25", c: "", axis: "" }, os: { s: "", c: "", axis: "" } },
    });
    const visitId = Number(opened.visitId);
    expect(visitId).toBeGreaterThan(0);

    // تاب الفحص: sheet content as WorkflowExamination builds it, plus the complaint call.
    await api.saveSheetEntry({
      patientId,
      visitId,
      sheetType: "consultant",
      content: JSON.stringify({
        visitId,
        consultantExam: { complains: "زغللة", muscleNormal: true },
        historyNotes: "سكر منذ 10 سنوات",
        symptoms: "تدميع",
        consultantDrawing: "",
        readingValue: "",
        examData: { autorefraction: { od: {}, os: {} } },
      }),
    });
    await api.updateVisitChiefComplaint({ visitId, chiefComplaint: "زغللة" });
    expect(await column(visitComplaints, visitId, "complaint")).toEqual(["زغللة"]);
    expect(await column(visitSymptoms, visitId, "symptoms")).toEqual(["تدميع"]);
    expect(await column(visitMedicalHistory, visitId, "history")).toEqual(["سكر منذ 10 سنوات"]);

    // تاب التشخيص: creates the report, then updates it. Neither may touch the history.
    await api.createDoctorReport({
      visitId,
      patientId,
      diagnosis: "مياه بيضاء",
      diseases: [disease.id],
      recommendations: "عملية فاكو",
    });
    const [report]: any[] = await api.getDoctorReportsByVisit({ visitId });
    await api.updateDoctorReport({
      reportId: report.id,
      diagnosis: "مياه بيضاء بالعين اليسرى",
      diseases: [disease.id],
      recommendations: "عملية فاكو",
    });
    expect(await column(visitMedicalHistory, visitId, "history")).toEqual(["سكر منذ 10 سنوات"]);
    expect(await column(visitDiagnoses, visitId, "diagnosis")).toEqual(["مياه بيضاء بالعين اليسرى"]);
    expect(await column(visitDecisions, visitId, "decision")).toEqual(["عملية فاكو"]);
    expect(await column(visitDiagnosisCodes, visitId, "diseaseId")).toEqual([disease.id]);

    // تاب البنتاكام.
    await api.updatePentacamResult({ visitId, patientId, k1OD: "43.1", k2OD: "44.0", axisOD: "90", thinnestPointOD: "540" });
    const pentacam: any[] = await api.getPentacamResultsByVisit({ visitId });
    expect(pentacam.map((row) => [row.k1OD, row.thinnestPointOD])).toEqual([["43.1", "540"]]);

    // الشيت النهائي: the final sheet and the patient file read these back by visit.
    await api.saveExaminationForm({
      patientId,
      visitId,
      visitDate: "2026-11-10",
      visitType: "examination",
      data: {
        chiefComplaint: "زغللة",
        symptoms: "تدميع",
        historyNotes: "سكر منذ 10 سنوات",
        diagnosis: "مياه بيضاء بالعين اليسرى",
        recommendations: "عملية فاكو",
        treatmentPlan: "قطرة",
        diseases: JSON.stringify([disease.id]),
        consultantExam: { complains: "زغللة" },
      },
    });
    const [visit]: any[] = (await api.getVisitsByPatient({ patientId })).filter((row: any) => row.id === visitId);
    expect({
      chiefComplaint: visit.chiefComplaint,
      symptoms: visit.symptoms,
      history: visit.history,
      diagnosis: visit.diagnosis,
      recommendations: visit.recommendations,
      treatment: visit.treatment,
      diseaseIds: visit.diseaseIds,
    }).toEqual({
      chiefComplaint: "زغللة",
      symptoms: "تدميع",
      history: "سكر منذ 10 سنوات",
      diagnosis: "مياه بيضاء بالعين اليسرى",
      recommendations: "عملية فاكو",
      treatment: "قطرة",
      diseaseIds: [disease.id],
    });
    expect(await column(visitTreatmentPlans, visitId, "treatment")).toEqual(["قطرة"]);
    const [finalReport]: any[] = await api.getDoctorReportsByVisit({ visitId });
    expect([finalReport.additionalNotes, finalReport.symptoms, finalReport.clinicalOpinion]).toEqual([
      "سكر منذ 10 سنوات",
      "تدميع",
      "زغللة",
    ]);
  });
  it("تاب التحاليل وتاب الروشتة: حفظ الاختيارات وحدها لا يمس الشكوى والتشخيص", async () => {
    const conn = await getTestDb();
    await conn.insert(patients).values({ patientCode: "DAY-002", fullName: "Day Picks" });
    const [patient] = await conn.select().from(patients).where(eq(patients.patientCode, "DAY-002")).limit(1);
    const patientId = Number(patient.id);
    const api = caller().medical;
    const opened: any = await api.saveExaminationForm({
      patientId, visitDate: "2026-11-10", visitType: "examination",
      data: { chiefComplaint: "ألم", diagnosis: "التهاب", historyNotes: "ضغط" },
    });
    const visitId = Number(opened.visitId);

    // Exactly the payloads of saveWorkflowSelection.
    await api.saveExaminationForm({
      patientId, visitId, visitDate: "2026-11-10", visitType: "examination",
      data: { tests: [{ testName: "CBC", catalogConfirmed: true, testType: "lab" }] },
    });
    await api.saveExaminationForm({
      patientId, visitId, visitDate: "2026-11-10", visitType: "examination",
      data: { treatment: [{ medicationName: "Vigamox", catalogConfirmed: true, dosage: "", frequency: "4 مرات", duration: "أسبوع", instructions: "" }] },
    });

    const requests: any[] = await api.getTestRequestsByVisit({ visitId });
    expect(requests.flatMap((item) => item.items ?? []).map((item) => item.testName)).toEqual(["CBC"]);
    const prescriptions: any[] = await api.getPrescriptionsWithItemsByVisit({ visitId });
    expect(prescriptions.flatMap((item) => item.items).map((item) => item.medicationName)).toEqual(["Vigamox"]);
    expect(await column(visitComplaints, visitId, "complaint")).toEqual(["ألم"]);
    expect(await column(visitDiagnoses, visitId, "diagnosis")).toEqual(["التهاب"]);
    expect(await column(visitMedicalHistory, visitId, "history")).toEqual(["ضغط"]);
  });
});
