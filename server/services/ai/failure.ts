import { AiGatewayError, type AiUsage } from "./gateway";
import { ManusRequestError } from "./providers/manus";
import type { AiManagementStore } from "./managementStore";

export class AiRequestNotSubmitted extends Error {
  constructor(cause: unknown) {
    super("AI_REQUEST_NOT_SUBMITTED", { cause });
  }
}

export function isKnownAiRejection(error: unknown) {
  return (
    error instanceof AiRequestNotSubmitted ||
    (error instanceof AiGatewayError &&
      (error.code === "configuration" ||
        error.code === "capacity" ||
        (error.code === "provider" &&
          [400, 401, 403, 404, 413, 422, 429].includes(error.status ?? 0)))) ||
    (error instanceof ManusRequestError && !error.outcomeUncertain)
  );
}

export async function settleAiFailure(
  store: AiManagementStore,
  requestId: string,
  error: unknown,
  usage?: AiUsage,
) {
  const rejected =
    isKnownAiRejection(error) &&
    (!usage ||
      (usage.usageKnown === undefined &&
        usage.status === "failed" &&
        usage.inputTokens === 0 &&
        usage.outputTokens === 0));
  if (rejected) {
    await store.complete(requestId, {
      status: "failed",
      inputTokens: 0,
      outputTokens: 0,
    });
  } else if (
    usage &&
    (usage.usageKnown !== undefined ||
      usage.status === "success" ||
      usage.inputTokens > 0 ||
      usage.outputTokens > 0)
  ) {
    await store.complete(requestId, usage);
  } else {
    await store.markUncertain(requestId);
  }
}
