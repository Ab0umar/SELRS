import { describe, expect, it } from "vitest";
import { toDateOnlyKey } from "../../server/services/attendance/dateOnly";

describe("toDateOnlyKey", () => {
  it("normalizes a Drizzle SQL DATE returned as a Date object", () => {
    expect(toDateOnlyKey(new Date("2026-09-08T00:00:00.000Z"))).toBe(
      "2026-09-08",
    );
  });

  it("preserves SQL date strings without timezone conversion", () => {
    expect(toDateOnlyKey("2026-09-08T00:00:00.000Z")).toBe("2026-09-08");
    expect(toDateOnlyKey("2026-09-08")).toBe("2026-09-08");
  });
});
