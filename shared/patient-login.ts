import { z } from "zod";

export function latinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) =>
    String(digit.charCodeAt(0) - (digit >= "۰" ? 0x6f0 : 0x660)),
  );
}

export function patientLoginPhone(value: string): string {
  const digits = latinDigits(value).replace(/\D/g, "");
  return digits.startsWith("0020")
    ? `0${digits.slice(4)}`
    : digits.startsWith("20")
      ? `0${digits.slice(2)}`
      : digits;
}

export const patientBirthDate = z
  .union([z.iso.date(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

export const patientLoginInput = z.object({
  phone: z
    .string()
    .max(30)
    .transform(patientLoginPhone)
    .pipe(
      z.string().regex(/^01\d{9}$/, "اكتب رقم الموبايل المسجل من 11 رقمًا"),
    ),
  dateOfBirth: patientBirthDate,
});

export const patientSelectionInput = z.object({
  selectionToken: z.string().min(1).max(1024),
  patientId: z.number().int().positive(),
});

export const patientOtpInput = z.object({
  challengeId: z.string().uuid(),
  dateOfBirth: patientBirthDate,
  code: z
    .string()
    .transform((value) => latinDigits(value).trim())
    .pipe(z.string().regex(/^\d{6}$/, "اكتب كود التحقق المكوّن من 6 أرقام")),
});
