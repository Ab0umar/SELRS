import { describe, expect, it, vi } from "vitest";

vi.mock("../_core/env", () => ({ ENV: { geminiApiKey: "" } }));
import {
  buildBrandAwareImagePrompt,
  buildBrandProfile,
  parseStyleAttributes,
  type StyleAttributes,
} from "../services/marketing/brandStyleAnalyzer.service";
import { getTopicImageHint } from "../services/marketing/contentGenerator.service";

const analysis: StyleAttributes = {
  dominantColors: ["#123456", "white"],
  colorMood: "هادئ وواثق",
  layoutStyle: "شبكة متوازنة ومساحات بيضاء واضحة",
  imageComposition: "عنصر بصري رئيسي مع مساحة للنص",
  brandingStyle: "طبي دافئ وحديث",
  medicalVisualStyle: "تصوير سريري واقعي",
  ctaPositioning: "أسفل التصميم",
  logoPlacementStyle: "أعلى اليمين",
  typographyStyle: "خط عربي واضح بوزن متوسط",
  overallAesthetic:
    "هوية هادئة ونظيفة يمكن تمييزها من الألوان والمساحات البيضاء",
};

describe("brand style analyzer", () => {
  it("rejects incomplete model output instead of accepting a type cast", () => {
    expect(parseStyleAttributes({ dominantColors: ["#123456"] })).toBeNull();
    expect(parseStyleAttributes(analysis)).toEqual(analysis);
  });

  it("keeps typography when building a profile from one design", async () => {
    const profile = await buildBrandProfile([analysis], 1);
    expect(profile?.typographyStyle).toBe(analysis.typographyStyle);
    expect(profile?.designCount).toBe(1);
  });

  it("keeps typography when aggregating multiple designs without Gemini", async () => {
    const profile = await buildBrandProfile(
      [analysis, { ...analysis, typographyStyle: "خط هندسي خفيف" }],
      2,
    );
    expect(profile?.typographyStyle).toBe(analysis.typographyStyle);
    expect(profile?.designCount).toBe(2);
  });

  it("includes the complete visual identity in the shared image prompt", () => {
    const prompt = buildBrandAwareImagePrompt("فحص النظر", {
      dominantColors: "#123456",
      colorPalette: "هادئة وموثوقة",
      layoutStyle: "شبكة متوازنة",
      imageComposition: "عنصر بصري رئيسي",
      brandingStyle: "طبي دافئ",
      medicalVisualStyle: "تصوير واقعي",
      ctaPositioning: "أسفل الإطار",
      logoPlacementStyle: "أعلى اليمين",
      typographyStyle: "خط عربي واضح",
      overallAesthetic: "نظيف وهادئ",
    });

    expect(prompt).toContain("شبكة متوازنة");
    expect(prompt).toContain("أعلى اليمين");
    expect(prompt).toContain("خط عربي واضح");
    expect(prompt).toContain("أسفل الإطار");
  });

  it("maps Arabic LASIK topic names to a laser-specific visual direction", () => {
    const hint = getTopicImageHint("الـLASIK");
    expect(hint).toContain("laser");
    expect(hint).not.toContain("generic eye exam");
  });
});
