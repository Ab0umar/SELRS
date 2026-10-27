export type ValidWebPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
};

export const WEB_PUSH_SUBSCRIPTION_MAX_LENGTH = 4096;

// web-push POSTs to subscription.endpoint, so an unchecked value is a
// server-side request to a host the client chose. Only the push services
// that browsers hand out are accepted.
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
  "push.apple.com",
];

function isPushServiceHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return PUSH_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

export function parseWebPushSubscription(
  value: unknown,
): ValidWebPushSubscription | null {
  let raw: unknown = value;
  if (typeof value === "string") {
    if (value.length > WEB_PUSH_SUBSCRIPTION_MAX_LENGTH) return null;
    try {
      raw = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const { endpoint, keys, expirationTime } = raw as Record<string, any>;
  if (typeof endpoint !== "string" || endpoint.length > 2048) return null;
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;
  if (typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!p256dh || !auth || p256dh.length > 256 || auth.length > 64) return null;

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "443") return null;
  if (!isPushServiceHost(url.hostname)) return null;

  return {
    endpoint: url.toString(),
    expirationTime: typeof expirationTime === "number" ? expirationTime : null,
    keys: { p256dh, auth },
  };
}
