import { describe, expect, it } from "vitest";
import {
  calculateMunnerlynAblation,
  calculateResidualBed,
  calculatePTA,
  evaluateRefractiveSafety,
  calculateCorrectedIop,
} from "../../shared/clinical-calculators";

describe("Clinical Calculators - Refractive & IOP", () => {
  it("calculates Munnerlyn ablation depth accurately for spherical myopia", () => {
    // Sphere = 4.5 D, OZ = 6.5 mm
    // Ablation = (4.5 * 6.5^2) / 3 = (4.5 * 42.25) / 3 = 190.125 / 3 = 63.375 -> rounded to 63 µm
    const depth = calculateMunnerlynAblation(4.5, 6.5);
    expect(depth).toBe(63);
  });

  it("calculates Munnerlyn ablation depth with astigmatism spherical equivalent", () => {
    // Sphere = 4.0 D, Cyl = 1.0 D (effective 4.5 D), OZ = 6.0 mm
    // (4.5 * 36) / 3 = 162 / 3 = 54 µm
    const depth = calculateMunnerlynAblation(4.0, 6.0, 1.0);
    expect(depth).toBe(54);
  });

  it("calculates residual stromal bed correctly", () => {
    // CCT = 540, Flap = 100, Ablation = 60 -> RSB = 380
    const rsb = calculateResidualBed(540, 100, 60);
    expect(rsb).toBe(380);
  });

  it("calculates percent tissue altered (PTA)", () => {
    // Flap = 100, Ablation = 60, CCT = 540 -> PTA = 160 / 540 * 100 = 29.6%
    const pta = calculatePTA(540, 100, 60);
    expect(pta).toBe(29.6);
  });

  it("does not declare candidacy from RSB and PTA without complete screening", () => {
    const result = evaluateRefractiveSafety({
      procedure: "LASIK",
      cctUm: 550,
      flapUm: 100,
      sphereD: 3.5,
      opticalZoneMm: 6.0,
    });
    expect(result.riskLevel).toBe("insufficient_data");
    expect(result.residualBedUm).toBeGreaterThanOrEqual(300);
    expect(result.ptaPercent).toBeLessThan(40);
    expect(result.recommendation).not.toContain("Candidate");
  });

  it("reports within planning thresholds only after screening and source measurements are complete", () => {
    const result = evaluateRefractiveSafety({
      procedure: "LASIK",
      cctUm: 550,
      flapUm: 100,
      sphereD: 3.5,
      opticalZoneMm: 6,
      screening: {
        ageYears: 30,
        refractionStable: true,
        tomographyReviewedNormal: true,
        ocularSurfaceControlled: true,
        measurementsAvailable: true,
      },
    });

    expect(result.riskLevel).toBe("within_thresholds");
    expect(result.recommendation).not.toMatch(/candidate|candidacy/i);
  });

  it("does not clear an incomplete-data status when source measurements are missing", () => {
    const result = evaluateRefractiveSafety({
      procedure: "LASIK",
      cctUm: 550,
      flapUm: 100,
      sphereD: 3.5,
      opticalZoneMm: 6,
      screening: {
        ageYears: 30,
        refractionStable: true,
        tomographyReviewedNormal: true,
        ocularSurfaceControlled: true,
        measurementsAvailable: false,
      },
    });

    expect(result.riskLevel).toBe("insufficient_data");
  });

  it("flags LASIK corneal thickness below 480 µm as a caution hint, not an exclusion", () => {
    const result = evaluateRefractiveSafety({
      procedure: "LASIK",
      cctUm: 470,
      flapUm: 90,
      sphereD: 1,
      opticalZoneMm: 6,
      screening: {
        ageYears: 30,
        refractionStable: true,
        tomographyReviewedNormal: true,
        ocularSurfaceControlled: true,
      },
    });

    expect(result.riskLevel).toBe("caution");
    expect(result.recommendation).toContain("480 µm");
  });

  it("correctly flags borderline candidates with caution", () => {
    const result = evaluateRefractiveSafety({
      cctUm: 490,
      flapUm: 110,
      sphereD: 7.0,
      opticalZoneMm: 6.0,
    });
    expect(result.riskLevel).toBe("caution");
  });

  it("flags high risk without automatically prescribing an alternative procedure", () => {
    const result = evaluateRefractiveSafety({
      cctUm: 470,
      flapUm: 120,
      sphereD: 8.5,
      opticalZoneMm: 6.5,
    });
    expect(result.riskLevel).toBe("high_risk");
    expect(result.recommendation).not.toContain("Phakic ICL");
  });

  it("treats a LASIK residual stromal bed from 250 to 299 µm as below optimal, not an automatic contraindication", () => {
    const result = evaluateRefractiveSafety({
      procedure: "LASIK",
      cctUm: 500,
      flapUm: 120,
      sphereD: 10,
      opticalZoneMm: 6,
      screening: {
        ageYears: 30,
        refractionStable: true,
        tomographyReviewedNormal: true,
        ocularSurfaceControlled: true,
      },
    });

    expect(result.residualBedUm).toBe(260);
    expect(result.riskLevel).toBe("caution");
    expect(result.recommendation).toContain("300 µm optimal target");
  });

  it("does not apply the LASIK PTA rule to PRK", () => {
    const result = evaluateRefractiveSafety({
      procedure: "PRK",
      cctUm: 510,
      flapUm: 0,
      sphereD: 4,
      opticalZoneMm: 6.5,
      screening: {
        ageYears: 30,
        refractionStable: true,
        tomographyReviewedNormal: true,
        ocularSurfaceControlled: true,
      },
    });

    expect(result.ptaPercent).toBeNull();
    expect(result.recommendation).toContain("PRK");
  });

  it("computes an approximate SMILE/KLEx lenticule estimate for FS with an editable-estimate caveat", () => {
    const result = evaluateRefractiveSafety({
      procedure: "FS",
      cctUm: 530,
      flapUm: 100,
      sphereD: 4,
      opticalZoneMm: 6.5,
      screening: {
        ageYears: 30,
        refractionStable: true,
        tomographyReviewedNormal: true,
        ocularSurfaceControlled: true,
      },
    });

    expect(result.ablationDepthUm).not.toBeNull();
    expect(result.residualBedUm).not.toBeNull();
    expect(result.ptaPercent).not.toBeNull();
    expect(result.recommendation).toContain("SMILE/KLEx");
    expect(result.recommendation).toContain("VisuMax");
  });

  it("adjusts IOP accurately using corneal pachymetry Dresdner formula", () => {
    const norm = calculateCorrectedIop(18, 545);
    expect(norm.offsetMmHg).toBe(0);
    expect(norm.correctedIopMmHg).toBe(18);
    expect(norm.category).toBe("normal");

    const thick = calculateCorrectedIop(22, 595);
    expect(thick.offsetMmHg).toBe(2.5);
    expect(thick.correctedIopMmHg).toBe(19.5);
    expect(thick.category).toBe("normal");

    const thin = calculateCorrectedIop(21, 495);
    expect(thin.offsetMmHg).toBe(-2.5);
    expect(thin.correctedIopMmHg).toBe(23.5);
    expect(thin.category).toBe("borderline");
  });
});
