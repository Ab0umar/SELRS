export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function registerWebPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[Push] Service Workers or Push API not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("[Push] Service Worker registered");

    const permission = Notification.permission;
    if (permission === "denied") {
      console.warn("[Push] Notification permission denied");
      return false;
    }

    if (permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        console.warn("[Push] Notification permission not granted");
        return false;
      }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    });

    const subscriptionJson = subscription.toJSON() as unknown as WebPushSubscription;
    console.log("[Push] Web push subscription successful:", subscriptionJson.endpoint.substring(0, 30) + "...");
    return true;
  } catch (error) {
    console.error("[Push] Web push registration failed", error);
    return false;
  }
}

export async function unregisterWebPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log("[Push] Web push unsubscribed");
      return true;
    }
  } catch (error) {
    console.error("[Push] Web push unsubscribe failed", error);
  }
  return false;
}

export async function getWebPushSubscription(): Promise<WebPushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return subscription.toJSON() as unknown as WebPushSubscription;
    }
  } catch (error) {
    console.error("[Push] Failed to get web push subscription", error);
  }
  return null;
}
