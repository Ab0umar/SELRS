import { expect, it } from "vitest";
import {
  appendPrescriptionTemplate,
  normalizeTemplateName,
  readPrescriptionTemplates,
  type PrescriptionBinding,
  type PrescriptionTemplate,
} from "./prescription-template";
const details = {
  dosage: "one drop",
  frequency: "twice daily",
  duration: "one week",
  instructions: "right eye",
};
const template: PrescriptionTemplate = {
  id: "t1",
  name: "قالب المتابعة",
  items: [
    { medicationName: "Medicine A", ...details },
    { medicationName: "Medicine B", ...details },
  ],
};
function binding(): PrescriptionBinding {
  return {
    templates: [template],
    medications: [
      { id: 1, name: "Medicine A" },
      { id: 2, name: "Medicine B" },
    ],
    draft: {
      ids: [1],
      details: { "1": { ...details, dosage: "existing dose" } },
    },
    disabled: false,
    change: () => {},
  };
}
it("adds only new medicines and preserves existing instructions", () => {
  const source = binding();
  const result = appendPrescriptionTemplate(source, template);
  expect(result.ids).toEqual([1, 2]);
  expect(result.details["1"].dosage).toBe("existing dose");
  expect(result.details["2"]).toEqual(details);
  expect(source.draft.ids).toEqual([1]);
});
it("rejects missing catalog medicines without mutating the draft", () => {
  const source = binding();
  source.medications.pop();
  expect(() => appendPrescriptionTemplate(source, template)).toThrow(
    "Missing or ambiguous",
  );
  expect(source.draft.ids).toEqual([1]);
});
it("rejects ambiguous catalog names", () => {
  const source = binding();
  source.medications.push({ id: 3, name: "Medicine B" });
  expect(() => appendPrescriptionTemplate(source, template)).toThrow(
    "Missing or ambiguous",
  );
});
it("rejects conflicting repeated medicine instructions", () => {
  const conflicting = {
    ...template,
    items: [...template.items, { ...template.items[1], dosage: "different" }],
  };
  expect(() => appendPrescriptionTemplate(binding(), conflicting)).toThrow(
    "Conflicting instructions",
  );
});
it("rejects locked prescriptions and unsavable reference IDs", () => {
  const source = binding();
  source.disabled = true;
  expect(() => appendPrescriptionTemplate(source, template)).toThrow(
    "not editable",
  );
  source.disabled = false;
  source.medications[1].id = "reference-2";
  expect(() => appendPrescriptionTemplate(source, template)).toThrow(
    "cannot be saved",
  );
});
it("accepts only structurally valid saved templates without inventing doses", () => {
  const parsed = readPrescriptionTemplates({
    t: { name: "Example", prescriptionItems: [{ medicationName: "A" }] },
    bad: {
      name: "Bad",
      prescriptionItems: [{ medicationName: "B", dosage: 5 }],
    },
  });
  expect(parsed).toEqual([
    {
      id: "t",
      name: "Example",
      items: [
        {
          medicationName: "A",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
        },
      ],
    },
  ]);
});
it("normalizes Arabic template names without changing medication content", () => {
  expect(normalizeTemplateName("إِجراءات ـ المتابعة")).toBe("اجراءات المتابعة");
});
