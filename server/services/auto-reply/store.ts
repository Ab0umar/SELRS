import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  notInArray,
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
import {
  englishFirst,
  hash,
  safetyDecision,
  unsupportedAcknowledgement,
} from "./policy";
import { isRecipientAllowed } from "./recipients";
import type { InboundEvent, DeliveryReceipt } from "./events";

type AutoReplyTransaction = Parameters<
  Parameters<MySql2Database["transaction"]>[0]
>[0];
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
          // A conversation started by staff has no customer message, so no reply window.
          lastInboundAt: event.humanEcho ? new Date(0) : event.at,
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
      const staffReplyPause =
        current.status === "human" &&
        (current.humanReason === "external_staff_reply" ||
          current.humanReason === "staff_reply");
      const now = Date.now();
      let staffPauseOver = true;
      if (staffReplyPause && config.staffReplyPauseMinutes > 0) {
        const [lastStaff] = await tx
          .select({ at: messages.createdAt })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conversationId),
              eq(messages.direction, "staff"),
            ),
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);
        staffPauseOver =
          !lastStaff ||
          now - lastStaff.at.getTime() >=
            config.staffReplyPauseMinutes * 60_000;
      }
      // An idle handoff reopens on a new customer message; an explicit takeover never does.
      const idleHandoff =
        current.status === "human" &&
        !staffReplyPause &&
        current.humanReason !== "staff_takeover" &&
        config.handoffReopenHours > 0 &&
        now - current.lastActivityAt.getTime() >
          config.handoffReopenHours * 3600_000;
      const reopenable =
        !event.humanEcho &&
        ((staffReplyPause && staffPauseOver) || idleHandoff);
      const resumeAutomation = !pause && reopenable && !stale;
      const acknowledge =
        event.unsupported &&
        !event.humanEcho &&
        event.channel !== "facebook_comment";
      if (stale && !pause) continue;
      const nextRevision = current.revision + 1;
      await tx
        .update(conversations)
        .set({
          lastActivityAt: new Date(),
          ...(!event.humanEcho && !stale ? { lastInboundAt: event.at } : {}),
          revision: nextRevision,
          ...(resumeAutomation
            ? { status: "open", humanReason: null, handoffNotifiedAt: null }
            : {}),
          ...(pause
            ? {
                status: "human",
                humanReason: event.humanEcho
                  ? current.status === "human" && !staffReplyPause
                    ? current.humanReason
                    : "external_staff_reply"
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
        !event.humanEcho &&
        (!pause || Boolean(requestedReason) || acknowledge) &&
        (current.status === "open" || reopenable) &&
        config.sendingEnabled &&
        isAutoReplyEnabled(config, event.channel, event.accountId) &&
        (await isRecipientAllowed(tx, config, event)) &&
        !(await nestedCommentOutsideBotThread(tx, event))
      ) {
        const [recent] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conversationId),
              eq(messages.direction, "bot"),
              gte(messages.createdAt, new Date(now - 3600_000)),
            ),
          );
        if (Number(recent?.count ?? 0) >= config.maxAutoRepliesPerHour) {
          await tx
            .update(conversations)
            .set({ status: "human", humanReason: "rate_limited" })
            .where(eq(conversations.id, conversationId));
          continue;
        }
        let body: string | null = null;
        if (acknowledge && !requestedReason) {
          const [first] = await tx
            .select({ body: messages.body })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conversationId),
                eq(messages.direction, "inbound"),
              ),
            )
            .orderBy(messages.id)
            .limit(1);
          body = unsupportedAcknowledgement(englishFirst(first?.body ?? ""));
        }
        await tx.insert(jobs).values({
          conversationId,
          inboundId: insert.insertId,
          requestKey: event.key,
          kind: "auto",
          revision: nextRevision,
          handoff: Boolean(requestedReason) || acknowledge,
          body,
        });
      }
    }
  });
}
// A nested comment is answered only when it replies to one of the bot's own comments.
async function nestedCommentOutsideBotThread(
  tx: AutoReplyTransaction,
  event: InboundEvent,
) {
  if (event.channel !== "facebook_comment" || !event.parentId) return false;
  const [parent] = await tx
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(messages.providerId, event.parentId),
        eq(messages.direction, "bot"),
        eq(conversations.channel, "facebook_comment"),
        eq(conversations.accountId, event.accountId),
      ),
    )
    .limit(1);
  return !parent;
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
// The central engine treats a repeated request id as a duplicate, so a regenerated
// auto reply gets a new key. Staff replies keep their body and key.
export async function requeueJob(
  tx: AutoReplyTransaction,
  job: Pick<typeof jobs.$inferSelect, "id" | "kind" | "state" | "requestKey">,
) {
  await tx
    .update(jobs)
    .set({
      claim: null,
      leaseUntil: null,
      ...(job.state === "retry" ? {} : { state: "pending" }),
      ...(job.kind === "auto"
        ? { body: null, requestKey: hash(`requeue:${job.requestKey}`) }
        : {}),
    })
    .where(eq(jobs.id, job.id));
}
async function requeueQueuedJobs(tx: AutoReplyTransaction) {
  const queued = await tx
    .select()
    .from(jobs)
    .where(inArray(jobs.state, ["pending", "retry", "generating"]))
    .for("update");
  for (const job of queued)
    if (job.kind === "auto" || job.state === "generating")
      await requeueJob(tx, job);
}
export async function saveSettings(config: AutoReplySettings, userId: number) {
  await ensureSettings();
  const db = await getAutoReplyDb();
  await db.transaction(async (tx) => {
    const [previous] = await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const wasSending =
      autoReplySettingsSchema.safeParse(previous?.config).data
        ?.sendingEnabled === true;
    await tx
      .update(settingsTable)
      .set({
        config,
        updatedBy: userId,
        revision: sql`${settingsTable.revision} + 1`,
      })
      .where(eq(settingsTable.id, 1));
    if (wasSending && config.sendingEnabled) {
      await requeueQueuedJobs(tx);
      return;
    }
    // Never release a backlog when sending is re-enabled or stopped.
    await tx
      .update(jobs)
      .set({ state: "cancelled", errorCode: "SETTINGS_CHANGED" })
      .where(inArray(jobs.state, ["pending", "retry", "generating"]));
  });
}
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
    await requeueQueuedJobs(tx);
    return result;
  });
}
export async function recordSentMessage(row: typeof messages.$inferInsert) {
  const db = await getAutoReplyDb();
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    await tx.insert(messages).values(row);
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
        ...(status === "human" ? {} : { handoffNotifiedAt: null }),
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
        humanReason: c.status === "human" ? c.humanReason : "staff_reply",
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
const silentHandoffReasons = [
  "staff_takeover",
  "staff_reply",
  "external_staff_reply",
];
// Claims conversations that moved to staff and were not announced yet; each is returned once.
export async function claimHandoffNotifications(limit = 20) {
  const db = await getAutoReplyDb();
  return db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const pending = await tx
      .select({
        id: conversations.id,
        channel: conversations.channel,
        humanReason: conversations.humanReason,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.status, "human"),
          isNull(conversations.handoffNotifiedAt),
          or(
            isNull(conversations.humanReason),
            notInArray(conversations.humanReason, silentHandoffReasons),
          ),
        ),
      )
      .limit(limit)
      .for("update");
    if (pending.length)
      await tx
        .update(conversations)
        .set({ handoffNotifiedAt: new Date() })
        .where(
          inArray(
            conversations.id,
            pending.map((row) => row.id),
          ),
        );
    return pending;
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
