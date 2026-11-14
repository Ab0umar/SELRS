import { expect, it, vi } from "vitest";
vi.mock("../_core/env", () => ({ ENV: {} }));
vi.mock("../db", () => ({ getDb: vi.fn(), getDbConnection: vi.fn() }));
import { z } from "zod";
import { centralDraftErrorCode } from "../services/ai/marketingDraft";
import { AiGatewayError } from "../services/ai/gateway";
import { AiManagementError } from "../services/ai/managementStore";
import { PublishedMarketingTopicError } from "../services/marketing/topicHistory";

it("stores a specific, safe error code for each central failure", () => {
  expect(centralDraftErrorCode(new AiManagementError("budget"))).toBe(
    "ai_budget",
  );
  expect(centralDraftErrorCode(new AiGatewayError("provider", 503))).toBe(
    "gateway_provider_503",
  );
  expect(centralDraftErrorCode(new AiGatewayError("invalid_output"))).toBe(
    "gateway_invalid_output",
  );
  expect(
    centralDraftErrorCode(z.string().safeParse(1).error as z.ZodError),
  ).toBe("invalid_output");
  expect(centralDraftErrorCode(new PublishedMarketingTopicError())).toBe(
    "topic_unavailable",
  );
  expect(centralDraftErrorCode(new Error("secret provider text"))).toBe(
    "generation_or_persistence_failed",
  );
});
