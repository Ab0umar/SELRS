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

export const OP_TYPE_OPTIONS = OP_TYPES.map((v) => ({ value: v, label: v }));

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
