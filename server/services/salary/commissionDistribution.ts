function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampRatio(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function calcWeightedCommissionShare(
  pool: number,
  grossWeight: number,
  totalGrossWeight: number,
  netAmount: number,
  leaveMultiplier = 1,
): { raw: number; payable: number } {
  if (pool <= 0 || grossWeight <= 0 || totalGrossWeight <= 0) {
    return { raw: 0, payable: 0 };
  }

  const raw = round2((grossWeight / totalGrossWeight) * pool);
  const payable = calcAdjustedCommission(
    raw,
    grossWeight,
    netAmount,
    leaveMultiplier,
  );
  return { raw, payable };
}

export function calcAdjustedCommission(
  rawCommission: number,
  grossBasis: number,
  netAmount: number,
  leaveMultiplier = 1,
): number {
  if (rawCommission <= 0 || grossBasis <= 0) return 0;
  const netRatio = clampRatio(netAmount / grossBasis);
  return round2(rawCommission * netRatio * clampRatio(leaveMultiplier));
}
