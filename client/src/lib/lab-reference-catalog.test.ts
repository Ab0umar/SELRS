import { describe, expect, it } from "vitest";
import {
  LAB_REFERENCE_CATALOG,
  planLabReferenceUpdate,
} from "../../../shared/lab-reference-catalog";
const row = {
  id: 198,
  name: "HbA1c",
  type: "lab",
  normalRange: "",
  unit: "",
  description: "ملاحظة محفوظة",
};
describe("lab reference catalog planning", () => {
  it("corrects the known prediabetes-as-normal mistake and preserves notes", () => {
    const update = planLabReferenceUpdate({
      ...row,
      normalRange: "5.7% - 6.4%",
    });
    expect(update?.normalRange).toBe("4.0 - 5.6");
    expect(update?.description).toContain("ملاحظة محفوظة");
    expect(update?.description).toContain("المصادر:");
  });
  it("does not overwrite custom ranges or incompatible units", () => {
    expect(planLabReferenceUpdate({ ...row, normalRange: "4 - 6" })).toBeNull();
    expect(planLabReferenceUpdate({ ...row, unit: "mmol/mol" })).toBeNull();
  });
  it("does not touch other types or misclassified eye procedures", () => {
    expect(planLabReferenceUpdate({ ...row, type: "imaging" })).toBeNull();
    expect(
      planLabReferenceUpdate({ ...row, name: "Occular Sonar" }),
    ).toBeNull();
  });
  it("gives panels textual references rather than one fabricated numeric interval", () => {
    expect(
      planLabReferenceUpdate({ ...row, name: "CBC" })?.normalRange,
    ).not.toMatch(/\d/);
    expect(
      planLabReferenceUpdate({ ...row, name: "Lipid Profile" })?.unit,
    ).toBe("");
  });
  it("is idempotent and has valid sourced field lengths", () => {
    const first = planLabReferenceUpdate(row)!;
    expect(planLabReferenceUpdate({ ...row, ...first })).toBeNull();
    for (const entry of LAB_REFERENCE_CATALOG) {
      expect(entry.normalRange.length).toBeLessThanOrEqual(255);
      expect(entry.unit.length).toBeLessThanOrEqual(64);
      expect(entry.sources.length).toBeGreaterThan(0);
    }
  });
});
