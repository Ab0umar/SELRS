import { describe, expect, it } from "vitest";
import { pickTopic } from "../services/marketing/topicRotation";

describe("marketing topic rotation", () => {
  it("keeps the center moving forward", () => {
    expect(pickTopic("saturday", 0, "forward")).toBe("LASIK");
    expect(pickTopic("saturday", 1, "forward")).toBe("Femto LASIK");
  });

  it("starts the doctor at the opposite end of the same day bank", () => {
    expect(pickTopic("saturday", 0, "reverse")).toBe("تقنيات تصحيح الإبصار");
    expect(pickTopic("saturday", 1, "reverse")).toBe("الفحص قبل الليزك");
  });
});
