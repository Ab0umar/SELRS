import { z } from "zod";

export function autoReplyErrorLabel(code: string): string {
  if (/^META_10(?:_\d+)?$/.test(code)) {
    return `رفضت ميتا السماح بالرد (${code}). راجع وضع نشر التطبيق ومستوى وصول pages_messaging وقيود مراسلة المستلم. نجاح فحص الاتصال وحده لا يثبت السماح بالإرسال.`;
  }
  return code;
}

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
export function normalizeAutoReplyPhone(value: string) {
  const digits = value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s()+.-]/g, "")
    .replace(/^00/, "");
  return /^01[0125]\d{8}$/.test(digits) ? `2${digits}` : digits;
}
export const whatsappRecipientsSchema = z.object({
  mode: z.enum(["all", "include", "exclude", "except_contacts"]).default("all"),
  confirmedContactSync: z.string().uuid().nullable().default(null),
  phones: z
    .array(
      z
        .string()
        .max(64)
        .transform(normalizeAutoReplyPhone)
        .pipe(
          z
            .string()
            .regex(/^[1-9]\d{7,14}$/, "أدخل رقم واتساب صحيحًا بكود الدولة"),
        ),
    )
    .max(500, "الحد الأقصى 500 رقم")
    .transform((phones) => [...new Set(phones)])
    .default([]),
});
export const autoReplySettingsSchema = z.object({
  whatsappRecipients: whatsappRecipientsSchema.default({
    mode: "all",
    phones: [],
    confirmedContactSync: null,
  }),
  targets: z
    .record(
      z.string(),
      z
        .object({
          style: z.string().trim().max(3000).optional(),
          maxReplyChars: z.number().int().min(100).max(2000).optional(),
          historyMessageLimit: z.number().int().min(0).max(50).optional(),
          temperature: z.number().min(0).max(2).optional(),
          topP: z.number().min(0.01).max(1).optional(),
          topK: z.number().int().min(1).max(100).nullable().optional(),
          maxOutputTokens: z.number().int().min(500).max(8192).optional(),
          stopSequences: z
            .array(z.string().trim().min(1).max(40))
            .max(5)
            .optional(),
          hoursEnabled: z.boolean().optional(),
          hours: z
            .array(
              z.object({
                day: z.number().int().min(0).max(6),
                start: clock,
                end: clock,
              }),
            )
            .max(28)
            .optional(),
          outsideMessage: z.string().trim().min(1).max(1000).optional(),
          outsideMessageEn: z.string().trim().min(1).max(1000).optional(),
        })
        .refine(
          (value) => !value.hoursEnabled || !!value.hours?.length,
          "أضف فترة عمل للجهة أو عطّل رسالة خارج المواعيد",
        ),
    )
    .default({}),
  engine: z.enum(["current", "central"]).default("current"),
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
  // 0 keeps a staff handoff until staff reopen it.
  handoffReopenHours: z.number().int().min(0).max(720).default(24),
  // 0 resumes automation on the next customer message after a staff reply.
  staffReplyPauseMinutes: z.number().int().min(0).max(1440).default(0),
  maxAutoRepliesPerHour: z.number().int().min(1).max(200).default(20),
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
export function settingsForTarget(
  settings: AutoReplySettings,
  channel: AutoReplyChannel,
  accountId?: string,
): AutoReplySettings {
  return {
    ...settings,
    ...settings.targets[
      channel === "whatsapp" ? "whatsapp" : (accountId ?? "")
    ],
  };
}
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
export function isAutoReplyRecipientAllowed(
  settings: AutoReplySettings,
  channel: AutoReplyChannel,
  participantId: string,
) {
  if (channel !== "whatsapp" || settings.whatsappRecipients.mode === "all")
    return true;
  if (settings.whatsappRecipients.mode === "except_contacts") return false;
  const phone = normalizeAutoReplyPhone(participantId);
  if (!/^[1-9]\d{7,14}$/.test(phone)) return false;
  const listed = settings.whatsappRecipients.phones.includes(phone);
  return settings.whatsappRecipients.mode === "include" ? listed : !listed;
}
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
