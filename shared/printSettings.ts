import { z } from "zod";

export const PRINT_SETTINGS_KEY = "clinical_print_settings_v1";
export const PRINT_PROFILE_IDS = [
  "prescription",
  "tests",
  "radiology",
  "consultant",
  "specialist",
  "lasik",
  "external",
  "followup",
  "refraction",
  "clinical-report",
  "medical-condition",
  "pre-post-op",
  "offdays",
  "summary",
  "referral",
  "report",
] as const;
export type PrintProfileId = (typeof PRINT_PROFILE_IDS)[number];
export const printProfileSchema = z
  .object({
    enabled: z.boolean(),
    widthMm: z.number().finite().min(70).max(420),
    heightMm: z.number().finite().min(70).max(600),
    topMm: z.number().finite().min(0).max(120),
    bottomMm: z.number().finite().min(0).max(120),
    leftMm: z.number().finite().min(0).max(120),
    rightMm: z.number().finite().min(0).max(120),
    header: z.string().max(1000),
    footer: z.string().max(1000),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.widthMm - value.leftMm - value.rightMm < 40 ||
      value.heightMm - value.topMm - value.bottomMm < 40
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "اترك مساحة محتوى لا تقل عن ٤ سم في الاتجاهين",
      });
    }
  });
export type PrintProfile = z.infer<typeof printProfileSchema>;
export const printSettingsSchema = z
  .object({
    version: z.literal(1),
    profiles: z.partialRecord(z.enum(PRINT_PROFILE_IDS), printProfileSchema),
  })
  .strict();
export type ClinicalPrintSettings = z.infer<typeof printSettingsSchema>;
export const defaultPrintProfile = (): PrintProfile => ({
  enabled: false,
  widthMm: 210,
  heightMm: 297,
  topMm: 10,
  bottomMm: 10,
  leftMm: 10,
  rightMm: 10,
  header: "",
  footer: "",
});
export function readClinicalPrintSettings(
  value: unknown,
): ClinicalPrintSettings {
  const result = printSettingsSchema.safeParse(value);
  return result.success ? result.data : { version: 1, profiles: {} };
}
