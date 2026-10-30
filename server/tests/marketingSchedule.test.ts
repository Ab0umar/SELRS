import { describe, expect, it } from "vitest";
import {
  marketingSlotForWeekday,
  marketingSlotLabel,
  marketingSlotDescription,
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
  it("keeps content categories consistent while changing the calendar by page", () => {
    expect(marketingSlotDescription("tuesday", "center")).toBe(
      "الثلاثاء — موضوع متنوع من مجالات طب العيون",
    );
    expect(marketingSlotDescription("tuesday", "doctor")).toBe(
      "الاثنين — موضوع متنوع من مجالات طب العيون",
    );
    expect(marketingSlotDescription("thursday", "doctor")).toBe(
      "الأربعاء — موضوع متنوع من مجالات طب العيون",
    );
  });
});
