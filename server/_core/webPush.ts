import webpush from "web-push";
import * as db from "../db";
import { ENV } from "./env";

export type WebPushPayload = {
  notificationId: string;
  title: string;
  body: string;
  kind?: "info" | "success" | "warning" | "error";
  path?: string | null;
  entityType?: string | null;
  entityId?: number | null;
};

function configureWebPush() {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) return false;
  webpush.setVapidDetails("mailto:support@selrs.cc", ENV.vapidPublicKey, ENV.vapidPrivateKey);
  return true;
}

export async function sendWebPushToSubscription(
  subscriptionJson: string,
  payload: WebPushPayload,
): Promise<"sent" | "expired" | "failed"> {
  if (!configureWebPush()) return "failed";
  try {
    const subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription;
    const message = JSON.stringify({
      notification: { title: payload.title, body: payload.body },
      data: {
        notificationId: payload.notificationId,
        kind: payload.kind ?? "info",
        path: payload.path ?? "",
        entityType: payload.entityType ?? "",
        entityId: payload.entityId == null ? "" : String(payload.entityId),
      },
    });
    await webpush.sendNotification(subscription, message);
    return "sent";
  } catch (err: any) {
    const status = err?.statusCode ?? 0;
    if (status === 410 || status === 404) return "expired";
    console.warn("[WebPush] send failed:", err?.message ?? err);
    return "failed";
  }
}

// Send to all staff web-push subscriptions stored in push_device_registrations
export async function sendWebPushNotifications(
  payload: WebPushPayload,
  targetRoles: string[] | null = null,
): Promise<{ sent: number; skipped: number; configured: boolean }> {
  if (!configureWebPush()) {
    console.warn("[WebPush] VAPID keys not configured");
    return { sent: 0, skipped: 0, configured: false };
  }

  const registrations = await db.getPushDeviceRegistrations({ platform: "web" });
  if (registrations.length === 0) return { sent: 0, skipped: 0, configured: true };

  let sent = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const result = await sendWebPushToSubscription(reg.token, payload);
    if (result === "sent") {
      sent += 1;
    } else {
      if (result === "expired") await db.disablePushDeviceToken(reg.token).catch(() => {});
      skipped += 1;
    }
  }

  return { sent, skipped, configured: true };
}
