import { expect, it } from "vitest";
import {
  appendPrescriptionTemplate,
  isAutoCatalogMedication,
  isExactCatalogMedication,
  matchCatalogMedications,
  normalizeTemplateName,
  readPrescriptionTemplates,
  type PrescriptionBinding,
  type PrescriptionTemplate,
} from "./prescription-template";
import { medicationArabicName } from "@shared/clinical-catalog-items";
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

// Rows as stored in the medications catalog (Egyptian Drug Database descriptions).
const catalog = [
  { id: 10, name: "VIGAMOX 0.5% EYE DROPS 5 ML", description: "فيجاموكس 0.5% إيي | Route: UNKNOWN | Source: Egyptian Drug Database (CC0)" },
  { id: 96, name: "SYSTANE ULTRA EYE DROPS 10 ML", description: "سيستاني أولترا إيي | Route: EYE | Source: Egyptian Drug Database (CC0)" },
  { id: 5, name: "AVAZIR 0.3% EYE OINT. 5 GM", description: "أفازير 0.3% إيي | Route: EYE" },
  { id: 100, name: "Tobramycin", description: "أفازير 0.3% إيي | Route: EYE" },
  { id: 84, name: "CATAFLAM 15MG/ML ORAL DROPS 15 ML", description: "كاتافلام 15مج/مل أورال | Route: ORAL" },
  { id: 93, name: "Lubricant Ointment", description: null },
];
it("reads the Arabic trade name from the catalog description", () => {
  expect(medicationArabicName(catalog[0].description)).toBe("فيجاموكس");
  expect(medicationArabicName(catalog[1].description)).toBe("سيستاني أولترا");
  expect(medicationArabicName(catalog[4].description)).toBe("كاتافلام");
  expect(medicationArabicName(null)).toBe("");
});
it("matches a medicine said or written in Arabic to the catalog", () => {
  expect(matchCatalogMedications(catalog, "فيجاموكس").map((item) => item.id)).toEqual([10]);
  expect(isExactCatalogMedication(catalog[0], "فيجاموكس")).toBe(true);
  // Spoken form without the database's long vowels: offered, never auto-added.
  expect(matchCatalogMedications(catalog, "سيستين").map((item) => item.id)).toEqual([96]);
  expect(isExactCatalogMedication(catalog[1], "سيستين")).toBe(false);
  // One Arabic name for several catalog rows stays a doctor's choice.
  expect(matchCatalogMedications(catalog, "أفازير").map((item) => item.id)).toEqual([5, 100]);
  expect(matchCatalogMedications(catalog, "Systane").map((item) => item.id)).toEqual([96]);
  expect(matchCatalogMedications(catalog, "بنادول")).toEqual([]);
  const terramycin = [{ id: 67, name: "TERRAMYCIN EYE OINT. 5 GM", description: "تيرراميسين إيي | Route: EYE" }];
  expect(matchCatalogMedications(terramycin, "تيرامايسين").map((item) => item.id)).toEqual([67]);
  // A sole English match is added on its own; a sound-alike Arabic match is not.
  expect(isAutoCatalogMedication(catalog[1], "Systane")).toBe(true);
  expect(isAutoCatalogMedication(catalog[1], "سيستين")).toBe(false);
  // The same medicine stored twice is one match, so it can be added on its own.
  const twice = [catalog[2], { ...catalog[2], id: 100 }];
  expect(matchCatalogMedications(twice, "AVAZIR 0.3% EYE OINT. 5 GM").map((item) => item.id)).toEqual([5]);
});
