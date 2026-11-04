import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { patients } from "../../drizzle/schema";
import {
  visitComplaints,
  visitDecisions,
  visitDiagnoses,
  visitMedicalHistory,
  visitSymptoms,
  visitTreatmentPlans,
} from "../../drizzle/clinical";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";
import { getTestDb } from "./setup";
import { validateMedicalProposals } from "../../shared/medical-assistant";
import {
  confirmedInvestigationsFromRecords,
  confirmedMedicationsFromRecords,
  type ConfirmedInvestigation,
  type ConfirmedMedication,
} from "../../shared/clinical-catalog-items";
import { prepareDraftAdditions } from "../../client/src/components/medical-assistant/draft-binding";

// A real Gemini result for this fictional visit, captured from the live prompt.
const transcript =
  "اتفضل يا حاج خير مالك. والله يا دكتور عيني الشمال بقالها شهرين مزغللة ومش شايف بيها كويس خصوصا بالليل. " +
  "عندك سكر أو ضغط. عندي سكر من عشر سنين وباخد جلوكوفاج. فيه احمرار أو ألم. لأ مفيش ألم بس بتدمع شوية. " +
  "طيب بص قدامك. الضغط في العين طبيعي. عندك مياه بيضاء في العين الشمال. " +
  "هكتبلك قطرة Vigamox أربع مرات في اليوم لمدة أسبوع و Systane عند اللزوم. " +
  "وعايزك تعمل تحليل CBC وسكر صائم وتعمل OCT. " +
  "القرار إننا نعمل عملية فاكو للعين الشمال بعد أسبوعين وتيجي متابعة بعد التحاليل.";
const aiResult = validateMedicalProposals(
  {
    proposals: [
      { field: "complaints", speaker: "patient", text: "زغللة وضعف نظر في العين اليسرى منذ شهرين، خاصة في الليل", sources: ["عيني الشمال بقالها شهرين مزغللة ومش شايف بيها كويس خصوصا بالليل"] },
      { field: "symptoms", speaker: "patient", text: "تدميع بسيط في العين مع نفي وجود ألم", sources: ["لأ مفيش ألم بس بتدمع شوية"] },
      { field: "history", speaker: "patient", text: "مرض السكري منذ 10 سنوات ويتناول علاج جلوكوفاج", sources: ["عندي سكر من عشر سنين وباخد جلوكوفاج"] },
      { field: "diagnosis", speaker: "doctor", text: "مياه بيضاء في العين الشمال", sources: ["عندك مياه بيضاء في العين الشمال"] },
      {
        field: "treatment",
        speaker: "doctor",
        text: "Vigamox أربع مرات في اليوم لمدة أسبوع\nSystane عند اللزوم",
        sources: ["هكتبلك قطرة Vigamox أربع مرات في اليوم لمدة أسبوع و Systane عند اللزوم"],
        medications: [
          { name: "Vigamox", source: "Vigamox أربع مرات في اليوم لمدة أسبوع", dosage: "", frequency: "أربع مرات في اليوم", duration: "أسبوع", instructions: "" },
          { name: "Systane", source: "Systane عند اللزوم", dosage: "", frequency: "عند اللزوم", duration: "", instructions: "" },
        ],
      },
      { field: "imaging", speaker: "doctor", text: "OCT", sources: ["وتعمل OCT"] },
      { field: "labs", speaker: "doctor", text: "CBC\nسكر صائم", sources: ["تحليل CBC وسكر صائم"] },
      { field: "decision", speaker: "doctor", text: "إجراء عملية فاكو للعين الشمال بعد أسبوعين مع الحضور للمتابعة بعد التحاليل", sources: ["القرار إننا نعمل عملية فاكو للعين الشمال بعد أسبوعين وتيجي متابعة بعد التحاليل"] },
    ],
    warnings: [],
  },
  { kind: "conversation", mode: "conversation", transcript },
);
const proposal = (field: string) =>
  aiResult.proposals.find((item) => item.field === field)!;

// ProposalReview fills narrative fields; labs/imaging and medicines go through
// the catalog reviews, where the doctor confirms names that are not catalogued.
const narrative = aiResult.proposals.filter(
  (item) => !["labs", "imaging"].includes(item.field),
);
const confirmedMedicines: ConfirmedMedication[] = proposal("treatment").medications!.map(
  (item) => ({
    medicationName: item.name,
    catalogConfirmed: true,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
  }),
);
const confirmedTests: ConfirmedInvestigation[] = [
  ...proposal("labs").text.split("\n").map((testName) => ({ testName, catalogConfirmed: true as const, testType: "lab" as const })),
  ...proposal("imaging").text.split("\n").map((testName) => ({ testName, catalogConfirmed: true as const, testType: "imaging" as const })),
];
const expected = {
  complaints: proposal("complaints").text,
  symptoms: proposal("symptoms").text,
  history: proposal("history").text,
  diagnosis: proposal("diagnosis").text,
  treatmentPlan: proposal("treatment").text,
  decision: proposal("decision").text,
};

const caller = () => appRouter.createCaller(makeCallerAs("doctor"));
const TABLES = [
  "medicalMigrationConflicts", "visitDiagnosisCodes", "visitSymptomCodes", "visitComplaints",
  "visitSymptoms", "visitDiagnoses", "visitTreatmentPlans", "visitDecisions", "visitMedicalHistory",
  "airPuffMeasurements", "examinationProcedurePlans", "fundusFindings", "examinationFindings",
  "sheet_entries", "prescriptionItems", "prescriptions", "testRequestItems", "testRequests",
  "followupItems", "followupSheets", "afterRefractionData", "glassesRecords", "autorefractometryData",
  "pentacamResults", "doctorReports", "postOpFollowups", "surgeries", "examinations", "visits", "patients",
];
async function cleanup() {
  const conn = await getTestDb();
  for (const name of TABLES) await conn.execute(`DELETE FROM \`${name}\`` as any);
}
async function seedPatient() {
  const conn = await getTestDb();
  await conn.insert(patients).values({ patientCode: "MAE2E-001", fullName: "Assistant E2E" });
  const [row] = await conn.select().from(patients).where(eq(patients.patientCode, "MAE2E-001")).limit(1);
  return Number(row.id);
}
async function savedItems(patientId: number, visitId: number) {
  const doctor = caller();
  // The same visit-level reads both screens use when reopening a visit.
  const prescriptions = await doctor.medical.getPrescriptionsWithItemsByVisit({ visitId });
  const requests = await doctor.medical.getTestRequestsByVisit({ visitId });
  return {
    medicines: confirmedMedicationsFromRecords(
      prescriptions.flatMap((item: { items: any[] }) => item.items),
    ),
    tests: confirmedInvestigationsFromRecords(requests.flatMap((item: { items?: any[] }) => item.items ?? [])),
  };
}
// The storage tables themselves, one row per visit section.
async function expectStoredSections(visitId: number) {
  const conn = await getTestDb();
  const read = async (table: any, column: string) =>
    (await conn.select().from(table).where(eq(table.visitId, visitId))).map((row: any) => row[column]);
  expect({
    visitComplaints: await read(visitComplaints, "complaint"),
    visitSymptoms: await read(visitSymptoms, "symptoms"),
    visitMedicalHistory: await read(visitMedicalHistory, "history"),
    visitDiagnoses: await read(visitDiagnoses, "diagnosis"),
    visitTreatmentPlans: await read(visitTreatmentPlans, "treatment"),
    visitDecisions: await read(visitDecisions, "decision"),
  }).toEqual({
    visitComplaints: [expected.complaints],
    visitSymptoms: [expected.symptoms],
    visitMedicalHistory: [expected.history],
    visitDiagnoses: [expected.diagnosis],
    visitTreatmentPlans: [expected.treatmentPlan],
    visitDecisions: [expected.decision],
  });
}
function expectItems(items: Awaited<ReturnType<typeof savedItems>>) {
  expect(items.medicines).toEqual(
    confirmedMedicines.map((item) => expect.objectContaining({ medicationName: item.medicationName, frequency: item.frequency, duration: item.duration })),
  );
  expect(items.tests.map((item) => [item.testName, item.testType])).toEqual(
    confirmedTests.map((item) => [item.testName, item.testType]),
  );
}

describe.sequential("medical assistant end to end: AI result -> fields -> save -> reload", () => {
  beforeEach(cleanup);
  afterEach(cleanup);

  it("الملف الطبي (MedicalFilePanel): every proposal lands in its field, saves and reloads unchanged", async () => {
    const patientId = await seedPatient();
    // Field state and binding exactly as MedicalFilePanel passes them to AssistantFieldsProvider.
    const formData: Record<string, string> = { historyNotes: "", treatmentPlan: "", symptoms: "", medicalHistory: "", diagnosis: "", recommendations: "" };
    const receipt = prepareDraftAdditions(
      {
        values: { history: formData.historyNotes, treatment: formData.treatmentPlan, symptoms: formData.symptoms, complaints: formData.medicalHistory, diagnosis: formData.diagnosis, decision: formData.recommendations, tests: "" },
        destinations: { history: "history", treatment: "treatment", complaints: "complaints", symptoms: "symptoms", diagnosis: "diagnosis", decision: "decision", labs: "tests", imaging: "tests" },
        change: () => {},
      },
      narrative,
    );
    const v = receipt.after;
    Object.assign(formData, {
      ...("history" in v ? { historyNotes: v.history } : {}),
      ...("treatment" in v ? { treatmentPlan: v.treatment } : {}),
      ...("complaints" in v ? { medicalHistory: v.complaints } : {}),
      ...("symptoms" in v ? { symptoms: v.symptoms } : {}),
      ...("diagnosis" in v ? { diagnosis: v.diagnosis } : {}),
      ...("decision" in v ? { recommendations: v.decision } : {}),
    });
    expect(receipt.skipped).toEqual([]);
    expect(formData).toEqual({
      historyNotes: expected.history, treatmentPlan: expected.treatmentPlan, symptoms: expected.symptoms,
      medicalHistory: expected.complaints, diagnosis: expected.diagnosis, recommendations: expected.decision,
    });

    // Save payload exactly as saveVisitDraft builds the clinical part.
    const saved = await caller().medical.saveExaminationForm({
      patientId, visitDate: "2026-11-04", visitType: "examination",
      data: {
        chiefComplaint: formData.medicalHistory, symptoms: formData.symptoms, historyNotes: formData.historyNotes,
        treatmentPlan: formData.treatmentPlan, diagnosis: formData.diagnosis, recommendations: formData.recommendations,
        treatment: confirmedMedicines, tests: confirmedTests,
      },
    });
    const visitId = Number(saved.visitId);

    // Reload exactly as MedicalFilePanel reads a saved visit.
    const [report] = await caller().medical.getDoctorReportsByVisit({ visitId });
    expect({
      historyNotes: report?.additionalNotes ?? "",
      treatmentPlan: report?.treatment ?? "",
      medicalHistory: report?.clinicalOpinion ?? "",
      symptoms: report?.symptoms ?? "",
      diagnosis: report?.diagnosis ?? "",
      recommendations: report?.recommendations ?? "",
    }).toEqual(formData);
    await expectStoredSections(visitId);
    expectItems(await savedItems(patientId, visitId));
  });

  it("مسار اليوم (WorkflowPrototypeLive): every proposal lands in its field, saves and reloads unchanged", async () => {
    const patientId = await seedPatient();
    // Reception opens the visit before the doctor reviews it.
    const opened = await caller().medical.saveExaminationForm({ patientId, visitDate: "2026-11-04", visitType: "examination", data: { readingValue: "" } });
    const visitId = Number(opened.visitId);
    const state = { treatmentPlan: "", complains: "", symptoms: "", medicalHistory: "", diagnosis: "", finalDecision: "" };
    const receipt = prepareDraftAdditions(
      {
        values: { treatment: state.treatmentPlan, symptoms: state.symptoms, complaints: state.complains, history: state.medicalHistory, diagnosis: state.diagnosis, decision: state.finalDecision, investigations: "" },
        destinations: { treatment: "treatment", complaints: "complaints", symptoms: "symptoms", history: "history", diagnosis: "diagnosis", decision: "decision", labs: "investigations", imaging: "investigations" },
        change: () => {},
      },
      narrative,
    );
    const v = receipt.after;
    Object.assign(state, {
      ...("treatment" in v ? { treatmentPlan: v.treatment } : {}),
      ...("history" in v ? { medicalHistory: v.history } : {}),
      ...("complaints" in v ? { complains: v.complaints } : {}),
      ...("symptoms" in v ? { symptoms: v.symptoms } : {}),
      ...("diagnosis" in v ? { diagnosis: v.diagnosis } : {}),
      ...("decision" in v ? { finalDecision: v.decision } : {}),
    });
    expect(receipt.skipped).toEqual([]);
    expect(state).toEqual({
      treatmentPlan: expected.treatmentPlan, complains: expected.complaints, symptoms: expected.symptoms,
      medicalHistory: expected.history, diagnosis: expected.diagnosis, finalDecision: expected.decision,
    });

    // Save payload exactly as saveFinalReportEdits builds the clinical part.
    await caller().medical.saveExaminationForm({
      patientId, visitId, visitDate: "2026-11-04", visitType: "examination",
      data: {
        chiefComplaint: state.complains, symptoms: state.symptoms, historyNotes: state.medicalHistory,
        diagnosis: state.diagnosis, recommendations: state.finalDecision, treatmentPlan: state.treatmentPlan,
        consultantExam: { complains: state.complains },
        tests: confirmedTests, treatment: confirmedMedicines,
      },
    });

    // Reload exactly as WorkflowPrototypeLive reads a saved visit: sheet first, then the doctor report.
    const sheetJson = await caller().medical.getSheetEntry({ patientId, visitId, sheetType: "consultant" });
    const sheet = JSON.parse(String(sheetJson ?? "{}"));
    const [report] = await caller().medical.getDoctorReportsByVisit({ visitId });
    expect({
      treatmentPlan: String(report?.treatment ?? ""),
      complains: String(report?.clinicalOpinion ?? ""),
      symptoms: String(report?.symptoms ?? ""),
      medicalHistory: String(sheet?.historyNotes ?? ""),
      diagnosis: String(report?.diagnosis ?? sheet?.formData?.diagnosis ?? ""),
      finalDecision: String(report?.recommendations ?? sheet?.formData?.recommendations ?? ""),
    }).toEqual(state);
    await expectStoredSections(visitId);
    expectItems(await savedItems(patientId, visitId));
  });
});
