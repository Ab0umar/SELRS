import { describe, expect, it } from "vitest";
import {
  applyProcedureToEyePlan,
  buildClinicalPlanFromSheetEntry,
} from "./clinicalDecisionData";

describe("buildClinicalPlanFromSheetEntry", () => {
  it("loads OD and OS refraction and Pentacam values from the JSON returned by getSheetEntry", () => {
    const payload = JSON.stringify({
      examData: {
        autorefraction: {
          od: { s: "-4.50", c: "-1.25" },
          os: { s: "+2.00", c: "-0.75" },
        },
        pentacam: {
          od: { thinnest: "487", apex: "492" },
          os: { thinnest: "503", apex: "508" },
        },
      },
    });

    expect(buildClinicalPlanFromSheetEntry(payload)).toEqual({
      procedure: "PRK",
      eyes: {
        od: {
          cct: 487,
          flap: 0,
          sphere: 4.5,
          cylinder: 1.25,
          opticalZone: 6.5,
        },
        os: {
          cct: 503,
          flap: 0,
          sphere: 2,
          cylinder: 0.75,
          opticalZone: 6.5,
        },
      },
      sourceAvailability: {
        od: { cct: true, refraction: true },
        os: { cct: true, refraction: true },
      },
    });
  });

  it("uses Pentacam pachymetry when no thinnest-point value is available", () => {
    const payload = JSON.stringify({
      examData: {
        pentacam: {
          od: { pachymetry: "476" },
          os: { pachymetry: "489" },
        },
      },
    });

    const result = buildClinicalPlanFromSheetEntry(payload);

    expect(result.eyes.od.cct).toBe(476);
    expect(result.eyes.os.cct).toBe(489);
  });

  it("preserves a previously saved editable clinical plan", () => {
    const payload = JSON.stringify({
      clinicalDecision: {
        procedure: "LASIK",
        eyes: {
          od: { cct: 501, flap: 105, sphere: 3, cylinder: 1, opticalZone: 6 },
          os: {
            cct: 509,
            flap: 110,
            sphere: 2,
            cylinder: 0.5,
            opticalZone: 6.5,
          },
        },
      },
      examData: {
        pentacam: { od: { thinnest: "480" }, os: { thinnest: "490" } },
      },
    });

    const result = buildClinicalPlanFromSheetEntry(payload);

    expect(result.procedure).toBe("LASIK");
    expect(result.eyes.od.cct).toBe(501);
    expect(result.eyes.os.cct).toBe(509);
  });
});

describe("applyProcedureToEyePlan", () => {
  it("keeps patient Refraction and Pentacam measurements when procedure changes", () => {
    const current = {
      cct: 487,
      flap: 100,
      sphere: 4.5,
      cylinder: 1.25,
      opticalZone: 6.2,
    };

    expect(applyProcedureToEyePlan(current, "LASIK")).toEqual({
      cct: 487,
      flap: 110,
      sphere: 4.5,
      cylinder: 1.25,
      opticalZone: 6.5,
    });
  });
});
