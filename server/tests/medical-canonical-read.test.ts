import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import { makeCallerAs } from "./helpers/auth";

vi.mock("../db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../db")>()),
  getVisitsByPatient: vi.fn(async () => [
    {
      id: 10,
      patientId: 5,
      chiefComplaint: "",
      visitDate: new Date("2026-03-15T12:00:00"),
    },
  ]),
  getSheetEntry: vi.fn(async () =>
    JSON.stringify({
      visitId: 10,
      diagnosisText: "Old diagnosis",
      finalDecisionText: "Old decision",
      formData: { diagnosis: "Old diagnosis", treatmentPlan: "Old treatment" },
      consultantExam: { complains: "Old complaint" },
      examData: {
        autorefraction: { od: { s: "Old sphere", iop: "Old IOP" } },
        glasses: { od: { s: "Old glasses" } },
      },
    }),
  ),
  getAutorefractometryByPatient: vi.fn(async () => [
    { id: 1, examinationId: 20, patientId: 5, sphereOD: null, iopOD: "" },
  ]),
  getGlassesRecordsByPatient: vi.fn(async () => [
    { id: 2, examinationId: 20, patientId: 5, sOD: null },
  ]),
  getAfterRefractionByPatient: vi.fn(async () => []),
  getPentacamResultsByVisit: vi.fn(async () => []),
  getDoctorReportsByPatient: vi.fn(async () => [
    {
      id: 3,
      patientId: 5,
      visitId: 10,
      diagnosis: "",
      recommendations: "",
      treatment: null,
    },
  ]),
  getMedicalHistoryByPatient: vi.fn(async () => []),
  getSurgeriesByPatient: vi.fn(async () => [
    {
      id: 9,
      patientId: 5,
      surgeryType: "Another operation",
      surgeryDate: new Date("2026-01-01"),
    },
  ]),
  getExaminationsByVisit: vi.fn(async () => [
    { id: 20, visitId: 10, patientId: 5 },
  ]),
}));

describe("clinical sheet query projection", () => {
  it("uses canonical clears across all sheet aliases instead of resurrecting JSON values", async () => {
    const caller = appRouter.createCaller(makeCallerAs("admin"));
    const sheet = JSON.parse(
      (await caller.medical.getSheetEntry({
        patientId: 5,
        visitId: 10,
        sheetType: "consultant",
      }))!,
    );
    expect(sheet.diagnosisText).toBe("");
    expect(sheet.formData.diagnosis).toBe("");
    expect(sheet.formData.treatmentPlan).toBe("");
    expect(sheet.finalDecisionText).toBe("");
    expect(sheet.consultantExam.complains).toBe("");
    expect(sheet.examData.autorefraction.od.s).toBe("");
    expect(sheet.examData.autorefraction.od.iop).toBe("");
    expect(sheet.examData.glasses.od.s).toBe("");
    expect(sheet.operationDetails.type).toBe("");
  });
});
