import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attendanceDaily, attendancePunches } from "../../drizzle/schema";

describe("attendance timestamp storage from August 2026", () => {
  const previous = process.env.ATTENDANCE_TIME_FIX_ENABLED;
  beforeAll(() => {
    process.env.ATTENDANCE_TIME_FIX_ENABLED = "1";
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.ATTENDANCE_TIME_FIX_ENABLED;
    else process.env.ATTENDANCE_TIME_FIX_ENABLED = previous;
  });

  it("keeps the running database format until the migration is enabled", () => {
    const punch = new Date(2026, 7, 15, 19, 0, 0);
    delete process.env.ATTENDANCE_TIME_FIX_ENABLED;
    try {
      expect(attendancePunches.punchAt.mapToDriverValue(punch)).toBe(
        punch.toISOString().replace("T", " ").slice(0, 23),
      );
    } finally {
      process.env.ATTENDANCE_TIME_FIX_ENABLED = "1";
    }
  });

  it("stores a Cairo evening punch as the same database wall time", () => {
    const punch = new Date(2026, 7, 15, 19, 0, 0);
    expect(attendancePunches.punchAt.mapToDriverValue(punch)).toBe(
      "2026-08-15 19:00:00.000",
    );
    expect(
      attendancePunches.punchAt.mapFromDriverValue("2026-08-15 19:00:00"),
    ).toEqual(punch);
  });

  it("keeps the existing encoding for punches before August 2026", () => {
    const punch = new Date(2026, 6, 15, 19, 0, 0);
    const legacyValue = punch.toISOString().replace("T", " ").slice(0, 23);
    expect(attendancePunches.punchAt.mapToDriverValue(punch)).toBe(legacyValue);
    expect(attendancePunches.punchAt.mapFromDriverValue(legacyValue)).toEqual(
      punch,
    );
  });

  it("uses the same wall-time encoding for the daily first and last punches", () => {
    const first = new Date(2026, 8, 1, 10, 0, 0);
    const last = new Date(2026, 8, 1, 19, 0, 0);
    expect(attendanceDaily.firstIn.mapToDriverValue(first)).toBe(
      "2026-09-01 10:00:00.000",
    );
    expect(attendanceDaily.lastOut.mapToDriverValue(last)).toBe(
      "2026-09-01 19:00:00.000",
    );
  });
});
