import { describe, expect, it } from "vitest";
import {
  calcAdjustedCommission,
  calcWeightedCommissionShare,
} from "../../../../server/services/salary/commissionDistribution";

describe("salary commission distribution", () => {
  it("distributes by full salary then applies the net ratio once", () => {
    const share = calcWeightedCommissionShare(2_000, 10_000, 20_000, 9_000);

    expect(share.raw).toBe(1_000);
    expect(share.payable).toBe(900);
  });

  it("does not redistribute a deducted share to other employees", () => {
    const deducted = calcWeightedCommissionShare(2_000, 10_000, 20_000, 9_000);
    const full = calcWeightedCommissionShare(2_000, 10_000, 20_000, 10_000);

    expect(deducted.payable).toBe(900);
    expect(full.payable).toBe(1_000);
    expect(deducted.payable + full.payable).toBe(1_900);
  });

  it("applies the leave multiplier separately", () => {
    const share = calcWeightedCommissionShare(2_000, 10_000, 20_000, 9_000, 0.75);

    expect(share.raw).toBe(1_000);
    expect(share.payable).toBe(675);
  });

  it("applies deductions to an equal exam share", () => {
    expect(calcAdjustedCommission(1_000, 10_000, 9_000, 0.75)).toBe(675);
  });
});
