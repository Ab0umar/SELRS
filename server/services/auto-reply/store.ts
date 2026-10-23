import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  notLike,
  or,
  sql,
} from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../db";
import {
  autoReplySettingsSchema,
  defaultAutoReplySettings,
  isAutoReplyEnabled,
  type AutoReplySettings,
} from "../../../shared/auto-reply";
import {
  autoReplySettings as settingsTable,
  autoReplyKnowledge as knowledgeTable,
  autoReplyConversations as conversations,
  autoReplyMessages as messages,
  autoReplyJobs as jobs,
  autoReplyEvents as events,
  autoReplyConnections as connections,
} from "../../../drizzle/autoReply";
import { hash, safetyDecision } from "./policy";
import type { InboundEvent, DeliveryReceipt } from "./events";

export async function getAutoReplyDb(): Promise<MySql2Database> {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "قاعدة البيانات غير متاحة",
    });
  return db as MySql2Database;
}
export function currentKnowledgeSourceCondition() {
  return or(
    isNull(knowledgeTable.source),
    notLike(knowledgeTable.source, "tests:%"),
  );
}
export async function readSettings() {
  const db = await getAutoReplyDb();
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.id, 1));
  return row
    ? autoReplySettingsSchema.parse(row.config)
    : structuredClone(defaultAutoReplySettings);
}
export async function ensureSettings() {
  const db = await getAutoReplyDb();
  await db
    .insert(settingsTable)
    .values({ id: 1, config: defaultAutoReplySettings })
    .onDuplicateKeyUpdate({ set: { id: 1 } });
}
export async function ingestEvents(batch: InboundEvent[]) {
  if (!batch.length) return;
  await ensureSettings();
  const db = await getAutoReplyDb();
  await db.transaction(async (tx) => {
    // The singleton lock orders ingestion, handoff and sending across server processes.
    const [settings] = await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const config = autoReplySettingsSchema.parse(settings.config);
    for (const event of batch) {
      const [seen] = await tx
        .select()
        .from(events)
        .where(eq(events.id, event.key));
      if (seen) continue;
      await tx.insert(events).values({ id: event.key });
      await tx
        .insert(connections)
        .values({
          channel: event.channel,
          accountId: event.accountId,
          lastWebhookAt: new Date(),
          ...(event.channel === "whatsapp" && event.humanEcho
            ? { lastMobileEchoAt: new Date() }
            : {}),
        })
        .onDuplicateKeyUpdate({
          set: {
            lastWebhookAt: new Date(),
            ...(event.channel === "whatsapp" && event.humanEcho
              ? { lastMobileEchoAt: new Date() }
              : {}),
          },
        });
      if (event.humanEcho) {
        const [ourMessage] = await tx
          .select({ id: messages.id })
          .from(messages)
          .innerJoin(
            conversations,
            eq(conversations.id, messages.conversationId),
          )
          .where(
            and(
              eq(messages.providerId, event.providerId),
              eq(conversations.accountId, event.accountId),
              inArray(
                conversations.channel,
                event.channel === "messenger"
                  ? ["messenger", "facebook_comment"]
                  : [event.channel],
              ),
              inArray(messages.direction, ["bot", "staff"]),
            ),
          )
          .limit(1);
        if (ourMessage) continue;
      }
      if (event.deleted) {
        const affected = await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(
            and(
              eq(conversations.channel, event.channel),
              eq(conversations.threadId, event.threadId),
              eq(conversations.accountId, event.accountId),
            ),
          );
        for (const c of affected) {
          await tx
            .update(conversations)
            .set({
              status: "closed",
              humanReason: "comment_deleted",
              revision: sql`${conversations.revision} + 1`,
            })
            .where(eq(conversations.id, c.id));
          await tx
            .update(jobs)
            .set({ state: "cancelled", errorCode: "COMMENT_DELETED" })
            .where(
              and(
                eq(jobs.conversationId, c.id),
                inArray(jobs.state, ["pending", "retry", "generating"]),
              ),
            );
          await tx
            .update(messages)
            .set({ body: "[تعليق محذوف]" })
            .where(eq(messages.conversationId, c.id));
        }
        continue;
      }
      const identityHash = hash(
        `${event.channel}:${event.accountId}:${event.participantId}:${event.threadId}`,
      );
      const [existing] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.identityHash, identityHash));
      let conversationId: number;
      if (existing) conversationId = existing.id;
      else {
        const [insert] = await tx.insert(conversations).values({
          identityHash,
          channel: event.channel,
          accountId: event.accountId,
          participantId: event.participantId,
          threadId: event.threadId,
          lastInboundAt: event.at,
          lastActivityAt: new Date(),
        });
        conversationId = insert.insertId;
      }
      const [current] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId));
      // Out-of-order deliveries are stored but cannot invalidate a newer response.
      const stale = event.at.getTime() < current.lastInboundAt.getTime();
      const [insert] = await tx.insert(messages).values({
        conversationId,
        eventKey: event.key,
        providerId: event.providerId,
        direction: event.humanEcho ? "staff" : "inbound",
        body: event.text,
        createdAt: event.at,
      });
      const requestedReason = event.humanEcho
        ? null
        : safetyDecision(event.text);
      const pause =
        event.humanEcho || event.unsupported || Boolean(requestedReason);
      if (stale && !pause) continue;
      const nextRevision = current.revision + 1;
      await tx
        .update(conversations)
        .set({
          lastActivityAt: new Date(),
          ...(!event.humanEcho && !stale ? { lastInboundAt: event.at } : {}),
          revision: nextRevision,
          ...(pause
            ? {
                status: "human",
                humanReason: event.humanEcho
                  ? "external_staff_reply"
                  : (requestedReason ?? "unsupported_message"),
              }
            : {}),
        })
        .where(eq(conversations.id, conversationId));
      await tx
        .update(jobs)
        .set({ state: "cancelled", errorCode: "SUPERSEDED" })
        .where(
          and(
            eq(jobs.conversationId, conversationId),
            eq(jobs.kind, "auto"),
            inArray(jobs.state, ["pending", "retry", "generating"]),
          ),
        );
      if (
        !stale &&
        (!pause || Boolean(requestedReason)) &&
        current.status === "open" &&
        config.sendingEnabled &&
        isAutoReplyEnabled(config, event.channel, event.accountId)
      ) {
        await tx.insert(jobs).values({
          conversationId,
          inboundId: insert.insertId,
          requestKey: event.key,
          kind: "auto",
          revision: nextRevision,
          handoff: Boolean(requestedReason),
          body: null,
        });
      }
    }
  });
}
export async function recordDeliveryReceipts(receipts: DeliveryReceipt[]) {
  if (!receipts.length) return;
  const db = await getAutoReplyDb();
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    for (const receipt of receipts) {
      const [message] = await tx
        .select()
        .from(messages)
        .where(eq(messages.providerId, receipt.providerId))
        .limit(1);
      if (!message) continue;
      const rank: Record<string, number> = {
        sent: 1,
        delivered: 2,
        read: 3,
        failed: 4,
      };
      if ((rank[receipt.state] ?? 0) <= (rank[message.state] ?? 0)) continue;
      await tx
        .update(messages)
        .set({ state: receipt.state })
        .where(eq(messages.id, message.id));
      if (receipt.state === "failed") {
        await tx
          .update(jobs)
          .set({ state: "failed", errorCode: "META_DELIVERY_FAILED" })
          .where(eq(jobs.providerId, receipt.providerId));
        await tx
          .update(conversations)
          .set({
            status: "human",
            humanReason: "META_DELIVERY_FAILED",
            revision: sql`${conversations.revision} + 1`,
          })
          .where(eq(conversations.id, message.conversationId));
      }
    }
  });
}
export async function saveSettings(config: AutoReplySettings, userId: number) {
  await ensureSettings();
  const db = await getAutoReplyDb();
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    await tx
      .update(settingsTable)
      .set({
        config,
        updatedBy: userId,
        revision: sql`${settingsTable.revision} + 1`,
      })
      .where(eq(settingsTable.id, 1));
    // Never release a backlog when sending is re-enabled or instructions change.
    await tx
      .update(jobs)
      .set({ state: "cancelled", errorCode: "SETTINGS_CHANGED" })
      .where(inArray(jobs.state, ["pending", "retry", "generating"]));
  });
}
type AutoReplyTransaction = Parameters<
  Parameters<MySql2Database["transaction"]>[0]
>[0];
export async function withKnowledgeUpdate<T>(
  work: (tx: AutoReplyTransaction) => Promise<T>,
) {
  await ensureSettings();
  const db = await getAutoReplyDb();
  return db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const result = await work(tx);
    await tx
      .update(settingsTable)
      .set({ revision: sql`${settingsTable.revision} + 1` })
      .where(eq(settingsTable.id, 1));
    await tx
      .update(jobs)
      .set({ state: "cancelled", errorCode: "KNOWLEDGE_CHANGED" })
      .where(
        and(
          eq(jobs.kind, "auto"),
          inArray(jobs.state, ["pending", "retry", "generating"]),
        ),
      );
    return result;
  });
}
export async function setConversationStatus(
  conversationId: number,
  status: "open" | "human" | "closed",
) {
  await ensureSettings();
  const db = await getAutoReplyDb();
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const [c] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .for("update");
    if (!c)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "المحادثة غير موجودة",
      });
    await tx
      .update(conversations)
      .set({
        status,
        humanReason: status === "human" ? "staff_takeover" : null,
        revision: c.revision + 1,
      })
      .where(eq(conversations.id, conversationId));
    await tx
      .update(jobs)
      .set({ state: "cancelled", errorCode: "STAFF_STATUS_CHANGED" })
      .where(
        and(
          eq(jobs.conversationId, conversationId),
          inArray(jobs.state, ["pending", "retry", "generating"]),
        ),
      );
  });
}
export async function queueManualReply(
  conversationId: number,
  body: string,
  requestId: string,
) {
  await ensureSettings();
  const db = await getAutoReplyDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const config = autoReplySettingsSchema.parse(row.config);
    if (!config.sendingEnabled)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "الإرسال متوقف بالمفتاح العام",
      });
    const key = hash(`manual:${conversationId}:${requestId}`);
    const [previous] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.requestKey, key));
    if (previous) return { id: previous.id };
    const [c] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .for("update");
    if (!c)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "المحادثة غير موجودة",
      });
    if (c.status === "closed")
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "أعد فتح المحادثة أولًا",
      });
    const { withinReplyWindow } = await import("./policy");
    if (!withinReplyWindow(c.channel, c.lastInboundAt))
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "انتهت نافذة الرد المسموح بها",
      });
    if (c.channel === "facebook_comment" && body.length > 400)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "التعليق العام بحد أقصى 400 حرف، دون بيانات شخصية أو طبية",
      });
    await tx
      .update(conversations)
      .set({
        status: "human",
        humanReason: "staff_reply",
        revision: c.revision + 1,
      })
      .where(eq(conversations.id, c.id));
    await tx
      .update(jobs)
      .set({ state: "cancelled", errorCode: "STAFF_REPLY" })
      .where(
        and(
          eq(jobs.conversationId, c.id),
          inArray(jobs.state, ["pending", "retry", "generating"]),
        ),
      );
    const [insert] = await tx.insert(jobs).values({
      conversationId: c.id,
      requestKey: key,
      kind: "manual",
      body,
      revision: c.revision + 1,
    });
    return { id: insert.insertId };
  });
}
export async function purgeExpiredConversations() {
  const config = await readSettings();
  const cutoff = new Date(Date.now() - config.retentionDays * 86400_000);
  const db = await getAutoReplyDb();
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const expired = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(lt(conversations.lastActivityAt, cutoff))
      .limit(100);
    const ids = expired.map((c) => c.id);
    if (ids.length) {
      await tx.delete(jobs).where(inArray(jobs.conversationId, ids));
      await tx.delete(messages).where(inArray(messages.conversationId, ids));
      await tx.delete(conversations).where(inArray(conversations.id, ids));
    }
    // Tombstones contain hashes only and outlive Meta's redelivery period.
    await tx
      .delete(events)
      .where(lt(events.receivedAt, new Date(Date.now() - 90 * 86400_000)));
    await tx.delete(messages).where(lt(messages.createdAt, cutoff));
    await tx
      .delete(jobs)
      .where(
        and(
          lt(jobs.createdAt, cutoff),
          inArray(jobs.state, ["sent", "failed", "unknown", "cancelled"]),
        ),
      );
  });
}
export async function conversationContext(conversationId: number) {
  const db = await getAutoReplyDb();
  const [conversation] = await db
    .select({ resetAt: conversations.contextResetAt })
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  const sinceReset = conversation?.resetAt
    ? gte(messages.createdAt, conversation.resetAt)
    : undefined;
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), sinceReset))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(50);
  const [first] = await db
    .select({ body: messages.body })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.direction, "inbound"),
        sinceReset,
      ),
    )
    .orderBy(messages.createdAt, messages.id)
    .limit(1);
  return { rows: rows.reverse(), firstText: first?.body };
}
