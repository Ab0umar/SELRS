import { z } from "zod";

export const operationBookingSchema = z.object({
  bookingDate: z.iso.date(),
  bookingTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "وقت العملية غير صالح"),
  doctorName: z.string().trim().min(1, "اختر الطبيب").max(255),
  operationType: z.string().trim().min(1, "اختر نوع العملية").max(128),
  casesCount: z.number().int().min(1),
  weekdayLabel: z.string().max(64).optional(),
});
