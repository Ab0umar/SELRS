import { afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { aiManagementRouter } from "../routers/aiManagement";
import { makeCallerAs } from "./helpers/auth";
import { profileSchema } from "../services/ai/managementStore";

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

  it("does not introduce a clinical medical workload", async () => {
    const caller = aiManagementRouter.createCaller(makeCallerAs("admin"));
    const request = { requestId: randomUUID(), workload: "medical.clinical" };
    // A raw API boundary can receive values outside the TypeScript contract.
    await expect(caller.runSyntheticProbe(request as Parameters<typeof caller.runSyntheticProbe>[0])).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
