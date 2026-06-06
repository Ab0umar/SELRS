import { z } from "zod";
import { desc, eq, count as drizzleCount } from "drizzle-orm";
import { router, adminProcedure } from "../_core/procedures";
import { getDb } from "../db";
import { marketingPosts, marketingSettings, marketingLogs } from "../../drizzle/schema";
import { generateMarketingContent } from "../services/marketing/contentGenerator.service";
import { pickTopic, type PostDay } from "../services/marketing/topicRotation";
import { generateMarketingImage, MarketingImageConfigError } from "../services/marketing/imageGenerator.service";

async function addLog(postId: number | null, action: string, status: "success" | "error" | "info", message: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(marketingLogs).values({ postId, action, status, message });
}

export const marketingRouter = router({

  // ─── Posts ────────────────────────────────────────────────

  listPosts: adminProcedure
    .input(z.object({
      status: z.enum(["draft", "published", "failed", "scheduled", "all"]).default("all"),
      limit: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const where = input.status !== "all"
        ? eq(marketingPosts.status, input.status as "draft" | "published" | "failed" | "scheduled")
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
      const [row] = await db.select().from(marketingPosts).where(eq(marketingPosts.id, input.id)).limit(1);
      return row ?? null;
    }),

  createPost: adminProcedure
    .input(z.object({
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
    }))
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
    .input(z.object({
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
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, scheduledAt, ...rest } = input;
      const updates: Record<string, unknown> = { ...rest };
      if (scheduledAt !== undefined) {
        updates.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      }
      await db.update(marketingPosts).set(updates).where(eq(marketingPosts.id, id));
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
      await db
        .update(marketingPosts)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(marketingPosts.id, input.id));
      await addLog(input.id, "publish_post", "info", `Post published manually: ${input.id}`);
      return { ok: true };
    }),

  generatePost: adminProcedure
    .input(z.object({
      postDay: z.enum(["saturday", "tuesday", "thursday"]),
      topic: z.string().optional(),
    }))
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
          .where(eq(marketingPosts.postDay, day));
        const usedCount = countRow?.total ?? 0;
        selectedTopic = pickTopic(day, usedCount);
      }

      // Generate AI content
      let generated;
      try {
        generated = await generateMarketingContent(selectedTopic, day);
      } catch (err) {
        await addLog(null, "generate_post", "error", `Content generation failed: ${String(err)}`);
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

      await addLog(id, "generate_post", "success", `Generated AI post — topic: ${selectedTopic}`);

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
        .select({ id: marketingPosts.id, imagePrompt: marketingPosts.imagePrompt, status: marketingPosts.status })
        .from(marketingPosts)
        .where(eq(marketingPosts.id, input.postId))
        .limit(1);

      if (!post) throw new Error("Post not found");

      const prompt = post.imagePrompt?.trim();
      if (!prompt) throw new Error("Post has no imagePrompt — generate content first");

      try {
        const imageUrl = await generateMarketingImage(prompt, input.postId);
        await db
          .update(marketingPosts)
          .set({ imageUrl })
          .where(eq(marketingPosts.id, input.postId));
        await addLog(input.postId, "generate_image", "success", `Image saved: ${imageUrl}`);
        return { imageUrl };
      } catch (err) {
        const isConfig = err instanceof MarketingImageConfigError;
        await addLog(
          input.postId,
          "generate_image",
          "error",
          isConfig ? "No image API configured" : String(err)
        );
        if (isConfig) throw new Error("لم يتم تكوين خدمة توليد الصور — أضف OPENAI_API_KEY في إعدادات الخادم");
        throw new Error("فشل توليد الصورة — يرجى المحاولة مرة أخرى");
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
    .input(z.object({
      autoPublish: z.boolean().optional(),
      saturdayEnabled: z.boolean().optional(),
      tuesdayEnabled: z.boolean().optional(),
      thursdayEnabled: z.boolean().optional(),
      publishHour: z.number().int().min(0).max(23).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [existing] = await db.select().from(marketingSettings).limit(1);
      if (!existing) {
        await db.insert(marketingSettings).values({ ...input });
      } else {
        await db.update(marketingSettings).set(input).where(eq(marketingSettings.id, existing.id));
      }
      await addLog(null, "update_settings", "info", "Marketing settings updated");
      return { ok: true };
    }),

  // ─── Logs ──────────────────────────────────────────────────

  getLogs: adminProcedure
    .input(z.object({
      postId: z.number().int().positive().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const where = input.postId ? eq(marketingLogs.postId, input.postId) : undefined;
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
    const all = await db.select({ status: marketingPosts.status }).from(marketingPosts);
    const counts = { draft: 0, published: 0, failed: 0, scheduled: 0, total: all.length };
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
});
