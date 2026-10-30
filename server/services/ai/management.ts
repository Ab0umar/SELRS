import { z } from "zod";
import { AiGateway, type AiUsage, type AiWorkload } from "./gateway";
import { AiManagementStore, AiManagementError } from "./managementStore";
import { ENV } from "../../_core/env";
import { createManusTask, readManusTask } from "../marketing/manusClient";
import { readAiOperation, trackedAiOperation } from "./operations";
import { settleAiFailure } from "./failure";

const probeSchema = z.object({ ok: z.literal(true) }).strict();
const instruction =
  "Synthetic software integration test only. No patient data, tools, connectors, external actions, publication or messaging. Follow only the requested output format.";
const jsonInput = 'Return only JSON {"ok":true}.';
const imageInput =
  "Generate one real square image of an empty blue and white clinic reception. No people, no text, no logos.";

export async function runAiManagementProbe(
  store: AiManagementStore,
  requestId: string,
  workload: Exclude<AiWorkload, "medical.documentation">,
  owner: number,
) {
  return trackedAiOperation(
    { requestId, scope: "probe", owner, context: { workload } },
    async (accept) => {
      const profile = await store.reserve(requestId, workload);
      let usage: AiUsage | undefined;
      let accepted = false;
      try {
        const credential =
          profile.provider === "manus"
            ? ENV.manusApiKey
            : profile.provider === "grok"
              ? process.env.XAI_API_KEY
              : workload === "reply.preview" || workload === "reply.live"
                ? process.env.AUTO_REPLY_GEMINI_KEY
                : process.env.GEMINI_API_KEY;
        if (!credential) throw new AiManagementError("unavailable");
        await accept();
        accepted = true;
        if (profile.provider === "manus") {
          const task = await createManusTask(
            `${instruction}\n${workload === "marketing.image" ? imageInput : 'Return a downloadable probe.json containing {"ok":true}.'}`,
            { agentProfile: profile.model as "standard" | "lite" | "max" },
          );
          await store.attachTask(requestId, task.task_id);
          return {
            requestId,
            state: "running" as const,
            provider: "manus" as const,
          };
        }
        const gateway = new AiGateway((event) => {
          usage = event;
        });
        const output =
          workload === "marketing.image"
            ? await gateway.generateImage({
                workload,
                instruction,
                input: imageInput,
                model: profile.model,
              })
            : await gateway.generateJson({
                workload,
                instruction,
                input: jsonInput,
                model: profile.model,
                schema: probeSchema,
                jsonSchema: {
                  type: "object",
                  additionalProperties: false,
                  properties: { ok: { type: "boolean" } },
                  required: ["ok"],
                },
              });
        if (!usage) throw new Error("AI usage metadata unavailable");
        await store.complete(requestId, usage);
        return {
          requestId,
          state: "completed" as const,
          provider: profile.provider,
          output,
        };
      } catch (error) {
        if (!accepted)
          await store.complete(requestId, {
            status: "failed",
            inputTokens: 0,
            outputTokens: 0,
          });
        else await settleAiFailure(store, requestId, error, usage);
        throw error;
      }
    },
  );
}

export async function readAiManagementProbe(
  store: AiManagementStore,
  requestId: string,
  owner: number,
) {
  const operation = await readAiOperation(requestId, "probe", owner);
  if (!operation) return null;
  if (operation.state === "rejected") return { state: "rejected" as const };
  const request = await store.findRequest(requestId);
  if (
    !request ||
    request.provider !== "manus" ||
    !request.task_id ||
    !["running", "uncertain"].includes(request.state)
  )
    return request;
  const remote = await readManusTask(request.task_id);
  if (
    remote.status === "error" ||
    remote.statusEvent?.agent_status === "error"
  ) {
    await store.complete(
      requestId,
      { inputTokens: 0, outputTokens: 0, status: "failed" },
      remote.credit_usage ?? null,
    );
  } else if (
    remote.status === "stopped" &&
    remote.has_running_background_jobs === false
  ) {
    // Completion here tracks the provider task, not acceptance of a marketing artifact.
    await store.complete(
      requestId,
      { inputTokens: 0, outputTokens: 0, status: "success" },
      remote.credit_usage ?? null,
    );
  }
  return store.findRequest(requestId);
}
