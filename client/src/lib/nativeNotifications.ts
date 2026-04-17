import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

type NativeFeedNotification = {
  id: string;
  title: string;
  message: string;
  kind?: "info" | "success" | "warning" | "error";
};

const SELRS_NOTIFICATION_CHANNEL_ID = "selrs-general";
const SELRS_NOTIFICATION_GROUP = "selrs-app-feed";

let channelReady = false;
let permissionPromptInFlight: Promise<boolean> | null = null;

const isNativeNotificationPlatform = () => Capacitor.isNativePlatform();

const toNotificationId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  if (hash === 0) return 1;
  return Math.abs(hash);
};

async function ensureNotificationChannel() {
  if (!isNativeNotificationPlatform()) return;
  if (Capacitor.getPlatform() !== "android") return;
  if (channelReady) return;

  await LocalNotifications.createChannel({
    id: SELRS_NOTIFICATION_CHANNEL_ID,
    name: "SELRS Notifications",
    description: "Operational notifications from the SELRS app",
    importance: 4,
    visibility: 1,
    vibration: true,
  });

  channelReady = true;
}

export async function ensureNativeNotificationPermission(prompt = true) {
  if (!isNativeNotificationPlatform()) return false;

  await ensureNotificationChannel();

  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  if (!prompt) return false;

  if (permissionPromptInFlight) {
    return permissionPromptInFlight;
  }

  permissionPromptInFlight = LocalNotifications.requestPermissions()
    .then((result) => result.display === "granted")
    .finally(() => {
      permissionPromptInFlight = null;
    });

  return permissionPromptInFlight;
}

export async function notifyNativeFeedItem(item: NativeFeedNotification) {
  if (!isNativeNotificationPlatform()) return false;

  const allowed = await ensureNativeNotificationPermission(false);
  if (!allowed) return false;

  await ensureNotificationChannel();

  const id = toNotificationId(String(item.id ?? "").trim() || `${Date.now()}`);
  const body = String(item.message ?? "").trim();
  const title = String(item.title ?? "").trim() || "Notification";

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        largeBody: body,
        summaryText: item.kind ? `SELRS ${item.kind}` : "SELRS update",
        channelId: SELRS_NOTIFICATION_CHANNEL_ID,
        group: SELRS_NOTIFICATION_GROUP,
        autoCancel: true,
        schedule: {
          at: new Date(Date.now() + 250),
          allowWhileIdle: true,
        },
        extra: {
          selrsNotificationId: item.id,
          kind: item.kind ?? "info",
        },
      },
    ],
  });

  return true;
}
