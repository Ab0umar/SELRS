import { z } from "zod";

export function cairoDateIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export const visitScheduleSchema = z
  .object({
    fullName: z.string().trim().min(1).max(255),
    age: z.number().int().min(0).max(130).nullable().optional(),
    visitDate: z.iso.date(),
    phone: z.string().max(32).nullable().optional(),
    service: z.enum([
      "consultant",
      "specialist",
      "lasik",
      "surgery",
      "external",
      "followup",
    ]),
    patientType: z.enum(["existing", "new", "guest"]).default("existing"),
    patientId: z.number().int().positive().nullable().optional(),
    moveToCheckedIn: z.boolean().default(false),
    cancelPreviousAppointment: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (
      (value.patientType === "existing" ||
        value.service === "followup" ||
        value.moveToCheckedIn ||
        value.cancelPreviousAppointment) &&
      !value.patientId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["patientId"],
        message:
          "اختر المريض المسجل أولاً؛ المريض الجديد يُسجل من شاشة التسجيل",
      });
    }
    if (value.patientType !== "existing" && value.patientId) {
      ctx.addIssue({
        code: "custom",
        path: ["patientType"],
        message: "المريض المحدد مسجل بالفعل",
      });
    }
    if (value.moveToCheckedIn && value.visitDate !== cairoDateIso()) {
      ctx.addIssue({
        code: "custom",
        path: ["visitDate"],
        message: "النقل للتسجيل متاح لموعد اليوم فقط",
      });
    }
  });
