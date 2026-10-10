import { describe, expect, it } from "vitest";
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_TONE,
  attendanceStatusClass,
  getAttendanceStatusLabel,
} from "./features/attendance/attendanceStatus";

describe("attendance status UI tokens", () => {
  it("uses the info tone for leave everywhere", () => {
    expect(ATTENDANCE_STATUS_TONE.leave).toContain("text-info");
    expect(ATTENDANCE_STATUS_TONE.leave).toContain("bg-info/10");
    expect(attendanceStatusClass("leave")).toBe(ATTENDANCE_STATUS_TONE.leave);
  });

  it("labels known day statuses in Arabic", () => {
    expect(getAttendanceStatusLabel("present")).toBe("حاضر");
    expect(getAttendanceStatusLabel("missing_checkout")).toBe(
      "لم يسجل الخروج",
    );
    expect(getAttendanceStatusLabel("leave")).toBe(
      ATTENDANCE_STATUS_LABELS.leave,
    );
    expect(getAttendanceStatusLabel("custom_x")).toBe("custom_x");
  });

  it("falls back for unknown statuses", () => {
    expect(attendanceStatusClass("nope")).toContain("bg-muted");
  });
});
