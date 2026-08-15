export interface LateTier {
  minMin: number;
  maxMin: number | null;
  type?: "linear";
  dayFraction?: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function normalizeLateTiers(tiers: LateTier[]): LateTier[] {
  return tiers.map((tier, index) => {
    if (index === 0) return { ...tier };
    const previous = tiers[index - 1];
    return {
      ...tier,
      minMin:
        previous.maxMin === null ? tier.minMin : previous.maxMin + 1,
    };
  });
}

export function calcLateDayTier(
  lateMinutes: number,
  dailyRate: number,
  minuteRate: number,
  tiers: LateTier[],
  linearOccurrence = 0,
): number {
  if (lateMinutes <= 0) return 0;
  const tier = tiers.find(
    (item) =>
      lateMinutes >= item.minMin &&
      (item.maxMin === null || lateMinutes <= item.maxMin),
  );
  if (!tier) return 0;
  if (tier.type === "linear") {
    if (linearOccurrence >= 5) return round2(0.5 * dailyRate);
    if (linearOccurrence >= 3) return round2(0.25 * dailyRate);
    return round2(lateMinutes * minuteRate);
  }
  return round2((tier.dayFraction ?? 0) * dailyRate);
}

export function calcMissingPunchDeduction(
  occurrenceCount: number,
  dailyRate: number,
): number {
  if (occurrenceCount <= 0) return 0;

  let dayFractions = 0;
  for (let occurrence = 1; occurrence <= occurrenceCount; occurrence += 1) {
    if (occurrence >= 4) dayFractions += 1;
    else if (occurrence === 3) dayFractions += 0.5;
    else dayFractions += 0.25;
  }
  return Math.round(dayFractions * dailyRate * 100) / 100;
}
