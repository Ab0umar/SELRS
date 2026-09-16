export type ClinicalEye = "od" | "os";
export type ClinicalProcedure = "PRK" | "LASIK" | "FS" | "FL" | "IOL" | "ICL";

export type ClinicalEyePlan = {
  cct: number;
  flap: number;
  sphere: number;
  cylinder: number;
  opticalZone: number;
};

export type ClinicalPlan = Record<ClinicalEye, ClinicalEyePlan>;

export const procedureDefaults: Record<ClinicalProcedure, ClinicalEyePlan> = {
  PRK: { cct: 500, flap: 0, sphere: 0, cylinder: 0, opticalZone: 6.5 },
  LASIK: { cct: 520, flap: 110, sphere: 0, cylinder: 0, opticalZone: 6.5 },
  FS: { cct: 520, flap: 100, sphere: 0, cylinder: 0, opticalZone: 6.5 },
  FL: { cct: 520, flap: 100, sphere: 0, cylinder: 0, opticalZone: 6.5 },
  IOL: { cct: 545, flap: 0, sphere: 0, cylinder: 0, opticalZone: 6.5 },
  ICL: { cct: 545, flap: 0, sphere: 0, cylinder: 0, opticalZone: 6.5 },
};

export const createInitialClinicalPlan = (): ClinicalPlan => ({
  od: { ...procedureDefaults.FS },
  os: { ...procedureDefaults.FS },
});

export function applyProcedureToEyePlan(
  current: ClinicalEyePlan,
  procedure: ClinicalProcedure,
): ClinicalEyePlan {
  return {
    ...procedureDefaults[procedure],
    cct: current.cct,
    sphere: current.sphere,
    cylinder: current.cylinder,
  };
}

function parseSheetEntry(entry: unknown): Record<string, any> {
  if (typeof entry !== "string") {
    return entry && typeof entry === "object"
      ? (entry as Record<string, any>)
      : {};
  }
  try {
    const parsed = JSON.parse(entry);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function numericValue(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildClinicalPlanFromSheetEntry(entry: unknown): {
  procedure: ClinicalProcedure;
  eyes: ClinicalPlan;
} {
  const data = parseSheetEntry(entry);
  const saved = data.clinicalDecision;
  const procedure = (saved?.procedure ?? "FS") as ClinicalProcedure;
  const defaults = procedureDefaults[procedure] ?? procedureDefaults.FS;

  if (saved?.eyes?.od && saved?.eyes?.os) {
    return {
      procedure,
      eyes: {
        od: { ...defaults, ...saved.eyes.od },
        os: { ...defaults, ...saved.eyes.os },
      },
    };
  }

  const exam = data.examData;
  const seedEye = (eye: ClinicalEye): ClinicalEyePlan => {
    const autorefraction = exam?.autorefraction?.[eye] ?? {};
    const pentacam = exam?.pentacam?.[eye] ?? {};
    return {
      ...procedureDefaults.FS,
      cct: numericValue(
        pentacam.thinnest ?? pentacam.pachymetry ?? pentacam.apex,
        procedureDefaults.FS.cct,
      ),
      sphere: Math.abs(numericValue(autorefraction.s, 0)),
      cylinder: Math.abs(numericValue(autorefraction.c, 0)),
    };
  };

  return {
    procedure: "FS",
    eyes: { od: seedEye("od"), os: seedEye("os") },
  };
}
