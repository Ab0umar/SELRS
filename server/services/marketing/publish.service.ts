import { and, eq, inArray } from "drizzle-orm";
import {
  reserveTopicPublication,
  confirmTopicPublication,
  releaseTopicPublication,
} from "./topicHistory";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { getDb } from "../../db";
import { ENV } from "../../_core/env";
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
} from "./facebookPublisher.service";

export class MarketingPublishError extends Error {
  constructor(
    message: string,
    readonly uncertain = false,
  ) {
    super(message);
  }
}

type PublicationClaim =
  | { kind: "published"; fbPostId: string }
  | {
      kind: "ready";
      topicKey: string;
      pageId: string;
      accessToken: string;
      message: string;
      imageUrl: string | null;
    };

function buildMessage(post: typeof marketingPosts.$inferSelect): string {
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
    return new MarketingPublishError(error.message, error.uncertain);
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
  try {
    ({ fbPostId } = await publishPostToFacebook(
      claim.pageId,
      claim.accessToken,
      claim.message,
      claim.imageUrl,
      ENV.fbAppOrigin || "https://selrs.cc",
    ));
  } catch (error) {
    const failure = normalizeFacebookError(error);
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
          .set({ status: "published", publishedAt: new Date(), fbPostId })
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
    throw new MarketingPublishError(
      "نجح طلب النشر ولم يتأكد حفظه محليًا؛ راجع المحاولة الأصلية قبل أي إرسال جديد",
      true,
    );
  }
  return { fbPostId };
}
