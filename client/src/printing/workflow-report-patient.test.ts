import { describe, expect, it } from "vitest";
import { resolveWorkflowReportPatient } from "../lib/workflow-report-patient";

describe("workflow report patient information", () => {
  it("uses the recorded age when no birth date exists", () => {
    expect(
      resolveWorkflowReportPatient(
        { fullName: "Patient", age: 42, occupation: "Teacher" },
        null,
        "2026-11-03",
      ),
    ).toMatchObject({ age: "42", dateOfBirth: "", occupation: "Teacher" });
  });
  it("falls back to sheet demographics when patient fields are blank", () => {
    expect(
      resolveWorkflowReportPatient(
        { dateOfBirth: "", occupation: " " },
        { dob: "2000-11-04", age: 26, occupation: "Teacher" },
        "2026-11-03",
        "Queue name",
      ),
    ).toEqual({
      fullName: "Queue name",
      dateOfBirth: "2000-11-04",
      age: "25",
      occupation: "Teacher",
    });
  });
  it("prefers the patient profile and calculates age on the visit date", () => {
    expect(
      resolveWorkflowReportPatient(
        { dateOfBirth: "2000-11-03", occupation: "Doctor" },
        { age: 20, occupation: "Teacher" },
        "2026-11-03",
      ),
    ).toMatchObject({ age: "26", occupation: "Doctor" });
  });
  it("retains zero age and never invents a birth date from age", () => {
    expect(
      resolveWorkflowReportPatient({ age: 0 }, null, "2026-11-03"),
    ).toMatchObject({ age: "0", dateOfBirth: "", occupation: "" });
  });
});
