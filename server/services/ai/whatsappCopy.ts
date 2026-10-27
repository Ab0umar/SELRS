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
const openings = z
  .object({
    openings: z
      .array(
        z
          .string()
          .trim()
          .min(3)
          .max(120)
          .refine(
            (value) => !/[\d٠-٩۰-۹]|https?:|www\.|@/i.test(value),
            "Opening must not contain numbers or links",
          ),
      )
      .length(3),
  })
  .strict();
const variants = z.array(z.string().min(1).max(1024)).length(3);
const pendingCopy = z.object({ pending: whatsappCopyInput });
function copyTask(input: Input) {
  return {
    workload: "whatsapp.marketing" as const,
    instruction:
      "Write three distinct short Egyptian Arabic greetings for a promotional WhatsApp draft from مركز عيون الشروق. Only welcoming openings, no claims, offers, numbers, links, medical advice, diagnoses, treatment recommendations, urgency or guarantees. Do not address any named person. The supplied topic is public campaign metadata. Return JSON openings array of exactly three strings.",
    input: JSON.stringify({ campaign: input.kind, days: input.days ?? [] }),
    schema: openings,
  };
}
function copyVariants(result: z.infer<typeof openings>, input: Input) {
  return variants.parse(
    result.openings.map(
      (opening) =>
        `${opening}\n${whatsappOfferFacts(input)}\nتحت إشراف أ.د محمد السعدني غرابه\nللتفاصيل: https://wa.me/201285800309\nللحجز: https://selrs.cc/my/book-guest`,
    ),
  );
}
export function whatsappOfferFacts(input: Input) {
  switch (input.kind) {
    case "lasik":
      return "خصم يصل إلى 15% على عمليات تصحيح الإبصار.";
    case "cataract":
      return "خصم 1000ج على عمليات المياه البيضاء لحامل بطاقة التأمين الصحي.";
    case "exam":
      return `الكشف مع الأخصائي فقط أيام ${[...new Set(input.days)].join(" و")} بـ200ج بدلًا من 260ج.`;
    case "reminder":
      return "بنفكرك تطمّن على عيونك كل فترة. وللاستفسار عن خدمات تصحيح الإبصار (الليزك)، تواصل مع المركز.";
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
          openings: {
            type: "array",
            items: { type: "string" },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ["openings"],
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
