import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { diseases, patients } from "../../drizzle/schema";
import { afterRefractionData, autorefractometryData, examinations } from "../../drizzle/schema";
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

  it("التمريض بصلاحيات الطبيب: يحفظ الشكوى والأعراض والتاريخ والتشخيص والعلاج والقرار", async () => {
    const conn = await getTestDb();
    await conn.insert(patients).values({ patientCode: "DAY-003", fullName: "Day Nurse" });
    const [patient] = await conn.select().from(patients).where(eq(patients.patientCode, "DAY-003")).limit(1);
    const patientId = Number(patient.id);
    const nurse = appRouter.createCaller(makeCallerAs("nurse")).medical;
    const opened: any = await nurse.saveMedicalVisit({ patientId, visitDate: "2026-11-10", iop: { od: "14", os: "15" } });
    const visitId = Number(opened.visitId);
    await nurse.saveSheetEntry({
      patientId, visitId, sheetType: "consultant",
      content: JSON.stringify({
        visitId,
        consultantExam: { complains: "ألم" },
        symptoms: "احمرار",
        historyNotes: "سكر",
        diagnosisText: "التهاب",
        treatmentPlan: "قطرة",
        finalDecisionText: "متابعة",
      }),
    });
    expect(await column(visitComplaints, visitId, "complaint")).toEqual(["ألم"]);
    expect(await column(visitSymptoms, visitId, "symptoms")).toEqual(["احمرار"]);
    expect(await column(visitMedicalHistory, visitId, "history")).toEqual(["سكر"]);
    expect(await column(visitDiagnoses, visitId, "diagnosis")).toEqual(["التهاب"]);
    expect(await column(visitTreatmentPlans, visitId, "treatment")).toEqual(["قطرة"]);
    expect(await column(visitDecisions, visitId, "decision")).toEqual(["متابعة"]);
  });

  it("التمريض (القياسات): الحفظ الأول وتعديل الزيارة يصلان لجداول القياسات", async () => {
    const conn = await getTestDb();
    await conn.insert(patients).values({ patientCode: "DAY-004", fullName: "Day Measures" });
    const [patient] = await conn.select().from(patients).where(eq(patients.patientCode, "DAY-004")).limit(1);
    const patientId = Number(patient.id);
    const nurse = appRouter.createCaller(makeCallerAs("nurse")).medical;
    const opened: any = await nurse.saveMedicalVisit({
      patientId,
      visitDate: "2026-11-10",
      autoref: { od: { s: "-1.00", c: "-0.50", axis: "90", ucva: "6/12" }, os: { s: "-2.00", c: "", axis: "", ucva: "6/18" } },
      iop: { od: "14", os: "15" },
      after: { od: { s: "-0.25", c: "", axis: "" }, os: { s: "", c: "", axis: "" } },
    });
    const visitId = Number(opened.visitId);
    const [exam] = await conn.select().from(examinations).where(eq(examinations.visitId, visitId));
    const read = async () => ({
      auto: (await nurse.getAutorefractometryByPatient({ patientId })).find((row: any) => row.examinationId === exam.id),
      after: (await nurse.getAfterRefractionByPatient({ patientId })).find((row: any) => row.examinationId === exam.id),
    });
    let saved: any = await read();
    expect([saved.auto.sphereOD, saved.auto.cylinderOD, saved.auto.axisOD, saved.auto.ucvaOD, saved.auto.iopOD]).toEqual(["-1.00", "-0.50", "90", "6/12", "14"]);
    expect([saved.auto.sphereOS, saved.auto.ucvaOS, saved.auto.iopOS]).toEqual(["-2.00", "6/18", "15"]);
    expect(saved.after.sphereOD).toBe("-0.25");

    // Editing the same visit, exactly as the tab saves it the second time.
    await nurse.updateExamination({
      examinationId: exam.id,
      updates: { sphereOD: "-3.00", cylinderOD: null, axisOD: null, ucvaOD: "6/9", iopOD: "17", sphereOS: "-2.00", iopOS: "15" },
    });
    await nurse.saveAfterRefractionData({ examinationId: exam.id, patientId, od: { s: "-0.75", c: "", axis: "" }, os: { s: "", c: "", axis: "" } });
    saved = await read();
    expect([saved.auto.sphereOD, saved.auto.cylinderOD, saved.auto.ucvaOD, saved.auto.iopOD]).toEqual(["-3.00", null, "6/9", "17"]);
    expect(saved.after.sphereOD).toBe("-0.75");
    // One row per examination: an edit updates it instead of leaving a stale copy.
    expect((await conn.select().from(autorefractometryData).where(eq(autorefractometryData.examinationId, exam.id))).length).toBe(1);
    expect((await conn.select().from(afterRefractionData).where(eq(afterRefractionData.examinationId, exam.id))).length).toBe(1);

    // The final sheet saves the same measurements again; the tables take the new values.
    await nurse.saveExaminationForm({
      patientId, visitId, visitDate: "2026-11-10", visitType: "examination",
      data: {
        autorefraction: {
          od: { s: "-4.00", c: "-1.00", axis: "10", ucva: "6/6", bcva: "6/6", iop: "18", afterS: "-0.50", afterC: "", afterA: "" },
          os: { s: "-2.00", c: "", axis: "", ucva: "6/18", bcva: "6/9", iop: "15", afterS: "", afterC: "", afterA: "" },
        },
        glasses: { od: { s: "-3.50", c: "", axis: "", bcva: "6/6" }, os: { s: "-2.00", c: "", axis: "", bcva: "6/9" } },
      },
    });
    saved = await read();
    expect([saved.auto.sphereOD, saved.auto.cylinderOD, saved.auto.axisOD, saved.auto.bcvaOD, saved.auto.iopOD]).toEqual(["-4.00", "-1.00", "10", "6/6", "18"]);
    expect(saved.after.sphereOD).toBe("-0.50");
    const glasses: any[] = await nurse.getGlassesRecordsByPatient({ patientId });
    expect(glasses.find((row) => row.examinationId === exam.id)?.sOD).toBe("-3.50");
  });

  it("الفني والاستقبال لا يكتبون التشخيص", async () => {
    const conn = await getTestDb();
    await conn.insert(patients).values({ patientCode: "DAY-005", fullName: "Day Tech" });
    const [patient] = await conn.select().from(patients).where(eq(patients.patientCode, "DAY-005")).limit(1);
    const patientId = Number(patient.id);
    const opened: any = await caller().medical.saveMedicalVisit({ patientId, visitDate: "2026-11-10", iop: { od: "14", os: "15" } });
    const visitId = Number(opened.visitId);
    for (const role of ["technician", "reception"]) {
      await appRouter.createCaller(makeCallerAs(role)).medical.saveSheetEntry({
        patientId, visitId, sheetType: "consultant",
        content: JSON.stringify({ visitId, diagnosisText: "لا يكتبه " + role }),
      });
    }
    expect(await column(visitDiagnoses, visitId, "diagnosis")).toEqual([]);
  });
});
