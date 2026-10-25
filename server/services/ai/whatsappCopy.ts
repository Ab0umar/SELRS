import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";
import { getDbConnection } from "../../db";
import { AiGateway, type AiUsage } from "./gateway";
import { AiManagementError, AiManagementStore } from "./managementStore";

export const whatsappCopyInput = z
  .object({
    requestId: z.string().uuid(),
    kind: z.enum(["reminder", "lasik", "cataract", "exam"]),
    days: z
      .array(z.enum(["الأحد", "الثلاثاء", "الخميس"]))
      .min(1)
      .max(3)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.kind === "exam") !== Boolean(value.days?.length))
      ctx.addIssue({
        code: "custom",
        message: "Examination days are required only for examination offers",
      });
  });
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
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT d.variants_json,u.state FROM ai_whatsapp_drafts d LEFT JOIN ai_core_usage u ON u.request_id=d.request_id WHERE d.request_id=? AND d.created_by=?",
      [requestId, owner],
    );
    return rows[0]
      ? {
          requestId,
          state: z
            .enum(["reserved", "running", "completed", "failed", "uncertain"])
            .nullable()
            .parse(rows[0].state),
          variants: rows[0].variants_json
            ? variants.parse(JSON.parse(rows[0].variants_json))
            : null,
        }
      : null;
  } finally {
    connection.release();
  }
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
    if (rows[0].variants_json)
      return {
        requestId: input.requestId,
        variants: variants.parse(JSON.parse(rows[0].variants_json)),
      };
  } finally {
    connection.release();
  }
  const store = new AiManagementStore(getDbConnection);
  const profile = await store.reserve(
    input.requestId,
    "whatsapp.marketing",
    "gemini",
  );
  let usage: AiUsage | undefined;
  try {
    const result = await new AiGateway((event) => {
      usage = event;
    }).generateJson({
      workload: "whatsapp.marketing",
      model: profile.model,
      instruction:
        "Write three distinct short Egyptian Arabic greetings for a promotional WhatsApp draft from مركز عيون الشروق. Only welcoming openings, no claims, offers, numbers, links, medical advice, diagnoses, treatment recommendations, urgency or guarantees. Do not address any named person. The supplied topic is public campaign metadata. Return JSON openings array of exactly three strings.",
      input: JSON.stringify({ campaign: input.kind }),
      schema: openings,
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
    const texts = variants.parse(
      result.openings.map(
        (opening) =>
          `${opening}\n${whatsappOfferFacts(input)}\nتحت إشراف أ.د محمد السعدني غرابه\nللتفاصيل: https://wa.me/201285800309\nللحجز: https://selrs.cc/my/book-guest`,
      ),
    );
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
    if (usage && (usage.inputTokens || usage.outputTokens))
      await store.complete(input.requestId, { ...usage, status: "failed" });
    else await store.markUncertain(input.requestId);
    throw error;
  }
}
