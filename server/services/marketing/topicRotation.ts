/**
 * Marketing topic rotation.
 * Each day has a fixed list; we pick by round-robin based on total post count for that day.
 */

import { marketingTopicIdentity } from "./topicIdentity";
import { MARKETING_CONTENT_CATEGORIES } from "../../../shared/marketingSchedule";
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
export type TopicDirection = "forward" | "reverse";

/**
 * Pick the next topic for a given day using round-robin index.
 * `usedCount` is the number of posts already generated for that day.
 */
export function pickTopic(
  day: PostDay,
  usedCount: number,
  direction: TopicDirection = "forward",
): string {
  const topics = TOPICS_BY_DAY[day] as readonly string[];
  const offset = usedCount % topics.length;
  const index = direction === "reverse" ? topics.length - 1 - offset : offset;
  return topics[index] ?? topics[0]!;
}

export const DAY_CATEGORY_LABELS = MARKETING_CONTENT_CATEGORIES;

export function pickUnpublishedTopic(
  day: PostDay,
  usedCount: number,
  publishedTopics: readonly string[],
  direction: TopicDirection = "forward",
): string | undefined {
  const published = new Set(publishedTopics.map(marketingTopicIdentity));
  const topics = TOPICS_BY_DAY[day];
  for (let offset = 0; offset < topics.length; offset++) {
    const candidate = pickTopic(day, usedCount + offset, direction);
    if (!published.has(marketingTopicIdentity(candidate))) return candidate;
  }
  return undefined;
}
