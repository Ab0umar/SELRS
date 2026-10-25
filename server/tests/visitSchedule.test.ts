import { describe, expect, it } from "vitest";
import { cairoDateIso, visitScheduleSchema } from "../../shared/visitSchedule";

const request = {
  fullName: "Test Patient",
  patientType: "existing",
  patientId: 7,
  service: "followup",
  visitDate: "2026-10-25",
};
describe("visit scheduling validation", () => {
  it("uses the Cairo calendar date after local midnight", () => {
    expect(cairoDateIso(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
  });
  it("retains the patient identity and followup selection", () => {
    expect(visitScheduleSchema.parse(request)).toMatchObject({
      patientId: 7,
      service: "followup",
    });
  });
  it("rejects a registered patient without an identity", () => {
    expect(
      visitScheduleSchema.safeParse({ ...request, patientId: null }).success,
    ).toBe(false);
  });
  it("rejects invalid calendar dates", () => {
    expect(
      visitScheduleSchema.safeParse({ ...request, visitDate: "2026-02-31" })
        .success,
    ).toBe(false);
  });
  it("requires registration before checking in a new patient", () => {
    expect(
      visitScheduleSchema.safeParse({
        ...request,
        patientType: "new",
        patientId: null,
        moveToCheckedIn: true,
      }).success,
    ).toBe(false);
  });
  it("does not check in a future appointment", () => {
    expect(
      visitScheduleSchema.safeParse({
        ...request,
        visitDate: "2099-01-01",
        moveToCheckedIn: true,
      }).success,
    ).toBe(false);
  });
  it("allows a plain new-patient booking without creating a patient", () => {
    expect(
      visitScheduleSchema.safeParse({
        ...request,
        patientType: "new",
        patientId: null,
        service: "consultant",
      }).success,
    ).toBe(true);
  });
});
