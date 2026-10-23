import { z } from "zod";

export const autoReplyChannels = [
  "whatsapp",
  "messenger",
  "facebook_comment",
] as const;
export type AutoReplyChannel = (typeof autoReplyChannels)[number];
export const channelLabels: Record<AutoReplyChannel, string> = {
  whatsapp: "واتساب",
  messenger: "ماسنجر",
  facebook_comment: "تعليقات فيسبوك",
};
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const replyTargetSchema = z
  .union([
    z.literal("all"),
    z.literal("whatsapp"),
    z.string().regex(/^whatsapp,\d{1,23}$/),
    z.literal("facebook"),
    z.string().regex(/^\d{1,32}$/),
  ])
  .default("all");
export const autoReplySettingsSchema = z.object({
  knowledgeMode: z.enum(["legacy", "teach_ai"]).default("legacy"),
  historyMessageLimit: z.number().int().min(0).max(50).default(12),
  temperature: z.number().min(0).max(2).default(0.2),
  topP: z.number().min(0.01).max(1).default(0.95),
  topK: z.number().int().min(1).max(100).nullable().default(null),
  maxOutputTokens: z.number().int().min(500).max(8192).default(4096),
  stopSequences: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
  sendingEnabled: z.boolean().default(false),
  facebookPages: z
    .record(
      z.string(),
      z.object({ messenger: z.boolean(), facebook_comment: z.boolean() }),
    )
    .default({}),
  channels: z
    .object({
      whatsapp: z.boolean(),
      messenger: z.boolean(),
      facebook_comment: z.boolean(),
    })
    .default({ whatsapp: false, messenger: false, facebook_comment: false }),
  model: z
    .string()
    .regex(/^gemini-[a-zA-Z0-9.-]{1,80}$/)
    .default("gemini-3.8-flash"),
  maxReplyChars: z.number().int().min(100).max(2000).default(600),
  retentionDays: z.number().int().min(7).max(365).default(30),
  style: z
    .string()
    .trim()
    .max(3000)
    .default("رد بالمصري بشكل مهني ومختصر، وبالإنجليزية إذا بدأ العميل بها."),
  instructions: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(1000),
        enabled: z.boolean().default(true),
        targetPage: replyTargetSchema,
      }),
    )
    .max(30)
    .refine(
      (items) =>
        items.reduce((total, item) => total + item.text.length, 0) <= 12000,
      "إجمالي التعليمات لا يتجاوز 12000 حرف",
    )
    .default([]),
  hoursEnabled: z.boolean().default(false),
  hours: z
    .array(
      z.object({
        day: z.number().int().min(0).max(6),
        start: clock,
        end: clock,
      }),
    )
    .max(28)
    .default([]),
  outsideMessage: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .default(
      "شكرًا لتواصلك مع مركز عيون الشروق. رسالتك وصلت، وموظف من المركز هيرد عليك خلال مواعيد العمل.",
    ),
  outsideMessageEn: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .default(
      "Thank you for contacting Shorouk Eye Center. Our team will reply during working hours.",
    ),
});
export type AutoReplySettings = z.infer<typeof autoReplySettingsSchema>;
export function isAutoReplyEnabled(
  settings: AutoReplySettings,
  channel: AutoReplyChannel,
  accountId: string,
) {
  return (
    settings.channels[channel] &&
    (channel === "whatsapp" ||
      settings.facebookPages[accountId]?.[channel] === true)
  );
}
export const defaultAutoReplySettings = autoReplySettingsSchema.parse({});
export function supportsGeminiSampling(model: string) {
  return /^gemini-(?:[12]\.|3\.[0-5](?:\D|$))/.test(model);
}
export const knowledgeKinds = [
  "service",
  "price",
  "branch",
  "doctor_schedule",
  "faq",
  "booking",
] as const;
export const knowledgeSchema = z.object({
  targetPage: replyTargetSchema,
  kind: z.enum(knowledgeKinds),
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(4000),
  keywords: z.string().trim().max(1000).default(""),
  approved: z.boolean().default(false),
});
export const teachingSchema = z.object({
  title: z.string().trim().min(1).max(255),
  content: z.string().trim().min(1).max(30000),
  targetPage: replyTargetSchema,
  enabled: z.boolean().default(true),
  sourceUrl: z.string().url().max(2048).optional(),
});
