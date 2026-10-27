// Persisted keys identify topic slots; calendar weekdays differ by page.
export const MARKETING_SCHEDULE = {
  center: {
    saturday: { jsDay: 0, label: "الأحد" },
    tuesday: { jsDay: 2, label: "الثلاثاء" },
    thursday: { jsDay: 4, label: "الخميس" },
  },
  doctor: {
    saturday: { jsDay: 6, label: "السبت" },
    tuesday: { jsDay: 1, label: "الاثنين" },
    thursday: { jsDay: 3, label: "الأربعاء" },
  },
} as const;

export type MarketingScheduleSlot = keyof typeof MARKETING_SCHEDULE.center;

export const MARKETING_CONTENT_CATEGORIES: Record<
  MarketingScheduleSlot,
  string
> = {
  saturday: "تصحيح الإبصار والبنتاكام",
  tuesday: "المياه البيضاء والقرنية",
  thursday: "صحة العيون العامة",
};

export function marketingSlotDescription(
  slot: MarketingScheduleSlot,
  pageRole: "center" | "doctor",
) {
  return `${marketingSlotLabel(slot, pageRole)} — ${MARKETING_CONTENT_CATEGORIES[slot]}`;
}

export function marketingSlotLabel(
  slot: string,
  pageRole: "center" | "doctor" = "center",
): string {
  return (
    MARKETING_SCHEDULE[pageRole][slot as MarketingScheduleSlot]?.label ?? slot
  );
}

export function marketingSlotForWeekday(
  pageRole: keyof typeof MARKETING_SCHEDULE,
  jsDay: number,
): MarketingScheduleSlot | undefined {
  return (
    Object.keys(MARKETING_SCHEDULE[pageRole]) as MarketingScheduleSlot[]
  ).find((slot) => MARKETING_SCHEDULE[pageRole][slot].jsDay === jsDay);
}
