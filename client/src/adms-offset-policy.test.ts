import { describe, expect, it } from "vitest";
import { decideAdmsOffset } from "../../server/services/attendance/admsOffsetPolicy";

describe("ADMS automatic offset policy", () => {
  it("calibrates on the first observation", () => {
    expect(decideAdmsOffset(undefined, 3, undefined, undefined)).toEqual({ offset: 3, pending: undefined, changed: true });
  });

  it("ignores observations while a manual override is set", () => {
    expect(decideAdmsOffset(undefined, 3, undefined, "6").changed).toBe(false);
    expect(decideAdmsOffset(6, 3, 3, "6").offset).toBe(6);
  });

  it("needs two consecutive matching observations to change a calibrated offset", () => {
    const first = decideAdmsOffset(3, 4, undefined, undefined);
    expect(first).toEqual({ offset: 3, pending: 4, changed: false });
    const second = decideAdmsOffset(3, 4, first.pending, undefined);
    expect(second).toEqual({ offset: 4, pending: undefined, changed: true });
  });

  it("drops a pending change when the old value returns", () => {
    expect(decideAdmsOffset(3, 3, 4, undefined)).toEqual({ offset: 3, pending: undefined, changed: false });
  });
});

import { applyAdmsTimeFix, parseAdmsTimeFixes } from "../../server/services/attendance/admsOffsetPolicy";

describe("ADMS time fix windows", () => {
  const fixes = parseAdmsTimeFixes("SN1|2026-10-28 00:00:00|2026-10-28 12:00:00|-60; bad|entry");

  it("parses valid entries and skips malformed ones", () => {
    expect(fixes).toHaveLength(1);
    expect(fixes[0].offsetMinutes).toBe(-60);
  });

  it("shifts only punches of that device inside the window", () => {
    const inside = new Date("2026-10-28T09:30:00");
    expect(applyAdmsTimeFix("SN1", inside, fixes)).toEqual(new Date("2026-10-28T08:30:00"));
    expect(applyAdmsTimeFix("SN1", new Date("2026-10-28T12:00:00"), fixes)).toEqual(new Date("2026-10-28T12:00:00"));
    expect(applyAdmsTimeFix("SN2", inside, fixes)).toEqual(inside);
  });
});
