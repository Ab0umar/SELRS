import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type {
  AutoReplyChannel,
  AutoReplySettings,
} from "../../../shared/auto-reply";

export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function verifyMetaSignature(
  raw: Buffer,
  signature: string | undefined,
  secret: string,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature))
    return false;
  return timingSafeEqual(
    Buffer.from(signature.slice(7), "hex"),
    createHmac("sha256", secret).update(raw).digest(),
  );
}
export function englishFirst(text: string) {
  return /^[a-z]$/i.test(text.match(/\p{L}/u)?.[0] ?? "");
}
export function isPriceQuestion(text: string) {
  const normalized = text.replace(/[أإآ]/g, "ا").replace(/[ً-ْ]/g, "");
  return /(سعر|اسعار|تكلف|بكام|بكم|ب كام|(?:^|\s)كام(?:\s|[؟?]|$)|ثمن|price|pricing|cost|how much)/i.test(
    normalized,
  );
}
export function inWorkingHours(settings: AutoReplySettings, now = new Date()) {
  if (!settings.hoursEnabled) return true;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    value("weekday"),
  );
  const time = `${value("hour")}:${value("minute")}`;
  return settings.hours.some((h) =>
    h.start < h.end
      ? h.day === day && time >= h.start && time < h.end
      : (h.day === day && time >= h.start) ||
        ((h.day + 1) % 7 === day && time < h.end),
  );
}
export function withinReplyWindow(
  channel: AutoReplyChannel,
  lastInbound: Date,
  now = new Date(),
) {
  const age = now.getTime() - lastInbound.getTime();
  return (
    age >= -60_000 &&
    age < (channel === "facebook_comment" ? 60 * 60_000 : 24 * 60 * 60_000)
  );
}
export function safetyDecision(
  text: string,
): "human_requested" | "clinical" | "untrusted_instruction" | null {
  if (
    /(موظف|بشري|بنى ادم|بني آدم|مسؤول|مسئول|خدمة العملاء|كلمني حد|human|agent|representative)/i.test(
      text,
    )
  )
    return "human_requested";
  if (
    /(عيني|عينى|عنيا|زغلله|زغللة|مش شايف|نزيف|أعراض|اعراض|my eyes?|blur|vision loss|red eye|swoll|bleed|medication|medicine)/i.test(
      text,
    ) ||
    /(تشخيص|علاج|قطر[ةه]|دواء|جرع[ةه]|ألم|الم في|وجع|احمرار|فقد.*نظر|زغلل|ينفع.*ليزك|مناسب.*ليزك|صلاحية|اعمل.*ليزك|diagnos|treat|prescri|drops|pain|symptom|eligible|suitable|can i.*lasik)/i.test(
      text,
    )
  )
    return "clinical";
  if (
    /(ignore.*instruction|system prompt|api.?key|access.?token|تجاهل.*تعليمات|اكشف.*(سر|مفتاح)|تعليمات النظام)/i.test(
      text,
    )
  )
    return "untrusted_instruction";
  return null;
}
export function handoffText(
  reason: string,
  english: boolean,
  publicComment: boolean,
) {
  if (publicComment)
    return english
      ? "Please message the page so our team can help with your question."
      : "ابعتلنا رسالة على الصفحة وفريق المركز هيساعدك في استفسارك.";
  if (reason === "clinical")
    return english
      ? "Diagnosis, treatment and LASIK suitability require an eye examination. I'll refer your message to our team to help you arrange a visit."
      : "التشخيص والعلاج وتحديد مناسبة الليزك محتاجين كشف عند طبيب عيون. هحوّل رسالتك لموظف يساعدك في الاستفسار عن الكشف.";
  return english
    ? "I'll refer your message to a member of our team to help with accurate information."
    : "هحوّل رسالتك لموظف من المركز يساعدك بالمعلومة المؤكدة.";
}
export type KnowledgeItem = {
  targetPage?: string;
  id: number;
  title: string;
  content: string;
  keywords: string;
  kind: string;
};
export function replyTargetMatches(
  targetPage: string | undefined,
  channel: AutoReplyChannel,
  accountId?: string,
) {
  return (
    !targetPage ||
    targetPage === "all" ||
    (channel !== "whatsapp" &&
      (targetPage === "facebook" || targetPage === accountId))
  );
}
const normalize = (s: string) =>
  s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
export function retrieveKnowledge(query: string, entries: KnowledgeItem[]) {
  const terms = [
    ...new Set(normalize(query).match(/[\p{L}\p{N}]{2,}/gu) ?? []),
  ];
  return entries
    .map((entry) => ({
      entry,
      score: terms.reduce(
        (n, term) =>
          n +
          (normalize(
            `${entry.title} ${entry.keywords} ${entry.content}`,
          ).includes(term)
            ? 1
            : 0),
        0,
      ),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((r) => r.entry);
}
