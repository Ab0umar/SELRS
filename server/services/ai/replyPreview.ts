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
    // UTF-8 bytes conservatively bound input tokens; the margin covers output and framing.
    const reservedTokens = Math.max(
      16384,
      Buffer.byteLength(request.instruction + request.input, "utf8") + 4096,
    );
    const profile = await store.reserve(
      requestId,
      workload,
      "gemini",
      reservedTokens,
    );
    let usage: AiUsage | undefined;
    try {
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
      if (
        usage?.status === "failed" &&
        (usage.inputTokens > 0 || usage.outputTokens > 0)
      )
        await store.complete(requestId, usage);
      else await store.markUncertain(requestId);
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
