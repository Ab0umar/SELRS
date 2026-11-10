import {
  medicationArabicName,
  type ConfirmedMedication,
} from "@shared/clinical-catalog-items";
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
  medications: Array<{
    id: string | number;
    name: string;
    description?: string | null;
  }>;
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

type CatalogMedication = PrescriptionBinding["medications"][number];
const arabicKey = (value: string) =>
  normalizeTemplateName(value).replace(/ى/g, "ي").replace(/ة/g, "ه");
// Spoken Egyptian names drop the database's long vowels ("سيستين" for "سيستاني")
// and its doubled letters ("تيرامايسين" for "تيرراميسين").
const arabicSkeleton = (value: string) =>
  arabicKey(value)
    .split(" ")
    .map((word) => word.replace(/[اويءئؤ]/g, "").replace(/(.)\1+/g, "$1"))
    .filter(Boolean)
    .join(" ");
const containsWords = (text: string, words: string) =>
  ` ${text} `.includes(` ${words} `);

/** True when a name is exactly this catalog medicine, by its English or Arabic name. */
export function isExactCatalogMedication(item: CatalogMedication, name: string) {
  const query = normalizeTemplateName(name);
  if (query && normalizeTemplateName(item.name) === query) return true;
  const arabic = arabicKey(medicationArabicName(item.description));
  return Boolean(arabic) && arabic === arabicKey(name);
}

/**
 * True when a sole catalog match may be added without the doctor choosing: an
 * exact name, or an English name contained word for word ("Systane" in
 * "SYSTANE ULTRA EYE DROPS 10 ML"). Sound-alike Arabic matches stay a choice.
 */
export function isAutoCatalogMedication(item: CatalogMedication, name: string) {
  if (isExactCatalogMedication(item, name)) return true;
  const query = normalizeTemplateName(name);
  return query.length >= 3 && containsWords(normalizeTemplateName(item.name), query);
}

/**
 * Catalog medicines for a spoken or written name. Exact matches (English or
 * Arabic) come first; otherwise whole-word English matches, then Arabic
 * matches that ignore long vowels. Only exact matches are safe to add without
 * the doctor choosing.
 */
export function matchCatalogMedications(allRows: CatalogMedication[], name: string) {
  const query = normalizeTemplateName(name);
  if (!query) return [];
  // The catalog holds some medicines twice under the same name; they are one choice.
  const seen = new Set<string>();
  const catalog = allRows.filter((item) => {
    const key = normalizeTemplateName(item.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const exact = catalog.filter((item) => isExactCatalogMedication(item, name));
  if (exact.length) return exact;
  const english = catalog.filter(
    (item) => query.length >= 3 && containsWords(normalizeTemplateName(item.name), query),
  );
  if (english.length) return english;
  const spoken = arabicSkeleton(name);
  if (spoken.replace(/ /g, "").length < 3) return [];
  return catalog.filter((item) => {
    const arabic = arabicSkeleton(medicationArabicName(item.description));
    return (
      arabic.replace(/ /g, "").length >= 3 &&
      (containsWords(arabic, spoken) || containsWords(spoken, arabic))
    );
  });
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
  if (binding.disabled) throw new Error("الروشتة غير قابلة للتعديل.");
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
        `الدواء غير موجود في القائمة أو مكرر: ${item.medicationName}. لم تتم إضافة أي شيء.`,
      );
    const id = matches[0].id;
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0)
      throw new Error(
        "لا يمكن حفظ هذا الدواء من خلال الروشتة الحالية.",
      );
    const { medicationName: _, ...details } = item;
    const previous = seen.get(String(id));
    if (previous && JSON.stringify(previous) !== JSON.stringify(details))
      throw new Error(
        `تعليمات متعارضة للدواء ${item.medicationName} داخل القالب. لم تتم إضافة أي شيء.`,
      );
    seen.set(String(id), details);
    if (next.ids.some((existing) => String(existing) === String(id))) continue;
    next.ids.push(Number(id));
    next.details[String(id)] = details;
  }
  return next;
}
