import * as XLSX from "xlsx";
import {
  autoReplySettingsSchema,
  knowledgeImportHeaders,
  teachingSchema,
} from "../../../shared/auto-reply";

export const knowledgeImportLimits = { bytes: 2_000_000, rows: 500 };

// Cell text is only ever read as strings; formulas and formatting are ignored.
export function readKnowledgeFile(fileName: string, base64: string) {
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > knowledgeImportLimits.bytes)
    return { error: "الملف أكبر من 2 ميجا." } as const;
  const csv = /\.csv$/i.test(fileName);
  const book = csv
    ? XLSX.read(buffer.toString("utf8").replace(/^﻿/, ""), {
        type: "string",
        raw: true,
      })
    : XLSX.read(buffer, { type: "buffer", cellFormula: false, cellHTML: false });
  const sheet = book.Sheets[book.SheetNames[0] ?? ""];
  if (!sheet) return { error: "الملف فاضي." } as const;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return {
    rows: rows.map((row) => row.map((cell) => String(cell ?? "").trim())),
  } as const;
}

type Pages = { accountId: string }[];
const yesNo = (value: string, empty: boolean) =>
  value === "" ? empty : value === "نعم" ? true : value === "لا" ? false : null;

// Same encoding the entries already use: all, whatsapp, facebook (both pages),
// a page id, or whatsapp,<page id>.
export function importTarget(value: string, pages: Pages) {
  if (!value || value === "الكل") return { target: "all" };
  let whatsapp = false;
  const ids = new Set<string>();
  for (const part of value.split("+").map((p) => p.trim())) {
    if (part === "الكل") return { target: "all" };
    if (part === "واتساب") whatsapp = true;
    else if (part === "صفحة المركز" || part === "صفحة العيادة") {
      const id = pages[part === "صفحة المركز" ? 0 : 1]?.accountId;
      if (!id) return { error: `«${part}» مش متعرّفة على السيرفر` };
      ids.add(id);
    } else return { error: `قيمة القناة «${part}» مش معروفة` };
  }
  const both = pages.length >= 2 && ids.size >= 2;
  if (whatsapp && both) return { target: "all" };
  if (both) return { target: "facebook" };
  const [id] = [...ids];
  if (whatsapp) return { target: id ? `whatsapp,${id}` : "whatsapp" };
  return { target: id };
}

// Every-reply rules keep the title as their first line, since instructions have no title field.
export const ruleText = (title: string, text: string) => `${title}\n${text}`;

export function planKnowledgeImport(
  rows: string[][],
  existing: {
    knowledge: { title: string; content: string }[];
    instructions: { text: string }[];
  },
  pages: Pages,
) {
  const rejected: { row: number; reason: string }[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const knowledge: {
    title: string;
    content: string;
    targetPage: string;
    enabled: boolean;
  }[] = [];
  const instructions: { text: string; enabled: boolean; targetPage: string }[] =
    [];
  const [header, ...body] = rows;
  if (
    !header ||
    knowledgeImportHeaders.some((name, index) => header[index] !== name)
  )
    return {
      error: `أول صف لازم يكون العناوين بالترتيب: ${knowledgeImportHeaders.join("، ")}.`,
    } as const;
  if (body.length > knowledgeImportLimits.rows)
    return {
      error: `الملف فيه ${body.length} صف؛ الحد ${knowledgeImportLimits.rows}.`,
    } as const;
  const seen = new Set(
    existing.knowledge.map((k) => `${k.title.trim()}\n${k.content.trim()}`),
  );
  const seenRules = new Set(existing.instructions.map((i) => i.text.trim()));
  let ruleCount = existing.instructions.length;
  let ruleChars = existing.instructions.reduce((n, i) => n + i.text.length, 0);
  body.forEach((cells, index) => {
    const row = index + 2;
    const [title = "", text = "", every = "", channel = "", enabled = ""] =
      cells;
    const reject = (reason: string) => rejected.push({ row, reason });
    if (!title) return reject("العنوان فاضي");
    if (title.length > 255) return reject("العنوان أطول من 255 حرف");
    if (!text) return reject("النص فاضي");
    const everyReply = yesNo(every, false);
    if (everyReply === null) return reject("«يتطبق في كل رد» لازم نعم أو لا");
    const on = yesNo(enabled, true);
    if (on === null) return reject("«مفعّل» لازم نعم أو لا");
    const target = importTarget(channel, pages);
    if (!target.target) return reject(target.error ?? "قناة غير صالحة");
    if (everyReply) {
      const composed = ruleText(title, text);
      if (seenRules.has(composed) || seenRules.has(text))
        return skipped.push({ row, reason: "نفس القاعدة موجودة" });
      if (composed.length > 1000)
        return reject(
          "النص أطول من 1000 حرف، فما ينفعش يتطبق في كل رد. خليه «لا» أو قصّره",
        );
      if (ruleCount >= 30) return reject("وصلت لحد 30 قاعدة في كل رد");
      if (ruleChars + composed.length > 12000)
        return reject("مجموع القواعد هيعدّي 12000 حرف");
      seenRules.add(composed);
      ruleCount++;
      ruleChars += composed.length;
      instructions.push({
        text: composed,
        enabled: on,
        targetPage: target.target,
      });
      return;
    }
    const key = `${title}\n${text}`;
    if (seen.has(key))
      return skipped.push({ row, reason: "نفس العنوان والنص موجودين" });
    const parsed = teachingSchema.safeParse({
      title,
      content: text,
      targetPage: target.target,
      enabled: on,
    });
    if (!parsed.success)
      return reject(
        text.length > 30000 ? "النص أطول من 30000 حرف" : "الصف مش صالح",
      );
    seen.add(key);
    knowledge.push({
      title: parsed.data.title,
      content: parsed.data.content,
      targetPage: parsed.data.targetPage,
      enabled: parsed.data.enabled,
    });
  });
  return { knowledge, instructions, rejected, skipped } as const;
}

export function withImportedRules(
  config: unknown,
  instructions: { text: string; enabled: boolean; targetPage: string }[],
) {
  const current = autoReplySettingsSchema.parse(config ?? {});
  return autoReplySettingsSchema.parse({
    ...current,
    instructions: [...current.instructions, ...instructions],
  });
}
