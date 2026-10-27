import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { availableGeminiModels } from "../services/auto-reply/ai-configuration";
import {
  startMedicalProposals,
  readMedicalProposals,
} from "../services/ai/medical";
import { adminProcedure, router } from "../_core/procedures";
import { getDbConnection } from "../db";
import { readMedicalAssistantSettings } from "../services/ai/medicalSettings";
import {
  AiManagementStore,
  AiManagementError,
  profileSchema,
} from "../services/ai/managementStore";
import {
  readAiManagementProbe,
  runAiManagementProbe,
} from "../services/ai/management";

async function managementOperation<T>(work: () => Promise<T>) {
  if (process.env.AI_CORE_MANAGEMENT_ENABLED !== "true")
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "AI management is disabled; existing services are unchanged.",
    });
  try {
    return await work();
  } catch (error) {
    throw new TRPCError({
      code:
        error instanceof AiManagementError
          ? "PRECONDITION_FAILED"
          : "INTERNAL_SERVER_ERROR",
      message:
        error instanceof AiManagementError
          ? error.message
          : "AI management operation failed; inspect safe usage status before retrying.",
    });
  }
}

export function createAiManagementRouter(store: AiManagementStore) {
  return router({
    models: adminProcedure.query(async () =>
      (await availableGeminiModels(process.env.GEMINI_API_KEY ?? "", true)).map(
        (model) => ({
          id: model.name.replace(/^models\//, ""),
          label: model.displayName ?? model.name,
          kind: /image|nano-banana/i.test(model.name)
            ? ("image" as const)
            : ("text" as const),
        }),
      ),
    ),
    status: adminProcedure.query(() => ({
      enabled: process.env.AI_CORE_MANAGEMENT_ENABLED === "true",
      consumersMigrated: false,
      replyPreviewAvailable: true,
      replyLiveAvailable: true,
      marketingDraftAvailable: true,
      marketingWorkflowAvailable: true,
      marketingTopicRetirementAvailable: true,
      marketingRecoveryAvailable: true,
      marketingReferencesAvailable: true,
      whatsappCopyAvailable: true,
      medicalWorkflowAvailable: true,
      credentials: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        replyGemini: Boolean(process.env.AUTO_REPLY_GEMINI_KEY),
        manus: Boolean(process.env.MANUS_API_KEY),
      },
    })),
    profiles: adminProcedure.query(() =>
      managementOperation(() => store.listProfiles()),
    ),
    updateProfile: adminProcedure
      .input(profileSchema)
      .mutation(({ input }) =>
        managementOperation(() => store.updateProfile(input)),
      ),
    usage: adminProcedure.query(() =>
      managementOperation(() => store.listUsage()),
    ),
    startMedicalSynthetic: adminProcedure.mutation(({ ctx }) =>
      managementOperation(async () => {
        const settings = await readMedicalAssistantSettings();
        const [provider, ...model] = settings.processingModel.split(":");
        return startMedicalProposals(
          ctx.user.id,
          {
            kind: "field",
            label: "Complaints",
            transcript: "مثال تدريبي خيالي: صداع من أسبوعين",
          },
          [],
          provider === "gemini" ? "gemini" : "manus",
          "central",
          model.join(":"),
        );
      }),
    ),
    readMedicalSynthetic: adminProcedure
      .input(z.object({ jobId: z.string().uuid() }).strict())
      .query(({ ctx, input }) =>
        managementOperation(() =>
          readMedicalProposals(ctx.user.id, input.jobId),
        ),
      ),
    runSyntheticProbe: adminProcedure
      .input(
        z
          .object({
            requestId: z.string().uuid(),
            workload: z.enum([
              "reply.preview",
              "reply.live",
              "marketing.text",
              "marketing.image",
              "medical.synthetic",
              "whatsapp.marketing",
            ]),
          })
          .strict(),
      )
      .mutation(({ input, ctx }) =>
        managementOperation(async () => {
          const probe = await runAiManagementProbe(
            store,
            input.requestId,
            input.workload,
            ctx.user.id,
          );
          if (probe.state === "completed" && "bytes" in probe.output)
            return {
              ...probe,
              output: {
                mimeType: probe.output.mimeType,
                bytes: probe.output.bytes.length,
                imageDataUrl:
                  probe.output.bytes.length <= 4 * 1024 * 1024
                    ? `data:${probe.output.mimeType};base64,${probe.output.bytes.toString("base64")}`
                    : null,
              },
            };
          return probe;
        }),
      ),
    readProbe: adminProcedure
      .input(z.object({ requestId: z.string().uuid() }).strict())
      .query(({ input, ctx }) =>
        managementOperation(() =>
          readAiManagementProbe(store, input.requestId, ctx.user.id),
        ),
      ),
  });
}
export const aiManagementRouter = createAiManagementRouter(
  new AiManagementStore(getDbConnection),
);
