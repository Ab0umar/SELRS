import { describe, expect, it } from "vitest";
import { getSinglePunchDayKeys } from "../../server/services/salary/singlePunchDays";

describe("payroll single-fingerprint days", () => {
  it("includes a day with one raw scan regardless of its device direction", () => {
    const days = getSinglePunchDayKeys([
      {
        empCd: "10",
        punchAt: new Date(2026, 7, 3, 8, 0),
        direction: "in",
      },
      {
        empCd: "11",
        punchAt: new Date(2026, 7, 3, 17, 0),
        direction: "out",
      },
    ]);

    expect(days).toEqual(new Set(["10|2026-08-03", "11|2026-08-03"]));
  });

  it("excludes a day when it has more than one raw scan", () => {
    const days = getSinglePunchDayKeys([
      { empCd: "10", punchAt: new Date(2026, 7, 3, 8, 0) },
      { empCd: "10", punchAt: new Date(2026, 7, 3, 17, 0) },
      { empCd: "10", punchAt: new Date(2026, 7, 4, 8, 0) },
    ]);

    expect(days).toEqual(new Set(["10|2026-08-04"]));
  });
});
