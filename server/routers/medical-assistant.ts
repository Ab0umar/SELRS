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
import { getDbConnection, getPatientById, logAuditEvent } from "../db";
import { router } from "../_core/trpc";
import {
  medicalAssistantProcedure,
  adminProcedure,
} from "../_core/procedures";
import {
  medicalGeminiOptions,
  assertMedicalGeminiAvailable,
  extractGeminiProposals,
} from "../services/ai/medicalGemini";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  medicalProposalRequestSchema,
  validateMedicalProposals,
} from "../../shared/medical-assistant";
import { readMedicalVocabulary } from "../services/medical-vocabulary";
import {
  startMedicalProposals,
  readMedicalProposals,
} from "../services/ai/medical";

const speechConsentSchema = z
  .object({ consentConfirmed: z.literal(true) })
  .strict();

let geminiModelsFailedUntil = 0;
let geminiModelsCache: { until: number; models: Array<{ id: string; label: string }> } | undefined;
async function geminiModelList() {
  if (geminiModelsFailedUntil > Date.now()) return [];
  if (geminiModelsCache && geminiModelsCache.until > Date.now())
    return geminiModelsCache.models;
  try {
    const models = (
      await availableGeminiModels(process.env.GEMINI_API_KEY ?? "")
    ).map((model) => ({
      id: model.name.replace(/^models\//, ""),
      label: model.displayName ?? model.name,
    }));
    geminiModelsCache = { until: Date.now() + 10 * 60_000, models };
    return models;
  } catch {
    // Avoid making every page load wait on an unreachable Gemini endpoint.
    geminiModelsFailedUntil = Date.now() + 60_000;
    return [];
  }
}

export const medicalAssistantRouter = router({
  settings: medicalAssistantProcedure.query(() => readMedicalAssistantSettings()),
  saveSettings: adminProcedure
    .input(medicalAssistantSettingsSchema)
    .mutation(({ ctx, input }) =>
      saveMedicalAssistantSettings(ctx.user.role, input),
    ),
  speechOptions: medicalAssistantProcedure.query(() => ({
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
  providerOptions: medicalAssistantProcedure.query(async () => {
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
  startProposals: medicalAssistantProcedure
    .input(medicalProposalRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Already reflects the central profile when AI management is enabled.
      const settings = await readMedicalAssistantSettings();
      const [provider, ...model] = settings.processingModel.split(":");
      if (
        input.provider !== provider ||
        (input.model && input.model !== model.join(":"))
      )
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "تغيّر مزوّد المعالجة المركزي. حدّث الصفحة وراجع الموافقة قبل الإرسال.",
        });
      // The job row and audit entry are linked to this patient, so it must exist.
      if (
        input.patientId !== undefined &&
        !(await getPatientById(input.patientId).catch(() => undefined))
      )
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المريض غير موجود. لم يُرسل النص للمعالجة.",
        });
      const started = await startMedicalProposals(
        ctx.user.id,
        input.recording,
        (await readMedicalVocabulary()).entries,
        provider === "gemini" ? "gemini" : "manus",
        input.engine,
        model.join(":"),
        { patientId: input.patientId, visitId: input.visitId },
      );
      // Audit metadata only: never the transcript or any clinical text.
      await logAuditEvent(
        ctx.user.id,
        "MEDICAL_AI_PROCESS",
        "medical_assistant",
        input.patientId ?? 0,
        {
          jobId: started.jobId,
          visitId: input.visitId ?? null,
          provider,
          model: model.join(":"),
          kind: input.recording.kind,
          transcriptChars: input.recording.transcript.length,
        },
      ).catch((error: unknown) => {
        console.warn("[medical-ai] Could not record audit event", error);
      });
      return started;
    }),
  readProposals: medicalAssistantProcedure
    .input(z.object({ jobId: z.string().uuid() }).strict())
    .mutation(({ ctx, input }) =>
      readMedicalProposals(ctx.user.id, input.jobId),
    ),
  // Recording streams patient audio to the speech provider, so consent comes first.
  speechToken: medicalAssistantProcedure
    .input(speechConsentSchema)
    .mutation(async () => {
      await assertSelectedSpeechProvider("azure");
      return medicalSpeechToken();
    }),
  geminiSpeechToken: medicalAssistantProcedure
    .input(speechConsentSchema)
    .mutation(async () => {
      await assertSelectedSpeechProvider("gemini");
      return medicalGeminiSpeechToken();
    }),
});
