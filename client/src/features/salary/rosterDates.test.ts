import { describe, expect, it } from "vitest";
import { rosterAddDates, rosterDates } from "./rosterDates";

describe("roster period dates (26th–25th regression)", () => {
  const range = { from: "2026-08-26", to: "2026-09-25" };

  it("includes the previous month's last days and excludes the next roster", () => {
    const dates = rosterDates(range.from, range.to);
    expect(dates).toHaveLength(31);
    expect(dates.slice(0, 6)).toEqual([
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
    ]);
    expect(dates.at(-1)).toBe("2026-09-25");
    expect(rosterAddDates(range, "month", "")).toEqual(dates);
  });

  it.each([
    ["day", "2026-08-29", ["2026-08-29"]],
    ["day", "2026-09-29", []],
    [
      "week",
      "2026-08-26",
      ["2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30"],
    ],
    [
      "weekly",
      "2026-08-26",
      ["2026-08-26", "2026-09-02", "2026-09-09", "2026-09-16", "2026-09-23"],
    ],
  ] as const)(
    "bounds %s additions anchored at %s to the roster",
    (period, anchor, expected) => {
      expect(rosterAddDates(range, period, anchor)).toEqual(expected);
    },
  );

  it.each([
    ["2026-12-26", "2027-01-25", 31],
    ["2028-02-26", "2028-03-25", 29],
    ["2026-08-26", "2026-08-26", 1],
    ["2026-08-27", "2026-08-26", 0],
  ])("handles the boundary %s through %s", (from, to, count) => {
    expect(rosterDates(from, to)).toHaveLength(count);
  });
});
