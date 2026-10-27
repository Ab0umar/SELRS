import { z } from "zod";
import { managedReplyPreview } from "../services/ai/replyPreview";
import {
  AiTaskPending,
  AiTaskExpired,
  AiTaskFailed,
} from "../services/ai/manusJson";
import {
  AiManagementError,
  AiManagementStore,
} from "../services/ai/managementStore";
import {
  beginOnboarding,
  cancelOnboarding,
  coexistenceAssets,
  exchangeOnboardingCode,
  finishOnboarding,
  onboardingStatus,
  requireOnboardingOrigin,
  onboardingSession,
} from "../services/auto-reply/coexistence";
import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/procedures";
import {
  autoReplyChannels,
  autoReplySettingsSchema,
  knowledgeSchema,
  isAutoReplyEnabled,
  supportsGeminiSampling,
  teachingSchema,
} from "../../shared/auto-reply";
import {
  autoReplyConnections as connections,
  autoReplyConversations as conversations,
  autoReplyJobs as jobs,
  autoReplyKnowledge as knowledge,
  autoReplySettings as settingsTable,
} from "../../drizzle/autoReply";
import { services } from "../../drizzle/schema";
import {
  conversationContext,
  getAutoReplyDb,
  queueManualReply,
  readSettings,
  saveSettings,
  setConversationStatus,
  withKnowledgeUpdate,
  currentKnowledgeSourceCondition,
} from "../services/auto-reply/store";
import {
  checkMetaConnection,
  configured,
  connectionFingerprint,
  proposeReply,
  ProviderError,
  facebookPages,
  connectionTargets,
} from "../services/auto-reply/providers";
import { inWorkingHours } from "../services/auto-reply/policy";
import { logAuditEvent, getDbConnection } from "../db";
import {
  availableGeminiModels,
  previewWebsite,
  publicWebsiteUrl,
} from "../services/auto-reply/ai-configuration";

const recordId = z.number().int().positive();
const autoReplyAdminProcedure = adminProcedure.use(async ({ next }) => {
  const result = await next();
  if (!result.ok && result.error.code === "INTERNAL_SERVER_ERROR") {
    return {
      ...result,
      error: new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "AUTO_REPLY_STORAGE_ERROR",
      }),
    };
  }
  return result;
});
export const autoReplyRouter = router({
  models: autoReplyAdminProcedure.query(async () =>
    (await availableGeminiModels()).map((model) => ({
      id: model.name.replace(/^models\//, ""),
      label: model.displayName ?? model.name,
      outputTokenLimit: model.outputTokenLimit,
      topK: model.topK,
    })),
  ),
  teaching: autoReplyAdminProcedure.query(async () =>
    (await getAutoReplyDb())
      .select()
      .from(knowledge)
      .where(inArray(knowledge.kind, ["teach_ai", "website"]))
      .orderBy(desc(knowledge.updatedAt))
      .limit(200),
  ),
  previewWebsite: autoReplyAdminProcedure
    .input(z.object({ url: z.string().max(2048) }))
    .mutation(({ input }) => previewWebsite(input.url)),
  saveTeaching: autoReplyAdminProcedure
    .input(teachingSchema.extend({ id: recordId.optional() }))
    .mutation(async ({ input, ctx }) => {
      const sourceUrl = input.sourceUrl
        ? publicWebsiteUrl(input.sourceUrl).href
        : null;
      await withKnowledgeUpdate(async (tx) => {
        if (input.id) {
          const [existing] = await tx
            .select({ kind: knowledge.kind })
            .from(knowledge)
            .where(eq(knowledge.id, input.id));
          if (!existing || !["teach_ai", "website"].includes(existing.kind))
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "محتوى التعليم غير موجود",
            });
        }
        const values = {
          title: input.title,
          content: input.content,
          targetPage: input.targetPage,
          approved: input.enabled,
          sourceUrl,
          kind: sourceUrl ? "website" : "teach_ai",
          source: sourceUrl ? "website" : "teach_ai",
          keywords: "",
          updatedBy: ctx.user.id,
        };
        if (input.id)
          await tx
            .update(knowledge)
            .set(values)
            .where(eq(knowledge.id, input.id));
        else await tx.insert(knowledge).values(values);
        await tx
          .update(settingsTable)
          .set({
            config: sql`JSON_SET(${settingsTable.config}, '$.knowledgeMode', 'teach_ai')`,
          })
          .where(eq(settingsTable.id, 1));
      });
      await logAuditEvent(
        ctx.user.id,
        "AUTO_REPLY_TEACH_AI",
        "auto_reply",
        input.id ?? 0,
        { enabled: input.enabled, targetPage: input.targetPage },
      );
      return { ok: true };
    }),
  deleteTeaching: autoReplyAdminProcedure
    .input(recordId)
    .mutation(async ({ input, ctx }) => {
      await withKnowledgeUpdate((tx) =>
        tx
          .delete(knowledge)
          .where(
            and(
              eq(knowledge.id, input),
              inArray(knowledge.kind, ["teach_ai", "website"]),
            ),
          ),
      );
      await logAuditEvent(
        ctx.user.id,
        "AUTO_REPLY_TEACH_AI_DELETE",
        "auto_reply",
        input,
        {},
      );
      return { ok: true };
    }),
  clearAIHistory: autoReplyAdminProcedure
    .input(z.object({ conversationId: recordId.optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getAutoReplyDb();
      const filter = input.conversationId
        ? eq(conversations.id, input.conversationId)
        : undefined;
      const count = await db.transaction(async (tx) => {
        const selected = await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(filter)
          .for("update");
        if (!selected.length) return 0;
        const ids = selected.map((row) => row.id);
        await tx
          .update(conversations)
          .set({
            contextResetAt: new Date(),
            revision: sql`${conversations.revision}+1`,
          })
          .where(inArray(conversations.id, ids));
        await tx
          .update(jobs)
          .set({ state: "cancelled", errorCode: "AI_CONTEXT_RESET" })
          .where(
            and(
              inArray(jobs.conversationId, ids),
              eq(jobs.kind, "auto"),
              inArray(jobs.state, ["pending", "retry", "generating"]),
            ),
          );
        return ids.length;
      });
      await logAuditEvent(
        ctx.user.id,
        "AUTO_REPLY_CONTEXT_RESET",
        "auto_reply",
        input.conversationId ?? 0,
        { count },
      );
      return { count };
    }),
  onboardingStatus: autoReplyAdminProcedure.query(() => onboardingStatus()),
  beginOnboarding: autoReplyAdminProcedure.mutation(({ ctx }) => {
    requireOnboardingOrigin(ctx.req.headers.origin);
    return beginOnboarding(
      ctx.user.id,
      onboardingSession(ctx.req.headers.cookie),
    );
  }),
  exchangeOnboardingCode: autoReplyAdminProcedure
    .input(
      z.object({ id: z.string().uuid(), code: z.string().min(1).max(8192) }),
    )
    .mutation(({ ctx, input }) => {
      requireOnboardingOrigin(ctx.req.headers.origin);
      return exchangeOnboardingCode(
        input.id,
        input.code,
        ctx.user.id,
        onboardingSession(ctx.req.headers.cookie),
      );
    }),
  finishOnboarding: autoReplyAdminProcedure
    .input(z.object({ id: z.string().uuid(), assets: coexistenceAssets }))
    .mutation(({ ctx, input }) => {
      requireOnboardingOrigin(ctx.req.headers.origin);
      return finishOnboarding(
        input.id,
        input.assets,
        ctx.user.id,
        onboardingSession(ctx.req.headers.cookie),
      );
    }),
  cancelOnboarding: autoReplyAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      requireOnboardingOrigin(ctx.req.headers.origin);
      return cancelOnboarding(
        input.id,
        ctx.user.id,
        onboardingSession(ctx.req.headers.cookie),
      );
    }),
  settings: autoReplyAdminProcedure.query(async () => {
    const db = await getAutoReplyDb();
    const checks = await db.select().from(connections);
    return {
      config: await readSettings(),
      workerEnabled: process.env.AUTO_REPLY_WORKER_ENABLED === "true",
      geminiConfigured: Boolean(process.env.AUTO_REPLY_GEMINI_KEY),
      centralAvailable: process.env.AI_CORE_MANAGEMENT_ENABLED === "true",
      pages: facebookPages().map(({ accountId, label }) => ({
        accountId,
        label,
      })),
      channels: connectionTargets().map(({ channel, accountId, label }) => {
        const row = checks.find(
          (c) => c.channel === channel && c.accountId === accountId,
        );
        const current =
          row?.fingerprint === connectionFingerprint(channel, accountId);
        return {
          channel,
          configured: configured(channel, accountId),
          accountId,
          label,
          checkedAt: row?.checkedAt ?? null,
          checkOk: Boolean(current && row?.checkOk),
          checkFresh: Boolean(
            current &&
            row?.checkOk &&
            row.checkedAt &&
            Date.now() - row.checkedAt.getTime() < 86400_000,
          ),
          errorCode: current ? (row?.errorCode ?? null) : null,
          lastWebhookAt: row?.lastWebhookAt ?? null,
          lastMobileEchoAt: row?.lastMobileEchoAt ?? null,
        };
      }),
    };
  }),
  saveSettings: autoReplyAdminProcedure
    .input(autoReplySettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const profile =
        input.engine === "central"
          ? process.env.AI_CORE_MANAGEMENT_ENABLED === "true"
            ? (
                await new AiManagementStore(getDbConnection).listProfiles()
              ).find((profile) => profile.workload === "reply.live")
            : undefined
          : undefined;
      if (input.engine === "central") {
        if (!profile?.enabled)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "فعّل مهمة الرد الآلي المركزي واختبرها في المعاينة أولًا",
          });
      }
      if (
        profile?.provider !== "manus" &&
        input.topK !== null &&
        supportsGeminiSampling(input.model)
      ) {
        const model = (await availableGeminiModels()).find(
          (model) => model.name === `models/${input.model}`,
        );
        if (!model?.topK)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "هذا الموديل لا يتيح topK؛ اتركه على افتراضي الموديل",
          });
      }
      if (input.hoursEnabled && !input.hours.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "أضف مواعيد العمل أو ألغِ تفعيلها",
        });
      if (input.hours.some((h) => h.start === h.end))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "بداية فترة العمل ونهايتها يجب أن تختلفا",
        });
      if (input.sendingEnabled) {
        if (process.env.AUTO_REPLY_WORKER_ENABLED !== "true")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "فعّل عامل الخلفية على السيرفر أولًا",
          });
        const db = await getAutoReplyDb();
        const checks = await db.select().from(connections);
        const active = connectionTargets().filter((c) =>
          isAutoReplyEnabled(input, c.channel, c.accountId),
        );
        if (
          active.length &&
          !(profile?.provider === "manus"
            ? process.env.MANUS_API_KEY
            : process.env.AUTO_REPLY_GEMINI_KEY)
        )
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "مفتاح مزوّد الرد الآلي المختار غير مضبوط على السيرفر",
          });
        for (const { channel, accountId } of active) {
          const check = checks.find(
            (c) => c.channel === channel && c.accountId === accountId,
          );
          if (
            !configured(channel, accountId) ||
            !check?.checkOk ||
            check.fingerprint !== connectionFingerprint(channel, accountId) ||
            !check.checkedAt ||
            Date.now() - check.checkedAt.getTime() > 86400_000 ||
            !check.lastWebhookAt ||
            (channel === "whatsapp" && !check.lastMobileEchoAt)
          )
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message:
                "اختبر القنوات المفعّلة واستقبل Webhook حقيقيًا قبل التشغيل",
            });
        }
      }
      await saveSettings(input, ctx.user.id);
      await logAuditEvent(ctx.user.id, "AUTO_REPLY_SETTINGS", "auto_reply", 1, {
        sendingEnabled: input.sendingEnabled,
        channels: input.channels,
        facebookPages: input.facebookPages,
      });
      return { ok: true };
    }),
  checkConnection: autoReplyAdminProcedure
    .input(
      z.object({
        channel: z.enum(autoReplyChannels),
        accountId: z.string().min(1).max(128),
      }),
    )
    .mutation(async ({ input }) => {
      let ok = false;
      let errorCode: string | null = null;
      try {
        await checkMetaConnection(input.channel, input.accountId);
        ok = true;
      } catch (error) {
        errorCode =
          error instanceof ProviderError ? error.code : "META_CHECK_FAILED";
      }
      const db = await getAutoReplyDb();
      const [previous] = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.channel, input.channel),
            eq(connections.accountId, input.accountId),
          ),
        );
      const changed =
        previous?.fingerprint &&
        previous.fingerprint !==
          connectionFingerprint(input.channel, input.accountId);
      const values = {
        checkedAt: new Date(),
        checkOk: ok,
        fingerprint: connectionFingerprint(input.channel, input.accountId),
        errorCode,
        ...(changed ? { lastWebhookAt: null, lastMobileEchoAt: null } : {}),
      };
      await db
        .insert(connections)
        .values({
          channel: input.channel,
          accountId: input.accountId,
          ...values,
        })
        .onDuplicateKeyUpdate({ set: values });
      return { ok, errorCode };
    }),
  conversations: autoReplyAdminProcedure
    .input(
      z.object({
        channel: z.enum(autoReplyChannels).optional(),
        accountId: z.string().min(1).max(128).optional(),
        status: z.enum(["open", "human", "closed"]).optional(),
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ input }) => {
      const db = await getAutoReplyDb();
      const filter = and(
        input.channel ? eq(conversations.channel, input.channel) : undefined,
        input.accountId
          ? eq(conversations.accountId, input.accountId)
          : undefined,
        input.status ? eq(conversations.status, input.status) : undefined,
      );
      const rows = await db
        .select()
        .from(conversations)
        .where(filter)
        .orderBy(desc(conversations.lastActivityAt))
        .limit(31)
        .offset((input.page - 1) * 30);
      return { rows: rows.slice(0, 30), hasMore: rows.length > 30 };
    }),
  conversation: autoReplyAdminProcedure
    .input(recordId)
    .query(async ({ input }) => {
      const db = await getAutoReplyDb();
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input));
      if (!conversation)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المحادثة غير موجودة",
        });
      return {
        conversation,
        ...(await conversationContext(input)),
        jobs: await db
          .select()
          .from(jobs)
          .where(eq(jobs.conversationId, input))
          .orderBy(desc(jobs.id))
          .limit(30),
      };
    }),
  setStatus: autoReplyAdminProcedure
    .input(
      z.object({ id: recordId, status: z.enum(["open", "human", "closed"]) }),
    )
    .mutation(async ({ input, ctx }) => {
      await setConversationStatus(input.id, input.status);
      await logAuditEvent(
        ctx.user.id,
        "AUTO_REPLY_STATUS",
        "auto_reply",
        input.id,
        { status: input.status },
      );
      return { ok: true };
    }),
  sendManual: autoReplyAdminProcedure
    .input(
      z.object({
        id: recordId,
        text: z.string().trim().min(1).max(2000),
        requestId: z.uuid(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await queueManualReply(
        input.id,
        input.text,
        input.requestId,
      );
      await logAuditEvent(
        ctx.user.id,
        "AUTO_REPLY_MANUAL_QUEUED",
        "auto_reply",
        input.id,
        { jobId: result.id },
      );
      return result;
    }),
  knowledge: autoReplyAdminProcedure.query(async () =>
    (await getAutoReplyDb())
      .select()
      .from(knowledge)
      .where(currentKnowledgeSourceCondition())
      .orderBy(desc(knowledge.updatedAt))
      .limit(2000),
  ),
  saveKnowledge: autoReplyAdminProcedure
    .input(knowledgeSchema.extend({ id: recordId.optional() }))
    .mutation(async ({ input, ctx }) => {
      if (input.id) {
        const db = await getAutoReplyDb();
        const [existing] = await db
          .select({ source: knowledge.source })
          .from(knowledge)
          .where(eq(knowledge.id, input.id));
        if (existing?.source?.startsWith("tests:"))
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "مصدر الخدمات هو صفحة خدمات المركز فقط؛ لا يمكن اعتماد فحوص من المصدر القديم",
          });
      }
      if (input.kind === "booking") {
        const links = input.content.match(/https:\/\/[^\s]+/g) ?? [];
        if (!links.length)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "أدخل رابط حجز معتمد يبدأ بـ https://",
          });
      }
      const { id, ...values } = input;
      await withKnowledgeUpdate(async (tx) => {
        if (id)
          await tx
            .update(knowledge)
            .set({ ...values, updatedBy: ctx.user.id })
            .where(eq(knowledge.id, id));
        else
          await tx
            .insert(knowledge)
            .values({ ...values, updatedBy: ctx.user.id });
      });
      await logAuditEvent(
        ctx.user.id,
        "AUTO_REPLY_KNOWLEDGE",
        "auto_reply",
        id ?? 0,
        { approved: input.approved, kind: input.kind },
      );
      return { ok: true };
    }),
  deleteKnowledge: autoReplyAdminProcedure
    .input(recordId)
    .mutation(async ({ input, ctx }) => {
      await withKnowledgeUpdate(async (tx) =>
        tx.delete(knowledge).where(eq(knowledge.id, input)),
      );
      await logAuditEvent(
        ctx.user.id,
        "AUTO_REPLY_KNOWLEDGE_DELETE",
        "auto_reply",
        input,
      );
      return { ok: true };
    }),
  importCatalog: autoReplyAdminProcedure.mutation(async ({ ctx }) => {
    const db = await getAutoReplyDb();
    const [catalog, present] = await Promise.all([
      db
        .select()
        .from(services)
        .where(
          and(eq(services.isActive, true), eq(services.locationType, "center")),
        )
        .limit(1000),
      db.select({ source: knowledge.source }).from(knowledge),
    ]);
    const sources = new Set(present.map((k) => k.source));
    const candidates = catalog
      .map((s) => ({
        source: `services:${s.id}`,
        title: s.name,
        content: `${s.name}${Number(s.price) > 0 ? `: السعر المسجل ${s.price} جنيه مصري` : ": السعر غير معتمد للنشر"}`,
        kind: "service",
        keywords: `${s.code} ${s.category ?? ""}`,
      }))
      .filter((c) => !sources.has(c.source));
    // Catalog prices are drafts until an administrator approves them for customer replies.
    if (candidates.length)
      await db.insert(knowledge).values(
        candidates.map((c) => ({
          ...c,
          approved: false,
          updatedBy: ctx.user.id,
        })),
      );
    await logAuditEvent(
      ctx.user.id,
      "AUTO_REPLY_IMPORT_CATALOG",
      "auto_reply",
      0,
      { count: candidates.length },
    );
    return { count: candidates.length };
  }),
  test: autoReplyAdminProcedure
    .input(
      z.object({
        channel: z.enum(autoReplyChannels),
        accountId: z
          .string()
          .regex(/^\d{1,32}$/)
          .optional(),
        text: z.string().trim().min(1).max(3000),
        conversationId: recordId.optional(),
        engine: z
          .enum(["current", "central", "central_live"])
          .default("current"),
        requestId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getAutoReplyDb();
      const config = await readSettings();
      const approved = await db
        .select()
        .from(knowledge)
        .where(
          and(eq(knowledge.approved, true), currentKnowledgeSourceCondition()),
        )
        .limit(2000);
      let context: Awaited<ReturnType<typeof conversationContext>> = {
        rows: [],
        firstText: input.text,
      };
      let accountId = input.accountId;
      if (input.conversationId) {
        const [c] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, input.conversationId));
        if (!c || c.channel !== input.channel)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "قناة الاختبار لا تطابق المحادثة",
          });
        context = await conversationContext(input.conversationId);
        accountId = c.accountId;
      }
      try {
        const engine =
          input.engine === "current" && config.engine === "central"
            ? "central_live"
            : input.engine;
        if (engine !== "current" && !input.requestId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "معرف طلب المعاينة مطلوب",
          });
        const proposal = await proposeReply(
          {
            channel: input.channel,
            accountId,
            text: input.text,
            firstText: context.firstText,
            context: context.rows,
            settings: config,
            knowledge: approved,
          },
          engine !== "current"
            ? managedReplyPreview(
                input.requestId!,
                undefined,
                engine === "central_live" ? "reply.live" : "reply.preview",
              )
            : undefined,
        );
        await logAuditEvent(
          ctx.user.id,
          "AUTO_REPLY_INTERNAL_TEST",
          "auto_reply",
          0,
          {
            model: proposal.model,
            inputTokens: proposal.inputTokens,
            outputTokens: proposal.outputTokens,
            handoff: proposal.handoff,
            engine: input.engine,
          },
        );
        return {
          ...proposal,
          testOnly: true as const,
          engine: input.engine,
          requestId: input.engine !== "current" ? input.requestId : undefined,
          inWorkingHours: inWorkingHours(config),
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            error instanceof AiTaskPending
              ? "AI_TASK_PENDING"
              : error instanceof AiTaskExpired
                ? "AI_TASK_EXPIRED"
                : error instanceof AiTaskFailed
                  ? "AI_TASK_FAILED"
                  : error instanceof ProviderError
                    ? error.code
                    : error instanceof AiManagementError
                      ? `المعاينة المركزية غير متاحة (${error.code}). راجع إعدادات مهمة معاينة الرد الآلي وسجل الاستهلاك.`
                      : "فشل الاختبار. راجع سجل الاستهلاك قبل إعادة المحاولة.",
        });
      }
    }),
  activity: autoReplyAdminProcedure.query(async () => {
    const db = await getAutoReplyDb();
    return db
      .select({
        id: jobs.id,
        channel: conversations.channel,
        accountId: conversations.accountId,
        conversationId: jobs.conversationId,
        state: jobs.state,
        kind: jobs.kind,
        attempts: jobs.attempts,
        errorCode: jobs.errorCode,
        model: jobs.model,
        inputTokens: jobs.inputTokens,
        outputTokens: jobs.outputTokens,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .innerJoin(conversations, eq(conversations.id, jobs.conversationId))
      .orderBy(desc(jobs.id))
      .limit(100);
  }),
});
