import { afterEach, describe, expect, it, vi } from "vitest";
import { initTRPC } from "@trpc/server";

vi.mock("../_core/trpc", () => ({ router: initTRPC.create().router }));
vi.mock("../_core/procedures", () => ({
  medicalStaffProcedure: initTRPC.create().procedure,
}));
import { medicalAssistantRouter } from "./medical-assistant";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("medical assistant Azure token exchange", () => {
  it("rejects missing configuration before fetching", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      medicalAssistantRouter.createCaller({}).speechToken(),
    ).rejects.toThrow("Configure AZURE");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns only a temporary token and region", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "test-secret");
    vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("temporary-token")),
    );
    expect(await medicalAssistantRouter.createCaller({}).speechToken()).toEqual(
      { token: "temporary-token", region: "westeurope" },
    );
  });
  it("does not expose Azure response details on failure", async () => {
    vi.stubEnv("AZURE_SPEECH_KEY", "test-secret");
    vi.stubEnv("AZURE_SPEECH_REGION", "westeurope");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("private details", { status: 401 })),
    );
    await expect(
      medicalAssistantRouter.createCaller({}).speechToken(),
    ).rejects.toThrow("Azure Speech could not connect");
  });
});
