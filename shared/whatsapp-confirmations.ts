import { z } from "zod";
export const confirmationKinds = [
  "booking_received",
  "booking_confirmed",
  "booking_cancelled",
  "operation_confirmed",
  "operation_cancelled",
] as const;
export const confirmationStates = [
  "sending",
  "accepted",
  "held",
  "sent",
  "delivered",
  "read",
  "failed",
  "unknown",
  "skipped",
] as const;
export const confirmationKindLabels: Record<
  (typeof confirmationKinds)[number],
  string
> = {
  booking_received: "استلام طلب حجز",
  booking_confirmed: "تأكيد كشف",
  booking_cancelled: "إلغاء كشف",
  operation_confirmed: "تأكيد عملية",
  operation_cancelled: "إلغاء عملية",
};
export const confirmationStateLabels: Record<
  (typeof confirmationStates)[number],
  string
> = {
  sending: "جارٍ الطلب",
  accepted: "قبلتها Meta",
  held: "محتجزة لدى Meta",
  sent: "أُرسلت",
  delivered: "تم التسليم",
  read: "تمت القراءة",
  failed: "فشلت",
  unknown: "النتيجة غير محسومة",
  skipped: "لم تُرسل",
};
export const confirmationListInput = z
  .object({
    page: z.number().int().min(1).max(10000).default(1),
    kind: z.enum(confirmationKinds).optional(),
    state: z.enum(confirmationStates).optional(),
    search: z.string().trim().max(80).default(""),
  })
  .strict();
