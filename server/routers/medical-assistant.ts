import { medicalSpeechToken } from "../services/ai/speech";
import { medicalGeminiSpeechToken } from "../services/ai/geminiSpeech";
import { medicalAssistantSettingsSchema } from "../../shared/medical-assistant-settings";
import {
  readMedicalAssistantSettings,
  saveMedicalAssistantSettings,
  assertSelectedSpeechProvider,
} from "../services/ai/medicalSettings";
import { availableGeminiModels } from "../services/auto-reply/ai-configuration";
import { AiManagementStore } from "../services/ai/managementStore";
import { getDbConnection } from "../db";
import { router } from "../_core/trpc";
import { medicalStaffProcedure } from "../_core/procedures";
import { adminProcedure } from "../_core/procedures";
import {
  medicalGeminiOptions,
  assertMedicalGeminiAvailable,
  extractGeminiProposals,
} from "../services/ai/medicalGemini";
import { validateMedicalProposals } from "../../shared/medical-assistant";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { medicalProposalRequestSchema } from "../../shared/medical-assistant";
import { readMedicalVocabulary } from "../services/medical-vocabulary";
import {
  startMedicalProposals,
  readMedicalProposals,
} from "../services/ai/medical";

let geminiModelsFailedUntil = 0;
async function geminiModelList() {
  if (geminiModelsFailedUntil > Date.now()) return [];
  try {
    return (
      await availableGeminiModels(process.env.GEMINI_API_KEY ?? "")
    ).map((model) => ({
      id: model.name.replace(/^models\//, ""),
      label: model.displayName ?? model.name,
    }));
  } catch {
    // Avoid making every page load wait on an unreachable Gemini endpoint.
    geminiModelsFailedUntil = Date.now() + 60_000;
    return [];
  }
}

export const medicalAssistantRouter = router({
  settings: medicalStaffProcedure.query(() => readMedicalAssistantSettings()),
  saveSettings: adminProcedure
    .input(medicalAssistantSettingsSchema)
    .mutation(({ ctx, input }) =>
      saveMedicalAssistantSettings(ctx.user.role, input),
    ),
  speechOptions: medicalStaffProcedure.query(() => ({
    azure: {
      configured: Boolean(
        process.env.AZURE_SPEECH_KEY &&
        process.env.AZURE_SPEECH_REGION?.trim() &&
        /^[a-z0-9]+$/.test(process.env.AZURE_SPEECH_REGION.trim()),
      ),
    },
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      clinicalEnabled: process.env.MEDICAL_GEMINI_CLINICAL_APPROVED === "true",
    },
  })),
  providerOptions: medicalStaffProcedure.query(async () => {
    const managementEnabled = process.env.AI_CORE_MANAGEMENT_ENABLED === "true";
    const gemini = medicalGeminiOptions();
    const [settings, models, profiles] = await Promise.all([
      readMedicalAssistantSettings(),
      gemini.configured && gemini.clinicalEnabled
        ? geminiModelList()
        : Promise.resolve([]),
      managementEnabled
        ? new AiManagementStore(getDbConnection).listProfiles()
        : Promise.resolve([]),
    ]);
    const central = profiles.find(
      (profile) => profile.workload === "medical.documentation",
    );
    return {
      managementEnabled,
      defaultProvider: settings.processingModel.startsWith("gemini:")
        ? ("gemini" as const)
        : ("manus" as const),
      gemini: { ...gemini, models },
      central: central
        ? {
            enabled: central.enabled,
            model: central.model,
            provider: central.provider,
          }
        : null,
    };
  }),
  testGeminiSynthetic: adminProcedure.mutation(async () => {
    assertMedicalGeminiAvailable();
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
    .mutation(async ({ ctx, input }) => {
      const settings = await readMedicalAssistantSettings();
      const profile =
        process.env.AI_CORE_MANAGEMENT_ENABLED === "true"
          ? (await new AiManagementStore(getDbConnection).listProfiles()).find(
              (profile) => profile.workload === "medical.documentation",
            )
          : undefined;
      const [provider, ...model] = (
        profile
          ? `${profile.provider}:${profile.model}`
          : settings.processingModel
      ).split(":");
      if (
        input.provider !== provider ||
        (input.model && input.model !== model.join(":"))
      )
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "تغيّر مزوّد المعالجة المركزي. حدّث الصفحة وراجع الموافقة قبل الإرسال.",
        });
      return startMedicalProposals(
        ctx.user.id,
        input.recording,
        (await readMedicalVocabulary()).entries,
        provider === "gemini" ? "gemini" : "manus",
        input.engine,
        model.join(":"),
      );
    }),
  readProposals: medicalStaffProcedure
    .input(z.object({ jobId: z.string().uuid() }).strict())
    .mutation(({ ctx, input }) =>
      readMedicalProposals(ctx.user.id, input.jobId),
    ),
  speechToken: medicalStaffProcedure.mutation(async () => {
    await assertSelectedSpeechProvider("azure");
    return medicalSpeechToken();
  }),
  geminiSpeechToken: medicalStaffProcedure.mutation(async () => {
    await assertSelectedSpeechProvider("gemini");
    return medicalGeminiSpeechToken();
  }),
});
