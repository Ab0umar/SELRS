import { describe, expect, it } from "vitest";
import { getAttendanceDepartmentValues } from "../../server/services/attendance/departmentFilter";

describe("attendance report department aliases", () => {
  it("maps the English center filter to Arabic and legacy center values", () => {
    expect(getAttendanceDepartmentValues("center")).toEqual(
      expect.arrayContaining(["مركز", "center", "المركز والعيادة"]),
    );
  });

  it("maps the English clinic filter to Arabic and legacy clinic values", () => {
    expect(getAttendanceDepartmentValues("clinic")).toEqual(
      expect.arrayContaining(["عيادة", "clinic", "المركز والعيادة"]),
    );
  });
});
