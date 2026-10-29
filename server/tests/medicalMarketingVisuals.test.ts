import { describe, expect, it } from "vitest";
import { getTopicImageHint } from "../services/marketing/contentGenerator.service";
import { medicalVisualDirection } from "../services/marketing/medicalVisuals";
import { TOPICS_BY_DAY } from "../services/marketing/topicRotation";
import {
  marketingImageData,
  marketingVisualBrief,
} from "../services/marketing/prompts";
describe("medical marketing image relevance", () => {
  it("covers every scheduled topic and never asks AI to counterfeit a medical device", () => {
    for (const topic of Object.values(TOPICS_BY_DAY).flat())
      expect(medicalVisualDirection(topic).knownTopic).toBe(true);
    expect(medicalVisualDirection("البنتاكام")).toMatchObject({
      medium: "medical-illustration",
      equipmentKind: "pentacam",
    });
    expect(medicalVisualDirection("الفحص الدوري للعيون").equipmentKind).toBe(
      "slit-lamp",
    );
  });
  it("explains dry eye through the tear film rather than a decorative tear portrait", () => {
    expect(getTopicImageHint("جفاف العين")).toMatch(/tear film/i);
    expect(getTopicImageHint("جفاف العين")).not.toMatch(
      /^single tear drop on an eyelash/i,
    );
  });
  it("explains corneal thickness without inventing a probe touching an eye", () => {
    expect(getTopicImageHint("سماكة القرنية")).toMatch(
      /corneal cross.section/i,
    );
    expect(getTopicImageHint("سماكة القرنية")).not.toMatch(
      /probe near an eye/i,
    );
  });
  it("distinguishes PRK from the flap used in LASIK", () => {
    expect(getTopicImageHint("PRK")).toMatch(/no flap/i);
  });
  it("does not pass a stale generic visual suggestion as the subject of a known medical topic", () => {
    const data = marketingImageData(
      {
        title: "جفاف العين",
        content: "توضيح طبقة الدموع",
        imagePrompt: "Beautiful eye portrait with a large tear",
      },
      "جفاف العين",
    );
    expect(data.suggestedVisual).toBeUndefined();
    expect(marketingVisualBrief("جفاف العين")).toMatch(/medical illustration/i);
  });
});
