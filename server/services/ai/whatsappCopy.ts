import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getDbConnection } from "../../db";
import { AiGateway, type AiUsage } from "./gateway";
import { AiManagementError, AiManagementStore } from "./managementStore";
import { AiTaskPending, readManusJson, startManusJson } from "./manusJson";
import { AiRequestNotSubmitted, settleAiFailure } from "./failure";
import { whatsappRequestContext } from "../../../shared/ai-request-context";

export const whatsappCopyInput = whatsappRequestContext;
type Input = z.infer<typeof whatsappCopyInput>;
const dayOrder = ["الأحد", "الثلاثاء", "الخميس"] as const;
const bookingLine = "للحجز: https://selrs.cc";
function offerRules(input: Input) {
  const days = dayOrder.filter((day) => input.days?.includes(day));
  switch (input.kind) {
    case "lasik":
      return { required: [["15%"], ["يصل", "لحد", "حتى"]], days: [] };
    case "cataract":
      return { required: [["1000ج"], ["التأمين الصحي"]], days: [] };
    case "exam":
      return { required: [["200ج"], ["260ج"], ["الأخصائي"]], days };
    case "reminder":
      return { required: [], days: [] };
  }
}
function messageIssue(text: string, input: Input) {
  if (/[٠-٩۰-۹]/.test(text)) return "Use Western digits only";
  if (/https?:|www\.|wa\.me|\.cc|\.com|@/i.test(text))
    return "Links are appended by the server";
  if (/إشراف|السعدني/.test(text)) return "Do not name a supervising doctor";
  const rules = offerRules(input);
  const allowed = new Set(whatsappOfferFacts(input).match(/\d+/g) ?? []);
  if ((text.match(/\d+/g) ?? []).some((n) => !allowed.has(n)))
    return "Only the supplied offer numbers are allowed";
  if (rules.required.some((options) => !options.some((t) => text.includes(t))))
    return "The offer facts must be stated exactly";
  if (rules.days.some((day) => !text.includes(day)))
    return "Every offer day must be stated";
  return null;
}
function messagesSchema(input: Input) {
  return z
    .object({
      messages: z
        .array(
          z
            .string()
            .trim()
            .min(20)
            .max(500)
            .superRefine((text, ctx) => {
              const issue = messageIssue(text, input);
              if (issue) ctx.addIssue({ code: "custom", message: issue });
            }),
        )
        .length(3)
        .refine((items) => new Set(items).size === 3, "Messages must differ"),
    })
    .strict();
}
const variants = z.array(z.string().min(1).max(1024)).length(3);
const pendingCopy = z.object({ pending: whatsappCopyInput });
function copyTask(input: Input) {
  return {
    workload: "whatsapp.marketing" as const,
    instruction: [
      "Write three promotional WhatsApp messages in Egyptian colloquial Arabic for مركز عيون الشروق (an eye center). Advertising tone: warm, short, direct, like a good local ad, not formal.",
      "Each message takes a different angle: (1) a direct friendly reminder, (2) opens with a short question that hooks the reader, (3) a very short warm note. 2 to 4 short lines each. At most one emoji per message.",
      "Address the reader in the singular (حضرتك / ليك / عيونك) from the first word to the last. Never mix in plural forms like حضراتكم or نورتونا.",
      "OFFER_FACTS must appear in every message with the same numbers and conditions; you may rephrase the surrounding words but keep figures exactly as written (Western digits, ج after amounts, % after percentages) and keep every listed day. If OFFER_FACTS is a reminder, mention the possibility of asking about الليزك without any numbers.",
      "Do not write any link, phone number, doctor name or supervision line; the server appends the booking link. No other numbers. No medical advice, diagnosis, guarantees, urgency or invented claims. Do not address a named person.",
      "Return JSON: messages array of exactly three strings.",
    ].join("\n"),
    input: JSON.stringify({
      campaign: input.kind,
      OFFER_FACTS: whatsappOfferFacts(input),
    }),
    schema: messagesSchema(input),
  };
}
function copyVariants(result: { messages: string[] }, input: Input) {
  return variants.parse(
    result.messages.map((message) => `${message}\n${bookingLine}`),
  );
}
export function whatsappOfferFacts(input: Input) {
  switch (input.kind) {
    case "lasik":
      return "خصم يصل إلى 15% على عمليات تصحيح الإبصار.";
    case "cataract":
      return "خصم 1000ج على عمليات المياه البيضاء لحامل بطاقة التأمين الصحي.";
    case "exam":
      return `الكشف مع الأخصائي فقط أيام ${dayOrder.filter((day) => input.days?.includes(day)).join(" و")} بـ200ج بدلًا من 260ج.`;
    case "reminder":
      return "تذكير بالكشف الدوري على العيون، وإمكانية الاستفسار عن تصحيح الإبصار بالليزك.";
  }
}
export async function readWhatsAppCopy(requestId: string, owner: number) {
  if (process.env.AI_CORE_MANAGEMENT_ENABLED !== "true")
    throw new AiManagementError("disabled");
  const connection = await getDbConnection();
  let row: RowDataPacket | undefined;
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT d.variants_json,u.state FROM ai_whatsapp_drafts d LEFT JOIN ai_core_usage u ON u.request_id=d.request_id WHERE d.request_id=? AND d.created_by=?",
      [requestId, owner],
    );
    row = rows[0];
  } finally {
    connection.release();
  }
  if (!row) return null;
  const state = z
    .enum(["reserved", "running", "completed", "failed", "uncertain"])
    .nullable()
    .parse(row.state);
  const payload = row.variants_json ? JSON.parse(row.variants_json) : null;
  if (payload && !Array.isArray(payload)) {
    if (state === "failed") return { requestId, state, variants: null };
    const input = pendingCopy.parse(payload).pending;
    if (input.requestId !== requestId) throw new AiManagementError("duplicate");
    try {
      const result = await readManusJson(
        requestId,
        copyTask(input),
        new AiManagementStore(getDbConnection),
      );
      const texts = copyVariants(result.value, input);
      const saved = await getDbConnection();
      try {
        await saved.execute(
          "UPDATE ai_whatsapp_drafts SET variants_json=? WHERE request_id=? AND created_by=? AND variants_json=?",
          [JSON.stringify(texts), requestId, owner, row.variants_json],
        );
      } finally {
        saved.release();
      }
      return { requestId, state: "completed" as const, variants: texts };
    } catch (error) {
      if (error instanceof AiTaskPending)
        return { requestId, state, variants: null };
      throw error;
    }
  }
  return {
    requestId,
    state,
    variants: payload ? variants.parse(payload) : null,
  };
}
export async function generateWhatsAppCopy(raw: unknown, owner: number) {
  if (process.env.AI_CORE_MANAGEMENT_ENABLED !== "true")
    throw new AiManagementError("disabled");
  const input = whatsappCopyInput.parse(raw);
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        kind: input.kind,
        days: [...new Set(input.days)].sort(),
      }),
    )
    .digest("hex");
  const connection = await getDbConnection();
  try {
    await connection.execute(
      "INSERT IGNORE INTO ai_whatsapp_drafts (request_id,input_hash,created_by) VALUES (?,?,?)",
      [input.requestId, hash, owner],
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT input_hash,created_by,variants_json FROM ai_whatsapp_drafts WHERE request_id=?",
      [input.requestId],
    );
    if (rows[0].input_hash !== hash || rows[0].created_by !== owner)
      throw new AiManagementError("duplicate");
    if (rows[0].variants_json) {
      const payload = JSON.parse(rows[0].variants_json);
      return {
        requestId: input.requestId,
        variants: Array.isArray(payload) ? variants.parse(payload) : null,
      };
    }
  } finally {
    connection.release();
  }
  const store = new AiManagementStore(getDbConnection);
  const profile = await store.reserve(input.requestId, "whatsapp.marketing");
  let usage: AiUsage | undefined;
  let manusPrepared = false;
  try {
    if (profile.provider === "manus") {
      const saved = await getDbConnection();
      try {
        const [written] = await saved.execute<
          import("mysql2/promise").ResultSetHeader
        >(
          "UPDATE ai_whatsapp_drafts SET variants_json=? WHERE request_id=? AND created_by=? AND variants_json IS NULL",
          [JSON.stringify({ pending: input }), input.requestId, owner],
        );
        if (written.affectedRows !== 1)
          throw new Error("WhatsApp request context was not saved");
      } finally {
        saved.release();
      }
      manusPrepared = true;
      await startManusJson(
        input.requestId,
        profile.model,
        copyTask(input),
        store,
      );
    }
    const result = await new AiGateway((event) => {
      usage = event;
    }).generateJson({
      model: profile.model,
      ...copyTask(input),
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          messages: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["messages"],
      },
    });
    const texts = copyVariants(result, input);
    const saved = await getDbConnection();
    try {
      await saved.execute(
        "UPDATE ai_whatsapp_drafts SET variants_json=? WHERE request_id=? AND created_by=?",
        [JSON.stringify(texts), input.requestId, owner],
      );
    } finally {
      saved.release();
    }
    if (!usage) throw new AiManagementError("unavailable");
    await store.complete(input.requestId, usage);
    return { requestId: input.requestId, variants: texts };
  } catch (error) {
    if (error instanceof AiTaskPending)
      return { requestId: input.requestId, variants: null };
    const failure =
      profile.provider === "manus" && !manusPrepared
        ? new AiRequestNotSubmitted(error)
        : error;
    await settleAiFailure(store, input.requestId, failure, usage);
    throw failure;
  }
}
