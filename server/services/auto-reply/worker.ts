import { randomUUID } from "node:crypto";
import { managedReplyLive } from "../ai/replyPreview";
import { and, eq, inArray, lt, lte, sql } from "drizzle-orm";
import {
  autoReplySettingsSchema,
  isAutoReplyEnabled,
} from "../../../shared/auto-reply";
import {
  autoReplySettings as settingsTable,
  autoReplyConversations as conversations,
  autoReplyMessages as messages,
  autoReplyJobs as jobs,
  autoReplyKnowledge as knowledge,
  autoReplyConnections as connections,
} from "../../../drizzle/autoReply";
import {
  conversationContext,
  ensureSettings,
  getAutoReplyDb,
  purgeExpiredConversations,
  currentKnowledgeSourceCondition,
} from "./store";
import {
  channelCredentials,
  configured,
  connectionFingerprint,
  proposeReply,
  ProviderError,
  sendMetaReply,
  sendCommentPrivateReply,
  checkMetaConnection,
} from "./providers";
import {
  englishFirst,
  hash,
  inWorkingHours,
  safetyDecision,
  isPriceQuestion,
  withinReplyWindow,
} from "./policy";

export function jobFailure(error: unknown, attempts: number) {
  const safe =
    error instanceof ProviderError
      ? error
      : new ProviderError("INTERNAL_ERROR");
  return {
    state: safe.uncertain
      ? "unknown"
      : safe.retryable && attempts < 3
        ? "retry"
        : "failed",
    errorCode: safe.code,
    availableAt: new Date(
      Date.now() +
        Math.max(
          safe.retryAfterSeconds * 1000,
          30_000 * 2 ** Math.max(0, attempts - 1),
        ),
    ),
  };
}
export async function runAutoReplyTick() {
  const db = await getAutoReplyDb();
  // Generation can be retried after a crash; an interrupted send needs human reconciliation.
  await db.transaction(async (tx) => {
    await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    const expired = await tx
      .select()
      .from(jobs)
      .where(
        and(
          inArray(jobs.state, ["sending", "generating"]),
          lt(jobs.leaseUntil, new Date()),
        ),
      )
      .limit(50)
      .for("update");
    for (const item of expired) {
      const state =
        item.state === "sending"
          ? "unknown"
          : item.attempts < 3
            ? "retry"
            : "failed";
      const errorCode =
        item.state === "sending"
          ? "SEND_INTERRUPTED"
          : "GENERATION_INTERRUPTED";
      await tx
        .update(jobs)
        .set({ state, errorCode, availableAt: new Date() })
        .where(eq(jobs.id, item.id));
      if (state !== "retry")
        await tx
          .update(conversations)
          .set({
            status: "human",
            humanReason: errorCode,
            revision: sql`${conversations.revision} + 1`,
          })
          .where(
            and(
              eq(conversations.id, item.conversationId),
              eq(conversations.revision, item.revision),
              inArray(conversations.status, ["open", "human"]),
            ),
          );
    }
  });
  const job = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .for("update");
    if (!row || !autoReplySettingsSchema.parse(row.config).sendingEnabled)
      return null;
    const [candidate] = await tx
      .select()
      .from(jobs)
      .where(
        and(
          inArray(jobs.state, ["pending", "retry"]),
          lte(jobs.availableAt, new Date()),
        ),
      )
      .orderBy(jobs.id)
      .limit(1)
      .for("update");
    if (!candidate) return null;
    const claim = randomUUID();
    await tx
      .update(jobs)
      .set({
        state: "generating",
        claim,
        attempts: candidate.attempts + 1,
        leaseUntil: new Date(Date.now() + 120_000),
      })
      .where(eq(jobs.id, candidate.id));
    return { ...candidate, claim, attempts: candidate.attempts + 1 };
  });
  if (!job) return;
  let acceptedByMeta = false;
  try {
    const [c] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, job.conversationId));
    const [settingsRow] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1));
    const config = autoReplySettingsSchema.parse(settingsRow.config);
    if (
      !c ||
      c.revision !== job.revision ||
      c.status === "closed" ||
      (job.kind === "auto" && !job.handoff && c.status !== "open") ||
      !config.sendingEnabled ||
      (job.kind === "auto" &&
        !isAutoReplyEnabled(config, c.channel, c.accountId))
    ) {
      await db
        .update(jobs)
        .set({ state: "cancelled", errorCode: "STOPPED" })
        .where(
          and(
            eq(jobs.id, job.id),
            eq(jobs.claim, job.claim),
            eq(jobs.state, "generating"),
          ),
        );
      return;
    }
    const [connection] = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.channel, c.channel),
          eq(connections.accountId, c.accountId),
        ),
      );
    if (
      !configured(c.channel, c.accountId) ||
      channelCredentials(c.channel, c.accountId).accountId !== c.accountId ||
      !connection?.checkOk ||
      connection.fingerprint !==
        connectionFingerprint(c.channel, c.accountId) ||
      !connection.checkedAt ||
      Date.now() - connection.checkedAt.getTime() > 86400_000 ||
      !connection.lastWebhookAt ||
      (c.channel === "whatsapp" && !connection.lastMobileEchoAt)
    )
      throw new ProviderError("CONNECTION_NOT_VERIFIED");
    if (!withinReplyWindow(c.channel, c.lastInboundAt))
      throw new ProviderError("REPLY_WINDOW_EXPIRED");
    let body = job.body;
    let privatePrice = false;
    if (job.kind === "auto" && c.channel === "facebook_comment") {
      const [inbound] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, job.inboundId ?? -1));
      privatePrice = Boolean(inbound && isPriceQuestion(inbound.body));
    }
    let handoff = job.handoff;
    let reason: string | null = null;
    let usage = {
      model: job.model,
      inputTokens: job.inputTokens,
      outputTokens: job.outputTokens,
    };
    if (job.kind === "auto" && !body) {
      const [inbound] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, job.inboundId ?? -1));
      if (!inbound) throw new ProviderError("INBOUND_MISSING");
      const context = await conversationContext(c.id);
      if (
        !inWorkingHours(config) &&
        !safetyDecision(inbound.body) &&
        c.channel !== "facebook_comment"
      ) {
        body = englishFirst(context.firstText ?? inbound.body)
          ? config.outsideMessageEn
          : config.outsideMessage;
      } else {
        const approved = await db
          .select()
          .from(knowledge)
          .where(
            and(
              eq(knowledge.approved, true),
              currentKnowledgeSourceCondition(),
            ),
          )
          .limit(2000);
        const proposal = await proposeReply(
          {
            channel: c.channel,
            accountId: c.accountId,
            text: inbound.body,
            firstText: context.firstText,
            context: context.rows,
            settings: config,
            knowledge: approved,
          },
          config.engine === "central"
            ? managedReplyLive(job.requestKey)
            : undefined,
        );
        body = proposal.text;
        handoff = proposal.handoff;
        reason = proposal.reason;
        usage = {
          model: proposal.model,
          inputTokens: proposal.inputTokens,
          outputTokens: proposal.outputTokens,
        };
      }
    }
    if (!body) throw new ProviderError("EMPTY_REPLY");
    const prepared = await db.transaction(async (tx) => {
      const [s] = await tx
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.id, 1))
        .for("update");
      const [fresh] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, c.id))
        .for("update");
      const [freshJob] = await tx
        .select()
        .from(jobs)
        .where(eq(jobs.id, job.id))
        .for("update");
      const settings = autoReplySettingsSchema.parse(s.config);
      if (
        !fresh ||
        fresh.revision !== job.revision ||
        freshJob.state !== "generating" ||
        freshJob.claim !== job.claim ||
        s.revision !== settingsRow.revision ||
        !settings.sendingEnabled ||
        (job.kind === "auto" &&
          !isAutoReplyEnabled(settings, c.channel, c.accountId))
      )
        return false;
      if (handoff)
        await tx
          .update(conversations)
          .set({ status: "human", humanReason: reason ?? "needs_review" })
          .where(eq(conversations.id, c.id));
      await tx
        .update(jobs)
        .set({
          body,
          handoff,
          ...usage,
          state: "sending",
          leaseUntil: new Date(Date.now() + 120_000),
        })
        .where(eq(jobs.id, job.id));
      return true;
    });
    if (!prepared) return;
    await db.transaction(async (tx) => {
      const [s] = await tx
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.id, 1))
        .for("update");
      const [fresh] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, c.id))
        .for("update");
      const [freshJob] = await tx
        .select()
        .from(jobs)
        .where(eq(jobs.id, job.id))
        .for("update");
      const settings = autoReplySettingsSchema.parse(s.config);
      if (
        !fresh ||
        fresh.revision !== job.revision ||
        fresh.status === "closed" ||
        freshJob.state !== "sending" ||
        freshJob.claim !== job.claim ||
        s.revision !== settingsRow.revision ||
        !settings.sendingEnabled ||
        (job.kind === "auto" &&
          !isAutoReplyEnabled(settings, c.channel, c.accountId))
      ) {
        await tx
          .update(jobs)
          .set({ state: "cancelled", errorCode: "STOPPED_BEFORE_SEND" })
          .where(eq(jobs.id, job.id));
        return;
      }
      if (!withinReplyWindow(c.channel, fresh.lastInboundAt))
        throw new ProviderError("REPLY_WINDOW_EXPIRED");
      const [lastSend] = await tx
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.channel, c.channel),
            eq(connections.accountId, c.accountId),
          ),
        );
      if (
        lastSend?.lastSentAt &&
        Date.now() - lastSend.lastSentAt.getTime() < 2000
      )
        throw new ProviderError("LOCAL_RATE_LIMIT", true, false, 2);
      const context = await tx
        .select({ providerId: messages.providerId })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, c.id),
            eq(messages.direction, "inbound"),
          ),
        )
        .orderBy(sql`${messages.id} desc`)
        .limit(1);
      const sendPricePrivately = privatePrice && !handoff;
      if (sendPricePrivately) {
        const privateId = await sendCommentPrivateReply(
          c.accountId,
          c.threadId,
          body!,
        );
        acceptedByMeta = true;
        await tx.insert(messages).values({
          conversationId: c.id,
          eventKey: hash(`private:${job.requestKey}`),
          providerId: privateId,
          direction: "bot",
          body: body!,
          state: "sent",
        });
      }
      const publicBody = sendPricePrivately
        ? "تم إرسال التفاصيل في رسالة خاصة."
        : body!;
      const providerId = await sendMetaReply(
        c.channel,
        c.participantId,
        c.channel === "whatsapp" ? (context[0]?.providerId ?? "") : c.threadId,
        publicBody,
        c.accountId,
      );
      acceptedByMeta = true;
      await tx
        .update(jobs)
        .set({ state: "sent", providerId, errorCode: null, leaseUntil: null })
        .where(eq(jobs.id, job.id));
      await tx.insert(messages).values({
        conversationId: c.id,
        eventKey: hash(`out:${job.requestKey}`),
        providerId,
        direction: job.kind === "manual" ? "staff" : "bot",
        body: publicBody,
        state: "sent",
      });
      await tx
        .update(conversations)
        .set({ lastActivityAt: new Date() })
        .where(eq(conversations.id, c.id));
      await tx
        .update(connections)
        .set({ lastSentAt: new Date() })
        .where(
          and(
            eq(connections.channel, c.channel),
            eq(connections.accountId, c.accountId),
          ),
        );
    });
  } catch (error) {
    // Log only safe codes; provider bodies and customer content never enter logs.
    const failure = jobFailure(
      acceptedByMeta
        ? new ProviderError("SEND_COMMIT_UNCERTAIN", false, true)
        : error,
      job.attempts,
    );
    await db.transaction(async (tx) => {
      await tx
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.id, 1))
        .for("update");
      await tx
        .update(jobs)
        .set({
          ...failure,
          ...(error instanceof ProviderError ? error.usage : {}),
        })
        .where(
          and(
            eq(jobs.id, job.id),
            eq(jobs.claim, job.claim),
            inArray(jobs.state, ["generating", "sending"]),
          ),
        );
      if (["failed", "unknown"].includes(failure.state)) {
        await tx
          .update(conversations)
          .set({ status: "human", humanReason: failure.errorCode })
          .where(
            and(
              eq(conversations.id, job.conversationId),
              eq(conversations.revision, job.revision),
            ),
          );
      }
    });
  }
}
export function startAutoReplyWorker() {
  if (process.env.AUTO_REPLY_WORKER_ENABLED !== "true") return;
  let busy = false;
  let lastPurge = 0;
  let lastConnectionCheck = 0;
  let lastErrorLog = 0;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await ensureSettings();
      if (Date.now() - lastConnectionCheck > 3600_000) {
        const db = await getAutoReplyDb();
        const checks = await db.select().from(connections);
        for (const check of checks) {
          if (
            !check.checkOk ||
            check.fingerprint !==
              connectionFingerprint(check.channel, check.accountId) ||
            !check.checkedAt ||
            Date.now() - check.checkedAt.getTime() < 6 * 3600_000
          )
            continue;
          let checkOk = true;
          let errorCode: string | null = null;
          try {
            await checkMetaConnection(check.channel, check.accountId);
          } catch (error) {
            checkOk = false;
            errorCode =
              error instanceof ProviderError ? error.code : "META_CHECK_FAILED";
          }
          await db
            .update(connections)
            .set({ checkOk, errorCode, checkedAt: new Date() })
            .where(
              and(
                eq(connections.channel, check.channel),
                eq(connections.accountId, check.accountId),
              ),
            );
        }
        lastConnectionCheck = Date.now();
      }
      await runAutoReplyTick();
      if (Date.now() - lastPurge > 3600_000) {
        await purgeExpiredConversations();
        lastPurge = Date.now();
      }
    } catch {
      if (Date.now() - lastErrorLog > 60_000) {
        console.error("[auto-reply] WORKER_STORAGE_UNAVAILABLE");
        lastErrorLog = Date.now();
      }
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), 2000);
  timer.unref();
  void tick();
}
