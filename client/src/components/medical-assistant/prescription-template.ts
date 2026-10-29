import type { ConfirmedMedication } from "@shared/clinical-catalog-items";
export type MedicationInstructions = {
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};
export type PrescriptionDraft = {
  ids: Array<string | number>;
  details: Record<string, MedicationInstructions>;
  manualItems?: ConfirmedMedication[];
};
export type PrescriptionTemplate = {
  id: string;
  name: string;
  items: Array<MedicationInstructions & { medicationName: string }>;
};
export type PrescriptionBinding = {
  templates: PrescriptionTemplate[];
  medications: Array<{ id: string | number; name: string }>;
  draft: PrescriptionDraft;
  disabled: boolean;
  change: (draft: PrescriptionDraft) => void;
};
export function normalizeTemplateName(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670ـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function readPrescriptionTemplates(
  raw: unknown,
): PrescriptionTemplate[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw).flatMap(([id, value]) => {
    if (!value || typeof value !== "object") return [];
    const template = value as Record<string, unknown>;
    if (
      typeof template.name !== "string" ||
      !Array.isArray(template.prescriptionItems)
    )
      return [];
    const items: PrescriptionTemplate["items"] = [];
    for (const rawItem of template.prescriptionItems) {
      if (!rawItem || typeof rawItem !== "object") return [];
      const item = rawItem as Record<string, unknown>;
      if (
        typeof item.medicationName !== "string" ||
        !item.medicationName.trim()
      )
        return [];
      const details = {
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      };
      for (const key of Object.keys(details) as Array<
        keyof MedicationInstructions
      >) {
        if (item[key] != null && typeof item[key] !== "string") return [];
        details[key] = (item[key] as string | undefined) ?? "";
      }
      items.push({ medicationName: item.medicationName, ...details });
    }
    return items.length ? [{ id, name: template.name, items }] : [];
  });
}
export function appendPrescriptionTemplate(
  binding: PrescriptionBinding,
  template: PrescriptionTemplate,
): PrescriptionDraft {
  if (binding.disabled) throw new Error("The prescription is not editable.");
  const next: PrescriptionDraft = {
    ...binding.draft,
    ids: [...binding.draft.ids],
    details: { ...binding.draft.details },
  };
  const seen = new Map<string, MedicationInstructions>();
  for (const item of template.items) {
    const matches = binding.medications.filter(
      (medication) =>
        medication.name.trim().toLowerCase() ===
        item.medicationName.trim().toLowerCase(),
    );
    if (matches.length !== 1)
      throw new Error(
        `Missing or ambiguous catalog medicine: ${item.medicationName}. Nothing was added.`,
      );
    const id = matches[0].id;
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0)
      throw new Error(
        "This medicine cannot be saved through the current prescription path.",
      );
    const { medicationName: _, ...details } = item;
    const previous = seen.get(String(id));
    if (previous && JSON.stringify(previous) !== JSON.stringify(details))
      throw new Error(
        `Conflicting instructions for ${item.medicationName} in the template. Nothing was added.`,
      );
    seen.set(String(id), details);
    if (next.ids.some((existing) => String(existing) === String(id))) continue;
    next.ids.push(Number(id));
    next.details[String(id)] = details;
  }
  return next;
}
