/**
 * Facebook page publishing service.
 *
 * Security: access tokens NEVER logged — use [REDACTED] in any log message.
 */

const GRAPH_API = "https://graph.facebook.com/v21.0";

export class FacebookPublishError extends Error {
  constructor(
    message: string,
    readonly uncertain = false,
  ) {
    super(message);
  }
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
      res = await fetch(`${GRAPH_API}/${pageId}/photos`, {
        method: "POST",
        body: params,
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
      error?: { message: string };
    };
    if (!res.ok || data.error) {
      throw new FacebookPublishError(
        data.error?.message ?? "Facebook photo post failed",
      );
    }
    return { fbPostId: data.post_id ?? data.id ?? "unknown" };
  }

  // Text-only fallback
  const params = new URLSearchParams({ access_token: accessToken, message });
  let res: Response;
  try {
    res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
      method: "POST",
      body: params,
    });
  } catch {
    throw new FacebookPublishError(
      "تعذر التأكد من نتيجة نشر المنشور على Facebook؛ راجع الصفحة قبل إعادة المحاولة",
      true,
    );
  }
  const data = (await res.json()) as {
    id?: string;
    error?: { message: string };
  };
  if (!res.ok || data.error) {
    throw new FacebookPublishError(
      data.error?.message ?? "Facebook feed post failed",
    );
  }
  return { fbPostId: data.id ?? "unknown" };
}
