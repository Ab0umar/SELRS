import { describe, expect, it } from "vitest";
import {
  calculateMunnerlynAblation,
  calculateResidualBed,
  calculatePTA,
  evaluateRefractiveSafety,
  calculateCorrectedIop,
} from "../shared/clinical-calculators";

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

  it("correctly flags safe refractive candidates", () => {
    const result = evaluateRefractiveSafety({
      cctUm: 550,
      flapUm: 100,
      sphereD: 3.5,
      opticalZoneMm: 6.0,
    });
    expect(result.riskLevel).toBe("safe");
    expect(result.residualBedUm).toBeGreaterThanOrEqual(300);
    expect(result.ptaPercent).toBeLessThan(40);
  });

  it("correctly flags borderline candidates with caution", () => {
    // High myopia on thin cornea
    const result = evaluateRefractiveSafety({
      cctUm: 490,
      flapUm: 110,
      sphereD: 7.0,
      opticalZoneMm: 6.0,
    });
    // Ablation = 7.0 * 36 / 3 = 84 µm
    // RSB = 490 - 110 - 84 = 296 µm (between 270 and 300)
    expect(result.riskLevel).toBe("caution");
  });

  it("correctly flags high risk candidates when RSB < 270 or PTA >= 43", () => {
    const result = evaluateRefractiveSafety({
      cctUm: 470,
      flapUm: 120,
      sphereD: 8.5,
      opticalZoneMm: 6.5,
    });
    expect(result.riskLevel).toBe("high_risk");
    expect(result.recommendation).toContain("Phakic ICL");
  });

  it("adjusts IOP accurately using corneal pachymetry Dresdner formula", () => {
    // Normal CCT (545 µm) -> 0 offset
    const norm = calculateCorrectedIop(18, 545);
    expect(norm.offsetMmHg).toBe(0);
    expect(norm.correctedIopMmHg).toBe(18);
    expect(norm.category).toBe("normal");

    // Thick cornea (595 µm) -> offset +2.5 mmHg -> corrected = 22 - 2.5 = 19.5 mmHg
    const thick = calculateCorrectedIop(22, 595);
    expect(thick.offsetMmHg).toBe(2.5);
    expect(thick.correctedIopMmHg).toBe(19.5);
    expect(thick.category).toBe("normal");

    // Thin cornea (495 µm) -> offset -2.5 mmHg -> corrected = 21 - (-2.5) = 23.5 mmHg
    const thin = calculateCorrectedIop(21, 495);
    expect(thin.offsetMmHg).toBe(-2.5);
    expect(thin.correctedIopMmHg).toBe(23.5);
    expect(thin.category).toBe("borderline");
  });
});
