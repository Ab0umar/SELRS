import { describe, expect, it } from "vitest";
import { patientWorkflowState } from "../services/patient-workflow-state";

describe("clinical workflow cache boundaries", () => {
  it.each([
    "examination",
    "prescription",
    "request-tests",
    "medical-file",
    " Prescription ",
  ])(
    "keeps UI preferences but never restores clinical fields for %s",
    (page) => {
      expect(
        patientWorkflowState(page, {
          activeTab: "history",
          diagnosis: "Old diagnosis",
          medicalChecklist: { glaucomaTreatment: true },
          prescriptionItems: [{ medicationId: 4 }],
          selectedTests: [8],
          unsavedDraft: { complaint: "Old complaint" },
          doctorName: "Old doctor",
        }),
      ).toEqual({ activeTab: "history" });
    },
  );
  it("does not rewrite patient-details draft handling", () => {
    const data = { unsavedDraft: { phone: "Synthetic" }, activeTab: "details" };
    expect(patientWorkflowState("patient-details", data)).toEqual(data);
  });
});
