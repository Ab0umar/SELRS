/**
 * Clinical calculation utilities for Ophthalmology & Refractive Surgery.
 * Implements Munnerlyn ablation depth, Residual Stromal Bed (RSB),
 * Percent Tissue Altered (PTA), and Pachymetry-adjusted Intraocular Pressure (IOP).
 */

export interface RefractiveCalcInput {
  procedure?: "PRK" | "LASIK" | "FS" | "FL";
  cctUm: number; // Central Corneal Thickness in microns
  flapUm: number; // Flap thickness in microns (0 for surface PRK/PTK)
  sphereD: number; // Myopic correction in diopters (positive magnitude, e.g. 4.5 for -4.50 D)
  cylinderD?: number; // Astigmatic correction in diopters (optional)
  opticalZoneMm: number; // Optical ablation zone diameter in mm (typically 6.0 - 6.5 mm)
  screening?: {
    ageYears?: number;
    refractionStable?: boolean;
    tomographyReviewedNormal?: boolean;
    ocularSurfaceControlled?: boolean;
    measurementsAvailable?: boolean;
  };
}

export interface RefractiveCalcResult {
  ablationDepthUm: number | null;
  residualBedUm: number | null;
  ptaPercent: number | null;
  riskLevel:
    "within_thresholds" | "insufficient_data" | "caution" | "high_risk";
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
  const procedure = input.procedure ?? "LASIK";
  const isSmile = procedure === "FS";
  const usesFlapOrCapModel =
    procedure === "LASIK" || procedure === "FL" || isSmile;
  const procedureLabel = isSmile ? "SMILE/KLEx" : "LASIK";
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
  const ptaPercent = usesFlapOrCapModel
    ? calculatePTA(input.cctUm, input.flapUm, ablationDepthUm)
    : null;

  const smileCaveat = isSmile
    ? " This is an approximate SMILE/KLEx estimate: lenticule thickness is modeled on the Munnerlyn equivalent and cap thickness is entered manually. It does not replace the exact lenticule/cap parameters computed by the surgical platform (e.g., VisuMax) and is editable/adjustable for platform-specific review."
    : "";

  let riskLevel: RefractiveCalcResult["riskLevel"];
  let statusTitle: string;
  let recommendation: string;

  const screeningComplete =
    input.screening?.ageYears !== undefined &&
    input.screening.refractionStable !== undefined &&
    input.screening.tomographyReviewedNormal !== undefined &&
    input.screening.ocularSurfaceControlled !== undefined &&
    input.screening.measurementsAvailable === true;

  if (procedure === "PRK") {
    if (
      input.cctUm < 480 ||
      (input.screening?.ageYears !== undefined &&
        input.screening.ageYears < 18) ||
      input.screening?.tomographyReviewedNormal === false
    ) {
      return {
        ablationDepthUm,
        residualBedUm,
        ptaPercent: null,
        riskLevel: "high_risk",
        statusTitle: "High-Risk or Exclusion Flag",
        recommendation:
          "A PRK planning requirement is not met. Review tomography, corneal thickness, and the complete clinical assessment; do not infer eligibility.",
      };
    }
    if (
      input.cctUm < 500 ||
      input.screening?.refractionStable === false ||
      input.screening?.ocularSurfaceControlled === false
    ) {
      return {
        ablationDepthUm,
        residualBedUm,
        ptaPercent: null,
        riskLevel: "caution",
        statusTitle: "Additional PRK Risk Review Required",
        recommendation:
          "PRK planning requires individualized review of tomography, epithelial profile when available, residual stromal thickness, ocular surface, and platform IFU.",
      };
    }
    return {
      ablationDepthUm,
      residualBedUm,
      ptaPercent: null,
      riskLevel: screeningComplete ? "within_thresholds" : "insufficient_data",
      statusTitle: screeningComplete
        ? "Within PRK Planning Thresholds"
        : "Incomplete Preoperative Screening",
      recommendation: screeningComplete
        ? "Calculated PRK values are within the available planning thresholds. This does not establish candidacy; final assessment is by the refractive surgeon."
        : "PRK calculation is available, but candidacy cannot be assessed until age, refractive stability, tomography, pachymetry, and ocular-surface review are confirmed.",
    };
  }

  if (
    residualBedUm < 250 ||
    (input.screening?.ageYears !== undefined &&
      input.screening.ageYears < 18) ||
    input.screening?.tomographyReviewedNormal === false
  ) {
    riskLevel = "high_risk";
    statusTitle = "High-Risk or Exclusion Flag";
    recommendation =
      residualBedUm < 250
        ? `Estimated RSB is below the ESCRS 250 µm absolute lower planning limit for ${procedureLabel}. This is a high-risk flag requiring refractive-surgeon review.`
        : "A required preoperative criterion is not met. Do not infer eligibility; complete refractive-surgeon assessment is required.";
  } else if (
    residualBedUm < 300 ||
    (ptaPercent !== null && ptaPercent >= 40) ||
    input.cctUm < 500 ||
    input.screening?.refractionStable === false ||
    input.screening?.ocularSurfaceControlled === false
  ) {
    riskLevel = "caution";
    statusTitle = "Additional Risk Review Required";
    recommendation =
      residualBedUm < 300
        ? "Estimated RSB is above the 250 µm absolute lower limit but below the ESCRS 300 µm optimal target. Review all risk factors and platform-specific planning."
        : ptaPercent !== null && ptaPercent >= 40
          ? `${procedureLabel} PTA is approximately 40% or higher, which is associated with increased ectasia risk. It is a risk flag, not a diagnosis; review tomography and all patient factors.`
          : input.cctUm < 480
            ? "Preoperative corneal thickness is under 480 µm. This is a hint, not an exclusion — RSB and PTA are the primary planning metrics; review full tomography and platform-specific planning before proceeding."
            : "One or more relative risk factors require individualized refractive-surgeon review.";
  } else if (!screeningComplete) {
    riskLevel = "insufficient_data";
    statusTitle = "Incomplete Preoperative Screening";
    recommendation =
      "RSB and PTA are within commonly used planning thresholds, but they do not establish candidacy. Confirm age, refractive stability, corneal topography/tomography, pachymetry, and ocular-surface health.";
  } else {
    riskLevel = "within_thresholds";
    statusTitle = "Within Planning Thresholds";
    recommendation =
      "Measured values are within commonly used planning thresholds. Final eligibility requires the refractive surgeon's complete assessment and the laser platform IFU.";
  }

  return {
    ablationDepthUm,
    residualBedUm,
    ptaPercent,
    riskLevel,
    statusTitle: isSmile ? `${statusTitle} (SMILE/KLEx Estimate)` : statusTitle,
    recommendation: `${recommendation}${smileCaveat}`,
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
