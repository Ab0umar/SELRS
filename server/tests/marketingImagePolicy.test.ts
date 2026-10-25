import { describe, expect, it, vi } from "vitest";
vi.mock("../_core/env", () => ({
  ENV: {
    falApiKey: "",
    forgeApiKey: "fixture",
    forgeApiUrl: "https://fixture.invalid",
    openaiApiKey: "",
  },
}));
vi.mock("../_core/imageGeneration", () => ({
  generateImage: vi
    .fn()
    .mockResolvedValue({ url: "https://fixture.invalid/image.png" }),
}));
import { generateImage } from "../_core/imageGeneration";
import { generateMarketingImage } from "../services/marketing/imageGenerator.service";
import {
  marketingImagePrompt,
  MARKETING_IMAGE_PEOPLE_POLICY,
} from "../services/marketing/imagePolicy";
describe("marketing image people restriction", () => {
  it("appends the mandatory restriction after an older conflicting visual brief", () => {
    const prompt = marketingImagePrompt(
      "An old post describes a female receptionist",
    );
    expect(prompt.endsWith(MARKETING_IMAGE_PEOPLE_POLICY)).toBe(true);
  });
  it("applies the policy at the legacy provider boundary, even for a saved old prompt", async () => {
    await generateMarketingImage("Older saved visual direction", 123, []);
    expect(generateImage).toHaveBeenCalledWith({
      prompt: marketingImagePrompt("Older saved visual direction"),
    });
  });
});
