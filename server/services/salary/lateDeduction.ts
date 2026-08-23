export interface LateTier {
  minMin: number;
  maxMin: number | null;
  type?: "linear";
  dayFraction?: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function getPayrollWeekKey(workDate: Date | string): string {
  const date =
    workDate instanceof Date
      ? new Date(
          workDate.getFullYear(),
          workDate.getMonth(),
          workDate.getDate(),
          12,
        )
      : new Date(`${String(workDate).slice(0, 10)}T12:00:00`);
  const cycleStart = new Date(date.getFullYear(), date.getMonth(), 26, 12);
  if (date < cycleStart) {
    cycleStart.setMonth(cycleStart.getMonth() - 1);
  }
  const daysIntoCycle = Math.floor(
    (date.getTime() - cycleStart.getTime()) / (24 * 60 * 60 * 1000),
  );
  cycleStart.setDate(cycleStart.getDate() + Math.floor(daysIntoCycle / 7) * 7);

  const year = cycleStart.getFullYear();
  const month = String(cycleStart.getMonth() + 1).padStart(2, "0");
  const day = String(cycleStart.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
    const weeklyMultiplier = Math.min(Math.max(linearOccurrence, 1), 4);
    return round2(lateMinutes * minuteRate * weeklyMultiplier);
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
