export const OP_TYPES = [
  "PRK",
  "Lasik",
  "FL",
  "FS",
  "IOL",
  "ICL",
  "Cataract",
  "Squint",
  "Others",
] as const;

export type OpType = (typeof OP_TYPES)[number];

export const OP_TYPE_LABELS_AR: Record<OpType, string> = {
  PRK: "تصحيح إبصار بالليزر (PRK)",
  Lasik: "تصحيح إبصار بالليزر (LASIK)",
  FL: "تصحيح إبصار بالليزر (Femto LASIK)",
  FS: "تصحيح إبصار بالليزر (Femto SMILE)",
  IOL: "زراعة عدسات (IOL)",
  ICL: "زراعة عدسات (ICL)",
  Cataract: "مياه بيضاء وزراعة عدسة (Cataract)",
  Squint: "عملية حول",
  Others: "عمليات أخرى",
};

export const OP_TYPE_OPTIONS = OP_TYPES.map((value) => ({
  value,
  label: OP_TYPE_LABELS_AR[value],
}));

// Fixed tabs (PRK/Lasik/FL/FS/IOL/ICL/Cataract/Squint/Others) don't match the
// raw free-text values already stored in patientOperations (e.g. the Lasik
// sheet's Arabic Op Type options: "ليزك", "فيمتو ليزك", "فيمتو سمايل") — this
// maps every known raw variant to the canonical tab it belongs under.
// "Others" is not matched by alias; it's whatever doesn't match anything else.
export const OP_TYPE_ALIASES: Record<Exclude<OpType, "Others">, string[]> = {
  PRK: ["prk"],
  Lasik: ["lasik", "ليزك"],
  FL: ["fl", "femto lasik", "فيمتو ليزك", "femto"],
  FS: ["fs", "femto smile", "فيمتو سمايل", "smile", "سمايل"],
  IOL: ["iol"],
  ICL: ["icl"],
  Cataract: ["cataract", "كتاراكت", "كاتاراكت"],
  Squint: ["squint", "حول"],
};

export function resolveCanonicalOpType(raw: string): OpType {
  const normalized = String(raw ?? "").trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(OP_TYPE_ALIASES)) {
    if (aliases.includes(normalized)) return canonical as OpType;
  }
  return "Others";
}

export function operationTypeLabelAr(raw: string): string {
  const canonical = resolveCanonicalOpType(raw);
  return canonical === "Others"
    ? String(raw ?? "").trim() || OP_TYPE_LABELS_AR.Others
    : OP_TYPE_LABELS_AR[canonical];
}

export function isLensOperationType(raw: string): boolean {
  const canonical = resolveCanonicalOpType(raw);
  return canonical === "Cataract" || canonical === "IOL" || canonical === "ICL";
}
