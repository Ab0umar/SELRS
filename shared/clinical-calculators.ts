/**
 * Clinical calculation utilities for Ophthalmology & Refractive Surgery.
 * Implements Munnerlyn ablation depth, Residual Stromal Bed (RSB),
 * Percent Tissue Altered (PTA), and Pachymetry-adjusted Intraocular Pressure (IOP).
 */

export interface RefractiveCalcInput {
  cctUm: number; // Central Corneal Thickness in microns
  flapUm: number; // Flap thickness in microns (0 for surface PRK/PTK)
  sphereD: number; // Myopic correction in diopters (positive magnitude, e.g. 4.5 for -4.50 D)
  cylinderD?: number; // Astigmatic correction in diopters (optional)
  opticalZoneMm: number; // Optical ablation zone diameter in mm (typically 6.0 - 6.5 mm)
}

export interface RefractiveCalcResult {
  ablationDepthUm: number;
  residualBedUm: number;
  ptaPercent: number;
  riskLevel: "safe" | "caution" | "high_risk";
  statusTitle: string;
  recommendation: string;
}

/**
 * Standard Munnerlyn Formula for myopic laser corneal ablation depth:
 * Depth (µm) = (Diopters * OpticalZone^2) / 3
 * When cylinder is present, uses spherical equivalent: Sphere + (Cylinder / 2)
 */
export function calculateMunnerlynAblation(
  sphereD: number,
  opticalZoneMm: number,
  cylinderD: number = 0,
): number {
  const absSph = Math.abs(sphereD);
  const absCyl = Math.abs(cylinderD);
  const diopters = absSph + absCyl * 0.5;
  const depth = (Math.pow(opticalZoneMm, 2) * diopters) / 3;
  return Math.round(depth);
}

/**
 * Residual Stromal Bed (RSB) = CCT - Flap Thickness - Ablation Depth
 */
export function calculateResidualBed(
  cctUm: number,
  flapUm: number,
  ablationDepthUm: number,
): number {
  return Math.round(cctUm - flapUm - ablationDepthUm);
}

/**
 * Percent Tissue Altered (PTA) = ((Flap + Ablation) / CCT) * 100
 * Santhiago et al. criterion: PTA >= 40% is a major risk factor for post-LASIK ectasia.
 */
export function calculatePTA(
  cctUm: number,
  flapUm: number,
  ablationDepthUm: number,
): number {
  if (cctUm <= 0) return 0;
  const pta = ((flapUm + ablationDepthUm) / cctUm) * 100;
  return Number(pta.toFixed(1));
}

/**
 * Comprehensive Refractive Surgery Safety Evaluation
 */
export function evaluateRefractiveSafety(
  input: RefractiveCalcInput,
): RefractiveCalcResult {
  const ablationDepthUm = calculateMunnerlynAblation(
    input.sphereD,
    input.opticalZoneMm,
    input.cylinderD ?? 0,
  );
  const residualBedUm = calculateResidualBed(
    input.cctUm,
    input.flapUm,
    ablationDepthUm,
  );
  const ptaPercent = calculatePTA(input.cctUm, input.flapUm, ablationDepthUm);

  let riskLevel: "safe" | "caution" | "high_risk";
  let statusTitle: string;
  let recommendation: string;

  if (residualBedUm >= 300 && ptaPercent < 40) {
    riskLevel = "safe";
    statusTitle = "Within Optimal Safety Range";
    recommendation =
      "Candidate meets standard criteria for LASIK (RSB ≥ 300 µm and PTA < 40%).";
  } else if (residualBedUm >= 270 && ptaPercent < 43) {
    riskLevel = "caution";
    statusTitle = "Borderline Corneal Bed";
    recommendation =
      "Consider Surface Ablation (PRK / TransPRK) to spare 100 µm of flap bed, or reduce optical zone.";
  } else {
    riskLevel = "high_risk";
    statusTitle = "High Ectasia Risk Alert";
    recommendation =
      "Contraindicated for standard LASIK (RSB < 270 µm or PTA ≥ 43%). Evaluate Phakic ICL implantation.";
  }

  return {
    ablationDepthUm,
    residualBedUm,
    ptaPercent,
    riskLevel,
    statusTitle,
    recommendation,
  };
}

/**
 * Pachymetry-Adjusted Intraocular Pressure (IOP)
 * Standard Goldmann Applanation Tonometry reference CCT is 545 µm.
 * Dresdner formula: ΔIOP = ((CCT - 545) / 50) * 2.5 mmHg
 * Corrected IOP = Measured IOP - ΔIOP
 */
export function calculateCorrectedIop(
  measuredIopMmHg: number,
  cctUm: number,
): {
  measuredIop: number;
  cct: number;
  offsetMmHg: number;
  correctedIopMmHg: number;
  category: "normal" | "borderline" | "elevated";
} {
  const offset = ((cctUm - 545) / 50) * 2.5;
  const corrected = Number((measuredIopMmHg - offset).toFixed(1));

  let category: "normal" | "borderline" | "elevated";
  if (corrected <= 21) {
    category = "normal";
  } else if (corrected <= 24) {
    category = "borderline";
  } else {
    category = "elevated";
  }

  return {
    measuredIop: measuredIopMmHg,
    cct: cctUm,
    offsetMmHg: Number(offset.toFixed(1)),
    correctedIopMmHg: corrected,
    category,
  };
}
