import { describe, expect, it } from "vitest";
import {
  marketingTopicIdentity,
  marketingTopicKey,
} from "../services/marketing/topicIdentity";
import {
  pickUnpublishedTopic,
  TOPICS_BY_DAY,
} from "../services/marketing/topicRotation";
describe("published marketing topics never rotate back", () => {
  it("skips any published topic across index wraparound", () => {
    expect(pickUnpublishedTopic("saturday", 0, ["lasik"])).toBe("Femto LASIK");
    expect(pickUnpublishedTopic("saturday", TOPICS_BY_DAY.saturday.length, ["LASIK"])).toBe("Femto LASIK");
  });
  it("stops when every topic was published instead of restarting the list", () => {
    expect(
      pickUnpublishedTopic("thursday", 100, [...TOPICS_BY_DAY.thursday]),
    ).toBeUndefined();
  });
  it("preserves reverse order while excluding retired topics", () => {
    expect(
      pickUnpublishedTopic("tuesday", 0, [TOPICS_BY_DAY.tuesday.at(-1)!], "reverse"),
    ).toBe(TOPICS_BY_DAY.tuesday.at(-2));
  });
  it("matches case, punctuation, Arabic marks and known bilingual aliases", () => {
    expect(marketingTopicKey("  LASIK!! ")).toBe(marketingTopicKey("اللِّيزك"));
    expect(marketingTopicKey("Cataract")).toBe(
      marketingTopicKey("المياه البيضاء (الكتاراكت)"),
    );
    expect(marketingTopicIdentity("أمراض   القرنية")).toBe(
      marketingTopicIdentity("امراض القرنية"),
    );
    expect(marketingTopicKey("Femto LASIK")).not.toBe(
      marketingTopicKey("LASIK"),
    );
  });
});
