import { z } from "zod";

export const medicalAssistantRoles = ["admin", "doctor", "nurse"] as const;
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
  complaints: "الشكوى",
  symptoms: "الأعراض",
  history: "التاريخ المرضي",
  diagnosis: "التشخيص",
  treatment: "العلاج",
  imaging: "طلبات الأشعة",
  labs: "طلبات التحاليل",
  decision: "القرار النهائي",
  field: "الحقل المحدد",
};
// Eight minutes of fast two-person Arabic speech stays well under this, so a
// full recording always reaches the automatic review.
export const medicalTranscriptMaxChars = 16000;
const transcript = z.string().trim().min(1).max(medicalTranscriptMaxChars);
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
    // Negative ids are patients from the legacy year databases.
    patientId: z
      .number()
      .int()
      .refine((id) => id !== 0)
      .optional(),
    visitId: z.number().int().positive().nullish(),
    provider: z.enum(["manus", "gemini"]).default("manus"),
    engine: z.enum(["current", "central"]).default("current"),
    model: z.string().max(100).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.model === undefined ||
      (input.provider === "manus"
        ? ["standard", "lite", "max"].includes(input.model)
        : /^gemini-[a-z0-9.-]+$/.test(input.model)),
    {
      message: "Model does not match the selected provider",
      path: ["model"],
    },
  );
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
            medications: z
              .array(
                z
                  .object({
                    name: z.string().trim().min(1).max(255),
                    source: z.string().min(1).max(4000),
                    dosage: z.string().max(255),
                    frequency: z.string().max(255),
                    duration: z.string().max(255),
                    instructions: z.string().max(1000),
                  })
                  .strict(),
              )
              .max(20)
              .optional(),
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
    readonly reason: "duplicate_field" | "scope",
    message: string,
  ) {
    super(message);
  }
}

// Overlapping four-word sequences, used to tell verbatim copying from rewording.
function phrases(text: string) {
  const words = text
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const result = new Set<string>();
  for (let index = 0; index + 4 <= words.length; index++)
    result.add(words.slice(index, index + 4).join(" "));
  return result;
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
  }
  if (input.kind === "field" ? output.proposals.length > 1 : seen.has("field"))
    throw new MedicalProposalValidationError(
      "scope",
      "Proposal outside recording scope",
    );
  // An answer that has already been paid for is repaired, not rejected: only
  // the unsupported part is dropped, and the doctor is told what was dropped.
  const notes: string[] = [];
  const label = (field: MedicalProposals["proposals"][number]["field"]) =>
    input.kind === "field" ? input.label : medicalProposalLabels[field];
  const spoken = (text: string) => input.transcript.includes(text);
  const proposals: MedicalProposals["proposals"] = [];
  for (const proposal of output.proposals) {
    const { medications, ...rest } = proposal;
    // A field dictation has a single destination; the model sometimes names
    // the clinical field it recognised (diagnosis, treatment) instead.
    const item =
      input.kind === "field" ? { ...rest, field: "field" as const } : rest;
    if (
      input.kind === "conversation" &&
      ["diagnosis", "treatment", "imaging", "labs", "decision"].includes(
        item.field,
      ) &&
      item.speaker !== "doctor"
    ) {
      notes.push(
        `حُذف اقتراح «${label(item.field)}» لأنه غير منسوب صراحةً إلى الطبيب. راجع هذا الحقل يدويًا.`,
      );
      continue;
    }
    const sources = item.sources.filter(spoken);
    if (!sources.length) {
      notes.push(
        `حُذف اقتراح «${label(item.field)}» لأن اقتباساته لا تطابق نص التسجيل. راجع هذا الحقل يدويًا.`,
      );
      continue;
    }
    const kept =
      input.kind === "conversation" && item.field === "treatment"
        ? medications?.filter((medication) => {
            if (spoken(medication.source)) return true;
            notes.push(
              `حُذف الدواء «${medication.name}» لأن مصدره غير موجود في نص التسجيل. راجعه يدويًا.`,
            );
            return false;
          })
        : undefined;
    if (
      input.kind === "conversation" &&
      item.field !== "treatment" &&
      medications?.length
    )
      notes.push(
        `حُذفت الأدوية من اقتراح «${label(item.field)}» لأنها تخص العلاج فقط. راجعها يدويًا.`,
      );
    proposals.push({
      ...item,
      sources,
      ...(kept?.length ? { medications: kept } : {}),
    });
  }
  // In a recorded conversation, a field that repeats most of the transcript word
  // for word is the raw conversation rather than an extracted value; drop it so it
  // never fills a field. Length alone is not evidence: a condensed summary can be
  // long, and in doctor dictation the whole transcript may be one field's value.
  const transcriptPhrases =
    input.kind === "conversation" &&
    input.mode === "conversation" &&
    input.transcript.length >= 200
      ? phrases(input.transcript)
      : new Set<string>();
  const rawCopies =
    transcriptPhrases.size < 10
      ? []
      : proposals.filter((proposal) => {
          let repeated = 0;
          for (const phrase of phrases(proposal.text))
            if (transcriptPhrases.has(phrase)) repeated++;
          return repeated / transcriptPhrases.size >= 0.6;
        });
  for (const proposal of rawCopies)
    notes.push(
      `حُذف اقتراح «${medicalProposalLabels[proposal.field]}» لأنه نسخ معظم المحادثة بدل استخراج المعلومة. راجع هذا الحقل يدويًا.`,
    );
  return {
    proposals: proposals.filter((proposal) => !rawCopies.includes(proposal)),
    // Repair notes first, so the cap never hides what was dropped.
    warnings: [...notes, ...output.warnings].slice(0, 12),
  };
}
