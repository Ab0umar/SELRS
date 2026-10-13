import { z } from "zod";

export const medicalProposalFields = [
  "complaints",
  "symptoms",
  "history",
  "diagnosis",
  "treatment",
  "imaging",
  "labs",
  "decision",
  "field",
] as const;
export const medicalProposalLabels: Record<
  (typeof medicalProposalFields)[number],
  string
> = {
  complaints: "Complaints",
  symptoms: "Symptoms",
  history: "Medical history",
  diagnosis: "Doctor-stated diagnosis",
  treatment: "Doctor-stated treatment",
  imaging: "Imaging requests",
  labs: "Laboratory requests",
  decision: "Final decision",
  field: "Selected field",
};
const transcript = z.string().trim().min(1).max(8000);
export const medicalTranscriptSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("conversation"),
      mode: z.enum(["conversation", "dictation"]),
      transcript,
    })
    .strict(),
  z
    .object({
      kind: z.literal("field"),
      label: z.string().trim().min(1).max(250),
      transcript,
    })
    .strict(),
]);
export type MedicalTranscript = z.infer<typeof medicalTranscriptSchema>;
export const medicalProposalRequestSchema = z
  .object({
    recording: medicalTranscriptSchema,
    consentConfirmed: z.literal(true),
  })
  .strict();
export const medicalProposalSchema = z
  .object({
    proposals: z
      .array(
        z
          .object({
            field: z.enum(medicalProposalFields),
            text: z.string().trim().min(1).max(6000),
            sources: z.array(z.string().min(1).max(4000)).min(1).max(12),
            speaker: z.enum(["doctor", "patient", "uncertain"]),
          })
          .strict(),
      )
      .max(8),
    warnings: z.array(z.string().trim().min(1).max(1000)).max(12),
  })
  .strict();
export type MedicalProposals = z.infer<typeof medicalProposalSchema>;

export class MedicalProposalValidationError extends Error {
  constructor(
    readonly reason: "duplicate_field" | "scope" | "source" | "speaker",
    message: string,
  ) {
    super(message);
  }
}

export function validateMedicalProposals(
  raw: unknown,
  input: MedicalTranscript,
): MedicalProposals {
  const output = medicalProposalSchema.parse(raw);
  const seen = new Set<string>();
  for (const proposal of output.proposals) {
    if (seen.has(proposal.field))
      throw new MedicalProposalValidationError(
        "duplicate_field",
        "Duplicate proposal field",
      );
    seen.add(proposal.field);
    if ((input.kind === "field") !== (proposal.field === "field"))
      throw new MedicalProposalValidationError(
        "scope",
        "Proposal outside recording scope",
      );
    if (proposal.sources.some((source) => !input.transcript.includes(source)))
      throw new MedicalProposalValidationError(
        "source",
        "Proposal source is not in the transcript",
      );
    if (
      ["diagnosis", "treatment", "imaging", "labs", "decision"].includes(
        proposal.field,
      ) &&
      proposal.speaker !== "doctor"
    )
      throw new MedicalProposalValidationError(
        "speaker",
        "Clinical decision requires an explicit doctor statement",
      );
  }
  return output;
}
