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
// The current message decides; the first message is used only when it has no letters.
export function replyInEnglish(text: string, firstText?: string) {
  return englishFirst(/\p{L}/u.test(text) ? text : (firstText ?? text));
}
export const unsupportedAcknowledgement = (english: boolean) =>
  english
    ? "We received your message and will pass it to a member of our team."
    : "وصلتنا رسالتك، وهنحوّلها لموظف من المركز يرد عليك.";
export function isSocialMessage(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[ً-ْـ]/g, "")
    .replace(/[\p{P}\p{S}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(?:(?:(?:السلام|سلام) عليكم|وعليكم السلام)(?: ورحمه الله| ورحمة الله)?(?: وبركاته)?|اهلا(?: وسهلا)?|مرحبا|هاي|ازيك|ازيكم|ازاي حضرتك|صباح الخير|صباح النور|مساء الخير|مساء النور|شكرا|شكرا جزيلا|متشكر|تسلم|hi|hello|hey|good morning|good evening|thanks|thank you)(?:\s+(?:اهلا|ازيكم|ازيك|شكرا|hi|thanks))*$/i.test(
    normalized,
  );
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
    return english ? "Please message us privately." : "نرجو التواصل على الخاص";
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
  if (targetPage?.startsWith("whatsapp,")) {
    return channel === "whatsapp" || targetPage.slice(9) === accountId;
  }
  return (
    !targetPage ||
    targetPage === "all" ||
    (targetPage === "whatsapp" && channel === "whatsapp") ||
    (channel !== "whatsapp" &&
      (targetPage === "facebook" || targetPage === accountId))
  );
}
const normalize = (s: string) =>
  s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
// Common words that would otherwise match nearly every entry.
const stopWords = new Set(
  [
    "في", "من", "على", "علي", "الى", "إلى", "عن", "مع", "هل", "ما", "ماذا",
    "هو", "هي", "انا", "انت", "ده", "دي", "دا", "اللي", "التي", "الذي", "او",
    "أو", "لو", "يا", "عند", "ايه", "إيه", "كان", "بس", "كده", "هذا", "هذه",
    "the", "and", "for", "you", "is", "to", "of", "in", "on", "do",
  ].map(normalize),
);
export function retrieveKnowledge(query: string, entries: KnowledgeItem[]) {
  const terms = [
    ...new Set(normalize(query).match(/[\p{L}\p{N}]{2,}/gu) ?? []),
  ].filter((term) => !stopWords.has(term));
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
const chunkSize = 3000;
// Long teaching entries are ranked by paragraph; every chunk keeps the entry id for citations.
function knowledgeChunks(entry: KnowledgeItem): KnowledgeItem[] {
  if (entry.content.length <= chunkSize) return [entry];
  const pieces: string[] = [];
  let current = "";
  for (const paragraph of entry.content.split(/\n\s*\n/)) {
    for (let start = 0; start < paragraph.length; start += chunkSize) {
      const part = paragraph.slice(start, start + chunkSize);
      if (current && current.length + part.length + 2 > chunkSize) {
        pieces.push(current);
        current = "";
      }
      current = current ? `${current}\n\n${part}` : part;
    }
  }
  if (current) pieces.push(current);
  return pieces.map((content) => ({ ...entry, content }));
}
export function selectKnowledgeContext(
  query: string,
  entries: KnowledgeItem[],
  maxCharacters = 64000,
) {
  const chunks = entries.flatMap(knowledgeChunks);
  const candidates = [...retrieveKnowledge(query, chunks), ...chunks];
  const selected: KnowledgeItem[] = [];
  const seen = new Set<KnowledgeItem>();
  let characters = 0;
  for (const entry of candidates) {
    if (seen.has(entry)) continue;
    seen.add(entry);
    const size = JSON.stringify(entry).length;
    if (characters + size > maxCharacters) continue;
    selected.push(entry);
    characters += size;
  }
  return selected;
}
// Names the entries a reply cited. The ids come from the model and proposeReply
// already rejects any id that was not among the entries sent to it.
export function describeReplySources(
  sourceIds: number[],
  knowledge: Pick<KnowledgeItem, "id" | "title">[],
  instructions: { text: string }[],
) {
  return [...new Set(sourceIds)].map((id) => {
    if (id === -1000)
      return { id, kind: "booking" as const, title: "رابط الحجز الإلكتروني" };
    if (id < 0) {
      const text = instructions[-id - 1]?.text.trim() ?? "";
      return {
        id,
        kind: "instruction" as const,
        title: `تعليمة ${-id}${text ? `: ${text.length > 60 ? `${text.slice(0, 60)}…` : text}` : ""}`,
      };
    }
    return {
      id,
      kind: "knowledge" as const,
      title: knowledge.find((entry) => entry.id === id)?.title ?? `معلومة رقم ${id}`,
    };
  });
}
