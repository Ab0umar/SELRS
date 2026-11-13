// Deterministic review rules for AI medical posts. A flagged draft is saved but never auto-published.
type Rule = { reason: string; pattern: RegExp; fields: "all" | "content" };

const DIGIT = "[0-9٠-٩]";

const RULES: Rule[] = [
  {
    reason: "يذكر سعرًا أو عملة",
    pattern: /جنيه|ج\.م|دولار|ريال|\bEGP\b|\bLE\b|\$|سعر|أسعار|تكلفة|\bprice/i,
    fields: "all",
  },
  {
    reason: "يذكر خصمًا أو عرضًا",
    pattern: /خصم|تخفيض|عرض خاص|عروض|مجان|\bfree\b|discount|\boffer/i,
    fields: "all",
  },
  {
    reason: "يحتوي صيغة ضمان",
    pattern: /ضمان|مضمون|نضمن|guarantee/i,
    fields: "all",
  },
  {
    reason: "يذكر نسبة أو إحصائية",
    pattern: new RegExp(
      `${DIGIT}+([.,٫]${DIGIT}+)?\\s*(%|٪)|في المائة|في المئة|بالمائة|بالمئة|نسبة نجاح|percent`,
      "i",
    ),
    fields: "all",
  },
  {
    reason: "يحتوي رقم هاتف داخل النص",
    pattern: new RegExp(`(?:\\+|00)?${DIGIT}(?:[\\s-]?${DIGIT}){7,}`),
    fields: "content",
  },
  {
    reason: "يحتوي رابطًا داخل النص",
    pattern: /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|eg|cc|io)\b/i,
    fields: "content",
  },
];

export function checkMarketingContent(post: {
  title?: string | null;
  content?: string | null;
  cta?: string | null;
}): string[] {
  const content = post.content ?? "";
  const all = [post.title ?? "", content, post.cta ?? ""].join("\n");
  return RULES.filter((rule) =>
    rule.pattern.test(rule.fields === "content" ? content : all),
  ).map((rule) => rule.reason);
}
