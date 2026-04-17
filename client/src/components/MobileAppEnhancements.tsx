import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { Moon, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { type NativeAppInfo } from "@/lib/appRuntime";
import { useLocation } from "wouter";

const APP_NOTIFICATION_FEED_KEY = "app_notifications_feed_v1";
const PUSH_DEVICE_ID_KEY = "selrs_push_device_id_v1";
const PUSH_TOKEN_KEY = "selrs_push_token_v1";
const PUSH_REGISTRATION_STATE_KEY = "selrs_push_registration_state_v1";

type AppNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  kind?: "info" | "success" | "warning" | "error";
  targetRoles?: string[] | null;
  targetUserIds?: number[] | null;
};

function canCurrentUserSeeNotification(userId: number | undefined, userRole: unknown, item: AppNotificationItem | null | undefined) {
  if (!item || typeof item !== "object") return false;

  // If targetUserIds is specified, only show to those specific users
  if (Array.isArray(item.targetUserIds) && item.targetUserIds.length > 0) {
    return userId && item.targetUserIds.includes(userId);
  }

  // Otherwise check by role
  const normalizedRole = String(userRole ?? "").trim().toLowerCase();
  const targetRoles = Array.isArray(item.targetRoles)
    ? item.targetRoles.map((value) => String(value ?? "").trim().toLowerCase()).filter(Boolean)
    : [];
  if (targetRoles.length === 0) return true;
  if (!normalizedRole) return false;
  return targetRoles.includes(normalizedRole);
}

function getOrCreatePushDeviceId() {
  if (typeof window === "undefined") return "unknown-device";
  const existing = window.localStorage.getItem(PUSH_DEVICE_ID_KEY)?.trim();
  if (existing) return existing;
  const next =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `selrs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(PUSH_DEVICE_ID_KEY, next);
  return next;
}

function buildPushRegistrationFingerprint(input: {
  token: string;
  deviceId: string;
  userId: string;
  platform: string;
  appVersion: string;
  build: string;
}) {
  return [
    input.token,
    input.deviceId,
    input.userId,
    input.platform,
    input.appVersion,
    input.build,
  ].join("|");
}

function loadPushRegistrationFingerprint() {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(PUSH_REGISTRATION_STATE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { fingerprint?: unknown };
    return String(parsed?.fingerprint ?? "").trim();
  } catch {
    return "";
  }
}

function savePushRegistrationFingerprint(fingerprint: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    PUSH_REGISTRATION_STATE_KEY,
    JSON.stringify({
      fingerprint,
      savedAt: new Date().toISOString(),
    })
  );
}

function clearPushRegistrationFingerprint() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PUSH_REGISTRATION_STATE_KEY);
}

function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  if (!cycleTheme) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      className="fixed bottom-3 left-3 z-[1000] rounded-full bg-background/90 backdrop-blur"
      aria-label={
        theme === "light"
          ? "Switch to dark mode"
          : theme === "dark"
            ? "Switch to Windows 7 mode"
            : "Switch to light mode"
      }
      title={
        theme === "light"
          ? "Dark mode"
          : theme === "dark"
            ? "Windows 7 mode"
            : "Light mode"
      }
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : theme === "dark" ? (
        <Monitor className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}

function AppNotificationsBridge() {
  const { user, isAuthenticated } = useAuth();
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const storageKey = `selrs_seen_app_notifications_${String(user?.id ?? "guest")}`;
  const isNative = Capacitor.isNativePlatform();
  const notificationsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: APP_NOTIFICATION_FEED_KEY },
    {
      enabled: isAuthenticated && !isNative,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
      staleTime: 5000,
    }
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const ids = Array.isArray(parsed) ? parsed.map((value) => String(value ?? "").trim()).filter(Boolean) : [];
      seenIdsRef.current = new Set(ids);
    } catch {
      seenIdsRef.current = new Set();
    }
    initializedRef.current = false;
  }, [storageKey]);

  useEffect(() => {
    if (isNative) return;
    if (!isAuthenticated) return;
    const itemsRaw = (notificationsQuery.data as any)?.value;
    const items = Array.isArray(itemsRaw)
      ? (itemsRaw as AppNotificationItem[])
          .filter((item) => item && typeof item === "object")
          .filter((item) => canCurrentUserSeeNotification(user?.id, user?.role, item))
      : [];
    if (items.length === 0) return;

    if (!initializedRef.current) {
      for (const item of items) {
        const id = String(item?.id ?? "").trim();
        if (id) seenIdsRef.current.add(id);
      }
      initializedRef.current = true;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seenIdsRef.current).slice(-200)));
      }
      return;
    }

    const unseen = [...items]
      .reverse()
      .filter((item) => {
        const id = String(item?.id ?? "").trim();
        return id && !seenIdsRef.current.has(id);
      });

    if (unseen.length === 0) return;

    for (const item of unseen) {
      const id = String(item.id ?? "").trim();
      if (!id) continue;
      const title = String(item.title ?? "").trim() || "Notification";
      const message = String(item.message ?? "").trim();
      const tone = item.kind ?? "info";
      seenIdsRef.current.add(id);
      if (tone === "success") toast.success(title, { description: message });
      else if (tone === "warning") toast.warning(title, { description: message });
      else if (tone === "error") toast.error(title, { description: message });
      else toast(title, { description: message });
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(seenIdsRef.current).slice(-200)));
    }
  }, [isAuthenticated, isNative, notificationsQuery.data, storageKey, user?.id, user?.role]);

  return null;
}

function NativePushNotificationsBridge({ nativeAppInfo }: { nativeAppInfo: NativeAppInfo | null }) {
  const { isAuthenticated, user } = useAuth();
  const registerPushTokenMutation = trpc.medical.registerPushDeviceToken.useMutation();
  const unregisterPushTokenMutation = trpc.medical.unregisterPushDeviceToken.useMutation();
  const listenersReadyRef = useRef(false);
  const inFlightFingerprintRef = useRef("");
  const inFlightRegistrationRef = useRef<Promise<void> | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!isAuthenticated) return;

    const deviceId = getOrCreatePushDeviceId();
    const platform = Capacitor.getPlatform();
    const userId = String(user?.id ?? "guest").trim() || "guest";
    let active = true;

    const registerDeviceToken = async (tokenValue: string) => {
      const value = String(tokenValue ?? "").trim();
      if (!value) return;

      const fingerprint = buildPushRegistrationFingerprint({
        token: value,
        deviceId,
        userId,
        platform: platform === "ios" ? "ios" : platform === "android" ? "android" : "web",
        appVersion: nativeAppInfo?.version ?? "",
        build: nativeAppInfo?.build ?? "",
      });

      const storedFingerprint = loadPushRegistrationFingerprint();
      if (storedFingerprint === fingerprint) {
        window.localStorage.setItem(PUSH_TOKEN_KEY, value);
        return;
      }

      if (inFlightFingerprintRef.current === fingerprint && inFlightRegistrationRef.current) {
        await inFlightRegistrationRef.current;
        return;
      }

      window.localStorage.setItem(PUSH_TOKEN_KEY, value);
      inFlightFingerprintRef.current = fingerprint;

      const registrationPromise = registerPushTokenMutation
        .mutateAsync({
          token: value,
          platform: platform === "ios" ? "ios" : platform === "android" ? "android" : "web",
          deviceId,
          appVersion: nativeAppInfo?.version ?? "",
          build: nativeAppInfo?.build ?? "",
        })
        .then(() => {
          savePushRegistrationFingerprint(fingerprint);
        })
        .catch((error) => {
          inFlightFingerprintRef.current = "";
          throw error;
        })
        .finally(() => {
          if (inFlightRegistrationRef.current === registrationPromise) {
            inFlightRegistrationRef.current = null;
          }
        });

      inFlightRegistrationRef.current = registrationPromise;
      await registrationPromise;
    };

    const attachListeners = async () => {
      if (listenersReadyRef.current) return;
      listenersReadyRef.current = true;

      await PushNotifications.createChannel({
        id: "selrs-push",
        name: "SELRS Push",
        description: "Background notifications from SELRS",
        importance: 5,
        visibility: 1,
        vibration: true,
      }).catch(() => {});

      await PushNotifications.addListener("registration", async (token) => {
        if (!active) return;
        const value = String(token.value ?? "").trim();
        if (!value) return;
        await registerDeviceToken(value).catch((error) => {
          console.error("[Push] Failed to register device token", error);
        });
      });

      await PushNotifications.addListener("registrationError", (error) => {
        console.error("[Push] Registration error", error);
        toast.error("Push registration failed");
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const title = String(notification.title ?? "").trim() || "Notification";
        const body = String(notification.body ?? "").trim();
        toast(title, { description: body });
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        const path = String(event.notification.data?.path ?? "").trim();
        if (path.startsWith("/")) {
          setLocation(path);
        }
      });
    };

    const register = async () => {
      await attachListeners();

      const currentPermission = await PushNotifications.checkPermissions();
      const permission =
        currentPermission.receive === "prompt"
          ? await PushNotifications.requestPermissions()
          : currentPermission;
      if (permission.receive !== "granted") {
        return;
      }
      await PushNotifications.register();
    };

    void register();

    return () => {
      active = false;
      void PushNotifications.removeAllListeners().catch(() => {});
      listenersReadyRef.current = false;
    };
  }, [isAuthenticated, nativeAppInfo?.build, nativeAppInfo?.version, registerPushTokenMutation, user?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (isAuthenticated) return;
    const token = window.localStorage.getItem(PUSH_TOKEN_KEY)?.trim();
    if (!token) return;
    window.localStorage.removeItem(PUSH_TOKEN_KEY);
    clearPushRegistrationFingerprint();
    void unregisterPushTokenMutation.mutateAsync({ token }).catch(() => {});
  }, [isAuthenticated, unregisterPushTokenMutation]);

  return null;
}

export default function MobileAppEnhancements({ nativeAppInfo }: { nativeAppInfo: NativeAppInfo | null }) {
  return (
    <>
      <AppNotificationsBridge />
      <NativePushNotificationsBridge nativeAppInfo={nativeAppInfo} />
      <ThemeToggle />
    </>
  );
}
