import { z } from "zod";

export const medicalAssistantSettingsSchema = z
  .object({
    speechProvider: z.enum(["azure", "gemini"]),
    maxRecordingMinutes: z.number().int().min(1).max(8),
    showDiagnostics: z.boolean(),
    processingModel: z
      .string()
      .regex(/^(manus:(standard|lite|max)|gemini:gemini-[a-z0-9.-]+)$/),
  })
  .strict();
export type MedicalAssistantSettings = z.infer<
  typeof medicalAssistantSettingsSchema
>;
export const defaultMedicalAssistantSettings: MedicalAssistantSettings = {
  speechProvider: "azure",
  maxRecordingMinutes: 8,
  showDiagnostics: true,
  processingModel: "manus:standard",
};
