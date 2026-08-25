import { describe, expect, it } from "vitest";
import { aggregateAttendanceDays } from "../../server/services/attendance/dailyAggregation";

describe("aggregateAttendanceDays", () => {
  it("counts two attended shifts as one attended day and sums their minutes", () => {
    const days = aggregateAttendanceDays([
      {
        empCd: "001",
        workDate: "2026-08-25",
        status: "present",
        lateMinutes: 5,
        overtimeMinutes: 10,
      },
      {
        empCd: "001",
        workDate: "2026-08-25",
        status: "present",
        lateMinutes: 0,
        overtimeMinutes: 20,
      },
    ]);

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({
      status: "present",
      shiftCount: 2,
      absentShiftCount: 0,
      lateMinutes: 5,
      overtimeMinutes: 30,
    });
  });

  it("keeps a missed shift visible without turning a partially attended day into absence", () => {
    const [day] = aggregateAttendanceDays([
      { empCd: "001", workDate: "2026-08-25", status: "present" },
      { empCd: "001", workDate: "2026-08-25", status: "absent" },
    ]);

    expect(day.status).toBe("present");
    expect(day.absentShiftCount).toBe(1);
  });
});
