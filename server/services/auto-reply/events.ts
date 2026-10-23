import { z } from "zod";
import type { AutoReplyChannel } from "../../../shared/auto-reply";
import { channelCredentials, facebookPages } from "./providers";
import { hash } from "./policy";

export type InboundEvent = {
  key: string;
  channel: AutoReplyChannel;
  accountId: string;
  participantId: string;
  threadId: string;
  providerId: string;
  text: string;
  at: Date;
  humanEcho: boolean;
  unsupported: boolean;
  deleted: boolean;
};
const id = z.string().min(1).max(255);
const message = z.object({
  mid: id.optional(),
  text: z.string().max(20_000).optional(),
  is_echo: z.boolean().optional(),
  app_id: z.union([z.string(), z.number()]).optional(),
});
const envelope = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        id: z.string().max(128),
        time: z.number().optional(),
        messaging: z
          .array(
            z.object({
              sender: z.object({ id }),
              recipient: z.object({ id }),
              timestamp: z.number(),
              message: message.optional(),
            }),
          )
          .max(1000)
          .optional(),
        changes: z
          .array(z.object({ field: z.string(), value: z.unknown() }))
          .max(1000)
          .optional(),
      }),
    )
    .max(1000)
    .default([]),
});
const whatsappValue = z.object({
  metadata: z.object({ phone_number_id: id }),
  messages: z
    .array(
      z.object({
        id,
        from: z.string().max(128),
        timestamp: z.string(),
        type: z.string(),
        text: z.object({ body: z.string().max(20_000) }).optional(),
      }),
    )
    .max(1000)
    .optional(),
});
const echoValue = z.object({
  metadata: z.object({ phone_number_id: id }),
  message_echoes: z
    .array(
      z.object({
        id,
        to: z.string().max(128),
        timestamp: z.string(),
        type: z.string(),
        text: z.object({ body: z.string().max(20_000) }).optional(),
      }),
    )
    .optional(),
});
const commentValue = z.object({
  item: z.string(),
  verb: z.string(),
  comment_id: id.optional(),
  post_id: id.optional(),
  parent_id: id.optional(),
  from: z.object({ id: z.string().max(128) }).optional(),
  message: z.string().max(20_000).optional(),
  created_time: z.number().optional(),
});
export function parseMetaEvents(
  body: unknown,
  now = new Date(),
): InboundEvent[] {
  const parsed = envelope.parse(body);
  const result: InboundEvent[] = [];
  const push = (event: Omit<InboundEvent, "key">) => {
    const age = now.getTime() - event.at.getTime();
    if (!Number.isFinite(age) || age < -60_000 || age > 7 * 86400_000) return;
    result.push({
      ...event,
      text: event.text.slice(0, 6000),
      key: hash(
        `${event.channel}:${event.accountId}:${event.providerId}:${event.deleted ? "delete" : "message"}`,
      ),
    });
  };
  for (const entry of parsed.entry) {
    if (
      parsed.object === "page" &&
      facebookPages().some((p) => p.accountId && p.accountId === entry.id)
    ) {
      for (const e of entry.messaging ?? []) {
        if (!e.message?.mid) continue;
        const echo = Boolean(e.message.is_echo);
        if (
          (!echo && e.recipient.id !== entry.id) ||
          (echo && e.sender.id !== entry.id)
        )
          continue;
        // App echoes are delivery observations; only messages from other actors pause automation.
        if (
          echo &&
          String(e.message.app_id ?? "") ===
            channelCredentials("messenger", entry.id).appId
        )
          continue;
        push({
          channel: "messenger",
          accountId: entry.id,
          participantId: echo ? e.recipient.id : e.sender.id,
          threadId: echo ? e.recipient.id : e.sender.id,
          providerId: e.message.mid,
          text: e.message.text ?? "[رسالة غير نصية]",
          at: new Date(e.timestamp),
          humanEcho: echo,
          unsupported: !e.message.text,
          deleted: false,
        });
      }
    }
    for (const change of entry.changes ?? []) {
      if (
        parsed.object === "whatsapp_business_account" &&
        change.field === "smb_message_echoes" &&
        entry.id === channelCredentials("whatsapp").wabaId &&
        channelCredentials("whatsapp").accountId !==
          process.env.WHATSAPP_PHONE_NUMBER_ID
      ) {
        const value = echoValue.safeParse(change.value);
        if (
          value.success &&
          value.data.metadata.phone_number_id ===
            channelCredentials("whatsapp").accountId
        ) {
          for (const m of value.data.message_echoes ?? [])
            push({
              channel: "whatsapp",
              accountId: value.data.metadata.phone_number_id,
              participantId: m.to,
              threadId: m.to,
              providerId: m.id,
              text: m.text?.body ?? "[رد من تطبيق الهاتف]",
              at: new Date(Number(m.timestamp) * 1000),
              humanEcho: true,
              unsupported: false,
              deleted: false,
            });
        }
      }
      if (
        parsed.object === "whatsapp_business_account" &&
        change.field === "messages" &&
        entry.id === channelCredentials("whatsapp").wabaId &&
        channelCredentials("whatsapp").accountId !==
          process.env.WHATSAPP_PHONE_NUMBER_ID
      ) {
        const value = whatsappValue.safeParse(change.value);
        if (
          !value.success ||
          value.data.metadata.phone_number_id !==
            channelCredentials("whatsapp").accountId
        )
          continue;
        for (const m of value.data.messages ?? []) {
          if (m.from === value.data.metadata.phone_number_id) continue;
          push({
            channel: "whatsapp",
            accountId: value.data.metadata.phone_number_id,
            participantId: m.from,
            threadId: m.from,
            providerId: m.id,
            text: m.text?.body ?? "[رسالة غير نصية]",
            at: new Date(Number(m.timestamp) * 1000),
            humanEcho: false,
            unsupported: m.type !== "text",
            deleted: false,
          });
        }
      }
      if (
        parsed.object === "page" &&
        facebookPages().some((p) => p.accountId && p.accountId === entry.id) &&
        change.field === "feed"
      ) {
        const value = commentValue.safeParse(change.value);
        if (!value.success) continue;
        const v = value.data;
        if (
          v.item !== "comment" ||
          !v.comment_id ||
          !["add", "remove"].includes(v.verb)
        )
          continue;
        if (v.from?.id === entry.id) continue;
        if (!v.from?.id && v.verb !== "remove") continue;
        push({
          channel: "facebook_comment",
          accountId: entry.id,
          participantId: v.from?.id ?? "deleted",
          threadId: v.comment_id,
          providerId: v.comment_id,
          text: v.message ?? "[تعليق محذوف]",
          at: new Date(
            (v.created_time ?? Math.floor(now.getTime() / 1000)) * 1000,
          ),
          humanEcho: false,
          unsupported: !v.message,
          deleted: v.verb === "remove",
        });
      }
    }
  }
  return result;
}

export type DeliveryReceipt = {
  channel: AutoReplyChannel;
  providerId: string;
  state: "sent" | "delivered" | "read" | "failed";
  at: Date;
};
export function parseDeliveryReceipts(body: unknown): DeliveryReceipt[] {
  const parsed = envelope.parse(body);
  const results: DeliveryReceipt[] = [];
  for (const entry of parsed.entry)
    for (const change of entry.changes ?? []) {
      if (
        parsed.object !== "whatsapp_business_account" ||
        change.field !== "messages"
      )
        continue;
      const value = z
        .object({
          metadata: z.object({ phone_number_id: id }),
          statuses: z
            .array(
              z.object({
                id,
                status: z.enum(["sent", "delivered", "read", "failed"]),
                timestamp: z.string(),
              }),
            )
            .optional(),
        })
        .safeParse(change.value);
      if (
        !value.success ||
        value.data.metadata.phone_number_id !==
          channelCredentials("whatsapp").accountId
      )
        continue;
      for (const s of value.data.statuses ?? [])
        results.push({
          channel: "whatsapp",
          providerId: s.id,
          state: s.status,
          at: new Date(Number(s.timestamp) * 1000),
        });
    }
  return results;
}
