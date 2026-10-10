import { describe, expect, it } from "vitest";
import { leaveDaysInYear } from "../../server/services/attendance/leaveDates";

describe("leave-day balance year overlap", () => {
  it("counts only the days inside the requested year for a spanning leave", () => {
    expect(leaveDaysInYear("2025-12-30", "2026-01-03", 2026)).toBe(3);
    expect(leaveDaysInYear("2025-12-30", "2026-01-03", 2025)).toBe(2);
  });

  it("counts an in-year leave inclusively and ignores non-overlapping years", () => {
    expect(leaveDaysInYear("2026-02-10", "2026-02-12", 2026)).toBe(3);
    expect(leaveDaysInYear("2025-02-10", "2025-02-12", 2026)).toBe(0);
  });

  it("handles leap day without relying on server timezone", () => {
    expect(leaveDaysInYear("2024-02-28", "2024-03-01", 2024)).toBe(3);
  });
});
