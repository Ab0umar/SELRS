import { z } from "zod";

export const referralDoctorInput = z.object({
  name: z.string().trim().min(1, "اسم الدكتور مطلوب").max(255),
  specialty: z.string().trim().min(1, "التخصص مطلوب").max(255),
  hospital: z.string().trim().max(255),
  schedule: z.string().trim().max(2000),
  address: z.string().trim().max(2000),
});
export type ReferralDoctorDetails = z.infer<typeof referralDoctorInput> & {
  id: number;
};
export function referralDoctorSnapshot(doctor: ReferralDoctorDetails) {
  return {
    referralDoctorId: doctor.id,
    referredPhysician: doctor.name,
    referredDept: doctor.specialty,
    referredFacility: doctor.hospital,
    referredAddress: doctor.address,
    referredSchedule: doctor.schedule,
  };
}
