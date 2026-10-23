import { describe, expect, it } from "vitest";
import {
  PENTACAM_PATIENT_KEY_RE,
  isUnsafePentacamName,
  resolvePentacamObjectCandidates,
} from "../_core/pentacamKeys";

describe("pentacam patient-scoped keys", () => {
  it("serves exactly the requested key, with no basename fallback", () => {
    expect(resolvePentacamObjectCandidates("pentacam/patients/5/scan.jpg")).toEqual([
      "pentacam/patients/5/scan.jpg",
    ]);
    expect(resolvePentacamObjectCandidates("/pentacam/patients/5/scan.jpg")).toEqual([
      "pentacam/patients/5/scan.jpg",
    ]);
  });

  it("only matches a single file segment under a numeric patient id", () => {
    expect(PENTACAM_PATIENT_KEY_RE.test("pentacam/patients/5/a.jpg")).toBe(true);
    expect(PENTACAM_PATIENT_KEY_RE.test("pentacam/patients/5/sub/a.jpg")).toBe(false);
    expect(PENTACAM_PATIENT_KEY_RE.test("pentacam/patients/x/a.jpg")).toBe(false);
    expect(PENTACAM_PATIENT_KEY_RE.test("Pentacam/Patients/5/a.jpg")).toBe(false);
  });
});

describe("legacy pentacam names", () => {
  it("only tries the legacy prefixes and the bucket root", () => {
    expect(resolvePentacamObjectCandidates("scan.jpg").sort()).toEqual(
      ["Pentacam/scan.jpg", "pentacam-exports/scan.jpg", "pentacam/scan.jpg", "scan.jpg"].sort(),
    );
  });

  it("never requests the raw path outside the allowed prefixes", () => {
    for (const name of [
      "SELRS/1234/1234_scan.jpg",
      "diagnosis/5/17_report.png",
      "kf-exam/9/1_x.webp",
    ]) {
      const keys = resolvePentacamObjectCandidates(name);
      expect(keys).not.toContain(name);
      for (const key of keys) {
        expect(key.split("/").length).toBeLessThanOrEqual(2);
        expect(key).toMatch(/^(pentacam-exports\/|Pentacam\/|pentacam\/)?[^/]+$/);
      }
    }
  });

  it("does not let a patient-shaped but invalid name fall into another patient's file", () => {
    const keys = resolvePentacamObjectCandidates("pentacam/patients/5/sub/other.jpg");
    expect(keys).not.toContain("pentacam/patients/5/sub/other.jpg");
    expect(keys.every((key) => !key.startsWith("pentacam/patients/"))).toBe(true);
  });

  it("expands extensionless names and keeps only image keys", () => {
    const keys = resolvePentacamObjectCandidates("scan");
    expect(keys).toContain("pentacam/scan.png");
    expect(keys).toContain("scan.webp");
    expect(keys).not.toContain("scan");
    expect(keys.every((key) => /\.(jpe?g|png|webp)$/i.test(key))).toBe(true);
  });

  it("drops non-image names entirely", () => {
    expect(resolvePentacamObjectCandidates("report.pdf")).toEqual([]);
  });
});

describe("unsafe names", () => {
  it.each([
    "../secret.jpg",
    "pentacam/patients/5/../6/a.jpg",
    "a\\..\\b.jpg",
    "a\0.jpg",
  ])("flags %j", (name) => {
    expect(isUnsafePentacamName(name)).toBe(true);
  });

  it.each(["scan.jpg", "pentacam/patients/5/scan..final.jpg", "a..b/c.png"])(
    "allows %j",
    (name) => {
      expect(isUnsafePentacamName(name)).toBe(false);
    },
  );
});
