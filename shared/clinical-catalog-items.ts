import { z } from "zod";

export const investigationInputSchema = z
  .object({
    testId: z.number().int().positive().optional(),
    testName: z.string().trim().min(1).max(255).optional(),
    testType: z.enum(["lab", "imaging", "examination", "other"]).optional(),
    catalogConfirmed: z.literal(true).optional(),
    notes: z.string().optional(),
  })
  .refine(
    (item) =>
      item.testId !== undefined ||
      (item.catalogConfirmed === true && Boolean(item.testName)),
    "Confirm an uncatalogued investigation name before saving",
  );
export const prescriptionLineInputSchema = z.object({
  medicationId: z.number().optional(),
  medicationName: z.string(),
  catalogConfirmed: z.literal(true).optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
});
export type InvestigationType = "lab" | "imaging" | "examination" | "other";
export type ConfirmedMedication = {
  medicationName: string;
  catalogConfirmed: true;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};
export type ConfirmedInvestigation = {
  testName: string;
  catalogConfirmed: true;
  testType?: InvestigationType;
  notes?: string;
};
export type InvestigationInput = {
  testId?: number;
  testName?: string;
  catalogConfirmed?: true;
  testType?: InvestigationType;
  notes?: string;
};

export function confirmedMedicationsFromRecords(
  items: Array<{
    medicationId?: number | null;
    medicationName?: string | null;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }>,
): ConfirmedMedication[] {
  return items
    .filter((item) => item.medicationId == null && item.medicationName?.trim())
    .map((item) => ({
      medicationName: item.medicationName!,
      catalogConfirmed: true,
      dosage: item.dosage ?? "",
      frequency: item.frequency ?? "",
      duration: item.duration ?? "",
      instructions: item.instructions ?? "",
    }));
}
export function confirmedInvestigationsFromRecords(
  items: Array<{
    testId?: number | null;
    testName?: string | null;
    testType?: InvestigationType | null;
    result?: string | null;
  }>,
): ConfirmedInvestigation[] {
  return items
    .filter((item) => item.testId == null && item.testName?.trim())
    .map((item) => ({
      testName: item.testName!,
      catalogConfirmed: true,
      testType: item.testType ?? "other",
      notes: item.result ?? "",
    }));
}
