import * as db from "../db";
import { ENV } from "./env";

export type WebPushPayload = {
  notificationId: string;
  title: string;
  body: string;
  kind?: "info" | "success" | "warning" | "error";
  targetRoles?: string[] | null;
  path?: string | null;
  entityType?: string | null;
  entityId?: number | null;
};

export async function sendWebPushNotifications(
  payload: WebPushPayload,
  targetRoles: string[] | null = null
): Promise<{ sent: number; skipped: number; configured: boolean }> {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not configured, push notifications disabled");
    return { sent: 0, skipped: 0, configured: false };
  }

  const registrations = await db.getPushDeviceRegistrations({
    platform: "web",
  });

  if (registrations.length === 0) {
    return { sent: 0, skipped: 0, configured: true };
  }

  let sent = 0;
  let skipped = 0;

  for (const registration of registrations) {
    try {
      const subscription = JSON.parse(registration.token) as {
        endpoint: string;
        keys: {
          p256dh: string;
          auth: string;
        };
      };

      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          notificationId: payload.notificationId,
          kind: payload.kind ?? "info",
          targetRoles: targetRoles?.join(",") ?? "",
          path: payload.path ?? "",
          entityType: payload.entityType ?? "",
          entityId: payload.entityId == null ? "" : String(payload.entityId),
        },
      };

      const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "aes128gcm",
          Authorization: `Bearer ${generateVAPIDToken()}`,
        },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        sent += 1;
      } else if (response.status === 410 || response.status === 404) {
        await db.disablePushDeviceToken(registration.token);
        skipped += 1;
      } else {
        skipped += 1;
        console.warn(
          `[WebPush] Failed to send (${response.status}) to ${subscription.endpoint.substring(0, 50)}...`
        );
      }
    } catch (error) {
      skipped += 1;
      console.error("[WebPush] Error sending push:", error);
    }
  }

  return { sent, skipped, configured: true };
}

function generateVAPIDToken(): string {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    return "";
  }
  const now = Math.floor(Date.now() / 1000);
  const expirationTime = now + 12 * 60 * 60;

  const header = Buffer.from(JSON.stringify({ alg: "ES256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      aud: "https://fcm.googleapis.com",
      exp: expirationTime,
      sub: "mailto:support@selrs.cc",
    })
  ).toString("base64url");

  return `${header}.${payload}.signature`;
}
