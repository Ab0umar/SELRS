import { describe, expect, it } from "vitest";
import {
  clinicalValue,
  selectClinicalVisit,
} from "../../../shared/clinical-record";
describe("clinical record identity and clearing", () => {
  const rows = [
    { id: 1, patientId: 3, visitDate: "2026-03-15" },
    { id: 2, patientId: 3, visitDate: "2026-03-15" },
  ];
  it("selects the requested visit, including a second visit on the same day", () => {
    expect(selectClinicalVisit(rows, 3, 2)?.id).toBe(2);
    expect(() => selectClinicalVisit(rows, 3, undefined, "2026-03-15")).toThrow(
      "Multiple visits",
    );
    expect(() => selectClinicalVisit(rows, 4, 1)).toThrow("does not belong");
  });
  it("does not resurrect a cleared canonical value from a sheet snapshot", () => {
    expect(clinicalValue({ diagnosis: "" }, "diagnosis", "old")).toBe("");
    expect(clinicalValue({ diagnosis: null }, "diagnosis", "old")).toBe("");
    expect(clinicalValue(undefined, "diagnosis", "old")).toBe("old");
  });
});
