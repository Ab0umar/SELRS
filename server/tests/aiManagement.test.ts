import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { aiManagementRouter, createAiManagementRouter } from "../routers/aiManagement";
import { makeCallerAs } from "./helpers/auth";
import { profileSchema, type AiManagementStore } from "../services/ai/managementStore";

afterEach(() => vi.unstubAllEnvs());
describe("AI management boundaries", () => {
  it.each(["viewer", "doctor", "manager", "reception"])("denies management access to %s", async role => {
    await expect(aiManagementRouter.createCaller(makeCallerAs(role)).status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps management off without changing current consumers or exposing keys", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
    vi.stubEnv("GEMINI_API_KEY", "fake-private-key");
    const caller = aiManagementRouter.createCaller(makeCallerAs("admin"));
    const status = await caller.status();
    expect(status).toMatchObject({ enabled: false, consumersMigrated: false, credentials: { gemini: true } });
    expect(JSON.stringify(status)).not.toContain("fake-private-key");
    await expect(caller.profiles()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("does not allow patient text to be supplied to a synthetic probe", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    const caller = aiManagementRouter.createCaller(makeCallerAs("admin"));
    const request = { requestId: randomUUID(), workload: "medical.synthetic" as const, transcript: "must not be accepted" };
    await expect(caller.runSyntheticProbe(request)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it.each([
    { provider: "gemini", model: "lite" },
    { provider: "manus", model: "gemini-3.8-flash" },
  ])("rejects cross-provider model configuration %j", variant => {
    expect(profileSchema.safeParse({ workload: "marketing.text", enabled: false, dailyRequests: 20, dailyTokens: 100000, maxConcurrent: 2, ...variant }).success).toBe(false);
  });

  it("reads today's use per workload for admins only, and only while management is on", async () => {
    const rows = [{ workload: "reply.live", requests: 3, tokens: 1200 }];
    const store = { todayUsage: vi.fn(async () => rows) };
    const router = createAiManagementRouter(store as unknown as AiManagementStore);
    await expect(router.createCaller(makeCallerAs("doctor")).todayUsage()).rejects.toMatchObject({ code: "FORBIDDEN" });
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
    await expect(router.createCaller(makeCallerAs("admin")).todayUsage()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "true");
    await expect(router.createCaller(makeCallerAs("admin")).todayUsage()).resolves.toEqual(rows);
  });

  it("does not introduce a clinical medical workload", async () => {
    const caller = aiManagementRouter.createCaller(makeCallerAs("admin"));
    const request = { requestId: randomUUID(), workload: "medical.clinical" };
    // A raw API boundary can receive values outside the TypeScript contract.
    await expect(caller.runSyntheticProbe(request as Parameters<typeof caller.runSyntheticProbe>[0])).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
