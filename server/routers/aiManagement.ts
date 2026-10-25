import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  startMedicalProposals,
  readMedicalProposals,
} from "../services/ai/medical";
import { adminProcedure, router } from "../_core/procedures";
import { getDbConnection } from "../db";
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
      managementOperation(() =>
        startMedicalProposals(
          ctx.user.id,
          {
            kind: "field",
            label: "Complaints",
            transcript: "مثال تدريبي خيالي: صداع من أسبوعين",
          },
          [],
          "manus",
          "central",
        ),
      ),
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
      .mutation(({ input }) =>
        managementOperation(async () => {
          const probe = await runAiManagementProbe(
            store,
            input.requestId,
            input.workload,
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
      .query(({ input }) =>
        managementOperation(() =>
          readAiManagementProbe(store, input.requestId),
        ),
      ),
  });
}
export const aiManagementRouter = createAiManagementRouter(
  new AiManagementStore(getDbConnection),
);
