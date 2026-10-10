import { describe, expect, it } from "vitest";
import { CATALOG_REFERENCE_SEED } from "../../../shared/catalog-reference-seed";
import { testReferenceRangesSchema } from "../../../shared/test-reference-ranges";
import { findMedicalReference } from "./medical-reference";

describe("whole catalog reference data", () => {
  it("covers the audited four-tab catalog without duplicate keys or invalid ranges", () => {
    expect(
      Object.fromEntries(
        ["lab", "imaging", "examination", "other"].map((type) => [
          type,
          CATALOG_REFERENCE_SEED.filter((entry) => entry.type === type).length,
        ]),
      ),
    ).toEqual({ lab: 19, imaging: 12, examination: 39, other: 5 });
    expect(
      new Set(
        CATALOG_REFERENCE_SEED.map((entry) => `${entry.type}:${entry.name}`),
      ).size,
    ).toBe(75);
    for (const entry of CATALOG_REFERENCE_SEED) {
      expect(
        testReferenceRangesSchema.safeParse(entry.ranges).success,
        entry.name,
      ).toBe(true);
      expect(
        entry.noNormalRange
          ? entry.ranges.length === 0
          : entry.ranges.length > 0,
        entry.name,
      ).toBe(true);
      if (entry.type !== "other")
        expect(entry.sources.length, entry.name).toBeGreaterThan(0);
    }
  });
  it.each([
    "Autorefraction",
    "Refraction",
    "Intraocular Lens Calculation",
    "Power PF IOL",
    "عـرض باطنـه",
    "عـرض قلب",
    "عرض اسنان",
    "عرض انف و اذن و حنجره",
  ])("does not fabricate a normal outcome or interval for %s", (name) => {
    const entry = CATALOG_REFERENCE_SEED.find((seed) => seed.name === name)!;
    expect(entry.noNormalRange).toBe(true);
    expect(entry.ranges).toEqual([]);
  });
  it("does not apply adult sex-specific renal references or conditional OCT benchmarks as generic patient bounds", () => {
    const rows = CATALOG_REFERENCE_SEED.map((entry) => ({
      name: entry.name,
      referenceRanges: entry.ranges,
      noNormalRange: entry.noNormalRange,
    }));
    for (const name of [
      "Creatinine",
      "ESR",
      "TSH",
      "OCT RNFL",
      "Pentacam",
      "IOP",
    ]) {
      expect(findMedicalReference(rows, [name]), name).toBeNull();
    }
  });
  it("keeps strict lab thresholds and lipid risk targets textual, not inclusive normal bounds", () => {
    for (const name of [
      "CRP",
      "RF",
      "Fasting Blood Sugar (FBS)",
      "Lipid Profile",
    ]) {
      const entry = CATALOG_REFERENCE_SEED.find((seed) => seed.name === name)!;
      expect(
        entry.ranges.every((range) => range.text && !range.min && !range.max),
        name,
      ).toBe(true);
    }
  });
});
