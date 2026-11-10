import { z } from "zod";

export const guestBookingContactSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(2, "اكتب الاسم الكامل بالعربية")
    .max(100)
    .refine(
      (value) =>
        /^[\p{L}\p{M}\s]+$/u.test(value) &&
        /^[\p{Script_Extensions=Arabic}\s]+$/u.test(value) &&
        /\p{L}/u.test(value),
      "الاسم يجب أن يحتوي على حروف عربية فقط",
    )
    .transform((value) => value.replace(/\s+/g, " ")),
  guestPhone: z
    .string()
    .trim()
    .transform((value) =>
      value.replace(/[٠-٩۰-۹]/g, (digit) =>
        String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)),
      ),
    )
    .pipe(
      z
        .string()
        .min(1, "رقم الموبايل مطلوب للتواصل")
        .regex(/^01\d{9}$/, "اكتب رقم موبايل مصري صحيح من 11 رقمًا يبدأ بـ 01"),
    ),
});
