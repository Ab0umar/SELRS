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

type PublishOutcome =
  | { ok: true; fbPostId: string; alreadyPublished?: boolean }
  | { ok: false; error: MarketingPublishError };

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
): Promise<{ fbPostId: string; alreadyPublished?: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const outcome: PublishOutcome = await db.transaction(
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
          ok: true,
          fbPostId: post.fbPostId ?? "unknown",
          alreadyPublished: true,
        };
      }
      if (post.status === "publishing") {
        return {
          ok: false,
          error: new MarketingPublishError(
            "المنشور قيد النشر أو يحتاج مراجعة نتيجة النشر على Facebook",
            true,
          ),
        };
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
            inArray(marketingGenerationJobs.state, ["starting", "running"]),
          ),
        )
        .limit(1);
      if (pendingImage) throw new Error("انتظر اكتمال توليد الصورة قبل النشر");

      const [settings] = await tx.select().from(marketingSettings).limit(1);
      const [page] = await tx
        .select()
        .from(marketingFacebookPages)
        .where(eq(marketingFacebookPages.pageRole, pageRole))
        .limit(1);
      const target =
        page ??
        (pageRole === "center" && settings?.fbPageId && settings.fbAccessToken
          ? {
              pageId: settings.fbPageId,
              accessToken: settings.fbAccessToken,
              connected: settings.fbConnected,
            }
          : null);
      if (!target?.connected || !target.pageId || !target.accessToken) {
        throw new Error(
          pageRole === "doctor"
            ? "اربط صفحة الدكتور قبل النشر"
            : "اربط صفحة المركز قبل النشر",
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

      try {
        const { fbPostId } = await publishPostToFacebook(
          target.pageId,
          target.accessToken,
          buildMessage(post),
          post.imageUrl ?? null,
          ENV.fbAppOrigin || "https://selrs.cc",
        );

        await tx
          .update(marketingPosts)
          .set({ status: "published", publishedAt: new Date(), fbPostId })
          .where(
            and(
              eq(marketingPosts.id, post.id),
              eq(marketingPosts.status, "publishing"),
            ),
          );
        await confirmTopicPublication(tx, topicKey, post.id);
        await tx.insert(marketingLogs).values({
          postId,
          action: "publish_post",
          status: "success",
          message: `Published to Facebook: ${fbPostId}`,
        });
        return { ok: true, fbPostId };
      } catch (error) {
        const publishError = normalizeFacebookError(error);
        if (!publishError.uncertain) {
          await releaseTopicPublication(tx, topicKey, post.id);
          await tx
            .update(marketingPosts)
            .set({ status: "draft" })
            .where(
              and(
                eq(marketingPosts.id, post.id),
                eq(marketingPosts.status, "publishing"),
              ),
            );
        }
        await tx.insert(marketingLogs).values({
          postId,
          action: "publish_post",
          status: "error",
          message: publishError.message.slice(0, 2000),
        });
        return { ok: false, error: publishError };
      }
    },
  );

  if (!outcome.ok) throw outcome.error;
  return {
    fbPostId: outcome.fbPostId,
    ...(outcome.alreadyPublished ? { alreadyPublished: true } : {}),
  };
}
