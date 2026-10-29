import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../services/marketing/equipmentAssets",async original=>({...await original<typeof import("../services/marketing/equipmentAssets")>(),readEquipmentPhoto:vi.fn().mockResolvedValue(null)}));
vi.mock("../services/marketing/pageBranding",()=>({readMarketingPageBranding:vi.fn().mockResolvedValue({pageRole:"center",pageId:"1",name:"Fixture",address:"Fixture address",phone:"000",logo:Buffer.alloc(0)}),brandMarketingImageUrl:vi.fn(async(url:string)=>url),prepareMarketingPublication:vi.fn(async(message:string,imageUrl:string|null)=>({message,imageUrl}))}));
import {
  centralMarketingInput,
  generateCentralMarketingDraft,
  marketingUsageId,
} from "../services/ai/marketingDraft";
import { marketingRouter } from "../routers/marketing";
import { makeCallerAs } from "./helpers/auth";
import {
  recoveryInput,
  recoverCentralMarketing,
} from "../services/ai/marketingRecovery";
const request = {
  requestId: "00000000-0000-4000-8000-000000000001",
  topic: "الكشف الدوري",
  pageRole: "center" as const,
  postDay: "saturday" as const,
};
afterEach(() => vi.unstubAllEnvs());
describe("central marketing draft boundary", () => {
  it("requires a separate recovery ID and defaults to no paid image generation", () => {
    expect(
      recoveryInput.parse({
        jobId: request.requestId,
        requestId: "00000000-0000-4000-8000-000000000002",
      }).allowImageGeneration,
    ).toBe(false);
    expect(
      recoveryInput.safeParse({
        jobId: request.requestId,
        requestId: request.requestId,
      }).success,
    ).toBe(false);
    expect(
      recoveryInput.safeParse({
        jobId: request.requestId,
        requestId: "00000000-0000-4000-8000-000000000002",
        prompt: "replace instructions",
      }).success,
    ).toBe(false);
  });
  it("does not recover or reserve usage when the module is disabled", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
    await expect(
      recoverCentralMarketing(
        {
          jobId: request.requestId,
          requestId: "00000000-0000-4000-8000-000000000002",
          allowImageGeneration: true,
        },
        1,
      ),
    ).rejects.toThrow("disabled");
  });
  it("separates text and image idempotency keys while preserving the parent request", () => {
    const textId = marketingUsageId(request.requestId, "marketing.text");
    const imageId = marketingUsageId(request.requestId, "marketing.image");
    expect(
      centralMarketingInput.shape.requestId.safeParse(textId).success,
    ).toBe(true);
    expect(textId).not.toBe(imageId);
    expect(marketingUsageId(request.requestId, "marketing.text")).toBe(textId);
    expect(
      marketingUsageId(
        "00000000-0000-4000-8000-000000000002",
        "marketing.text",
      ),
    ).not.toBe(textId);
  });
  it("rejects extra provider instructions and unknown page/day values", () => {
    expect(
      centralMarketingInput.safeParse({ ...request, publish: true }).success,
    ).toBe(false);
    expect(
      centralMarketingInput.safeParse({ ...request, pageRole: "other" })
        .success,
    ).toBe(false);
    expect(
      centralMarketingInput.safeParse({ ...request, postDay: "monday" })
        .success,
    ).toBe(false);
  });
  it("does not reach database or generation while disabled", async () => {
    vi.stubEnv("AI_CORE_MANAGEMENT_ENABLED", "false");
    await expect(generateCentralMarketingDraft(request, 1)).rejects.toThrow(
      "disabled",
    );
  });
  it("rejects non-admin generation and job history access", async () => {
    const caller = marketingRouter.createCaller(makeCallerAs("doctor"));
    await expect(caller.generateCentralPost(request)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(caller.centralGenerationJobs()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.centralGenerationJob({ requestId: request.requestId }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.regenerateCentralImage({
        requestId: request.requestId,
        postId: 75,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.centralSchedulerProviders()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      caller.centralRecoveryPlan({ jobId: request.requestId }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.recoverCentralJob({
        jobId: request.requestId,
        requestId: "00000000-0000-4000-8000-000000000002",
        allowImageGeneration: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.setCentralSchedulerProvider({
        pageRole: "center",
        provider: "central",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
