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
    "الفرق بين قصر النظر وطول النظر",
    "العدسات اللاصقة قبل فحوصات تصحيح الإبصار",
    "ما الذي يقيسه فحص انكسار العين؟",
    "تغير مقاس النظارة وثبات النظر",
    "ما الفرق بين النظارة والعدسات المزروعة؟",
    "أسئلة تسألها لطبيبك قبل تصحيح الإبصار",
    "لماذا قد تظل نظارة القراءة مطلوبة مع التقدم في العمر؟",
    "ماذا يعني قياس محور الاستيغماتيزم؟",
    "الفرق بين فحص النظر وفحص صحة العين",
    "لماذا تختلف خطة تصحيح الإبصار من شخص لآخر؟",
    "ما المعلومات التي تخبر بها طبيبك قبل فحوصات النظر؟",
    "كيف تقرأ رموز قصر وطول النظر في وصفة النظارة؟",
  ] as const,
  tuesday: [
    "المياه البيضاء (الكتاراكت)",
    "العدسات عالية الجودة",
    "القرنية المخروطية (Keratoconus)",
    "ربط ألياف القرنية (Cross Linking)",
    "أمراض القرنية",
    "زراعة القرنية",
    "كيف تؤثر المياه البيضاء على وضوح الألوان؟",
    "ما الفرق بين المياه البيضاء والمياه الزرقاء؟",
    "لماذا تُقاس أبعاد العين قبل زراعة العدسة؟",
    "الفرق بين العدسة الطبيعية والعدسة المزروعة",
    "فرك العين وصحة القرنية",
    "ماذا يعني تغير شكل القرنية؟",
    "المياه البيضاء وصعوبة القيادة ليلًا",
    "لماذا تختلف أنواع العدسات المزروعة؟",
    "ما الذي تتضمنه متابعة العين بعد جراحة المياه البيضاء؟",
    "الفرق بين عتامة العدسة وعتامة القرنية",
    "لماذا يراجع الطبيب سطح العين قبل قياسات العدسة؟",
    "دور القرنية في تركيز الضوء داخل العين",
  ] as const,
  thursday: [
    "جفاف العين",
    "الجلوكوما (المياه الزرقاء)",
    "السكري وصحة العين",
    "صحة الشبكية",
    "مشاكل الإبصار عند الأطفال",
    "الفحص الدوري للعيون",
    "إجهاد العيون من الشاشات",
    "الفرق بين حدة الإبصار ومجال الإبصار",
    "لماذا يفحص الطبيب قاع العين؟",
    "صحة العين مع استخدام العدسات اللاصقة",
    "الفرق بين حساسية العين وجفاف العين",
    "النظارة الشمسية وحماية العين من الأشعة فوق البنفسجية",
    "لماذا تختلف مقاسات النظر بين العينين؟",
    "الرمش ودوره في توزيع الدموع",
    "لماذا يقيس طبيب العيون ضغط العين؟",
    "ما وظيفة العصب البصري؟",
    "دور البقعة الصفراء في رؤية التفاصيل",
    "ما الفرق بين الرؤية المركزية والرؤية الطرفية؟",
    "لماذا يسأل طبيب العيون عن التاريخ المرضي للعائلة؟",
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
