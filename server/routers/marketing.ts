import { z } from "zod";
import { desc, eq, and, inArray } from "drizzle-orm";
import { router, adminProcedure, protectedProcedure } from "../_core/procedures";
import { getDb } from "../db";
import { marketingPosts, marketingSettings, marketingLogs } from "../../drizzle/schema";

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

      const topicsByDay: Record<string, string[]> = {
        saturday: ["LASIK", "Femto LASIK", "PRK", "ICL", "Astigmatism", "Pentacam", "Corneal Mapping", "Pre-LASIK Assessment"],
        tuesday: ["Cataract", "Premium Lenses", "Keratoconus", "Corneal Cross Linking", "Corneal Transplantation"],
        thursday: ["Dry Eye", "Glaucoma", "Diabetes & Eye Health", "Retina Health", "Children Vision", "Digital Eye Strain"],
      };

      const topics = topicsByDay[input.postDay] ?? [];
      const selectedTopic = input.topic ?? topics[Math.floor(Math.random() * topics.length)] ?? "Eye Health";

      const title = `${selectedTopic} — Post ${new Date().toLocaleDateString("en-GB")}`;
      const content = `[AI content placeholder for topic: ${selectedTopic}]`;
      const hashtags = `#${selectedTopic.replace(/\s+/g, "")} #EyeHealth #SaadanyEyeCenter`;
      const cta = "Book your appointment today! Call or WhatsApp us.";
      const imagePrompt = `Professional ophthalmology image about ${selectedTopic}, clean medical aesthetic, blue tones`;

      const [result] = await db.insert(marketingPosts).values({
        title,
        content,
        topic: selectedTopic,
        cta,
        hashtags,
        imagePrompt,
        platform: "facebook",
        postDay: input.postDay,
        status: "draft",
        createdBy: ctx.user.id,
      });
      const id = (result as { insertId?: number }).insertId ?? 0;
      await addLog(id, "generate_post", "success", `Generated post for topic: ${selectedTopic}`);
      return { id, title, content, topic: selectedTopic };
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
