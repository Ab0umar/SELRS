import { describe, expect, it } from "vitest";
import { isAiMobileApp, isAiMobilePath } from "./ai-mobile";

describe("AI mobile shell", () => {
  it("selects only the dedicated app without changing web or SELRS mobile", () => {
    expect(isAiMobileApp("Mozilla/5.0 Android SELRS-AI/1")).toBe(true);
    expect(isAiMobileApp("Mozilla/5.0 Android SELRS")).toBe(false);
    expect(isAiMobileApp("Mozilla/5.0 Chrome")).toBe(false);
    expect(isAiMobileApp("SELRS-AI/10")).toBe(false);
  });
  it("keeps AI and authentication flows inside the dedicated app", () => {
    for (const path of [
      "/ai",
      "/ai/marketing/drafts",
      "/login",
      "/force-password-change",
    ]) {
      expect(isAiMobilePath(path)).toBe(true);
    }
    for (const path of ["/", "/home", "/patients", "/ai-other", "/admin-hub"]) {
      expect(isAiMobilePath(path)).toBe(false);
    }
  });
});
