import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { z } from "zod";
import { getDb, getDbConnection } from "../../db";
import { ENV } from "../../_core/env";
import {
  aiMarketingJobs,
  aiMarketingRecoveries,
  marketingPosts,
  marketingLogs,
} from "../../../drizzle/schema";
import { manusPostSchema } from "../marketing/manusClient";
import {
  assertMarketingTopicAvailable,
  PublishedMarketingTopicError,
} from "../marketing/topicHistory";
import { AiManagementError, AiManagementStore } from "./managementStore";
import { readMarketingJobContext } from "../marketing/jobContext";
import { assertDraftImageAvailable } from "../marketing/draftImageClaim";
import {
  centralMarketingJobs,
  finishCentralMarketingDraft,
  matchesMarketingPostSnapshot,
  marketingUsageId,
  regenerateCentralMarketingImage,
} from "./marketingDraft";

type Job = typeof aiMarketingJobs.$inferSelect;
type Plan = {
  action: "attach" | "image_retry" | "blocked" | "done" | "wait";
  reason: string;
  artifact?: string;
  usageReview?: boolean;
  imageModel?: string;
};
export const recoveryInput = z
  .object({
    jobId: z.string().uuid(),
    requestId: z.string().uuid(),
    allowImageGeneration: z.boolean().default(false),
  })
  .strict()
  .refine(
    (input) => input.jobId !== input.requestId,
    "A separate recovery request ID is required",
  );

function savedText(job: Job) {
  try {
    return manusPostSchema.parse(JSON.parse(job.generatedJson || "null"));
  } catch {
    return undefined;
  }
}
function validImage(bytes: Buffer, extension: string) {
  if (bytes.length < 32 || bytes.length > 20 * 1024 * 1024) return false;
  if (extension === "jpg")
    return (
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255 &&
      bytes[bytes.length - 2] === 255 &&
      bytes[bytes.length - 1] === 217
    );
  if (extension === "png")
    return (
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      bytes
        .subarray(-12)
        .equals(Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]))
    );
  return (
    extension === "webp" &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP" &&
    bytes.readUInt32LE(4) + 8 === bytes.length
  );
}
async function artifact(job: Job) {
  const usageId =
    job.imageUsageId || marketingUsageId(job.id, "marketing.image");
  z.string().uuid().parse(usageId);
  const stems = [
    `gemini-output-${usageId}`,
    job.kind === "image" ? `gemini-image-${job.id}` : `gemini-${job.id}`,
  ];
  const names = stems.flatMap((stem) =>
    ["jpg", "png", "webp"].map((extension) => `${stem}.${extension}`),
  );
  const directory = path.resolve(
    ENV.marketingImageDir || path.join(process.cwd(), "uploads", "marketing"),
  );
  for (const name of names) {
    const filename = path.join(directory, name);
    try {
      const stat = await fs.stat(filename);
      if (!stat.isFile() || stat.size > 20 * 1024 * 1024) continue;
      const bytes = await fs.readFile(filename);
      if (validImage(bytes, path.extname(name).slice(1)))
        return `/uploads/marketing/${name}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return undefined;
}
async function inspect(job: Job, ownExecution?: string): Promise<Plan> {
  if (job.state === "completed")
    return {
      action: "done",
      reason: "already_completed",
      usageReview: job.errorCode === "recovered_usage_requires_review",
    };
  if (job.state === "running" && job.executionId !== ownExecution)
    return { action: "wait", reason: "still_running" };
  if (job.kind === "post") {
    if (!savedText(job))
      return { action: "blocked", reason: "saved_text_missing" };
    try {
      await assertMarketingTopicAvailable(job.topic);
    } catch (error) {
      if (error instanceof PublishedMarketingTopicError)
        return { action: "blocked", reason: "topic_retired" };
      throw error;
    }
  } else {
    const db = await getDb();
    const [post] = await db
      .select()
      .from(marketingPosts)
      .where(eq(marketingPosts.id, job.sourcePostId!));
    if (
      !post ||
      post.status !== "draft" ||
      !matchesMarketingPostSnapshot(post, job.postSnapshot, job.topic)
    )
      return { action: "blocked", reason: "draft_changed" };
  }
  const usage = await new AiManagementStore(getDbConnection).findRequest(
    job.imageUsageId || marketingUsageId(job.id, "marketing.image"),
  );
  const image = await artifact(job);
  if (image)
    return {
      action: "attach",
      reason: "saved_image_available",
      artifact: image,
      usageReview: usage?.state !== "completed",
    };
  if (usage && usage.state !== "failed")
    return {
      action: "blocked",
      reason:
        usage.state === "completed"
          ? "paid_image_missing"
          : "provider_uncertain",
    };
  const profiles = await new AiManagementStore(getDbConnection).listProfiles();
  const context = await readMarketingJobContext(job.id, "gemini");
  const imageModel =
    context?.imageModel ??
    (usage?.provider === "gemini" ? usage.model : undefined);
  if (!imageModel || !/^gemini-[a-z0-9.-]+$/.test(imageModel))
    return { action: "blocked", reason: "original_model_missing" };
  if (
    !process.env.GEMINI_API_KEY ||
    !profiles.some(
      (profile) => profile.workload === "marketing.image" && profile.enabled,
    )
  )
    return { action: "blocked", reason: "image_configuration" };
  return {
    action: "image_retry",
    reason: usage ? "image_failed" : "image_not_requested",
    imageModel,
  };
}
export async function marketingRecoveryPlan(jobId: string) {
  z.string().uuid().parse(jobId);
  await centralMarketingJobs(jobId);
  const db = await getDb();
  const [job] = await db
    .select()
    .from(aiMarketingJobs)
    .where(eq(aiMarketingJobs.id, jobId));
  if (!job) throw new AiManagementError("unavailable");
  const plan = await inspect(job);
  return {
    action: plan.action,
    reason: plan.reason,
    usageReview: Boolean(plan.usageReview),
    imageModel: plan.imageModel,
    imageUsageId:
      job.imageUsageId || marketingUsageId(job.id, "marketing.image"),
  };
}
async function attach(job: Job, requestId: string, plan: Plan) {
  const db = await getDb();
  await db.transaction(
    async (tx: Pick<MySql2Database, "select" | "insert" | "update">) => {
      let source: typeof marketingPosts.$inferSelect | undefined;
      if (job.kind === "image")
        [source] = await tx
          .select()
          .from(marketingPosts)
          .where(eq(marketingPosts.id, job.sourcePostId!))
          .for("update");
      const [current] = await tx
        .select()
        .from(aiMarketingJobs)
        .where(eq(aiMarketingJobs.id, job.id))
        .for("update");
      if (current?.executionId !== requestId || current.state !== "running")
        throw new AiManagementError("unavailable");
      let postId = job.sourcePostId;
      if (job.kind === "image") {
        if (
          !source ||
          source.status !== "draft" ||
          !matchesMarketingPostSnapshot(source, job.postSnapshot, job.topic)
        )
          throw new AiManagementError("unavailable");
        await assertDraftImageAvailable(tx, source.id, job.id);
        await tx
          .update(marketingPosts)
          .set({ imageUrl: plan.artifact! })
          .where(eq(marketingPosts.id, source.id));
      } else {
        const generated = savedText(current);
        if (!generated) throw new AiManagementError("unavailable");
        const [created] = await tx.insert(marketingPosts).values({
          ...generated,
          imageUrl: plan.artifact!,
          topic: job.topic,
          postDay: job.postDay,
          pageRole: job.pageRole,
          platform: "facebook",
          status: "draft",
          createdBy: job.createdBy,
        });
        postId = created.insertId;
      }
      await tx
        .update(aiMarketingJobs)
        .set({
          state: "completed",
          postId,
          imageArtifact: plan.artifact!,
          errorCode: plan.usageReview
            ? "recovered_usage_requires_review"
            : null,
        })
        .where(eq(aiMarketingJobs.id, job.id));
      await tx.insert(marketingLogs).values({
        postId,
        action: "central_ai_recovery",
        status: "success",
        message: `Saved artifacts recovered (${job.id}); no AI request or publication`,
      });
    },
  );
}
export async function recoverCentralMarketing(
  raw: z.input<typeof recoveryInput>,
  createdBy: number,
) {
  const input = recoveryInput.parse(raw);
  if (process.env.AI_CORE_MANAGEMENT_ENABLED !== "true")
    throw new AiManagementError("disabled");
  await centralMarketingJobs(input.jobId);
  const db = await getDb();
  const [observed] = await db
    .select()
    .from(aiMarketingJobs)
    .where(eq(aiMarketingJobs.id, input.jobId));
  if (!observed) throw new AiManagementError("unavailable");
  const proposed = await inspect(observed);
  const claim = await db.transaction(
    async (tx: Pick<MySql2Database, "select" | "insert" | "update">) => {
      const [job] = await tx
        .select()
        .from(aiMarketingJobs)
        .where(eq(aiMarketingJobs.id, input.jobId))
        .for("update");
      if (!job) throw new AiManagementError("unavailable");
      const [known] = await tx
        .select()
        .from(aiMarketingRecoveries)
        .where(eq(aiMarketingRecoveries.id, input.requestId));
      if (known) {
        if (known.jobId !== job.id) throw new AiManagementError("duplicate");
        return { job, run: false };
      }
      const unchanged =
        job.state === observed.state &&
        job.executionId === observed.executionId &&
        job.imageUsageId === observed.imageUsageId &&
        job.imageArtifact === observed.imageArtifact &&
        job.generatedJson === observed.generatedJson;
      const plan = unchanged
        ? proposed
        : { action: "blocked" as const, reason: "job_changed" };
      const allowed =
        plan.action === "attach" ||
        (plan.action === "image_retry" && input.allowImageGeneration);
      await tx.insert(aiMarketingRecoveries).values({
        id: input.requestId,
        jobId: job.id,
        action: allowed ? (plan.action as "attach" | "image_retry") : "blocked",
        createdBy,
      });
      if (allowed)
        await tx
          .update(aiMarketingJobs)
          .set({
            state: "running",
            executionId: input.requestId,
            errorCode: null,
          })
          .where(eq(aiMarketingJobs.id, job.id));
      return { job, run: allowed };
    },
  );
  if (claim.run) {
    try {
      const plan = await inspect(
        { ...claim.job, state: "running", executionId: input.requestId },
        input.requestId,
      );
      if (plan.action === "attach")
        await attach(claim.job, input.requestId, plan);
      else if (plan.action === "image_retry" && input.allowImageGeneration) {
        if (claim.job.kind === "post")
          await finishCentralMarketingDraft(
            {
              requestId: claim.job.id,
              topic: claim.job.topic,
              pageRole: claim.job.pageRole,
              postDay: claim.job.postDay,
              imageModel: plan.imageModel,
            },
            claim.job.createdBy,
            savedText(claim.job)!,
            input.requestId,
          );
        else
          await regenerateCentralMarketingImage(
            { requestId: claim.job.id, postId: claim.job.sourcePostId! },
            createdBy,
            input.requestId,
            plan.imageModel,
          );
      } else throw new AiManagementError("unavailable");
    } catch {
      await db
        .update(aiMarketingJobs)
        .set({ state: "uncertain", errorCode: "recovery_requires_review" })
        .where(
          and(
            eq(aiMarketingJobs.id, claim.job.id),
            eq(aiMarketingJobs.executionId, input.requestId),
            eq(aiMarketingJobs.state, "running"),
          ),
        );
    }
  }
  return { jobId: input.jobId, ...(await marketingRecoveryPlan(input.jobId)) };
}
