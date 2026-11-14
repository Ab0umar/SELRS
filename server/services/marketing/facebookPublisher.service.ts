/**
 * Facebook page publishing service.
 *
 * Security: access tokens NEVER logged — use [REDACTED] in any log message.
 */

const DEFAULT_GRAPH_VERSION = "v21.0";

/** MARKETING_GRAPH_VERSION overrides the Graph API version, e.g. v22.0. */
export function marketingGraphVersion(
  value = process.env.MARKETING_GRAPH_VERSION,
) {
  const version = value?.trim();
  return version && /^v\d+\.\d+$/.test(version)
    ? version
    : DEFAULT_GRAPH_VERSION;
}
const graphApi = () => `https://graph.facebook.com/${marketingGraphVersion()}`;

export class FacebookPublishError extends Error {
  constructor(
    message: string,
    readonly uncertain = false,
    readonly tokenRejected = false,
  ) {
    super(message);
  }
}

// Graph error 190 means the page access token is invalid or expired.
function graphFailure(
  status: number,
  error: { message?: string; code?: number } | undefined,
  fallback: string,
) {
  if (error?.code === 190)
    return new FacebookPublishError(
      "رفض Facebook رمز الصفحة (انتهت صلاحيته أو أُلغي)؛ أعد ربط الصفحة",
      false,
      true,
    );
  return new FacebookPublishError(
    error?.message ?? fallback,
    status >= 500 || status === 408,
  );
}

/**
 * Publish a post (with optional image) to a Facebook Page.
 * Returns the Facebook post ID.
 */
export async function publishPostToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrl: string | null,
  appOrigin: string,
): Promise<{ fbPostId: string }> {
  if (imageUrl) {
    const fullImageUrl = imageUrl.startsWith("http")
      ? imageUrl
      : `${appOrigin}${imageUrl}`;
    const params = new URLSearchParams({
      access_token: accessToken,
      url: fullImageUrl,
      caption: message,
      published: "true",
    });
    let res: Response;
    try {
      res = await fetch(`${graphApi()}/${pageId}/photos`, {
        method: "POST",
        body: params,
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new FacebookPublishError(
        "تعذر التأكد من نتيجة نشر الصورة على Facebook؛ راجع الصفحة قبل إعادة المحاولة",
        true,
      );
    }
    const data = (await res.json()) as {
      id?: string;
      post_id?: string;
      error?: { message?: string; code?: number };
    };
    if (!res.ok || data.error)
      throw graphFailure(res.status, data.error, "Facebook photo post failed");
    const id = data.post_id ?? data.id;
    if (typeof id !== "string" || !id.trim())
      throw new FacebookPublishError(
        "تعذر تأكيد معرف المنشور؛ راجع نتيجة النشر على Facebook",
        true,
      );
    return { fbPostId: id };
  }

  // Text-only fallback
  const params = new URLSearchParams({ access_token: accessToken, message });
  let res: Response;
  try {
    res = await fetch(`${graphApi()}/${pageId}/feed`, {
      method: "POST",
      body: params,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new FacebookPublishError(
      "تعذر التأكد من نتيجة نشر المنشور على Facebook؛ راجع الصفحة قبل إعادة المحاولة",
      true,
    );
  }
  const data = (await res.json()) as {
    id?: string;
    error?: { message?: string; code?: number };
  };
  if (!res.ok || data.error)
    throw graphFailure(res.status, data.error, "Facebook feed post failed");
  if (typeof data.id !== "string" || !data.id.trim())
    throw new FacebookPublishError(
      "تعذر تأكيد معرف المنشور؛ راجع نتيجة النشر على Facebook",
      true,
    );
  return { fbPostId: data.id };
}

export type FacebookPagePost = {
  id: string;
  message: string;
  createdTime: Date;
};

/** Reads the page's posts created since `since`; throws when the token cannot read them. */
export async function readRecentPagePosts(
  pageId: string,
  accessToken: string,
  since: Date,
): Promise<FacebookPagePost[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,message,created_time",
    since: String(Math.floor(since.getTime() / 1000)),
    limit: "50",
  });
  let res: Response;
  try {
    res = await fetch(`${graphApi()}/${pageId}/posts?${params}`, {
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new FacebookPublishError("تعذر الاتصال بـ Facebook لقراءة المنشورات");
  }
  const data = (await res.json().catch(() => ({}))) as {
    data?: Array<{ id?: string; message?: string; created_time?: string }>;
    error?: { message: string };
  };
  if (!res.ok || data.error || !Array.isArray(data.data))
    throw new FacebookPublishError(
      "لا يسمح رمز الصفحة بقراءة منشوراتها؛ حدد النتيجة يدويًا",
    );
  return data.data.flatMap((post) =>
    post.id && post.created_time
      ? [
          {
            id: post.id,
            message: post.message ?? "",
            createdTime: new Date(post.created_time),
          },
        ]
      : [],
  );
}
