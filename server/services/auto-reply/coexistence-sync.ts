import { and, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  autoReplyContacts as contacts,
  autoReplyConversations as conversations,
  autoReplyMessages as messages,
  autoReplyEvents as events,
  autoReplyOnboarding as attempts,
  autoReplySettings as settings,
  autoReplyConnections as connections,
  autoReplySyncEvents as queue,
} from "../../../drizzle/autoReply";
import {
  ensureSettings,
  getAutoReplyDb,
  readSettings,
  purgeExpiredConversations,
} from "./store";
import { hash } from "./policy";
import {
  openCoexistence,
  readCoexistenceCredentials,
  sealCoexistence,
} from "./coexistence-credentials";
import { initiateCoexistenceSync } from "./coexistence";

const id = z.string().min(1).max(255);
const historySchema = z.object({
  history: z
    .array(
      z.object({
        metadata: z
          .object({
            phase: z.number().int().min(0).max(2),
            chunk_order: z.number().int().nonnegative(),
            progress: z.number().min(0).max(100),
          })
          .optional(),
        errors: z.array(z.object({ code: z.number() })).optional(),
        threads: z
          .array(
            z.object({
              id,
              messages: z
                .array(
                  z.object({
                    id,
                    from: id,
                    timestamp: z.string().regex(/^\d+$/),
                    type: z.string(),
                    text: z.object({ body: z.string().max(20_000) }).optional(),
                  }),
                )
                .max(10000),
            }),
          )
          .max(10000)
          .optional(),
      }),
    )
    .max(1000),
});
const contactsSchema = z.object({
  state_sync: z
    .array(
      z.object({
        type: z.string(),
        action: z.enum(["add", "remove"]),
        contact: z.object({
          phone_number: z.string().max(64),
          full_name: z.string().max(500).optional(),
          first_name: z.string().max(500).optional(),
        }),
        metadata: z.object({ timestamp: z.string().regex(/^\d+$/) }),
      }),
    )
    .max(10000),
});
const envelope = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        id: z.string(),
        changes: z
          .array(z.object({ field: z.string(), value: z.unknown() }))
          .optional(),
      }),
    )
    .default([]),
});
export function parseCoexistenceChanges(
  body: unknown,
  phoneId: string,
  wabaId: string,
) {
  const parsed = envelope.parse(body);
  if (parsed.object !== "whatsapp_business_account") return [];
  return parsed.entry
    .filter((entry) => entry.id === wabaId)
    .flatMap((entry) =>
      (entry.changes ?? []).filter((change) => {
        if (
          !["history", "smb_app_state_sync", "account_update"].includes(
            change.field,
          )
        )
          return false;
        const metadata = z
          .object({
            metadata: z.object({ phone_number_id: z.string() }).optional(),
          })
          .safeParse(change.value);
        return (
          metadata.success &&
          (change.field === "account_update" ||
            metadata.data.metadata?.phone_number_id === phoneId)
        );
      }),
    );
}
export async function enqueueCoexistenceChanges(body: unknown) {
  const credentials = readCoexistenceCredentials();
  if (!credentials) return;
  const changes = parseCoexistenceChanges(
    body,
    credentials.phoneId,
    credentials.wabaId,
  );
  if (!changes.length) return;
  const db = await getAutoReplyDb();
  for (const change of changes) {
    if (change.field === "history") {
      const history = historySchema.parse(change.value);
      for (const chunk of history.history) {
        const batches: unknown[] = [];
        for (const thread of chunk.threads ?? []) {
          for (let offset = 0; offset < thread.messages.length; offset += 100) {
            batches.push({
              history: [
                {
                  ...chunk,
                  threads: [
                    {
                      id: thread.id,
                      messages: thread.messages.slice(offset, offset + 100),
                    },
                  ],
                },
              ],
            });
          }
        }
        if (!batches.length) batches.push({ history: [chunk] });
        for (const batch of batches) {
          const eventId = hash(
            `${credentials.attemptId}:history:${JSON.stringify(batch)}`,
          );
          await db
            .insert(queue)
            .values({
              id: eventId,
              attemptId: credentials.attemptId,
              field: "history",
              payloadCipher: sealCoexistence(batch),
              createdAt: new Date(),
            })
            .onDuplicateKeyUpdate({ set: { id: eventId } });
        }
      }
      continue;
    }
    const eventId = hash(
      `${credentials.attemptId}:${change.field}:${JSON.stringify(change.value)}`,
    );
    await db
      .insert(queue)
      .values({
        id: eventId,
        attemptId: credentials.attemptId,
        field: change.field,
        payloadCipher: sealCoexistence(change.value),
        createdAt: new Date(),
      })
      .onDuplicateKeyUpdate({ set: { id: eventId } });
  }
}
export function historyTimestamp(seconds: string) {
  const ms = Number(seconds) * 1000;
  if (!Number.isSafeInteger(ms) || ms <= 0 || ms > Date.now() + 300_000)
    throw new Error("HISTORY_TIMESTAMP_INVALID");
  return new Date(ms);
}
export async function processCoexistenceQueue() {
  const credentials = readCoexistenceCredentials();
  if (!credentials) return;
  const db = await getAutoReplyDb();
  const retention = (await readSettings()).retentionDays;
  const cutoff = new Date(Date.now() - retention * 86400_000);
  for (let iteration = 0; iteration < 5; iteration++) {
    let selected: string | undefined;
    try {
      const processed = await db.transaction(async (tx) => {
        // Order history import with live ingestion without changing the live reply window.
        await tx
          .select()
          .from(settings)
          .where(eq(settings.id, 1))
          .for("update");
        const [event] = await tx
          .select()
          .from(queue)
          .where(
            and(
              eq(queue.state, "pending"),
              eq(queue.attemptId, credentials.attemptId),
            ),
          )
          .limit(1)
          .for("update");
        if (!event) return false;
        selected = event.id;
        const [attempt] = await tx
          .select()
          .from(attempts)
          .where(eq(attempts.id, event.attemptId))
          .for("update");
        if (!attempt || !event.payloadCipher)
          throw new Error("SYNC_ATTEMPT_MISSING");
        const payload = openCoexistence(event.payloadCipher);
        const details = { ...attempt.details };
        if (event.field === "history") {
          const value = historySchema.parse(payload);
          for (const chunk of value.history) {
            if (chunk.errors?.some((error) => error.code === 2593109)) {
              details.history = "declined";
              continue;
            }
            if (chunk.errors?.length) {
              details.history = "failed";
              continue;
            }
            details.history = "receiving";
            if (chunk.metadata) {
              details.historyProgress = Math.max(
                details.historyProgress ?? 0,
                chunk.metadata.progress,
              );
              const chunkId = `${chunk.metadata.phase}:${chunk.metadata.chunk_order}`;
              details.historyChunks = [
                ...new Set([...(details.historyChunks ?? []), chunkId]),
              ].slice(-10000);
            }
            for (const thread of chunk.threads ?? []) {
              const identityHash = hash(
                `whatsapp:${credentials.phoneId}:${thread.id}:${thread.id}`,
              );
              for (const message of thread.messages) {
                const at = historyTimestamp(message.timestamp);
                if (at < cutoff) continue;
                const eventKey = hash(
                  `whatsapp:${credentials.phoneId}:${message.id}:message`,
                );
                const [existingMessage] = await tx
                  .select({ id: messages.id })
                  .from(messages)
                  .innerJoin(
                    conversations,
                    eq(conversations.id, messages.conversationId),
                  )
                  .where(
                    and(
                      eq(conversations.channel, "whatsapp"),
                      eq(conversations.accountId, credentials.phoneId),
                      eq(messages.providerId, message.id),
                    ),
                  )
                  .limit(1);
                if (existingMessage) continue;
                await tx
                  .insert(events)
                  .values({ id: eventKey })
                  .onDuplicateKeyUpdate({ set: { id: eventKey } });
                await tx
                  .insert(conversations)
                  .values({
                    identityHash,
                    channel: "whatsapp",
                    accountId: credentials.phoneId,
                    participantId: thread.id,
                    threadId: thread.id,
                    status: "human",
                    humanReason: "imported_history",
                    lastInboundAt: new Date(0),
                    lastActivityAt: at,
                  })
                  .onDuplicateKeyUpdate({ set: { identityHash } });
                const [conversation] = await tx
                  .select({ id: conversations.id })
                  .from(conversations)
                  .where(eq(conversations.identityHash, identityHash));
                await tx
                  .insert(messages)
                  .values({
                    conversationId: conversation.id,
                    eventKey,
                    providerId: message.id,
                    direction:
                      message.from === thread.id
                        ? "history_inbound"
                        : "history_staff",
                    body:
                      message.type === "text"
                        ? (message.text?.body ?? "")
                        : "[رسالة قديمة غير نصية]",
                    state: "imported",
                    createdAt: at,
                  })
                  .onDuplicateKeyUpdate({ set: { eventKey } });
              }
            }
          }
          // 100 means provider completion, not proof that all out-of-order chunks arrived.
          if (
            details.historyProgress === 100 &&
            details.history === "receiving"
          )
            details.history = "provider_complete";
        } else if (event.field === "smb_app_state_sync") {
          for (const item of contactsSchema.parse(payload).state_sync) {
            if (item.type !== "contact") continue;
            const sourceAt = historyTimestamp(item.metadata.timestamp);
            if (sourceAt < cutoff) continue;
            const contactId = hash(
              `${credentials.phoneId}:${item.contact.phone_number}`,
            );
            const [existing] = await tx
              .select()
              .from(contacts)
              .where(eq(contacts.id, contactId));
            if (
              existing &&
              (existing.sourceAt > sourceAt ||
                (existing.sourceAt.getTime() === sourceAt.getTime() &&
                  item.action === "add" &&
                  openCoexistence(existing.nameCipher) === null))
            )
              continue;
            // Removal leaves a tombstone so an older delayed add cannot restore the contact.
            const nameCipher = sealCoexistence(
              item.action === "remove"
                ? null
                : (item.contact.full_name ?? item.contact.first_name ?? ""),
            );
            await tx
              .insert(contacts)
              .values({
                id: contactId,
                accountId: credentials.phoneId,
                phone: item.contact.phone_number,
                nameCipher,
                sourceAt,
                updatedAt: new Date(),
              })
              .onDuplicateKeyUpdate({
                set: { nameCipher, sourceAt, updatedAt: new Date() },
              });
          }
          details.contacts = "receiving";
        } else {
          // Unknown lifecycle events fail closed; an administrator must recheck access.
          await tx
            .update(settings)
            .set({
              revision: sql`${settings.revision} + 1`,
              config: sql`JSON_SET(${settings.config}, '$.sendingEnabled', false)`,
            })
            .where(eq(settings.id, 1));
          details.errorCode = "ACCOUNT_LIFECYCLE_RECHECK_REQUIRED";
          await tx
            .update(connections)
            .set({
              checkOk: false,
              errorCode: "ACCOUNT_LIFECYCLE_RECHECK_REQUIRED",
            })
            .where(
              and(
                eq(connections.channel, "whatsapp"),
                eq(connections.accountId, credentials.phoneId),
              ),
            );
        }
        await tx
          .update(attempts)
          .set({ details, updatedAt: new Date() })
          .where(eq(attempts.id, attempt.id));
        await tx
          .update(queue)
          .set({ state: "processed", payloadCipher: null })
          .where(eq(queue.id, event.id));
        return true;
      });
      if (!processed) break;
    } catch {
      if (selected) {
        await db
          .update(queue)
          .set({
            attempts: sql`${queue.attempts} + 1`,
            state: sql`IF(${queue.attempts} >= 2, 'failed', 'pending')`,
          })
          .where(eq(queue.id, selected));
        const [failed] = await db
          .select()
          .from(queue)
          .where(eq(queue.id, selected));
        if (failed?.state === "failed")
          await db.transaction(async (tx) => {
            const [attempt] = await tx
              .select()
              .from(attempts)
              .where(eq(attempts.id, credentials.attemptId))
              .for("update");
            if (attempt)
              await tx
                .update(attempts)
                .set({
                  details: {
                    ...attempt.details,
                    errorCode: "SYNC_EVENT_PROCESSING_FAILED",
                  },
                  updatedAt: new Date(),
                })
                .where(eq(attempts.id, attempt.id));
          });
      }
      break;
    }
  }
  await db.delete(contacts).where(lt(contacts.updatedAt, cutoff));
  await db.delete(queue).where(lt(queue.createdAt, cutoff));
  await db
    .update(attempts)
    .set({ tokenCipher: null })
    .where(lt(attempts.expiresAt, new Date()));
}
export function startCoexistenceWorker() {
  if (process.env.AUTO_REPLY_COEXISTENCE_ENABLED !== "true") return;
  let busy = false;
  let lastError = 0;
  let lastPurge = 0;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await ensureSettings();
      const db = await getAutoReplyDb();
      await db
        .update(attempts)
        .set({ tokenCipher: null })
        .where(lt(attempts.expiresAt, new Date()));
      await initiateCoexistenceSync();
      await processCoexistenceQueue();
      if (Date.now() - lastPurge > 3600_000) {
        await purgeExpiredConversations();
        lastPurge = Date.now();
      }
    } catch {
      if (Date.now() - lastError > 60_000) {
        console.error("[auto-reply] COEXISTENCE_BACKGROUND_FAILED");
        lastError = Date.now();
      }
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), 2000);
  timer.unref();
  void tick();
}
