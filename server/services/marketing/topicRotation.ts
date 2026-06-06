/**
 * Marketing topic rotation.
 * Each day has a fixed list; we pick by round-robin based on total post count for that day.
 */

export const TOPICS_BY_DAY = {
  saturday: [
    "LASIK",
    "Femto LASIK",
    "PRK",
    "ICL لتصحيح الإبصار",
    "الاستيغماتيزم (اللابؤرية)",
    "البنتاكام",
    "رسم خريطة القرنية",
    "سماكة القرنية",
    "الفحص قبل الليزك",
    "تقنيات تصحيح الإبصار",
  ] as const,
  tuesday: [
    "المياه البيضاء (الكتاراكت)",
    "العدسات عالية الجودة",
    "القرنية المخروطية (Keratoconus)",
    "ربط ألياف القرنية (Cross Linking)",
    "أمراض القرنية",
    "زراعة القرنية",
  ] as const,
  thursday: [
    "جفاف العين",
    "الجلوكوما (المياه الزرقاء)",
    "السكري وصحة العين",
    "صحة الشبكية",
    "مشاكل الإبصار عند الأطفال",
    "الفحص الدوري للعيون",
    "إجهاد العيون من الشاشات",
  ] as const,
} as const;

export type PostDay = keyof typeof TOPICS_BY_DAY;
export type TopicForDay<D extends PostDay> = (typeof TOPICS_BY_DAY)[D][number];

/**
 * Pick the next topic for a given day using round-robin index.
 * `usedCount` is the number of posts already generated for that day.
 */
export function pickTopic(day: PostDay, usedCount: number): string {
  const topics = TOPICS_BY_DAY[day] as readonly string[];
  return topics[usedCount % topics.length] ?? topics[0]!;
}

export const DAY_CATEGORY_LABELS: Record<PostDay, string> = {
  saturday: "تصحيح الإبصار والبنتاكام",
  tuesday: "المياه البيضاء والقرنية",
  thursday: "صحة العيون العامة",
};
