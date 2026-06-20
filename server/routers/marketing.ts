import { z } from "zod";
import { desc, eq, count as drizzleCount, and, gte } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { router, adminProcedure } from "../_core/procedures";
import { getDb } from "../db";
import {
  marketingPosts,
  marketingSettings,
  marketingLogs,
  marketingReferenceDesigns,
  marketingBrandProfile,
} from "../../drizzle/schema";
import { generateMarketingContent } from "../services/marketing/contentGenerator.service";
import { pickTopic, type PostDay } from "../services/marketing/topicRotation";
import {
  generateMarketingImage,
  MarketingImageConfigError,
} from "../services/marketing/imageGenerator.service";
import {
  analyzeDesignImage,
  buildBrandProfile,
  type StyleAttributes,
} from "../services/marketing/brandStyleAnalyzer.service";
import { ENV } from "../_core/env";

async function addLog(
  postId: number | null,
  action: string,
  status: "success" | "error" | "info",
  message: string,
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(marketingLogs).values({ postId, action, status, message });
}

async function getActiveBrandProfile() {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(marketingBrandProfile).limit(1);
  return row ?? null;
}

function getReferenceDesignDir(): string {
  return path.resolve(
    ENV.marketingImageDir
      ? path.join(ENV.marketingImageDir, "reference-designs")
      : path.join(process.cwd(), "uploads", "marketing", "reference-designs"),
  );
}

export const marketingRouter = router({
  // ─── Posts ────────────────────────────────────────────────

  listPosts: adminProcedure
    .input(
      z.object({
        status: z
          .enum(["draft", "published", "failed", "scheduled", "all"])
          .default("all"),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const where =
        input.status !== "all"
          ? eq(
              marketingPosts.status,
              input.status as "draft" | "published" | "failed" | "scheduled",
            )
          : undefined;
      const rows = await db
        .select()
        .from(marketingPosts)
        .where(where)
        .orderBy(desc(marketingPosts.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  getPost: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [row] = await db
        .select()
        .from(marketingPosts)
        .where(eq(marketingPosts.id, input.id))
        .limit(1);
      return row ?? null;
    }),

  createPost: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().optional(),
        topic: z.string().max(255).optional(),
        idea: z.string().optional(),
        cta: z.string().max(500).optional(),
        hashtags: z.string().optional(),
        imagePrompt: z.string().optional(),
        imageUrl: z.string().max(1000).optional(),
        platform: z.enum(["facebook", "instagram", "both"]).default("facebook"),
        postDay: z.enum(["saturday", "tuesday", "thursday"]).optional(),
        status: z.enum(["draft", "scheduled"]).default("draft"),
        scheduledAt: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(marketingPosts).values({
        title: input.title,
        content: input.content ?? null,
        topic: input.topic ?? null,
        idea: input.idea ?? null,
        cta: input.cta ?? null,
        hashtags: input.hashtags ?? null,
        imagePrompt: input.imagePrompt ?? null,
        imageUrl: input.imageUrl ?? null,
        platform: input.platform,
        postDay: input.postDay ?? null,
        status: input.status,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        createdBy: ctx.user.id,
      });
      const id = (result as { insertId?: number }).insertId ?? 0;
      await addLog(id, "create_post", "info", `Post created: ${input.title}`);
      return { id };
    }),

  updatePost: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        topic: z.string().max(255).optional(),
        idea: z.string().optional(),
        cta: z.string().max(500).optional(),
        hashtags: z.string().optional(),
        imagePrompt: z.string().optional(),
        imageUrl: z.string().max(1000).optional(),
        platform: z.enum(["facebook", "instagram", "both"]).optional(),
        postDay: z.enum(["saturday", "tuesday", "thursday"]).optional(),
        status: z.enum(["draft", "scheduled"]).optional(),
        scheduledAt: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, scheduledAt, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (scheduledAt !== undefined) {
        updates.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      }
      await db
        .update(marketingPosts)
        .set(updates)
        .where(eq(marketingPosts.id, id));
      await addLog(id, "update_post", "info", `Post updated: ${id}`);
      return { ok: true };
    }),

  deletePost: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(marketingPosts).where(eq(marketingPosts.id, input.id));
      await addLog(null, "delete_post", "info", `Post deleted: ${input.id}`);
      return { ok: true };
    }),

  publishPost: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [post] = await db
        .select()
        .from(marketingPosts)
        .where(eq(marketingPosts.id, input.id))
        .limit(1);
      if (!post) throw new Error("Post not found");

      // Try to publish to Facebook if connected
      const [settings] = await db.select().from(marketingSettings).limit(1);
      let fbResult: string | null = null;

      if (
        settings?.fbConnected &&
        settings.fbPageId &&
        settings.fbAccessToken
      ) {
        try {
          const { publishPostToFacebook } =
            await import("../services/marketing/facebookPublisher.service");
          const message = [
            post.content ?? post.title,
            post.cta ? `\n\n${post.cta}` : "",
            post.hashtags ? `\n\n${post.hashtags}` : "",
          ]
            .join("")
            .trim();
          const appOrigin = ENV.fbAppOrigin || "https://selrs.cc";
          const { fbPostId } = await publishPostToFacebook(
            settings.fbPageId,
            settings.fbAccessToken,
            message,
            post.imageUrl ?? null,
            appOrigin,
          );
          fbResult = fbPostId;
          await addLog(
            input.id,
            "publish_post",
            "success",
            `Published to Facebook: ${fbPostId}`,
          );
        } catch (err) {
          await addLog(
            input.id,
            "publish_post",
            "error",
            `Facebook publish failed: ${String(err)}`,
          );
          throw new Error(`فشل النشر على Facebook: ${String(err)}`);
        }
      }

      await db
        .update(marketingPosts)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(marketingPosts.id, input.id));

      if (!fbResult) {
        await addLog(
          input.id,
          "publish_post",
          "info",
          `Post marked published locally (FB not connected)`,
        );
      }
      return { ok: true, fbPostId: fbResult };
    }),

  generatePost: adminProcedure
    .input(
      z.object({
        postDay: z.enum(["saturday", "tuesday", "thursday"]),
        topic: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const day = input.postDay as PostDay;

      // Determine topic: explicit override or round-robin from list
      let selectedTopic = input.topic;
      let postIndex = 0;
      if (!selectedTopic) {
        const [countRow] = await db
          .select({ total: drizzleCount() })
          .from(marketingPosts)
          .where(eq(marketingPosts.postDay, day));
        postIndex = countRow?.total ?? 0;
        selectedTopic = pickTopic(day, postIndex);
      }

      // Read brand profile (if available) to guide image prompt generation
      const brandProfile = await getActiveBrandProfile();

      // Load clinic name from settings
      const [settingsRow] = await db
        .select({ clinicName: marketingSettings.clinicName })
        .from(marketingSettings)
        .limit(1);
      const clinicName = settingsRow?.clinicName ?? "مركزك لطب العيون";

      // Generate AI content
      let generated;
      try {
        generated = await generateMarketingContent(
          selectedTopic,
          day,
          brandProfile,
          clinicName,
          postIndex,
        );
      } catch (err) {
        await addLog(
          null,
          "generate_post",
          "error",
          `Content generation failed: ${String(err)}`,
        );
        throw new Error("فشل توليد المحتوى — يرجى المحاولة مرة أخرى");
      }

      const [result] = await db.insert(marketingPosts).values({
        title: generated.title,
        content: generated.content,
        topic: selectedTopic,
        idea: generated.idea,
        cta: generated.cta,
        hashtags: generated.hashtags,
        imagePrompt: generated.imagePrompt,
        platform: "facebook",
        postDay: day,
        status: "draft",
        createdBy: ctx.user.id,
      });
      const id = (result as { insertId?: number }).insertId ?? 0;

      await addLog(
        id,
        "generate_post",
        "success",
        `Generated AI post — topic: ${selectedTopic}`,
      );

      return {
        id,
        title: generated.title,
        content: generated.content,
        topic: selectedTopic,
        idea: generated.idea,
        cta: generated.cta,
        hashtags: generated.hashtags,
        imagePrompt: generated.imagePrompt,
      };
    }),

  // ─── Image Generation ─────────────────────────────────────

  generateImageForPost: adminProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [post] = await db
        .select({
          id: marketingPosts.id,
          imagePrompt: marketingPosts.imagePrompt,
          status: marketingPosts.status,
        })
        .from(marketingPosts)
        .where(eq(marketingPosts.id, input.postId))
        .limit(1);

      if (!post) throw new Error("Post not found");

      const prompt = post.imagePrompt?.trim();
      if (!prompt)
        throw new Error("Post has no imagePrompt — generate content first");

      try {
        const imageUrl = await generateMarketingImage(prompt, input.postId);
        await db
          .update(marketingPosts)
          .set({ imageUrl })
          .where(eq(marketingPosts.id, input.postId));
        await addLog(
          input.postId,
          "generate_image",
          "success",
          `Image saved: ${imageUrl}`,
        );
        return { imageUrl };
      } catch (err) {
        const isConfig = err instanceof MarketingImageConfigError;
        await addLog(
          input.postId,
          "generate_image",
          "error",
          isConfig ? "No image API configured" : String(err),
        );
        if (isConfig)
          throw new Error(
            "لم يتم تكوين خدمة توليد الصور — أضف GEMINI_API_KEY في إعدادات الخادم",
          );
        throw err; // surface actual error so it's visible in logs and UI
      }
    }),

  // ─── Settings ─────────────────────────────────────────────

  getSettings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [row] = await db.select().from(marketingSettings).limit(1);
    if (!row) {
      await db.insert(marketingSettings).values({});
      const [fresh] = await db.select().from(marketingSettings).limit(1);
      return fresh;
    }
    return row;
  }),

  updateSettings: adminProcedure
    .input(
      z.object({
        clinicName: z.string().min(1).max(255).optional(),
        autoPublish: z.boolean().optional(),
        saturdayEnabled: z.boolean().optional(),
        tuesdayEnabled: z.boolean().optional(),
        thursdayEnabled: z.boolean().optional(),
        publishHour: z.number().int().min(0).max(23).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db.select().from(marketingSettings).limit(1);
      if (!existing) {
        await db.insert(marketingSettings).values({ ...input });
      } else {
        await db
          .update(marketingSettings)
          .set(input)
          .where(eq(marketingSettings.id, existing.id));
      }
      await addLog(
        null,
        "update_settings",
        "info",
        "Marketing settings updated",
      );
      return { ok: true };
    }),

  // ─── Logs ──────────────────────────────────────────────────

  getLogs: adminProcedure
    .input(
      z.object({
        postId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const where = input.postId
        ? eq(marketingLogs.postId, input.postId)
        : undefined;
      const rows = await db
        .select()
        .from(marketingLogs)
        .where(where)
        .orderBy(desc(marketingLogs.createdAt))
        .limit(input.limit);
      return rows;
    }),

  // ─── Dashboard summary ─────────────────────────────────────

  dashboardSummary: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const all = await db
      .select({ status: marketingPosts.status })
      .from(marketingPosts);
    const counts = {
      draft: 0,
      published: 0,
      failed: 0,
      scheduled: 0,
      total: all.length,
    };
    for (const row of all) {
      if (row.status in counts) counts[row.status as keyof typeof counts]++;
    }
    const recentPosts = await db
      .select()
      .from(marketingPosts)
      .orderBy(desc(marketingPosts.createdAt))
      .limit(5);
    return { counts, recentPosts };
  }),

  // ─── Brand Library ────────────────────────────────────────────────────────

  uploadReferenceDesign: adminProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64Data: z.string().min(1),
        fileSize: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const dir = getReferenceDesignDir();
      await fs.mkdir(dir, { recursive: true });

      const ext =
        input.mimeType === "image/png"
          ? "png"
          : input.mimeType === "image/webp"
            ? "webp"
            : "jpg";
      const safeFilename = `${Date.now()}-${nanoid(8)}.${ext}`;
      const filePath = path.join(dir, safeFilename);
      const fileUrl = `/uploads/marketing/reference-designs/${safeFilename}`;

      const buffer = Buffer.from(input.base64Data, "base64");
      await fs.writeFile(filePath, buffer);

      const [result] = await db.insert(marketingReferenceDesigns).values({
        filename: safeFilename,
        originalName: input.filename,
        filePath,
        fileUrl,
        mimeType: input.mimeType,
        fileSize: input.fileSize ?? buffer.length,
        uploadedBy: ctx.user.id,
      });
      const id = (result as { insertId?: number }).insertId ?? 0;

      // Run async analysis — don't block upload response
      void (async () => {
        try {
          const attrs = await analyzeDesignImage(filePath, input.mimeType);
          if (attrs) {
            await db
              .update(marketingReferenceDesigns)
              .set({
                styleAttributes: JSON.stringify(attrs),
                analyzedAt: new Date(),
              })
              .where(eq(marketingReferenceDesigns.id, id));
            await addLog(
              null,
              "analyze_design",
              "success",
              `Analyzed design: ${safeFilename}`,
            );
          }
        } catch (err) {
          await addLog(null, "analyze_design", "error", String(err));
        }
      })();

      await addLog(
        null,
        "upload_reference_design",
        "info",
        `Uploaded: ${input.filename}`,
      );
      return { id, fileUrl };
    }),

  listReferenceDesigns: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const rows = await db
      .select()
      .from(marketingReferenceDesigns)
      .orderBy(desc(marketingReferenceDesigns.createdAt));
    return rows;
  }),

  deleteReferenceDesign: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [row] = await db
        .select({ filePath: marketingReferenceDesigns.filePath })
        .from(marketingReferenceDesigns)
        .where(eq(marketingReferenceDesigns.id, input.id))
        .limit(1);
      if (row?.filePath) {
        await fs.unlink(row.filePath).catch(() => {});
      }
      await db
        .delete(marketingReferenceDesigns)
        .where(eq(marketingReferenceDesigns.id, input.id));
      await addLog(
        null,
        "delete_reference_design",
        "info",
        `Deleted design id: ${input.id}`,
      );
      return { ok: true };
    }),

  getBrandProfile: adminProcedure.query(async () => {
    const profile = await getActiveBrandProfile();
    return profile;
  }),

  rebuildBrandProfile: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const designs = await db
      .select()
      .from(marketingReferenceDesigns)
      .orderBy(desc(marketingReferenceDesigns.createdAt));

    if (designs.length === 0) {
      throw new Error("لا توجد تصاميم مرجعية — ارفع بعض التصاميم أولاً");
    }

    // Run the heavy Gemini work in background — return immediately to avoid 524
    void (async () => {
      try {
        const cached: StyleAttributes[] = [];
        const pending: typeof designs = [];
        for (const design of designs) {
          if (design.styleAttributes) {
            try {
              cached.push(
                JSON.parse(design.styleAttributes) as StyleAttributes,
              );
            } catch {}
          } else if (design.filePath) {
            pending.push(design);
          }
        }

        const BATCH = 2;
        const newAttrs: (StyleAttributes | null)[] = [];
        for (let i = 0; i < pending.length; i += BATCH) {
          const batch = pending.slice(i, i + BATCH);
          const batchResults = await Promise.all(
            batch.map(async (design: any) => {
              const attrs = await analyzeDesignImage(
                design.filePath!,
                design.mimeType,
              );
              if (attrs) {
                await db
                  .update(marketingReferenceDesigns)
                  .set({
                    styleAttributes: JSON.stringify(attrs),
                    analyzedAt: new Date(),
                  })
                  .where(eq(marketingReferenceDesigns.id, design.id));
              }
              return attrs;
            }),
          );
          newAttrs.push(...batchResults);
        }

        const analyses: StyleAttributes[] = [
          ...cached,
          ...(newAttrs.filter(Boolean) as StyleAttributes[]),
        ];

        if (analyses.length === 0) {
          await addLog(
            null,
            "rebuild_brand_profile",
            "error",
            "No designs analyzed — check GEMINI_API_KEY",
          );
          return;
        }

        const profile = await buildBrandProfile(analyses, designs.length);
        if (!profile) {
          await addLog(
            null,
            "rebuild_brand_profile",
            "error",
            "buildBrandProfile returned null",
          );
          return;
        }

        const [existing] = await db
          .select()
          .from(marketingBrandProfile)
          .limit(1);
        if (existing) {
          await db
            .update(marketingBrandProfile)
            .set({ ...profile, builtAt: new Date() })
            .where(eq(marketingBrandProfile.id, existing.id));
        } else {
          await db
            .insert(marketingBrandProfile)
            .values({ ...profile, builtAt: new Date() });
        }

        await addLog(
          null,
          "rebuild_brand_profile",
          "success",
          `Profile built from ${analyses.length} designs`,
        );
      } catch (err) {
        await addLog(null, "rebuild_brand_profile", "error", String(err));
      }
    })();

    return { started: true };
  }),

  // ─── Facebook Connect ─────────────────────────────────────────────────────

  getFacebookStatus: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [row] = await db
      .select({
        fbConnected: marketingSettings.fbConnected,
        fbPageId: marketingSettings.fbPageId,
        fbPageName: marketingSettings.fbPageName,
      })
      .from(marketingSettings)
      .limit(1);
    const { isFbConfigured } =
      await import("../services/marketing/facebookOAuth.service");
    return {
      connected: row?.fbConnected ?? false,
      pageId: row?.fbPageId ?? null,
      pageName: row?.fbPageName ?? null,
      appConfigured: isFbConfigured(),
    };
  }),

  getOAuthUrl: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const { isFbConfigured, buildOAuthUrl } =
      await import("../services/marketing/facebookOAuth.service");
    if (!isFbConfigured()) {
      throw new Error(
        "FB_APP_ID و FB_APP_SECRET غير مهيأين — أضفهما في إعدادات الخادم",
      );
    }

    const state = randomBytes(24).toString("hex");
    const [existing] = await db
      .select({ id: marketingSettings.id })
      .from(marketingSettings)
      .limit(1);
    if (!existing) {
      await db.insert(marketingSettings).values({ fbOauthState: state });
    } else {
      await db
        .update(marketingSettings)
        .set({ fbOauthState: state })
        .where(eq(marketingSettings.id, existing.id));
    }

    const ENV = (await import("../_core/env")).ENV;
    const redirectUri =
      ENV.fbRedirectUri ||
      `${ENV.fbAppOrigin || ""}/api/marketing/facebook/callback`;
    const url = buildOAuthUrl(state, redirectUri);
    await addLog(
      null,
      "fb_oauth_start",
      "info",
      `OAuth initiated by user ${ctx.user.id}`,
    );
    return { url };
  }),

  getPendingPages: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [row] = await db
      .select({ fbPendingPages: marketingSettings.fbPendingPages })
      .from(marketingSettings)
      .limit(1);
    if (!row?.fbPendingPages) return [];
    try {
      const raw = JSON.parse(
        Buffer.from(row.fbPendingPages, "base64").toString(),
      ) as Array<{
        id: string;
        name: string;
        category?: string;
        token: string;
      }>;
      return raw.map(({ id, name, category }) => ({ id, name, category }));
    } catch {
      return [];
    }
  }),

  selectFacebookPage: adminProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [row] = await db
        .select({
          id: marketingSettings.id,
          fbPendingPages: marketingSettings.fbPendingPages,
        })
        .from(marketingSettings)
        .limit(1);
      if (!row?.fbPendingPages)
        throw new Error("لا توجد صفحات معلقة — ابدأ عملية الربط من جديد");

      let pages: Array<{
        id: string;
        name: string;
        category?: string;
        token: string;
      }>;
      try {
        pages = JSON.parse(
          Buffer.from(row.fbPendingPages, "base64").toString(),
        );
      } catch {
        throw new Error("بيانات الصفحات المعلقة تالفة");
      }

      const selected = pages.find((p) => p.id === input.pageId);
      if (!selected) throw new Error("الصفحة المحددة غير موجودة في القائمة");

      await db
        .update(marketingSettings)
        .set({
          fbPageId: selected.id,
          fbPageName: selected.name,
          fbAccessToken: selected.token,
          fbConnected: true,
          fbPendingPages: null,
          fbOauthState: null,
        })
        .where(eq(marketingSettings.id, row.id));

      await addLog(
        null,
        "fb_page_selected",
        "success",
        `Connected page: ${selected.name} (${selected.id})`,
      );
      return { ok: true, pageName: selected.name };
    }),

  disconnectFacebook: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [row] = await db
      .select({ id: marketingSettings.id })
      .from(marketingSettings)
      .limit(1);
    if (!row) return { ok: true };
    await db
      .update(marketingSettings)
      .set({
        fbPageId: null,
        fbPageName: null,
        fbAccessToken: null,
        fbConnected: false,
        fbPendingPages: null,
        fbOauthState: null,
      })
      .where(eq(marketingSettings.id, row.id));
    await addLog(
      null,
      "fb_disconnect",
      "info",
      `Disconnected by user ${ctx.user.id}`,
    );
    return { ok: true };
  }),

  testFacebookConnection: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [row] = await db
      .select({
        fbPageId: marketingSettings.fbPageId,
        fbAccessToken: marketingSettings.fbAccessToken,
        fbPageName: marketingSettings.fbPageName,
      })
      .from(marketingSettings)
      .limit(1);

    if (!row?.fbPageId || !row.fbAccessToken) {
      throw new Error("لم يتم ربط صفحة Facebook بعد");
    }

    const { testPageToken } =
      await import("../services/marketing/facebookOAuth.service");
    const result = await testPageToken(row.fbPageId, row.fbAccessToken);

    if (result.ok) {
      await addLog(
        null,
        "fb_test_connection",
        "success",
        `Connection OK — page: ${result.pageName ?? row.fbPageName}`,
      );
      return { ok: true, pageName: result.pageName ?? row.fbPageName };
    } else {
      await addLog(
        null,
        "fb_test_connection",
        "error",
        `Connection failed: ${result.error}`,
      );
      throw new Error(`فشل الاتصال: ${result.error}`);
    }
  }),

  // ─── Scheduler ───────────────────────────────────────────────────────────────

  getSchedulerStatus: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [settings] = await db
      .select({
        autoPublish: marketingSettings.autoPublish,
        saturdayEnabled: marketingSettings.saturdayEnabled,
        tuesdayEnabled: marketingSettings.tuesdayEnabled,
        thursdayEnabled: marketingSettings.thursdayEnabled,
        publishHour: marketingSettings.publishHour,
        fbConnected: marketingSettings.fbConnected,
        lastSchedulerRun: marketingSettings.lastSchedulerRun,
        schedulerStatus: marketingSettings.schedulerStatus,
      })
      .from(marketingSettings)
      .limit(1);

    const { getNextScheduledTime } =
      await import("../services/marketing/scheduler.service");
    const nextRun = settings
      ? getNextScheduledTime({
          saturdayEnabled: settings.saturdayEnabled,
          tuesdayEnabled: settings.tuesdayEnabled,
          thursdayEnabled: settings.thursdayEnabled,
          publishHour: settings.publishHour,
        })
      : null;

    return {
      autoPublish: settings?.autoPublish ?? false,
      fbConnected: settings?.fbConnected ?? false,
      saturdayEnabled: settings?.saturdayEnabled ?? true,
      tuesdayEnabled: settings?.tuesdayEnabled ?? true,
      thursdayEnabled: settings?.thursdayEnabled ?? true,
      publishHour: settings?.publishHour ?? 9,
      lastSchedulerRun: settings?.lastSchedulerRun ?? null,
      schedulerStatus: settings?.schedulerStatus ?? "idle",
      nextRun: nextRun
        ? { day: nextRun.day, date: nextRun.date.toISOString() }
        : null,
    };
  }),

  runSchedulerNow: adminProcedure
    .input(
      z.object({
        day: z.enum(["saturday", "tuesday", "thursday"]).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { runScheduledPost } =
        await import("../services/marketing/scheduler.service");

      // Determine which day to run
      let day = input.day as "saturday" | "tuesday" | "thursday" | undefined;
      if (!day) {
        const jsDay = new Date().getDay();
        const JS_MAP: Record<number, "saturday" | "tuesday" | "thursday"> = {
          6: "saturday",
          2: "tuesday",
          4: "thursday",
        };
        day = JS_MAP[jsDay];
        if (!day) {
          // Today is not a scheduled day — default to saturday for manual testing
          day = "saturday";
        }
      }

      await addLog(
        null,
        "scheduler_manual_trigger",
        "info",
        `Manual run triggered by user ${ctx.user.id} for day: ${day}`,
      );
      const result = await runScheduledPost(day);
      return result;
    }),
});
