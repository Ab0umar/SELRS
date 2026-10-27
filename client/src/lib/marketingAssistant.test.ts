import { describe, it, expect } from "vitest";
import {
  configuredMarketingAssistant,
  marketingAssistantValue,
} from "../../../shared/marketing-assistant";
describe("configured marketing assistant", () => {
  const profiles = [
    {
      workload: "marketing.text",
      provider: "gemini" as const,
      model: "gemini-text",
      enabled: true,
    },
    {
      workload: "marketing.image",
      provider: "gemini" as const,
      model: "gemini-image",
      enabled: true,
    },
  ];
  it("uses the configured provider and both models", () => {
    const selection = configuredMarketingAssistant(profiles)!;
    expect(selection.provider).toBe("gemini");
    expect(marketingAssistantValue(selection)).toBe(
      "gemini:gemini-text|gemini-image",
    );
  });
  it("does not fall back when a required profile is missing or disabled", () => {
    expect(configuredMarketingAssistant([])).toBeUndefined();
    expect(
      configuredMarketingAssistant(
        profiles.map((p) => ({ ...p, enabled: false })),
      ),
    ).toBeUndefined();
  });
  it("preserves a configured Manus model", () => {
    expect(
      configuredMarketingAssistant(
        profiles.map((p) => ({
          ...p,
          provider: "manus" as const,
          model: "lite",
        })),
      ),
    ).toEqual({ provider: "manus", model: "lite" });
  });
});
