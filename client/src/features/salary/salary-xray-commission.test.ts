import { describe, expect, it } from "vitest";
import {
  calcXray1502Pool,
  calcXray1600Pool,
  calcXrayRemainingPool,
} from "../../../../server/services/salary/xrayCommission";

describe("center xray commission pools", () => {
  it("uses July 2026 rates and configured prices", () => {
    expect(calcXray1600Pool(19_630, 550)).toBe(4_809.35);
    expect(calcXray1502Pool(12_100, 450)).toBe(3_327.5);
    expect(calcXrayRemainingPool(70_020, 400)).toBe(19_255.5);
  });

  it("returns zero when a configured price is invalid", () => {
    expect(calcXray1600Pool(19_630, 0)).toBe(0);
    expect(calcXray1502Pool(12_100, 0)).toBe(0);
    expect(calcXrayRemainingPool(70_020, 0)).toBe(0);
  });
});
