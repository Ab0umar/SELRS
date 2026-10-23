import { z } from "zod";
import { marketingSlotForWeekday } from "../../shared/marketingSchedule";
import { desc, eq, count as drizzleCount, and, inArray } from "drizzle-orm";
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
  marketingGenerationJobs,
  marketingFacebookPages,
  type MarketingReferenceDesign,
} from "../../drizzle/schema";
import {
  startManusGeneration,
  listManusGenerationJobs,
} from "../services/marketing/manusGeneration.service";
import { pickTopic, type PostDay } from "../services/marketing/topicRotation";
import { publishMarketingPost } from "../services/marketing/publish.service";
import {
  getMarketingPageTarget,
  type MarketingPageRole,
} from "../services/marketing/page.service";
import {
  analyzeDesignImage,
  buildBrandProfile,
  parseStyleAttributes,
  type StyleAttributes,
} from "../services/marketing/brandStyleAnalyzer.service";
import { ENV } from "../_core/env";
import {
  marketingSummary,
  sendMarketingBatch,
} from "../services/whatsappMarketing.service";

const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PROFILE_ANALYSES = 12;

function decodeReferenceImage(base64Data: string, mimeType: string): Buffer {
  if (base64Data.length > 14_000_000 || base64Data.length % 4 === 1) {
    throw new Error("ملف الصورة أكبر من الحد المسموح");
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
    throw new Error("بيانات الصورة غير صالحة");
  }
  const buffer = Buffer.from(base64Data, "base64");
  if (buffer.length === 0 || buffer.length > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error("ملف الصورة أكبر من الحد المسموح أو فارغ");
  }
  const isPng = buffer
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp =
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
  const valid =
    (mimeType === "image/png" && isPng) ||
    (mimeType === "image/jpeg" && isJpeg) ||
    (mimeType === "image/webp" && isWebp);
  if (!valid) throw new Error("نوع الصورة لا يطابق محتواها");
  return buffer;
}

function errorMessage(error: unknown, fallback: string): string {
  return (error instanceof Error ? error.message : fallback).slice(0, 2000);
}

async function analyzeReferenceDesign(
  designId: number,
): Promise<StyleAttributes | null> {
  const db = await getDb();
  if (!db) return null;
  const [design] = await db
    .select()
    .from(marketingReferenceDesigns)
    .where(eq(marketingReferenceDesigns.id, designId))
    .limit(1);
  if (!design) return null;

  await db
    .update(marketingReferenceDesigns)
    .set({ analysisStatus: "analyzing", analysisError: null })
    .where(eq(marketingReferenceDesigns.id, designId));
  try {
    const attrs = await analyzeDesignImage(design.filePath, design.mimeType);
    if (!attrs) throw new Error("تعذر تحليل الصورة؛ تحقق من إعداد Gemini");
    await db
      .update(marketingReferenceDesigns)
      .set({
        styleAttributes: JSON.stringify(attrs),
        analysisStatus: "analyzed",
        analysisError: null,
        analyzedAt: new Date(),
      })
      .where(eq(marketingReferenceDesigns.id, designId));
    await addLog(
      null,
      "analyze_design",
      "success",
      `Analyzed design: ${design.filename}`,
    );
    return attrs;
  } catch (error) {
    const message = errorMessage(error, "فشل تحليل التصميم");
    await db
      .update(marketingReferenceDesigns)
      .set({ analysisStatus: "failed", analysisError: message })
      .where(eq(marketingReferenceDesigns.id, designId));
    await addLog(null, "analyze_design", "error", message);
    return null;
  }
}

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

async function getActiveBrandProfile(pageRole: MarketingPageRole = "center") {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(marketingBrandProfile)
    .where(eq(marketingBrandProfile.pageRole, pageRole))
    .limit(1);
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
  // ─── WhatsApp campaigns ───────────────────────────────────

  whatsappSummary: adminProcedure.query(() => marketingSummary()),

  sendWhatsAppOptInBatch: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(3).max(255),
        limit: z.number().int().min(1).max(1000).default(25),
        testPhone: z.string().trim().min(8).max(32).optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      sendMarketingBatch({
        kind: "opt_in",
        name: input.name,
        limit: input.limit,
        testPhone: input.testPhone,
        createdBy: ctx.user.id,
      }),
    ),

  sendWhatsAppPromotionBatch: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(3).max(255),
        limit: z.number().int().min(1).max(1000).default(25),
        testPhone: z.string().trim().min(8).max(32).optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      sendMarketingBatch({
        kind: "promotion",
        name: input.name,
        limit: input.limit,
        testPhone: input.testPhone,
        createdBy: ctx.user.id,
      }),
    ),

  // ─── Posts ────────────────────────────────────────────────

  listPosts: adminProcedure
    .input(
      z.object({
        status: z
          .enum([
            "draft",
            "publishing",
            "published",
            "failed",
            "scheduled",
            "all",
          ])
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
              input.status as
                "draft" | "publishing" | "published" | "failed" | "scheduled",
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
        pageRole: z.enum(["center", "doctor"]).default("center"),
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
        pageRole: input.pageRole,
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
      const [updated] = await db
        .update(marketingPosts)
        .set(updates)
        .where(
          and(eq(marketingPosts.id, id), eq(marketingPosts.status, "draft")),
        );
      if (!updated.affectedRows)
        throw new Error("المسودة غير موجودة أو تغيرت حالتها");
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
    .input(
      z.object({
        id: z.number().int().positive(),
        pageRole: z.enum(["center", "doctor"]),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await publishMarketingPost(input.id, input.pageRole);
      return { ok: true, fbPostId: result.fbPostId };
    }),

  generatePost: adminProcedure
    .input(
      z.object({
        postDay: z.enum(["saturday", "tuesday", "thursday"]),
        topic: z.string().trim().min(1).max(255).optional(),
        requestId: z.string().uuid(),
        pageRole: z.enum(["center", "doctor"]).default("center"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const day = input.postDay as PostDay;

      // Determine topic: explicit override or round-robin from list
      let selectedTopic = input.topic;
      if (!selectedTopic) {
        const [countRow] = await db
          .select({ total: drizzleCount() })
          .from(marketingPosts)
          .where(
            and(
              eq(marketingPosts.postDay, day),
              eq(marketingPosts.pageRole, input.pageRole),
            ),
          );
        const topicIndex = countRow?.total ?? 0;
        const pageTarget = await getMarketingPageTarget(input.pageRole);
        selectedTopic = pickTopic(
          day,
          topicIndex,
          pageTarget?.topicDirection ?? "forward",
        );
      }

      return startManusGeneration({
        requestId: input.requestId,
        topic: selectedTopic,
        postDay: day,
        pageRole: input.pageRole,
        createdBy: ctx.user.id,
      });
    }),

  generationJobs: adminProcedure.query(() => listManusGenerationJobs()),

  // ─── Image Generation ─────────────────────────────────────

  generateImageForPost: adminProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [post] = await db
        .select({
          id: marketingPosts.id,
          imagePrompt: marketingPosts.imagePrompt,
          status: marketingPosts.status,
          topic: marketingPosts.topic,
          title: marketingPosts.title,
          postDay: marketingPosts.postDay,
          pageRole: marketingPosts.pageRole,
        })
        .from(marketingPosts)
        .where(eq(marketingPosts.id, input.postId))
        .limit(1);

      if (!post) throw new Error("Post not found");

      return startManusGeneration({
        postId: post.id,
        topic: post.topic || post.title,
        postDay: post.postDay ?? "thursday",
        pageRole: post.pageRole,
        createdBy: ctx.user.id,
      });
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
      publishing: 0,
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
        base64Data: z.string().min(1).max(14_000_000),
        pageRole: z.enum(["center", "doctor"]).default("center"),
        fileSize: z
          .number()
          .int()
          .positive()
          .max(MAX_REFERENCE_IMAGE_BYTES)
          .optional(),
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

      const buffer = decodeReferenceImage(input.base64Data, input.mimeType);
      await fs.writeFile(filePath, buffer);

      let id = 0;
      try {
        const [result] = await db.insert(marketingReferenceDesigns).values({
          filename: safeFilename,
          originalName: input.filename,
          filePath,
          fileUrl,
          mimeType: input.mimeType,
          pageRole: input.pageRole,
          fileSize: buffer.length,
          analysisStatus: "pending",
          uploadedBy: ctx.user.id,
        });
        id = (result as { insertId?: number }).insertId ?? 0;
      } catch (error) {
        await fs.unlink(filePath).catch(() => {});
        throw error;
      }
      if (!id) {
        await fs.unlink(filePath).catch(() => {});
        throw new Error("تعذر حفظ التصميم المرجعي");
      }

      void analyzeReferenceDesign(id);

      await addLog(
        null,
        "upload_reference_design",
        "info",
        `Uploaded: ${input.filename}`,
      );
      return { id, fileUrl };
    }),

  listReferenceDesigns: adminProcedure
    .input(z.object({ pageRole: z.enum(["center", "doctor"]) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(marketingReferenceDesigns)
        .where(eq(marketingReferenceDesigns.pageRole, input.pageRole))
        .orderBy(desc(marketingReferenceDesigns.createdAt));
      return rows.map((row: MarketingReferenceDesign) => {
        const {
          filePath: _filePath,
          styleAttributes: _styleAttributes,
          ...publicRow
        } = row;
        return publicRow;
      });
    }),

  deleteReferenceDesign: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [row] = await db
        .select({
          filePath: marketingReferenceDesigns.filePath,
          pageRole: marketingReferenceDesigns.pageRole,
        })
        .from(marketingReferenceDesigns)
        .where(eq(marketingReferenceDesigns.id, input.id))
        .limit(1);
      if (!row) throw new Error("التصميم المرجعي غير موجود");
      let fileCleanupFailed = false;
      try {
        await fs.unlink(row.filePath);
      } catch {
        fileCleanupFailed = true;
      }
      await db
        .delete(marketingReferenceDesigns)
        .where(eq(marketingReferenceDesigns.id, input.id));
      await db
        .delete(marketingBrandProfile)
        .where(eq(marketingBrandProfile.pageRole, row.pageRole));
      await addLog(
        null,
        "delete_reference_design",
        fileCleanupFailed ? "error" : "info",
        fileCleanupFailed
          ? `Deleted design id: ${input.id}; file cleanup failed`
          : `Deleted design id: ${input.id}; brand profile invalidated`,
      );
      return { ok: true, fileCleanupFailed };
    }),

  retryReferenceDesignAnalysis: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [design] = await db
        .select({
          id: marketingReferenceDesigns.id,
          analysisStatus: marketingReferenceDesigns.analysisStatus,
        })
        .from(marketingReferenceDesigns)
        .where(eq(marketingReferenceDesigns.id, input.id))
        .limit(1);
      if (!design) throw new Error("التصميم المرجعي غير موجود");
      if (design.analysisStatus === "analyzing") {
        return { started: false, alreadyRunning: true };
      }
      void analyzeReferenceDesign(input.id);
      return { started: true, alreadyRunning: false };
    }),

  getBrandProfile: adminProcedure
    .input(z.object({ pageRole: z.enum(["center", "doctor"]) }))
    .query(async ({ input }) => {
      const profile = await getActiveBrandProfile(input.pageRole);
      if (!profile) return null;
      const { rawProfile: _rawProfile, ...safeProfile } = profile;
      return safeProfile;
    }),

  rebuildBrandProfile: adminProcedure
    .input(z.object({ pageRole: z.enum(["center", "doctor"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const designs = await db
        .select()
        .from(marketingReferenceDesigns)
        .where(eq(marketingReferenceDesigns.pageRole, input.pageRole))
        .orderBy(desc(marketingReferenceDesigns.createdAt));

      if (designs.length === 0) {
        throw new Error("لا توجد تصاميم مرجعية — ارفع بعض التصاميم أولاً");
      }
      const profileDesigns = designs.slice(0, MAX_PROFILE_ANALYSES);

      const [existing] = await db
        .select()
        .from(marketingBrandProfile)
        .where(eq(marketingBrandProfile.pageRole, input.pageRole))
        .limit(1);
      if (existing?.rebuildStatus === "running") {
        return {
          started: false,
          alreadyRunning: true,
          startedAt: existing.rebuildStartedAt?.toISOString() ?? null,
        };
      }

      const startedAt = new Date();
      if (existing) {
        await db
          .update(marketingBrandProfile)
          .set({
            rebuildStatus: "running",
            rebuildError: null,
            rebuildStartedAt: startedAt,
          })
          .where(eq(marketingBrandProfile.id, existing.id));
      } else {
        await db.insert(marketingBrandProfile).values({
          pageRole: input.pageRole,
          rebuildStatus: "running",
          rebuildStartedAt: startedAt,
        });
      }

      void (async () => {
        try {
          const cached: StyleAttributes[] = [];
          const pending: number[] = [];
          for (const design of profileDesigns) {
            let attrs: StyleAttributes | null = null;
            if (design.styleAttributes) {
              try {
                attrs = parseStyleAttributes(
                  JSON.parse(design.styleAttributes),
                );
              } catch {
                attrs = null;
              }
            }
            if (attrs) cached.push(attrs);
            else pending.push(design.id);
          }

          const BATCH = 2;
          const newAttrs: (StyleAttributes | null)[] = [];
          for (let i = 0; i < pending.length; i += BATCH) {
            const batch = pending.slice(i, i + BATCH);
            const batchResults = await Promise.all(
              batch.map(analyzeReferenceDesign),
            );
            newAttrs.push(...batchResults);
          }

          const analyses: StyleAttributes[] = [
            ...cached,
            ...(newAttrs.filter(Boolean) as StyleAttributes[]),
          ].slice(0, MAX_PROFILE_ANALYSES);

          if (analyses.length === 0)
            throw new Error("لم يتم تحليل أي تصميم — تحقق من إعداد Gemini");

          const profile = await buildBrandProfile(analyses, analyses.length);
          if (!profile) throw new Error("تعذر بناء ملف العلامة التجارية");

          const [current] = await db
            .select()
            .from(marketingBrandProfile)
            .where(eq(marketingBrandProfile.pageRole, input.pageRole))
            .limit(1);
          if (current) {
            await db
              .update(marketingBrandProfile)
              .set({
                ...profile,
                pageRole: input.pageRole,
                builtAt: new Date(),
                rebuildStatus: "completed",
                rebuildError: null,
                rebuildStartedAt: startedAt,
              })
              .where(eq(marketingBrandProfile.id, current.id));
          } else {
            await db.insert(marketingBrandProfile).values({
              pageRole: input.pageRole,
              ...profile,
              builtAt: new Date(),
              rebuildStatus: "completed",
              rebuildStartedAt: startedAt,
            });
          }

          await addLog(
            null,
            "rebuild_brand_profile",
            "success",
            `Profile built from ${analyses.length} designs`,
          );
        } catch (error) {
          const message = errorMessage(error, "فشل بناء ملف العلامة التجارية");
          await db
            .update(marketingBrandProfile)
            .set({ rebuildStatus: "failed", rebuildError: message })
            .where(eq(marketingBrandProfile.pageRole, input.pageRole));
          await addLog(null, "rebuild_brand_profile", "error", message);
        }
      })();

      return {
        started: true,
        alreadyRunning: false,
        startedAt: startedAt.toISOString(),
      };
    }),

  // ─── Facebook Connect ─────────────────────────────────────────────────────

  getFacebookStatus: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    type FacebookPageStatus = {
      pageRole: "center" | "doctor";
      pageId: string;
      pageName: string;
      contentName: string | null;
      connected: boolean;
      autoPublish: boolean;
      saturdayEnabled: boolean;
      tuesdayEnabled: boolean;
      thursdayEnabled: boolean;
      publishHour: number;
      topicDirection: "forward" | "reverse";
    };
    const pages = (await db
      .select({
        pageRole: marketingFacebookPages.pageRole,
        pageId: marketingFacebookPages.pageId,
        pageName: marketingFacebookPages.pageName,
        contentName: marketingFacebookPages.contentName,
        connected: marketingFacebookPages.connected,
        autoPublish: marketingFacebookPages.autoPublish,
        saturdayEnabled: marketingFacebookPages.saturdayEnabled,
        tuesdayEnabled: marketingFacebookPages.tuesdayEnabled,
        thursdayEnabled: marketingFacebookPages.thursdayEnabled,
        publishHour: marketingFacebookPages.publishHour,
        topicDirection: marketingFacebookPages.topicDirection,
      })
      .from(marketingFacebookPages)) as FacebookPageStatus[];
    const [row] = await db
      .select({
        fbConnected: marketingSettings.fbConnected,
        fbPageId: marketingSettings.fbPageId,
        fbPageName: marketingSettings.fbPageName,
        fbOauthRole: marketingSettings.fbOauthRole,
      })
      .from(marketingSettings)
      .limit(1);
    const { isFbConfigured } =
      await import("../services/marketing/facebookOAuth.service");
    const legacyCenter = pages.find((page) => page.pageRole === "center");
    return {
      connected: legacyCenter?.connected ?? row?.fbConnected ?? false,
      pageId: legacyCenter?.pageId ?? row?.fbPageId ?? null,
      pageName: legacyCenter?.pageName ?? row?.fbPageName ?? null,
      appConfigured: isFbConfigured(),
      pages,
      pendingRole: row?.fbOauthRole ?? null,
    };
  }),

  getOAuthUrl: adminProcedure
    .input(z.object({ pageRole: z.enum(["center", "doctor"]) }))
    .mutation(async ({ ctx, input }) => {
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
        await db
          .insert(marketingSettings)
          .values({ fbOauthState: state, fbOauthRole: input.pageRole });
      } else {
        await db
          .update(marketingSettings)
          .set({ fbOauthState: state, fbOauthRole: input.pageRole })
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
    .input(
      z.object({
        pageId: z.string().min(1),
        pageRole: z.enum(["center", "doctor"]).default("center"),
      }),
    )
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

      const [existingPage] = await db
        .select({ id: marketingFacebookPages.id })
        .from(marketingFacebookPages)
        .where(eq(marketingFacebookPages.pageRole, input.pageRole))
        .limit(1);
      const pageValues = {
        pageRole: input.pageRole,
        pageId: selected.id,
        pageName: selected.name,
        contentName: selected.name,
        accessToken: selected.token,
        category: selected.category ?? null,
        connected: true,
      };
      if (existingPage) {
        await db
          .update(marketingFacebookPages)
          .set({
            pageId: pageValues.pageId,
            pageName: pageValues.pageName,
            accessToken: pageValues.accessToken,
            category: pageValues.category,
            connected: pageValues.connected,
          })
          .where(eq(marketingFacebookPages.id, existingPage.id));
      } else {
        await db.insert(marketingFacebookPages).values(pageValues);
      }

      await db
        .update(marketingSettings)
        .set({
          ...(input.pageRole === "center"
            ? {
                fbPageId: selected.id,
                fbPageName: selected.name,
                fbAccessToken: selected.token,
                fbConnected: true,
              }
            : {}),
          fbPendingPages: null,
          fbOauthState: null,
          fbOauthRole: null,
        })
        .where(eq(marketingSettings.id, row.id));

      await addLog(
        null,
        "fb_page_selected",
        "success",
        `Connected page: ${selected.name} (${selected.id})`,
      );
      return { ok: true, pageName: selected.name, pageRole: input.pageRole };
    }),

  disconnectFacebook: adminProcedure
    .input(z.object({ pageRole: z.enum(["center", "doctor"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(marketingFacebookPages)
        .where(eq(marketingFacebookPages.pageRole, input.pageRole));
      const [row] = await db
        .select({ id: marketingSettings.id })
        .from(marketingSettings)
        .limit(1);
      if (!row) return { ok: true };
      if (input.pageRole === "center") {
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
      }
      await addLog(
        null,
        "fb_disconnect",
        "info",
        `Disconnected by user ${ctx.user.id}`,
      );
      return { ok: true };
    }),

  testFacebookConnection: adminProcedure
    .input(z.object({ pageRole: z.enum(["center", "doctor"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [page] = await db
        .select({
          pageId: marketingFacebookPages.pageId,
          accessToken: marketingFacebookPages.accessToken,
          pageName: marketingFacebookPages.pageName,
        })
        .from(marketingFacebookPages)
        .where(eq(marketingFacebookPages.pageRole, input.pageRole))
        .limit(1);
      const [row] = await db
        .select({
          fbPageId: marketingSettings.fbPageId,
          fbAccessToken: marketingSettings.fbAccessToken,
          fbPageName: marketingSettings.fbPageName,
        })
        .from(marketingSettings)
        .limit(1);

      const pageId =
        page?.pageId ?? (input.pageRole === "center" ? row?.fbPageId : null);
      const accessToken =
        page?.accessToken ??
        (input.pageRole === "center" ? row?.fbAccessToken : null);
      const pageName =
        page?.pageName ??
        (input.pageRole === "center" ? row?.fbPageName : null);
      if (!pageId || !accessToken) {
        throw new Error(
          input.pageRole === "doctor"
            ? "لم يتم ربط صفحة الدكتور بعد"
            : "لم يتم ربط صفحة المركز بعد",
        );
      }

      const { testPageToken } =
        await import("../services/marketing/facebookOAuth.service");
      const result = await testPageToken(pageId, accessToken);

      if (result.ok) {
        await addLog(
          null,
          "fb_test_connection",
          "success",
          `Connection OK — page: ${result.pageName ?? pageName}`,
        );
        return { ok: true, pageName: result.pageName ?? pageName };
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

  updateFacebookPageSettings: adminProcedure
    .input(
      z.object({
        pageRole: z.enum(["center", "doctor"]),
        contentName: z.string().trim().min(1).max(255),
        autoPublish: z.boolean(),
        saturdayEnabled: z.boolean(),
        tuesdayEnabled: z.boolean(),
        thursdayEnabled: z.boolean(),
        publishHour: z.number().int().min(0).max(23),
        topicDirection: z.enum(["forward", "reverse"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [page] = await db
        .select({ id: marketingFacebookPages.id })
        .from(marketingFacebookPages)
        .where(eq(marketingFacebookPages.pageRole, input.pageRole))
        .limit(1);
      if (!page) throw new Error("اربط الصفحة أولاً قبل حفظ جدولها");
      await db
        .update(marketingFacebookPages)
        .set({
          contentName: input.contentName,
          autoPublish: input.autoPublish,
          saturdayEnabled: input.saturdayEnabled,
          tuesdayEnabled: input.tuesdayEnabled,
          thursdayEnabled: input.thursdayEnabled,
          publishHour: input.publishHour,
          topicDirection: input.topicDirection,
        })
        .where(eq(marketingFacebookPages.id, page.id));
      return { ok: true };
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
        const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "short" }).format(new Date());
        const jsDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
        day = marketingSlotForWeekday("center", jsDay);
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
