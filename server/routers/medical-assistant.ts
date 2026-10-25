import { medicalSpeechToken } from "../services/ai/speech";
import { AiManagementStore } from "../services/ai/managementStore";
import { getDbConnection } from "../db";
import { router } from "../_core/trpc";
import { medicalStaffProcedure } from "../_core/procedures";
import { adminProcedure } from "../_core/procedures";
import {
  medicalGeminiOptions,
  extractGeminiProposals,
} from "../services/ai/medicalGemini";
import { validateMedicalProposals } from "../../shared/medical-assistant";
import { z } from "zod";
import { medicalProposalRequestSchema } from "../../shared/medical-assistant";
import { readMedicalVocabulary } from "../services/medical-vocabulary";
import {
  startMedicalProposals,
  readMedicalProposals,
} from "../services/ai/medical";

export const medicalAssistantRouter = router({
  providerOptions: medicalStaffProcedure.query(async () => ({
    defaultProvider: "manus" as const,
    gemini: medicalGeminiOptions(),
    central:
      process.env.AI_CORE_MANAGEMENT_ENABLED === "true"
        ? ((await new AiManagementStore(getDbConnection).listProfiles())
            .filter((profile) => profile.workload === "medical.documentation")
            .map((profile) => ({
              enabled: profile.enabled,
              model: profile.model,
            }))[0] ?? null)
        : null,
  })),
  testGeminiSynthetic: adminProcedure.mutation(async () => {
    const recording = {
      kind: "field",
      label: "Complaints",
      transcript: "مثال تدريبي خيالي: صداع من أسبوعين",
    } as const;
    const raw = await extractGeminiProposals(
      `Synthetic software test only, not a real patient or clinical use. Extract this fictional text without medical advice. Return JSON {"proposals":[{"field":"field","text":"...","sources":["exact quote"],"speaker":"patient"}],"warnings":[]}. Transcript: ${JSON.stringify(recording.transcript)}`,
    );
    return {
      synthetic: true,
      result: validateMedicalProposals(raw, recording),
    };
  }),
  startProposals: medicalStaffProcedure
    .input(medicalProposalRequestSchema)
    .mutation(async ({ ctx, input }) =>
      startMedicalProposals(
        ctx.user.id,
        input.recording,
        (await readMedicalVocabulary()).entries,
        input.provider,
        input.engine,
      ),
    ),
  readProposals: medicalStaffProcedure
    .input(z.object({ jobId: z.string().uuid() }).strict())
    .mutation(({ ctx, input }) =>
      readMedicalProposals(ctx.user.id, input.jobId),
    ),
  speechToken: medicalStaffProcedure.mutation(() => medicalSpeechToken()),
});
