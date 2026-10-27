import { z } from "zod";
import { createHash } from "node:crypto";
import { getDbConnection } from "../../db";
import {
  generatedSchema,
  ProviderError,
  type ReplyGenerator,
} from "../auto-reply/providers";
import { AiGateway, type AiUsage } from "./gateway";
import { AiManagementStore, AiManagementError } from "./managementStore";
import { isKnownAiRejection, settleAiFailure } from "./failure";
import {
  AiTaskPending,
  AiTaskExpired,
  AiTaskFailed,
  readManusJson,
  startManusJson,
} from "./manusJson";

const replyJsonSchema = {
  type: "object",
  properties: {
    text: { type: "string" },
    handoff: { type: "boolean" },
    sourceIds: { type: "array", items: { type: "integer" } },
  },
  required: ["text", "handoff", "sourceIds"],
};

export function managedReplyPreview(
  requestId: string,
  store = new AiManagementStore(getDbConnection),
  workload: "reply.preview" | "reply.live" = "reply.preview",
): ReplyGenerator {
  z.string().uuid().parse(requestId);
  return async (request) => {
    if (process.env.AI_CORE_MANAGEMENT_ENABLED !== "true")
      throw new AiManagementError("disabled");
    if (request.instruction.length > 32000 || request.input.length > 32000)
      throw new AiManagementError("unavailable");
    const task = { ...request, workload, schema: generatedSchema };
    const existing = await store.findRequest(requestId);
    if (existing?.state === "failed") throw new AiTaskFailed();
    if (existing?.provider === "manus") {
      const result = await readManusJson(requestId, task, store);
      return {
        reply: result.value,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          model: `manus:${result.model}`,
        },
        finishReason: "STOP",
      };
    }
    // UTF-8 bytes conservatively bound input tokens; the margin covers output and framing.
    const reservedTokens = Math.max(
      16384,
      Buffer.byteLength(request.instruction + request.input, "utf8") + 4096,
    );
    const profile = await store.reserve(
      requestId,
      workload,
      undefined,
      reservedTokens,
    );
    let usage: AiUsage | undefined;
    try {
      if (profile.provider === "manus")
        return await startManusJson(requestId, profile.model, task, store);
      const gateway = new AiGateway((event) => {
        usage = event;
      });
      const reply = await gateway.generateJson({
        ...request,
        workload,
        model: profile.model,
        schema: generatedSchema,
        jsonSchema: replyJsonSchema,
      });
      if (!usage) throw new AiManagementError("unavailable");
      await store.complete(requestId, usage);
      return {
        reply,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          model: profile.model,
        },
        finishReason: "STOP",
      };
    } catch (error) {
      if (error instanceof AiTaskPending) throw error;
      await settleAiFailure(store, requestId, error, usage);
      throw error;
    }
  };
}

export function managedReplyLive(requestKey: string): ReplyGenerator {
  const hash = createHash("sha256")
    .update(`auto-reply:${requestKey}`)
    .digest("hex");
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  const generate = managedReplyPreview(id, undefined, "reply.live");
  return async (request) => {
    try {
      return await generate(request);
    } catch (error) {
      if (error instanceof AiTaskPending)
        throw new ProviderError("CENTRAL_AI_PENDING", true, false, 15);
      if (error instanceof AiTaskExpired)
        throw new ProviderError("CENTRAL_AI_PENDING_EXPIRED", false, true);
      if (error instanceof AiTaskFailed)
        throw new ProviderError("CENTRAL_AI_FAILED", false, false);
      if (isKnownAiRejection(error))
        throw new ProviderError("CENTRAL_AI_REJECTED", false, false);
      throw new ProviderError(
        error instanceof AiManagementError
          ? `CENTRAL_AI_${error.code.toUpperCase()}`
          : "CENTRAL_AI_OUTCOME_UNCERTAIN",
        false,
        !(error instanceof AiManagementError) || error.code === "duplicate",
      );
    }
  };
}
