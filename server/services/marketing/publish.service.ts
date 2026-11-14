import { and, desc, eq, inArray } from "drizzle-orm";
import {
  reserveTopicPublication,
  confirmTopicPublication,
  releaseTopicPublication,
  settleTopicForPost,
} from "./topicHistory";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { getDb } from "../../db";
import { ENV } from "../../_core/env";
import { prepareMarketingPublication } from "./pageBranding";
import { checkMarketingContent } from "./contentCheck";
import {
  marketingApprovalRequired,
  notifyMarketingAdmins,
} from "./marketingReview";
import {
  marketingGenerationJobs,
  marketingLogs,
  marketingPosts,
  marketingFacebookPages,
  marketingSettings,
  aiMarketingJobs,
  aiMarketingScheduler,
} from "../../../drizzle/schema";
import {
  FacebookPublishError,
  publishPostToFacebook,
  readRecentPagePosts,
} from "./facebookPublisher.service";

export class MarketingPublishError extends Error {
  constructor(
    message: string,
    readonly uncertain = false,
    readonly tokenRejected = false,
  ) {
    super(message);
  }
}

type PublicationClaim =
  | { kind: "published"; fbPostId: string }
  | {
      kind: "ready";
      pageRole: "center" | "doctor";
      topicKey: string;
      pageId: string;
      accessToken: string;
      message: string;
      imageUrl: string | null;
    };

export function buildMessage(post: typeof marketingPosts.$inferSelect): string {
  return [
    post.content ?? post.title,
    post.cta ? `\n\n${post.cta}` : "",
    post.hashtags ? `\n\n${post.hashtags}` : "",
  ]
    .join("")
    .trim();
}

function normalizeFacebookError(error: unknown): MarketingPublishError {
  if (error instanceof FacebookPublishError) {
    return new MarketingPublishError(
      error.message,
      error.uncertain,
      error.tokenRejected,
    );
  }
  return new MarketingPublishError(
    "تعذر التأكد من نتيجة النشر على Facebook؛ راجع الصفحة قبل إعادة المحاولة",
    true,
  );
}

export async function publishMarketingPost(
  postId: number,
  requestedPageRole?: "center" | "doctor",
  expectedTarget?: {
    pageId: string;
    requireAutoPublish: boolean;
    schedulerProvider?: "manus" | "central";
  },
): Promise<{ fbPostId: string; alreadyPublished?: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const claim: PublicationClaim = await db.transaction(
    async (
      tx: Pick<MySql2Database, "select" | "insert" | "update" | "delete">,
    ) => {
      const [post] = await tx
        .select()
        .from(marketingPosts)
        .where(eq(marketingPosts.id, postId))
        .limit(1)
        .for("update");

      if (!post) throw new Error("Post not found");
      if (post.status === "published") {
        return {
          kind: "published",
          fbPostId: post.fbPostId ?? "unknown",
        };
      }
      if (post.status === "publishing") {
        throw new MarketingPublishError(
          "المنشور قيد النشر أو يحتاج مراجعة نتيجة النشر على Facebook",
          true,
        );
      }
      if (post.status !== "draft") {
        throw new Error("المنشور ليس مسودة قابلة للنشر");
      }
      const pageRole = requestedPageRole ?? post.pageRole ?? "center";

      const [pendingImage] = await tx
        .select({ id: marketingGenerationJobs.id })
        .from(marketingGenerationJobs)
        .where(
          and(
            eq(marketingGenerationJobs.postId, post.id),
            inArray(marketingGenerationJobs.state, [
              "starting",
              "running",
              "uncertain",
            ]),
          ),
        )
        .limit(1);
      if (pendingImage) throw new Error("انتظر اكتمال توليد الصورة قبل النشر");

      const [settings] = await tx
        .select()
        .from(marketingSettings)
        .limit(1)
        .for("update");
      const [page] = await tx
        .select()
        .from(marketingFacebookPages)
        .where(eq(marketingFacebookPages.pageRole, pageRole))
        .limit(1)
        .for("update");
      const target =
        page ??
        (pageRole === "center" && settings?.fbPageId && settings.fbAccessToken
          ? {
              pageId: settings.fbPageId,
              accessToken: settings.fbAccessToken,
              connected: settings.fbConnected,
              autoPublish: settings.autoPublish,
              saturdayEnabled: settings.saturdayEnabled,
              tuesdayEnabled: settings.tuesdayEnabled,
              thursdayEnabled: settings.thursdayEnabled,
            }
          : null);
      if (!target?.connected || !target.pageId || !target.accessToken) {
        throw new Error(
          pageRole === "doctor"
            ? "اربط صفحة الدكتور قبل النشر"
            : "اربط صفحة المركز قبل النشر",
        );
      }
      if (
        expectedTarget &&
        (target.pageId !== expectedTarget.pageId ||
          (expectedTarget.requireAutoPublish && !target.autoPublish))
      ) {
        throw new MarketingPublishError(
          "تغيرت صفحة النشر أو إعداد الجدولة؛ المسودة محفوظة للمراجعة",
        );
      }

      if (expectedTarget?.requireAutoPublish) {
        // Second line of defence; schedulers already skip these drafts.
        if (checkMarketingContent(post).length)
          throw new MarketingPublishError(
            "المسودة تحتاج مراجعة المحتوى؛ لم تُنشر تلقائيًا",
          );
        if (await marketingApprovalRequired(pageRole))
          throw new MarketingPublishError(
            "وضع الموافقة مفعل لهذه الصفحة؛ المسودة تنتظر النشر اليدوي",
          );
      }

      if (expectedTarget?.schedulerProvider) {
        const [scheduler] = await tx
          .select()
          .from(aiMarketingScheduler)
          .where(eq(aiMarketingScheduler.pageRole, pageRole))
          .limit(1)
          .for("update");
        const slotEnabled =
          post.postDay === "saturday"
            ? target.saturdayEnabled
            : post.postDay === "tuesday"
              ? target.tuesdayEnabled
              : target.thursdayEnabled;
        if (
          (scheduler?.provider ?? "manus") !==
            expectedTarget.schedulerProvider ||
          slotEnabled === false
        )
          throw new MarketingPublishError(
            "تغير مزوّد الجدولة أو تعطّل يوم النشر؛ المسودة محفوظة للمراجعة",
          );
      }

      const [centralImage] = await tx
        .select({ id: aiMarketingJobs.id })
        .from(aiMarketingJobs)
        .where(
          and(
            eq(aiMarketingJobs.sourcePostId, post.id),
            eq(aiMarketingJobs.state, "running"),
          ),
        )
        .limit(1);
      if (centralImage)
        throw new Error("انتظر اكتمال توليد صورة Gemini قبل النشر");
      const topicKey = await reserveTopicPublication(post);

      await tx
        .update(marketingPosts)
        .set({
          status: "publishing",
          ...(requestedPageRole ? { pageRole: requestedPageRole } : {}),
        })
        .where(
          and(
            eq(marketingPosts.id, post.id),
            eq(marketingPosts.status, "draft"),
          ),
        );

      await tx.insert(marketingLogs).values({
        postId,
        action: "publish_claim",
        status: "info",
        message: `Publication claimed for Facebook page ${target.pageId}`,
      });
      return {
        kind: "ready",
        pageRole,
        topicKey,
        pageId: target.pageId,
        accessToken: target.accessToken,
        message: buildMessage(post),
        imageUrl: post.imageUrl ?? null,
      };
    },
  );

  if (claim.kind === "published")
    return { fbPostId: claim.fbPostId, alreadyPublished: true };
  let fbPostId: string;
  let publishedImageUrl = claim.imageUrl;
  let submitted = false;
  try {
    const prepared = await prepareMarketingPublication(
      claim.message,
      claim.imageUrl,
      claim.pageRole,
      claim.pageId,
    );
    publishedImageUrl = prepared.imageUrl;
    submitted = true;
    ({ fbPostId } = await publishPostToFacebook(
      claim.pageId,
      claim.accessToken,
      prepared.message,
      prepared.imageUrl,
      ENV.fbAppOrigin || "https://selrs.cc",
    ));
  } catch (error) {
    const failure = submitted
      ? normalizeFacebookError(error)
      : new MarketingPublishError(
          error instanceof Error
            ? error.message
            : "تعذر تجهيز هوية المنشور؛ لم يتم إرساله إلى Facebook",
          false,
        );
    if (!failure.uncertain) {
      try {
        await db.transaction(
          async (
            tx: Pick<MySql2Database, "select" | "update" | "delete" | "insert">,
          ) => {
            const [post] = await tx
              .select()
              .from(marketingPosts)
              .where(eq(marketingPosts.id, postId))
              .for("update");
            if (post?.status !== "publishing")
              throw new MarketingPublishError(
                "تغيرت حالة النشر؛ راجع النتيجة قبل المحاولة",
                true,
              );
            await releaseTopicPublication(tx, claim.topicKey, postId);
            await tx
              .update(marketingPosts)
              .set({ status: "draft" })
              .where(eq(marketingPosts.id, postId));
            await tx.insert(marketingLogs).values({
              postId,
              action: "publish_post",
              status: "error",
              message: failure.message.slice(0, 2000),
            });
          },
        );
      } catch {
        throw new MarketingPublishError(
          "تعذر حفظ نتيجة رفض النشر؛ راجع المحاولة الأصلية",
          true,
        );
      }
    } else {
      try {
        await db.insert(marketingLogs).values({
          postId,
          action: "publish_post",
          status: "error",
          message: failure.message.slice(0, 2000),
        });
      } catch {
        console.error(
          "[marketing] Could not record uncertain publication outcome",
        );
      }
    }
    if (failure.tokenRejected)
      console.error(
        "[marketing] Facebook rejected the page access token (Graph code 190)",
        claim.pageRole,
      );
    await notifyMarketingAdmins({
      title: failure.tokenRejected
        ? "رفض Facebook رمز الصفحة"
        : failure.uncertain
          ? "نتيجة نشر غير مؤكدة"
          : "تعذر نشر منشور",
      message: failure.message.slice(0, 300),
      kind: failure.uncertain ? "warning" : "error",
      postId,
    });
    throw failure;
  }
  try {
    await db.transaction(
      async (
        tx: Pick<MySql2Database, "select" | "update" | "insert" | "delete">,
      ) => {
        const [post] = await tx
          .select()
          .from(marketingPosts)
          .where(eq(marketingPosts.id, postId))
          .for("update");
        if (post?.status !== "publishing")
          throw new MarketingPublishError(
            "تغيرت حالة المحاولة؛ راجع المنشور على Facebook",
            true,
          );
        await tx
          .update(marketingPosts)
          .set({
            status: "published",
            publishedAt: new Date(),
            fbPostId,
            imageUrl: publishedImageUrl,
          })
          .where(eq(marketingPosts.id, postId));
        await confirmTopicPublication(tx, claim.topicKey, postId);
        await tx.insert(marketingLogs).values({
          postId,
          action: "publish_post",
          status: "success",
          message: `Published to Facebook: ${fbPostId}`,
        });
      },
    );
  } catch {
    const failure = new MarketingPublishError(
      "نجح طلب النشر ولم يتأكد حفظه محليًا؛ راجع المحاولة الأصلية قبل أي إرسال جديد",
      true,
    );
    await notifyMarketingAdmins({
      title: "نتيجة نشر غير مؤكدة",
      message: failure.message,
      kind: "warning",
      postId,
    });
    throw failure;
  }
  return { fbPostId };
}

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();
// Facebook's created_time and our clock can disagree by a little.
const CLAIM_SKEW_MS = 2 * 60 * 1000;

async function readPublishingPost(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [post] = await db
    .select()
    .from(marketingPosts)
    .where(eq(marketingPosts.id, postId))
    .limit(1);
  if (!post) throw new Error("المنشور غير موجود");
  if (post.status !== "publishing")
    throw new Error("المنشور ليس في حالة قيد النشر");
  const [claim] = await db
    .select({ createdAt: marketingLogs.createdAt })
    .from(marketingLogs)
    .where(
      and(
        eq(marketingLogs.postId, postId),
        eq(marketingLogs.action, "publish_claim"),
      ),
    )
    .orderBy(desc(marketingLogs.createdAt))
    .limit(1);
  return { db, post, claimedAt: claim?.createdAt ?? post.updatedAt };
}

async function settlePublishingPost(
  postId: number,
  outcome: "published" | "not_published",
  fbPostId: string | null,
  message: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(
    async (
      tx: Pick<MySql2Database, "select" | "update" | "insert" | "delete">,
    ) => {
      const [post] = await tx
        .select()
        .from(marketingPosts)
        .where(eq(marketingPosts.id, postId))
        .for("update");
      if (post?.status !== "publishing")
        throw new Error("تغيرت حالة المنشور؛ حدّث الصفحة");
      await tx
        .update(marketingPosts)
        .set(
          outcome === "published"
            ? { status: "published", publishedAt: new Date(), fbPostId }
            : { status: "draft" },
        )
        .where(eq(marketingPosts.id, postId));
      await settleTopicForPost(
        tx,
        postId,
        outcome === "published" ? "published" : "released",
      );
      await tx.insert(marketingLogs).values({
        postId,
        action: "publish_reconcile",
        status: "info",
        message,
      });
    },
  );
}

/** Looks for a stuck post on its Facebook page and settles it when found. */
export async function reconcilePublishingPost(
  postId: number,
  userId: number,
): Promise<
  | { state: "published"; fbPostId: string }
  | { state: "unmatched"; reason: string }
> {
  const { db, post, claimedAt } = await readPublishingPost(postId);
  const pageRole = post.pageRole ?? "center";
  const [page] = await db
    .select()
    .from(marketingFacebookPages)
    .where(eq(marketingFacebookPages.pageRole, pageRole))
    .limit(1);
  const [settings] = page
    ? []
    : await db.select().from(marketingSettings).limit(1);
  const pageId =
    page?.pageId ?? (pageRole === "center" ? settings?.fbPageId : null);
  const accessToken =
    page?.accessToken ??
    (pageRole === "center" ? settings?.fbAccessToken : null);
  if (!pageId || !accessToken)
    return {
      state: "unmatched",
      reason: "الصفحة غير مربوطة؛ حدد النتيجة يدويًا",
    };
  const since = new Date(claimedAt.getTime() - CLAIM_SKEW_MS);
  let posts;
  try {
    posts = await readRecentPagePosts(pageId, accessToken, since);
  } catch (error) {
    return {
      state: "unmatched",
      reason:
        error instanceof FacebookPublishError
          ? error.message
          : "تعذر قراءة منشورات الصفحة؛ حدد النتيجة يدويًا",
    };
  }
  const body = normalizeText(buildMessage(post));
  const match = posts.find(
    (candidate) =>
      candidate.createdTime.getTime() >= since.getTime() &&
      body.length > 0 &&
      normalizeText(candidate.message).startsWith(body),
  );
  if (!match)
    return {
      state: "unmatched",
      reason:
        "لم نجد المنشور على الصفحة بعد وقت محاولة النشر؛ حدد النتيجة يدويًا",
    };
  await settlePublishingPost(
    postId,
    "published",
    match.id,
    `Reconciled by user ${userId}: found on Facebook as ${match.id}`,
  );
  return { state: "published", fbPostId: match.id };
}

/** Admin's manual decision for a stuck post that could not be matched. */
export async function resolvePublishingPost(
  postId: number,
  outcome: "published" | "not_published",
  userId: number,
) {
  await readPublishingPost(postId);
  await settlePublishingPost(
    postId,
    outcome,
    null,
    outcome === "published"
      ? `Marked published manually by user ${userId}`
      : `Marked not published by user ${userId}; returned to draft and topic released`,
  );
  return { ok: true };
}
