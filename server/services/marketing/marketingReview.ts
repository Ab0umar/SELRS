import { z } from "zod";
import { getDb, getSystemSetting, updateSystemSettings } from "../../db";
import { eq } from "drizzle-orm";
import { marketingLogs, marketingPosts } from "../../../drizzle/schema";
import { pushAppNotification } from "../../_core/appNotifications";
import { checkMarketingContent } from "./contentCheck";
import type { MarketingPageRole } from "./page.service";

const approvalKey = (pageRole: MarketingPageRole) =>
  `marketing_require_approval_${pageRole}`;

/** Owner decision 2026-11-14: scheduled drafts wait for approval unless turned off per page. */
export async function marketingApprovalRequired(pageRole: MarketingPageRole) {
  const row = await getSystemSetting(approvalKey(pageRole));
  if (!row?.value) return true;
  try {
    return z.boolean().parse(JSON.parse(String(row.value)));
  } catch {
    return true;
  }
}

export async function setMarketingApprovalRequired(
  pageRole: MarketingPageRole,
  required: boolean,
) {
  await updateSystemSettings(approvalKey(pageRole), required);
}

/** Runs the content check, logs any reasons, and returns them. */
export async function recordMarketingContentCheck(
  postId: number,
  post: Parameters<typeof checkMarketingContent>[0],
) {
  const reasons = checkMarketingContent(post);
  if (reasons.length) {
    try {
      const db = await getDb();
      await db?.insert(marketingLogs).values({
        postId,
        action: "content_check",
        status: "error",
        message: `Flagged for review: ${reasons.join("، ")}`,
      });
    } catch {
      console.error("[marketing] Could not record content check");
    }
  }
  return reasons;
}

const DRAFTS_PATH = "/marketing/drafts";

/** In-app and push notice to admins: title and reason only, never post bodies. */
export async function notifyMarketingAdmins(input: {
  title: string;
  message: string;
  kind?: "info" | "success" | "warning" | "error";
  postId?: number | null;
}) {
  try {
    await pushAppNotification({
      title: input.title,
      message: input.message,
      kind: input.kind ?? "info",
      targetRoles: ["admin"],
      source: "marketing",
      entityType: input.postId ? "marketing_post" : null,
      entityId: input.postId ?? null,
      meta: {
        path: input.postId
          ? `${DRAFTS_PATH}?post=${input.postId}`
          : DRAFTS_PATH,
      },
    });
  } catch {
    console.error("[marketing] Could not notify admins");
  }
}

export type DraftReadyOutcome = "review" | "approval" | "flagged" | "published";

export async function notifyMarketingDraftReady(
  postId: number,
  topic: string,
  outcome: DraftReadyOutcome,
  reasons: string[] = [],
) {
  const message = {
    review: `مسودة جديدة جاهزة للمراجعة: ${topic}`,
    approval: `مسودة مجدولة تنتظر موافقتك قبل النشر: ${topic}`,
    flagged: `مسودة تحتاج مراجعة قبل النشر (${reasons.join("، ")}): ${topic}`,
    published: `نُشرت المسودة تلقائيًا على Facebook: ${topic}`,
  }[outcome];
  await notifyMarketingAdmins({
    title: outcome === "published" ? "نُشر منشور تلقائي" : "مسودة تسويق جاهزة",
    message: message.slice(0, 300),
    kind:
      outcome === "flagged"
        ? "warning"
        : outcome === "published"
          ? "success"
          : "info",
    postId,
  });
}

async function reviewGeneratedDraft(postId: number) {
  const db = await getDb();
  if (!db) return null;
  const [post] = await db
    .select({
      title: marketingPosts.title,
      content: marketingPosts.content,
      cta: marketingPosts.cta,
      topic: marketingPosts.topic,
    })
    .from(marketingPosts)
    .where(eq(marketingPosts.id, postId))
    .limit(1);
  if (!post) return null;
  return {
    topic: post.topic || post.title,
    reasons: await recordMarketingContentCheck(postId, post),
  };
}

/** A draft an admin asked for: check it and tell admins it is ready. */
export async function announceManualDraft(postId: number) {
  try {
    const draft = await reviewGeneratedDraft(postId);
    if (!draft) return;
    await notifyMarketingDraftReady(
      postId,
      draft.topic,
      draft.reasons.length ? "flagged" : "review",
      draft.reasons,
    );
  } catch {
    console.error("[marketing] Could not announce draft", postId);
  }
}

/**
 * A scheduled draft: publish only when it passed the content check, the page
 * still allows auto-publish, and approval mode is off. Publish errors propagate;
 * the publish service records and notifies them.
 */
export async function finishScheduledDraft(
  postId: number,
  pageRole: MarketingPageRole,
  canAutoPublish: boolean,
  publish: () => Promise<unknown>,
): Promise<boolean> {
  const draft = await reviewGeneratedDraft(postId);
  if (!draft) return false;
  if (draft.reasons.length) {
    await notifyMarketingDraftReady(
      postId,
      draft.topic,
      "flagged",
      draft.reasons,
    );
    return false;
  }
  if (!canAutoPublish) {
    await notifyMarketingDraftReady(postId, draft.topic, "review");
    return false;
  }
  if (await marketingApprovalRequired(pageRole)) {
    await notifyMarketingDraftReady(postId, draft.topic, "approval");
    return false;
  }
  await publish();
  await notifyMarketingDraftReady(postId, draft.topic, "published");
  return true;
}
