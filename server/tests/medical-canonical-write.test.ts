import { describe, expect, it } from "vitest";
import { examinationFormInput } from "../services/examination-form-input";

const form = (data: Record<string, unknown>) =>
  examinationFormInput(
    {
      patientId: 5,
      visitId: 11,
      visitDate: "2026-03-15",
      visitType: "examination",
      data,
    },
    "doctor",
  );
describe("examination form normalization", () => {
  it("keeps explicitly confirmed uncatalogued medicines and investigations as named items", () => {
    const input = form({
      treatment: [
        {
          medicationName: "Uncatalogued drops",
          catalogConfirmed: true,
          frequency: "مرتين",
        },
      ],
      tests: [
        {
          testName: "Uncatalogued scan",
          testType: "examination",
          catalogConfirmed: true,
        },
      ],
    });
    expect(input.prescriptionItems).toEqual([
      {
        medicationName: "Uncatalogued drops",
        catalogConfirmed: true,
        frequency: "مرتين",
      },
    ]);
    expect(input.testItems).toEqual([
      {
        testName: "Uncatalogued scan",
        testType: "examination",
        catalogConfirmed: true,
      },
    ]);
  });
  it("rejects uncatalogued investigation names without explicit review", () => {
    expect(() => form({ tests: [{ testName: "Unreviewed scan" }] })).toThrow();
  });
  it("retains explicitly changed medication instructions without inventing omitted doses", () => {
    expect(
      form({
        treatment: [{ medicationId: 4, instructions: "New instructions" }],
      }).prescriptionItems,
    ).toEqual([
      { medicationId: 4, medicationName: "", instructions: "New instructions" },
    ]);
  });
  it("distinguishes a cleared diagnosis from an omitted treatment plan", () => {
    const content = JSON.parse(form({ diagnosis: "" }).content);
    expect(content.formData.diagnosis).toBe("");
    expect(content.treatmentPlan).toBeUndefined();
  });
  it("retains repeated readings and explicit clears from the full form", () => {
    const content = JSON.parse(
      form({
        "autoref-od": {
          s1: "-2",
          s2: "-3",
          a2: "90",
          airPuff1: "18",
          airPuff2: "19",
          afterS: "---",
        },
        medicalChecklist: { glaucomaTreatment: false },
      }).content,
    );
    expect(content.examData.autorefraction.od).toMatchObject({
      s: "-2",
      s2: "-3",
      a2: "90",
      iop: "18",
      airPuff2: "19",
      afterS: "",
    });
    expect(content.medicalChecklist).toEqual({ glaucomaTreatment: false });
  });
});
