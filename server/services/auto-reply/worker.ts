import { randomUUID } from "node:crypto";
import { managedReplyLive } from "../ai/replyPreview";
import { and, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import {
  autoReplySettingsSchema,
  isAutoReplyEnabled,
  settingsForTarget,
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
  recordSentMessage,
  requeueJob,
  claimHandoffNotifications,
} from "./store";
import { pushAppNotification } from "../../_core/appNotifications";
import { channelLabels } from "../../../shared/auto-reply";
import { ROUTES } from "../../../shared/routes";
import { isRecipientAllowed } from "./recipients";
import {
  channelCredentials,
  configured,
  connectionFingerprint,
  proposeReply,
  ProviderError,
  sendMetaReply,
  sendCommentPrivateReply,
  checkMetaConnection,
  isTransientCheckFailure,
} from "./providers";
import {
  englishFirst,
  hash,
  inWorkingHours,
  safetyDecision,
  isPriceQuestion,
  replyInEnglish,
  withinReplyWindow,
} from "./policy";

export function jobFailure(error: unknown, attempts: number) {
  const safe =
    error instanceof ProviderError
      ? error
      : new ProviderError("INTERNAL_ERROR");
  // The local 2-second send spacing is not a failure of this job.
  if (safe.code === "LOCAL_RATE_LIMIT")
    return {
      state: "retry",
      errorCode: safe.code,
      availableAt: new Date(Date.now() + 2000),
      attempts: Math.max(0, attempts - 1),
    };
  if (safe.code === "CENTRAL_AI_PENDING")
    return {
      state: attempts < 40 ? "retry" : "unknown",
      errorCode: safe.code,
      availableAt: new Date(Date.now() + 15_000),
    };
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
// Error messages can carry query parameters (customer text); only the name, driver code and frames are logged.
function logInternalError(jobId: number | null, error: unknown) {
  const e = (error ?? {}) as {
    name?: unknown;
    code?: unknown;
    cause?: { code?: unknown };
    stack?: unknown;
  };
  const code =
    typeof e.code === "string"
      ? e.code
      : typeof e.cause?.code === "string"
        ? e.cause.code
        : null;
  console.error("[auto-reply] INTERNAL_ERROR", {
    jobId,
    name: typeof e.name === "string" ? e.name : null,
    code,
    stack: String(e.stack ?? "")
      .split("\n")
      .filter((line) => /^\s+at /.test(line))
      .slice(0, 10)
      .map((line) => line.trim()),
  });
}
type ConnectionRow = typeof connections.$inferSelect;
async function recheckConnection(
  db: Awaited<ReturnType<typeof getAutoReplyDb>>,
  check: ConnectionRow,
) {
  let checkOk = true;
  let errorCode: string | null = null;
  try {
    await checkMetaConnection(check.channel, check.accountId);
  } catch (error) {
    // A transient outcome leaves the stored result alone.
    if (isTransientCheckFailure(error)) return "transient" as const;
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
  return checkOk ? ("ok" as const) : ("failed" as const);
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
    const baseConfig = autoReplySettingsSchema.parse(settingsRow.config);
    const config = c
      ? settingsForTarget(baseConfig, c.channel, c.accountId)
      : baseConfig;
    if (
      !c ||
      c.revision !== job.revision ||
      c.status === "closed" ||
      (job.kind === "auto" && !job.handoff && c.status !== "open") ||
      !config.sendingEnabled ||
      (job.kind === "auto" &&
        (!isAutoReplyEnabled(config, c.channel, c.accountId) ||
          !(await isRecipientAllowed(db, config, c))))
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
    const readConnection = async () =>
      (
        await db
          .select()
          .from(connections)
          .where(
            and(
              eq(connections.channel, c.channel),
              eq(connections.accountId, c.accountId),
            ),
          )
      )[0] as ConnectionRow | undefined;
    const verify = (connection: ConnectionRow | undefined) =>
      !configured(c.channel, c.accountId)
      ? "CONFIG_MISSING"
      : channelCredentials(c.channel, c.accountId).accountId !== c.accountId
        ? "ACCOUNT_MISMATCH"
        : !connection?.checkOk
          ? "CHECK_NOT_OK"
          : connection.fingerprint !==
              connectionFingerprint(c.channel, c.accountId)
            ? "CREDENTIALS_CHANGED"
            : !connection.checkedAt
              ? "CHECK_MISSING"
              : Date.now() - connection.checkedAt.getTime() > 86400_000
                ? "CHECK_EXPIRED"
                : !connection.lastWebhookAt
                  ? "WEBHOOK_MISSING"
                  : c.channel === "whatsapp" && !connection.lastMobileEchoAt
                    ? "MOBILE_ECHO_MISSING"
                    : null;
    let connection = await readConnection();
    let verificationFailure = verify(connection);
    if (
      (verificationFailure === "CHECK_NOT_OK" ||
        verificationFailure === "CHECK_EXPIRED") &&
      connection?.checkedAt &&
      connection.fingerprint ===
        connectionFingerprint(c.channel, c.accountId) &&
      !(
        verificationFailure === "CHECK_NOT_OK" &&
        Date.now() - connection.checkedAt.getTime() < 300_000
      )
    ) {
      if ((await recheckConnection(db, connection)) === "transient")
        throw new ProviderError("CONNECTION_CHECK_TRANSIENT", true, false, 60);
      connection = await readConnection();
      verificationFailure = verify(connection);
    }
    if (verificationFailure) {
      console.warn("[auto-reply-connection]", {
        pid: process.pid,
        channel: c.channel,
        accountId: c.accountId,
        reason: verificationFailure,
      });
      throw new ProviderError(`CONNECTION_NOT_VERIFIED:${verificationFailure}`);
    }
    if (!withinReplyWindow(c.channel, c.lastInboundAt))
      throw new ProviderError("REPLY_WINDOW_EXPIRED");
    let body = job.body;
    let privatePrice = false;
    let englishComment = false;
    if (job.kind === "auto" && c.channel === "facebook_comment") {
      const [inbound] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, job.inboundId ?? -1));
      privatePrice = Boolean(inbound && isPriceQuestion(inbound.body));
      englishComment = Boolean(inbound && englishFirst(inbound.body));
    }
    let handoff = job.handoff;
    let reason: string | null = null;
    let usage = {
      model: job.model,
      inputTokens: job.inputTokens,
      outputTokens: job.outputTokens,
    };
    // Ends the job without a Meta call, under the settings lock like every other write.
    const finishWithoutSend = (
      errorCode: string,
      humanReason: string | null,
      jobUsage = {},
    ) =>
      db.transaction(async (tx) => {
        await tx
          .select()
          .from(settingsTable)
          .where(eq(settingsTable.id, 1))
          .for("update");
        const [updated] = await tx
          .update(jobs)
          .set({ state: "cancelled", errorCode, leaseUntil: null, ...jobUsage })
          .where(
            and(
              eq(jobs.id, job.id),
              eq(jobs.claim, job.claim),
              eq(jobs.state, "generating"),
            ),
          );
        if (humanReason && updated.affectedRows)
          await tx
            .update(conversations)
            .set({ status: "human", humanReason })
            .where(
              and(
                eq(conversations.id, c.id),
                eq(conversations.revision, job.revision),
              ),
            );
      });
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
        body = replyInEnglish(inbound.body, context.firstText)
          ? config.outsideMessageEn
          : config.outsideMessage;
        // One outside-hours notice per conversation every 6 hours is enough.
        const [repeat] = await db
          .select({ id: messages.id })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, c.id),
              eq(messages.direction, "bot"),
              eq(messages.body, body),
              gte(messages.createdAt, new Date(Date.now() - 6 * 3600_000)),
            ),
          )
          .limit(1);
        if (repeat) {
          await finishWithoutSend("OUTSIDE_HOURS_REPEAT", null);
          return;
        }
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
            // The current message is sent separately, not again as history.
            context: context.rows.filter((row) => row.id !== inbound.id),
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
        // A comment that asks nothing (praise, prayers, tags) is handed off without a public reply.
        if (
          c.channel === "facebook_comment" &&
          proposal.handoff &&
          !proposal.publicReply
        ) {
          await finishWithoutSend(
            "SILENT_HANDOFF",
            proposal.reason ?? "needs_review",
            usage,
          );
          return;
        }
      }
    }
    if (!body) throw new ProviderError("EMPTY_REPLY");
    // Step 1: one short locked transaction re-validates and marks the job sending.
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
        freshJob.claim !== job.claim
      )
        return null;
      if (
        fresh.status === "closed" ||
        !settings.sendingEnabled ||
        (job.kind === "auto" &&
          (!isAutoReplyEnabled(settings, c.channel, c.accountId) ||
            !(await isRecipientAllowed(tx, settings, c))))
      ) {
        await tx
          .update(jobs)
          .set({ state: "cancelled", errorCode: "STOPPED_BEFORE_SEND" })
          .where(eq(jobs.id, job.id));
        return null;
      }
      // A settings or knowledge save made the generated text stale; a staff reply is still valid.
      if (s.revision !== settingsRow.revision && job.kind === "auto") {
        await requeueJob(tx, freshJob);
        return null;
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
      // Another job of this account may be mid-call outside the lock.
      const [inFlight] = await tx
        .select({ id: jobs.id })
        .from(jobs)
        .innerJoin(conversations, eq(conversations.id, jobs.conversationId))
        .where(
          and(
            eq(jobs.state, "sending"),
            eq(conversations.channel, c.channel),
            eq(conversations.accountId, c.accountId),
          ),
        )
        .limit(1);
      if (
        inFlight ||
        (lastSend?.lastSentAt &&
          Date.now() - lastSend.lastSentAt.getTime() < 2000)
      ) {
        // Keep the generated text so the retry does not call the model again.
        await tx
          .update(jobs)
          .set({
            ...jobFailure(
              new ProviderError("LOCAL_RATE_LIMIT", true, false, 2),
              job.attempts,
            ),
            body,
            handoff,
            ...usage,
            claim: null,
            leaseUntil: null,
          })
          .where(eq(jobs.id, job.id));
        return null;
      }
      const [inboundRow] = await tx
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
      return { inboundProviderId: inboundRow?.providerId ?? "" };
    });
    if (!prepared) return;
    // Step 2: Meta calls with no transaction open. A crash here resolves to
    // `unknown` through lease expiry of the `sending` job.
    const sendPricePrivately = privatePrice && !handoff;
    if (sendPricePrivately) {
      const privateId = await sendCommentPrivateReply(
        c.accountId,
        c.threadId,
        body,
      );
      acceptedByMeta = true;
      await recordSentMessage({
        conversationId: c.id,
        eventKey: hash(`private:${job.requestKey}`),
        providerId: privateId,
        direction: "bot",
        body,
        state: "sent",
      });
      acceptedByMeta = false;
    }
    const publicBody = sendPricePrivately
      ? englishComment
        ? "We have sent you the details in a private message."
        : "تم إرسال التفاصيل في رسالة خاصة."
      : body;
    let providerId: string;
    try {
      providerId = await sendMetaReply(
        c.channel,
        c.participantId,
        c.channel === "whatsapp" ? prepared.inboundProviderId : c.threadId,
        publicBody,
        c.accountId,
      );
    } catch (error) {
      if (!sendPricePrivately) throw error;
      // The private reply reached the customer; only the public line failed.
      throw new ProviderError(
        "PRIVATE_SENT_PUBLIC_FAILED",
        false,
        !(error instanceof ProviderError) || error.uncertain,
      );
    }
    acceptedByMeta = true;
    // Step 3: a second short transaction records the outcome.
    await db.transaction(async (tx) => {
      await tx
        .select()
        .from(settingsTable)
        .where(eq(settingsTable.id, 1))
        .for("update");
      await tx
        .update(jobs)
        .set({ state: "sent", providerId, errorCode: null, leaseUntil: null })
        .where(and(eq(jobs.id, job.id), eq(jobs.claim, job.claim)));
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
    if (!(error instanceof ProviderError)) logInternalError(job.id, error);
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
const handoffReasonLabels: Record<string, string> = {
  human_requested: "العميل طلب موظف",
  clinical: "سؤال طبي",
  untrusted_instruction: "محاولة تغيير تعليمات البوت",
  unsupported_message: "رسالة غير نصية",
  missing_information: "المعلومة غير متاحة",
  needs_review: "الرد يحتاج مراجعة",
  output_guard: "الرد يحتاج مراجعة",
  personal_information: "بيانات شخصية في تعليق",
  rate_limited: "تجاوز حد الردود الآلية",
  outside_hours: "خارج مواعيد العمل",
};
// Channel, reason and a link only: customer text never goes into a push payload.
export async function notifyHandoffs() {
  for (const row of await claimHandoffNotifications()) {
    const reason = row.humanReason ?? "needs_review";
    await pushAppNotification({
      title: "محادثة تحتاج موظف",
      message: `${channelLabels[row.channel] ?? row.channel} · ${handoffReasonLabels[reason] ?? reason}`,
      kind: "warning",
      targetRoles: ["admin", "reception"],
      source: "auto_reply",
      entityType: "auto_reply_conversation",
      entityId: row.id,
      meta: { path: `${ROUTES.aiInbox}?conversation=${row.id}` },
    }).catch(() => {
      console.warn("[auto-reply] HANDOFF_NOTIFICATION_FAILED", { id: row.id });
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
          // Failed rows are re-checked too, so a recovered channel comes back without an admin test.
          if (
            check.fingerprint !==
              connectionFingerprint(check.channel, check.accountId) ||
            !check.checkedAt ||
            Date.now() - check.checkedAt.getTime() < 6 * 3600_000
          )
            continue;
          await recheckConnection(db, check);
        }
        lastConnectionCheck = Date.now();
      }
      await runAutoReplyTick();
      await notifyHandoffs();
      if (Date.now() - lastPurge > 3600_000) {
        await purgeExpiredConversations();
        lastPurge = Date.now();
      }
    } catch (error) {
      if (Date.now() - lastErrorLog > 60_000) {
        console.error("[auto-reply] WORKER_STORAGE_UNAVAILABLE");
        if (!(error instanceof ProviderError)) logInternalError(null, error);
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
