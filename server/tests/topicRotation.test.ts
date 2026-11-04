import { describe, expect, it } from "vitest";
import { pickTopic, TOPICS_BY_DAY } from "../services/marketing/topicRotation";

describe("marketing topic rotation", () => {
  it("keeps the center moving forward", () => {
    expect(pickTopic("saturday", 0, "forward")).toBe("LASIK");
    expect(pickTopic("saturday", 1, "forward")).toBe("Femto LASIK");
  });

  it("starts the doctor at the opposite end of the same day bank", () => {
    // Derived from the bank so adding topics does not break the rule under test.
    const bank = TOPICS_BY_DAY.saturday;
    expect(pickTopic("saturday", 0, "reverse")).toBe(bank[bank.length - 1]);
    expect(pickTopic("saturday", 1, "reverse")).toBe(bank[bank.length - 2]);
  });
});
