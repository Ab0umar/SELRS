import { describe, expect, it } from "vitest";
import {
  referralDoctorInput,
  referralDoctorSnapshot,
} from "../../../shared/referral-doctors";

describe("outgoing referral doctors", () => {
  it("copies each directory field into its letter field without modifying the directory", () => {
    const doctor = {
      id: 12,
      name: "د. أحمد",
      specialty: "الشبكية",
      hospital: "مستشفى العيون",
      schedule: "السبت ٦–٩ مساءً",
      address: "القاهرة",
    };
    const snapshot = referralDoctorSnapshot(doctor);
    expect(snapshot).toEqual({
      referralDoctorId: 12,
      referredPhysician: doctor.name,
      referredDept: doctor.specialty,
      referredFacility: doctor.hospital,
      referredSchedule: doctor.schedule,
      referredAddress: doctor.address,
    });
    doctor.address = "عنوان جديد";
    expect(snapshot.referredAddress).toBe("القاهرة");
  });
  it("clears missing details when selecting another doctor", () => {
    const snapshot = referralDoctorSnapshot({
      id: 2,
      name: "د. آخر",
      specialty: "التجميل",
      hospital: "",
      address: "",
      schedule: "",
    });
    expect(snapshot.referredAddress).toBe("");
    expect(snapshot.referredSchedule).toBe("");
    expect(snapshot.referredFacility).toBe("");
  });
  it("requires a name and specialty and rejects oversized data", () => {
    const base = {
      name: "د. أحمد",
      specialty: "الشبكية",
      hospital: "",
      schedule: "",
      address: "",
    };
    expect(referralDoctorInput.safeParse(base).success).toBe(true);
    expect(
      referralDoctorInput.safeParse({ ...base, name: "   " }).success,
    ).toBe(false);
    expect(
      referralDoctorInput.safeParse({ ...base, specialty: "" }).success,
    ).toBe(false);
    expect(
      referralDoctorInput.safeParse({ ...base, address: "x".repeat(2001) })
        .success,
    ).toBe(false);
  });
});
