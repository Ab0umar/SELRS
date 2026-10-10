import { describe, expect, it } from "vitest";
import {
  emptyTestReferenceRange,
  getTestReferenceRanges,
  legacyReferenceFields,
  testReferenceRangesSchema,
} from "../../../shared/test-reference-ranges";
import { findMedicalReference, parseReferenceRange } from "./medical-reference";

describe("named test reference ranges", () => {
  it.each(["رجال 0.74–1.35؛ سيدات 0.59–1.04", "15 - 10", "لعمر ≥20: 0.3–4.2"])(
    "preserves conditional or invalid legacy references as text: %s",
    (normalRange) => {
      expect(getTestReferenceRanges({ normalRange })[0]?.text).toBe(
        normalRange,
      );
      expect(parseReferenceRange(normalRange)).toBeNull();
    },
  );
  it("loads legacy signed bounds and their units without losing values", () => {
    expect(
      getTestReferenceRanges({ normalRange: "-4 - +4", unit: "D" }),
    ).toEqual([{ name: "", min: "-4", max: "+4", text: "", unit: "D" }]);
  });
  it("selects an explicitly named measurement, not the whole multi-measurement scan", () => {
    const referenceRanges = [
      {
        ...emptyTestReferenceRange(),
        name: "K1",
        min: "40",
        max: "47",
        unit: "D",
      },
      {
        ...emptyTestReferenceRange(),
        name: "CCT",
        min: "500",
        max: "600",
        unit: "µm",
      },
    ];
    const rows = [{ name: "Pentacam", referenceRanges }];
    expect(findMedicalReference(rows, ["Pentacam"])).toBeNull();
    expect(findMedicalReference(rows, ["CCT"])).toEqual({
      name: "CCT",
      min: 500,
      max: 600,
      unit: "µm",
    });
    expect(legacyReferenceFields(referenceRanges)).toEqual({
      normalRange: "",
      unit: "",
    });
  });
  it("does not interpret disabled or malformed structured ranges using stale legacy bounds", () => {
    const row = { name: "IOP", normalRange: "10 - 20", unit: "mmHg" };
    expect(
      findMedicalReference([{ ...row, noNormalRange: true }], ["IOP"]),
    ).toBeNull();
    expect(
      findMedicalReference(
        [{ ...row, referenceRanges: "invalid json" }],
        ["IOP"],
      ),
    ).toBeNull();
    expect(
      legacyReferenceFields(
        getTestReferenceRanges({ ...row, noNormalRange: true }),
      ),
    ).toEqual({
      normalRange: "",
      unit: "",
    });
  });
  it.each([
    { min: "30", max: "10" },
    { min: "10 mg/dL", max: "20" },
    { min: "10", text: "Negative" },
    { name: "رجال" },
  ])("rejects a misleading or incomplete range: %j", (fields) => {
    expect(
      testReferenceRangesSchema.safeParse([
        { ...emptyTestReferenceRange(), ...fields },
      ]).success,
    ).toBe(false);
  });
  it("round trips independently named and unit-specific ranges", () => {
    const ranges = [
      {
        ...emptyTestReferenceRange(),
        name: "PT",
        min: "9.4",
        max: "12.5",
        unit: "s",
      },
      { ...emptyTestReferenceRange(), name: "INR", min: "0.9", max: "1.1" },
    ];
    expect(
      getTestReferenceRanges({ referenceRanges: JSON.stringify(ranges) }),
    ).toEqual(ranges);
  });
});
