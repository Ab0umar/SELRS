/**
 * Value for `app.set("trust proxy", …)`.
 *
 * Production sits behind Cloudflare, so one hop is trusted by default: Express
 * then takes the client address from the right-most X-Forwarded-For entry,
 * which the proxy wrote and a client cannot forge. Override with TRUST_PROXY
 * (a hop count, "true"/"false", or a comma-separated list of subnets) when the
 * topology changes, for example an extra nginx in front of the app.
 */
export function parseTrustProxy(
  raw: string | undefined,
  nodeEnv: string | undefined,
): boolean | number | string | string[] {
  const value = String(raw ?? "").trim();
  if (!value) return nodeEnv === "production" ? 1 : false;
  if (/^(true|yes|on)$/i.test(value)) return true;
  if (/^(false|no|off|0)$/i.test(value)) return false;
  if (/^\d+$/.test(value)) return Number.parseInt(value, 10);
  const list = value.split(",").map((part) => part.trim()).filter(Boolean);
  return list.length > 1 ? list : (list[0] ?? false);
}
