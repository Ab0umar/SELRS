import { createHash } from "node:crypto";

function normalizedWords(topic: string) {
  return topic
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
const aliases = [
  ["LASIK", "الليزك", "ليزك", "تصحيح الإبصار بالليزك"],
  ["Femto LASIK", "FemtoLASIK", "الفيمتو ليزك", "فيمتو ليزك", "الفيمتوليزك"],
  ["PRK", "الليزر السطحي", "ليزر سطحي"],
  [
    "الفحص الدوري للعيون",
    "الكشف الدوري للعين",
    "الكشف الدوري",
    "فحص العين الدوري",
    "المتابعة الدورية لصحة العين",
    "تذكير بالكشف الدوري على العين",
  ],
  ["المياه البيضاء (الكتاراكت)", "المياه البيضاء", "الكتاراكت", "Cataract"],
  ["الجلوكوما (المياه الزرقاء)", "الجلوكوما", "المياه الزرقاء", "Glaucoma"],
  ["القرنية المخروطية (Keratoconus)", "القرنية المخروطية", "Keratoconus"],
  ["ربط ألياف القرنية (Cross Linking)", "ربط الياف القرنية", "Cross Linking"],
  ["الاستيغماتيزم (اللابؤرية)", "الاستيغماتيزم", "اللابؤرية", "Astigmatism"],
];
const canonical = new Map(
  aliases.flatMap((group) =>
    group.map(
      (alias) => [normalizedWords(alias), normalizedWords(group[0])] as const,
    ),
  ),
);
export function marketingTopicIdentity(topic: string) {
  const words = normalizedWords(topic);
  return canonical.get(words) ?? words;
}
export function marketingTopicKey(topic: string) {
  const normalized = marketingTopicIdentity(topic);
  if (!normalized) throw new Error("الموضوع غير صالح");
  return createHash("sha256").update(normalized).digest("hex");
}
