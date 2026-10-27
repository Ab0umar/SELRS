import { describe, expect, it } from "vitest";
import { runWithMssqlYear } from "../integrations/mssqlYear";
import { clampToSessionYear } from "../lib/sessionYearRange";

describe("clampToSessionYear", () => {
  it("leaves automatic sessions and jobs untouched", () => {
    expect(clampToSessionYear("2020-01-01", undefined)).toEqual({
      dateFrom: "2020-01-01",
      dateTo: undefined,
    });
    runWithMssqlYear(null, () => {
      expect(clampToSessionYear()).toEqual({ dateFrom: undefined, dateTo: undefined });
    });
  });

  it("limits an older year session to that calendar year", () => {
    runWithMssqlYear(2025, () => {
      expect(clampToSessionYear()).toEqual({ dateFrom: "2025-01-01", dateTo: "2025-12-31" });
    });
  });

  it("keeps a narrower range inside the year and clips a wider one", () => {
    runWithMssqlYear(2025, () => {
      expect(clampToSessionYear("2025-03-01", "2025-03-31")).toEqual({
        dateFrom: "2025-03-01",
        dateTo: "2025-03-31",
      });
      expect(clampToSessionYear("2026-10-27", "2026-10-27")).toEqual({
        dateFrom: "2026-10-27",
        dateTo: "2025-12-31",
      });
      expect(clampToSessionYear("2024-01-01", "2030-01-01")).toEqual({
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
      });
    });
  });
});
