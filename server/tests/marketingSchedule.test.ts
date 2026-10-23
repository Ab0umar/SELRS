import { describe, expect, it } from "vitest";
import {
  marketingSlotForWeekday,
  marketingSlotLabel,
} from "../../shared/marketingSchedule";

describe("per-page marketing calendar", () => {
  it.each([
    [0, "saturday", undefined],
    [1, undefined, "tuesday"],
    [2, "tuesday", undefined],
    [3, undefined, "thursday"],
    [4, "thursday", undefined],
    [5, undefined, undefined],
    [6, undefined, "saturday"],
  ] as const)(
    "assigns weekday %s to only the intended page",
    (weekday, center, doctor) => {
      expect(marketingSlotForWeekday("center", weekday)).toBe(center);
      expect(marketingSlotForWeekday("doctor", weekday)).toBe(doctor);
    },
  );

  it("labels stored topic slots using the page calendar", () => {
    expect(marketingSlotLabel("saturday", "center")).toBe("الأحد");
    expect(marketingSlotLabel("tuesday", "doctor")).toBe("الاثنين");
    expect(marketingSlotLabel("thursday", "doctor")).toBe("الأربعاء");
  });
});
