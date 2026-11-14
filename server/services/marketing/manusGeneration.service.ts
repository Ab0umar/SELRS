import { randomUUID } from "node:crypto";
import { brandMarketingImageUrl } from "./pageBranding";
import { readEquipmentPhoto } from "./equipmentAssets";
import { assertMarketingTopicAvailable } from "./topicHistory";
import fs from "node:fs/promises";
import path from "node:path";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  or,
  ne,
  gte,
  isNull,
  lt,
} from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { getDb } from "../../db";
import { ENV } from "../../_core/env";
import {
  marketingGenerationJobs,
  marketingPosts,
  marketingSettings,
  marketingBrandProfile,
  marketingLogs,
  aiMarketingJobs,
  aiMarketingJobContext,
} from "../../../drizzle/schema";
import {
  createManusTask,
  readManusTask,
  downloadManusFile,
  manusPostSchema,
  ManusRequestError,
} from "./manusClient";
import { publishMarketingPost } from "./publish.service";
import { getTopicImageHint } from "./contentGenerator.service";
import {
  marketingEditorialBrief,
  marketingVisualBrief,
  marketingPublicationBrief,
} from "./prompts";
import { getMarketingPageTarget, type MarketingPageRole } from "./page.service";
import type { PostDay } from "./topicRotation";
import { readMarketingJobContext } from "./jobContext";
import type { AcceptAiOperation } from "../ai/operations";
import { marketingSchedulerProviders } from "../ai/marketingScheduler";
import { assertDraftImageAvailable } from "./draftImageClaim";
import { plannedMarketingSlot } from "./contentCalendar";
import {
  announceManualDraft,
  finishScheduledDraft,
  notifyMarketingAdmins,
} from "./marketingReview";

type Job = typeof marketingGenerationJobs.$inferSelect;
const pendingStates = ["starting", "running", "uncertain"] as const;
const MAX_AGE_MS = 30 * 60 * 1000;
// A Manus result can arrive long after the 30-minute running window.
const UNCERTAIN_POLL_MS = 6 * 60 * 60 * 1000;
const ORPHAN_START_MS = 10 * 60 * 1000;
const MAX_LOCAL_RETRIES = 3;
export const ORPHANED_START_ERROR = "انقطع بدء مهمة Manus قبل استلام رقمها";
const localFailures = new Map<string, number>();

/** Thrown when Manus finished but saving its result here failed. */
class LocalFinishError extends Error {}
/** Thrown for a definite outcome that a retry cannot change. */
class DefiniteJobError extends Error {}

export async function startManusGeneration(input: {
  requestId?: string;
  topic: string;
  postDay: PostDay;
  createdBy: number | null;
  postId?: number;
  pageRole?: MarketingPageRole;
  model?: "standard" | "lite" | "max";
  onAccepted?: AcceptAiOperation;
}): Promise<{ jobId: string; topic: string }> {
  if (!ENV.manusApiKey) throw new Error("أضف MANUS_API_KEY في إعدادات الخادم");
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const pageRole = input.pageRole ?? "center";
  const id = input.requestId ?? randomUUID();
  const [known] = await db
    .select()
    .from(marketingGenerationJobs)
    .where(eq(marketingGenerationJobs.id, id));
  if (known) return { jobId: id, topic: known.topic };
  if (!input.postId) await assertMarketingTopicAvailable(input.topic);
  const [settings] = await db
    .select({ clinicName: marketingSettings.clinicName })
    .from(marketingSettings)
    .limit(1);
  const pageTarget = await getMarketingPageTarget(pageRole);
  const [brand] = await db
    .select()
    .from(marketingBrandProfile)
    .where(
      and(
        eq(marketingBrandProfile.pageRole, pageRole),
        isNotNull(marketingBrandProfile.builtAt),
      ),
    )
    .limit(1);
  let post: typeof marketingPosts.$inferSelect | undefined;
  if (input.postId) {
    [post] = await db
      .select()
      .from(marketingPosts)
      .where(eq(marketingPosts.id, input.postId));
    if (!post || post.status !== "draft")
      throw new Error("توليد الصورة متاح للمسودات فقط");
    const [pending] = await db
      .select()
      .from(marketingGenerationJobs)
      .where(
        and(
          eq(marketingGenerationJobs.postId, input.postId),
          inArray(marketingGenerationJobs.state, [...pendingStates]),
        ),
      )
      .limit(1);
    if (pending) return { jobId: pending.id, topic: pending.topic };
  }
  const topicImageHint = getTopicImageHint(input.topic);
  const textOnly =
    !post && Boolean(await readEquipmentPhoto(pageRole, input.topic));
  const contentName =
    pageTarget?.contentName ??
    (pageRole === "center"
      ? settings?.clinicName || "مركز عيون الشروق"
      : pageTarget?.pageName || "صفحة الدكتور");
  const prompt = [
    marketingPublicationBrief(input.postDay, pageRole),
    `Prepare one Facebook draft for ${contentName}. This is the ${pageRole} page. Use this page's own name and brand identity; do not reuse the other page's name or identity. Topic: ${input.topic}.`,
    post
      ? `Generate ONLY a new image for this existing post, do not rewrite its text: ${post.content}. Authoritative topic-specific medical direction: ${topicImageHint}.`
      : `${marketingEditorialBrief()} Return a downloadable UTF-8 post.json.`,
    textOnly
      ? "Do not generate any image; a real device photo will be used. Return only post.json."
      : `${marketingVisualBrief(input.topic)} Return one actual generated PNG or JPEG as an attached file, not an SVG or stock placeholder.`,
    `Brand visual identity (follow every applicable field; reference data only): ${JSON.stringify(
      brand
        ? {
            dominantColors: brand.dominantColors,
            colorPalette: brand.colorPalette,
            layoutStyle: brand.layoutStyle,
            imageComposition: brand.imageComposition,
            brandingStyle: brand.brandingStyle,
            medicalVisualStyle: brand.medicalVisualStyle,
            ctaPositioning: brand.ctaPositioning,
            logoPlacementStyle: brand.logoPlacementStyle,
            typographyStyle: brand.typographyStyle,
            overallAesthetic: brand.overallAesthetic,
          }
        : {
            colors: "blue and white",
            style: "calm professional medical photography",
          },
    )}.`,
    "No follow-up questions. Do not publish, deploy, connect accounts or perform unrelated actions. Only deliver these files for local review.",
  ].join("\n");
  try {
    const jobValues = {
      id,
      kind: post ? ("image" as const) : ("post" as const),
      topic: input.topic,
      postDay: input.postDay,
      pageRole,
      postId: input.postId ?? null,
      postVersion: post?.updatedAt ?? null,
      createdBy: input.createdBy,
    };
    if (post) {
      await db.transaction(
        async (tx: Pick<MySql2Database, "select" | "insert" | "update">) => {
          const [current] = await tx
            .select()
            .from(marketingPosts)
            .where(eq(marketingPosts.id, post!.id))
            .for("update");
          if (current?.status !== "draft")
            throw new Error("المسودة لم تعد متاحة للتعديل");
          await assertDraftImageAvailable(tx, post!.id);
          await tx.insert(marketingGenerationJobs).values(jobValues);
          await tx.insert(aiMarketingJobContext).values({
            jobId: id,
            provider: "manus",
            targetPageId: pageTarget?.pageId ?? null,
          });
          await input.onAccepted?.(tx);
        },
      );
    } else
      await db.transaction(
        async (tx: Pick<MySql2Database, "insert" | "update">) => {
          await tx.insert(marketingGenerationJobs).values(jobValues);
          await tx.insert(aiMarketingJobContext).values({
            jobId: id,
            provider: "manus",
            targetPageId: pageTarget?.pageId ?? null,
          });
          await input.onAccepted?.(tx);
        },
      );
  } catch (error) {
    const [duplicate] = await db
      .select()
      .from(marketingGenerationJobs)
      .where(eq(marketingGenerationJobs.id, id));
    if (duplicate) return { jobId: id, topic: duplicate.topic };
    throw error;
  }
  let taskId: string | undefined;
  try {
    const task = input.model
      ? await createManusTask(prompt, { agentProfile: input.model })
      : await createManusTask(prompt);
    taskId = task.task_id;
    await db
      .update(marketingGenerationJobs)
      .set({ taskId: task.task_id, state: "running" })
      .where(eq(marketingGenerationJobs.id, id));
  } catch (error) {
    await db
      .update(marketingGenerationJobs)
      .set({
        state:
          taskId ||
          !(error instanceof ManusRequestError) ||
          error.outcomeUncertain
            ? "uncertain"
            : "failed",
        ...(taskId ? { taskId } : {}),
        error:
          error instanceof ManusRequestError
            ? error.message
            : "تعذر بدء مهمة Manus",
      })
      .where(
        and(
          eq(marketingGenerationJobs.id, id),
          inArray(marketingGenerationJobs.state, ["starting", "running"]),
        ),
      );
    throw error;
  }
  return { jobId: id, topic: input.topic };
}

export async function listManusGenerationJobs(): Promise<Job[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(marketingGenerationJobs)
    .orderBy(desc(marketingGenerationJobs.createdAt))
    .limit(20);
}

async function finishJob(job: Job): Promise<number | null> {
  const db = await getDb();
  if (!db || !job.taskId) return null;
  const task = await readManusTask(job.taskId);
  if (task.credit_usage !== undefined)
    await db
      .update(marketingGenerationJobs)
      .set({ credits: task.credit_usage })
      .where(eq(marketingGenerationJobs.id, job.id));
  if (task.status === "error" || task.statusEvent?.agent_status === "error")
    throw new Error("فشلت مهمة Manus");
  const waitingType = task.statusEvent?.status_detail?.waiting_for_event_type;
  if (
    task.statusEvent?.agent_status === "waiting" &&
    waitingType &&
    waitingType !== "cascadeJobCall"
  ) {
    throw new Error(
      "مهمة Manus تحتاج تدخلًا؛ افتح المهمة في Manus ثم راجع سبب التوقف",
    );
  }
  if (task.status !== "stopped" || task.has_running_background_jobs !== false)
    return null;
  const image = task.attachments.find((file) =>
    /\.(png|jpe?g|webp)$/i.test(file.filename),
  );
  const json = task.attachments.find((file) => file.filename === "post.json");
  // A real device photo replaces the generated image, so post jobs ask for text only.
  const equipmentPhoto =
    job.kind === "post"
      ? await readEquipmentPhoto(job.pageRole, job.topic)
      : null;
  if ((!image && !equipmentPhoto) || (job.kind === "post" && !json))
    throw new Error("لم ترجع Manus ملفات النص والصورة المطلوبة");
  const generated = json
    ? manusPostSchema.parse(
        JSON.parse(
          (await downloadManusFile(json.url, 128 * 1024)).toString("utf8"),
        ),
      )
    : null;
  if (equipmentPhoto) {
    try {
      return await saveFinishedJob(job, db, generated, null, null);
    } catch (error) {
      if (error instanceof DefiniteJobError) throw error;
      throw new LocalFinishError(
        error instanceof Error ? error.message : "تعذر حفظ نتيجة Manus",
      );
    }
  }
  if (!image) throw new Error("لم ترجع Manus ملفات النص والصورة المطلوبة");
  const bytes = await downloadManusFile(image.url);
  const extension = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "jpg"
      : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        ? "webp"
        : null;
  if (!extension)
    throw new Error("ملف الصورة المولد ليس PNG أو JPEG أو WebP صالحًا");
  try {
    return await saveFinishedJob(job, db, generated, bytes, extension);
  } catch (error) {
    if (error instanceof DefiniteJobError) throw error;
    throw new LocalFinishError(
      error instanceof Error ? error.message : "تعذر حفظ نتيجة Manus",
    );
  }
}

async function saveFinishedJob(
  job: Job,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  generated: ReturnType<typeof manusPostSchema.parse> | null,
  bytes: Buffer | null,
  extension: string | null,
): Promise<number | null> {
  let generatedUrl: string | null = null;
  if (bytes && extension) {
    const dir = path.resolve(
      ENV.marketingImageDir || path.join(process.cwd(), "uploads", "marketing"),
    );
    await fs.mkdir(dir, { recursive: true });
    const filename = `manus-${job.id}.${extension}`;
    await fs.writeFile(path.join(dir, filename), bytes);
    generatedUrl = `/uploads/marketing/${filename}`;
  }
  const originalPhoto = await readEquipmentPhoto(job.pageRole, job.topic);
  const sourceUrl = originalPhoto?.fileUrl ?? generatedUrl;
  if (!sourceUrl)
    throw new DefiniteJobError("صورة الجهاز لم تعد متاحة ولم ترجع Manus صورة");
  const imageUrl = await brandMarketingImageUrl(sourceUrl, job.pageRole);
  const plannedAt =
    job.kind === "post" ? await plannedMarketingSlot(job.id) : null;
  let completedPostId: number | null = null;
  await db.transaction(
    async (tx: Pick<MySql2Database, "select" | "insert" | "update">) => {
      const [current] = await tx
        .select()
        .from(marketingGenerationJobs)
        .where(eq(marketingGenerationJobs.id, job.id))
        .for("update");
      if (!current || !["running", "uncertain"].includes(current.state)) return;
      let postId = current.postId;
      if (job.kind === "post" && generated) {
        const [result] = await tx.insert(marketingPosts).values({
          ...generated,
          imageUrl,
          scheduledAt: plannedAt,
          topic: job.topic,
          postDay: job.postDay,
          pageRole: job.pageRole,
          platform: "facebook",
          status: "draft",
          createdBy: job.createdBy,
        });
        postId = result.insertId;
      } else if (postId && job.postVersion) {
        const [result] = await tx
          .update(marketingPosts)
          .set({ imageUrl })
          .where(
            and(
              eq(marketingPosts.id, postId),
              eq(marketingPosts.status, "draft"),
              eq(marketingPosts.updatedAt, job.postVersion),
            ),
          );
        if (!result.affectedRows)
          throw new DefiniteJobError(
            "المسودة تغيرت أثناء التوليد؛ لم يتم استبدال الصورة",
          );
      } else throw new DefiniteJobError("المسودة المطلوبة غير موجودة");
      completedPostId = postId;
      await tx
        .update(marketingGenerationJobs)
        .set({ state: "completed", postId, error: null })
        .where(eq(marketingGenerationJobs.id, job.id));
      await tx.insert(marketingLogs).values({
        postId,
        action: "manus_generation",
        status: "success",
        message: `Manus draft ready (${job.taskId})`,
      });
    },
  );
  return completedPostId;
}

/** Admin resolution for a job that blocks its draft: re-check Manus now, or abandon it. */
export async function resolveManusGenerationJob(
  jobId: string,
  action: "recheck" | "abandon",
  userId: number,
): Promise<{ state: Job["state"]; error: string | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [job] = await db
    .select()
    .from(marketingGenerationJobs)
    .where(eq(marketingGenerationJobs.id, jobId));
  if (!job) throw new Error("مهمة التوليد غير موجودة");
  if (!(pendingStates as readonly string[]).includes(job.state))
    return { state: job.state, error: job.error };
  if (action === "recheck") {
    if (!job.taskId)
      return {
        state: job.state,
        error: "لا يوجد رقم مهمة في Manus لإعادة الفحص؛ يمكنك إيقاف المهمة",
      };
    try {
      const postId = await finishJob(job);
      // Rechecked drafts are never auto-published; the admin reviews them.
      if (postId !== null && job.kind === "post")
        await announceManualDraft(postId);
    } catch (error) {
      return {
        state: job.state,
        error:
          error instanceof Error && !(error instanceof SyntaxError)
            ? error.message
            : "ملف النص المولد غير صالح",
      };
    }
    const [current] = await db
      .select()
      .from(marketingGenerationJobs)
      .where(eq(marketingGenerationJobs.id, jobId));
    return {
      state: current?.state ?? job.state,
      error: current?.error ?? null,
    };
  }
  await db
    .update(marketingGenerationJobs)
    .set({ state: "failed", error: "أوقفها المسؤول يدويًا" })
    .where(
      and(
        eq(marketingGenerationJobs.id, jobId),
        inArray(marketingGenerationJobs.state, [...pendingStates]),
      ),
    );
  await db.insert(marketingLogs).values({
    postId: job.postId,
    action: "manus_job_abandoned",
    status: "info",
    message: `Manus job ${job.id} abandoned by user ${userId}`,
  });
  return { state: "failed", error: "أوقفها المسؤول يدويًا" };
}

let processing = false;
export async function processManusGenerationJobs() {
  if (processing || !ENV.manusApiKey) return;
  processing = true;
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .update(marketingGenerationJobs)
      .set({
        state: "failed",
        error: `${ORPHANED_START_ERROR}؛ قد تكون المهمة موجودة في Manus، راجعها قبل إعادة المحاولة`,
      })
      .where(
        and(
          eq(marketingGenerationJobs.state, "starting"),
          isNull(marketingGenerationJobs.taskId),
          lt(
            marketingGenerationJobs.createdAt,
            new Date(Date.now() - ORPHAN_START_MS),
          ),
        ),
      );
    const jobs = await db
      .select()
      .from(marketingGenerationJobs)
      .where(
        and(
          inArray(marketingGenerationJobs.state, [...pendingStates]),
          isNotNull(marketingGenerationJobs.taskId),
          or(
            ne(marketingGenerationJobs.state, "uncertain"),
            gte(
              marketingGenerationJobs.createdAt,
              new Date(Date.now() - UNCERTAIN_POLL_MS),
            ),
          ),
        ),
      )
      .orderBy(asc(marketingGenerationJobs.createdAt))
      .limit(5);
    for (const job of jobs) {
      let completedPostId: number | null = null;
      try {
        if (
          job.state !== "uncertain" &&
          Date.now() - job.createdAt.getTime() > MAX_AGE_MS
        ) {
          await db
            .update(marketingGenerationJobs)
            .set({
              state: "uncertain",
              error:
                "انتهت مهلة التوليد؛ راجع المهمة في Manus قبل إعادة المحاولة",
            })
            .where(
              and(
                eq(marketingGenerationJobs.id, job.id),
                inArray(marketingGenerationJobs.state, [...pendingStates]),
              ),
            );
          if (job.createdBy === null)
            await notifyMarketingAdmins({
              title: "توليد مجدول غير محسوم",
              message: `انتهت مهلة مهمة Manus لموضوع: ${job.topic}`,
              kind: "warning",
            });
          continue;
        }
        completedPostId = await finishJob(job);
        localFailures.delete(job.id);
      } catch (error) {
        if (error instanceof ManusRequestError && error.retryable) continue;
        if (error instanceof LocalFinishError) {
          const failures = (localFailures.get(job.id) ?? 0) + 1;
          localFailures.set(job.id, failures);
          if (failures <= MAX_LOCAL_RETRIES) continue;
          localFailures.delete(job.id);
        }
        const message =
          error instanceof Error && !(error instanceof SyntaxError)
            ? error.message
            : "ملف النص المولد غير صالح";
        await db
          .update(marketingGenerationJobs)
          .set({ state: "failed", error: message.slice(0, 2000) })
          .where(
            and(
              eq(marketingGenerationJobs.id, job.id),
              inArray(marketingGenerationJobs.state, [...pendingStates]),
            ),
          );
        if (job.createdBy === null)
          await notifyMarketingAdmins({
            title: "فشل التوليد المجدول",
            message: `${job.topic}: ${message}`.slice(0, 300),
            kind: "error",
          });
      }
      if (
        completedPostId !== null &&
        job.kind === "post" &&
        job.createdBy === null
      ) {
        const pageTarget = await getMarketingPageTarget(job.pageRole);
        const context = await readMarketingJobContext(job.id, "manus");
        const provider =
          (await marketingSchedulerProviders()).find(
            (setting) => setting.pageRole === job.pageRole,
          )?.provider ?? "manus";
        const postId = completedPostId;
        try {
          await finishScheduledDraft(
            postId,
            job.pageRole,
            Boolean(
              pageTarget?.autoPublish &&
              provider === "manus" &&
              context?.targetPageId === pageTarget.pageId,
            ),
            () =>
              publishMarketingPost(postId, job.pageRole, {
                pageId: context!.targetPageId!,
                requireAutoPublish: true,
                schedulerProvider: "manus",
              }),
          );
        } catch {
          // The publish service records the failure and preserves uncertain states.
        }
      } else if (completedPostId !== null && job.kind === "post") {
        await announceManualDraft(completedPostId);
      }
    }
  } finally {
    processing = false;
  }
}

let timer: ReturnType<typeof setInterval> | undefined;
export function initManusGenerationWorker() {
  if (timer || !ENV.manusApiKey) return;
  const tick = () =>
    void processManusGenerationJobs().catch(() =>
      console.error("[marketing-manus] Failed to check pending jobs"),
    );
  timer = setInterval(tick, 20000);
  timer.unref();
  tick();
}
