import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { StatusBar, Style } from "@capacitor/status-bar";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { type NativeAppInfo } from "@/lib/appRuntime";
import { shouldRegisterNativePush } from "@/lib/nativePushConfig";
import { notifyNativeFeedItem } from "@/lib/nativeNotifications";
import { useLocation } from "wouter";
import { getApiUrl } from "@/const";
import { downloadAndInstallApk } from "@/lib/nativeApkUpdater";

const APP_NOTIFICATION_FEED_KEY = "app_notifications_feed_v1";
const APP_NOTIFICATION_SETTINGS_KEY = "app_notification_settings_v1";
const PUSH_DEVICE_ID_KEY = "selrs_push_device_id_v1";
const PUSH_TOKEN_KEY = "selrs_push_token_v1";
const PUSH_REGISTRATION_STATE_KEY = "selrs_push_registration_state_v1";
const NATIVE_THEME_COLORS = {
  dark: "#000000",
  light: "#FBFDFF",
} as const;

type AppNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  kind?: "info" | "success" | "warning" | "error";
  targetRoles?: string[] | null;
  targetUserIds?: number[] | null;
};

function canCurrentUserSeeNotification(
  userId: number | undefined,
  userRole: unknown,
  item: AppNotificationItem | null | undefined,
) {
  if (!item || typeof item !== "object") return false;

  // If targetUserIds is specified, only show to those specific users
  if (Array.isArray(item.targetUserIds) && item.targetUserIds.length > 0) {
    return userId && item.targetUserIds.includes(userId);
  }

  // Otherwise check by role
  const normalizedRole = String(userRole ?? "")
    .trim()
    .toLowerCase();
  const targetRoles = Array.isArray(item.targetRoles)
    ? item.targetRoles
        .map((value) =>
          String(value ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean)
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
    }),
  );
}

function clearPushRegistrationFingerprint() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PUSH_REGISTRATION_STATE_KEY);
}

function isNewerVersion(server: string, current: string): boolean {
  const serverParts = server.split(".").map((n) => parseInt(n, 10) || 0);
  const currentParts = current.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(serverParts.length, currentParts.length);
  for (let i = 0; i < len; i += 1) {
    const s = serverParts[i] ?? 0;
    const c = currentParts[i] ?? 0;
    if (s > c) return true;
    if (s < c) return false;
  }
  return false;
}

/** Mirrors the desktop WebView2 shell's self-updater: check /healthz for a newer
 *  build than the installed APK, then hand the download off to the OS. */
function NativeApkUpdateCheck({
  nativeAppInfo,
}: {
  nativeAppInfo: NativeAppInfo | null;
}) {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (checkedRef.current) return;
    const currentVersion = nativeAppInfo?.version?.trim();
    if (!currentVersion) return;
    checkedRef.current = true;

    (async () => {
      try {
        const response = await fetch(getApiUrl("/healthz"), {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        const serverVersion = String(data?.version ?? "").trim();
        if (!/^\d+\.\d+\.\d+$/.test(serverVersion)) return;
        if (!isNewerVersion(serverVersion, currentVersion)) return;

        toast(`تحديث جديد للتطبيق متاح (${serverVersion})`, {
          description: "اضغط لتنزيل النسخة الجديدة",
          duration: 20000,
          action: {
            label: "تنزيل",
            onClick: () => {
              void downloadAndInstallApk(
                getApiUrl(`/updates/android/SELRS_${serverVersion}.apk`),
              )
                .then((status) => {
                  if (status === "downloading") {
                    toast.success("جاري تنزيل التحديث...", {
                      description: "سيبدأ التثبيت تلقائيًا عند اكتمال التنزيل",
                    });
                  } else if (status === "needs_permission") {
                    toast("يرجى السماح بتثبيت التطبيقات", {
                      description:
                        'فعّل خيار "السماح من هذا المصدر" ثم اضغط تنزيل مرة أخرى',
                      duration: 10000,
                    });
                  }
                })
                .catch((error: unknown) => {
                  console.error("Android APK update failed", error);
                  toast.error("تعذر تنزيل تحديث التطبيق", {
                    description: "تحقق من الاتصال ثم حاول مرة أخرى",
                  });
                });
            },
          },
        });
      } catch {
        // Silent — same as the desktop shell's background update check.
      }
    })();
  }, [nativeAppInfo?.version]);

  return null;
}

function NativeThemeSync() {
  const { theme } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const isDark = theme === "dark";
    void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(
      () => {},
    );
    void StatusBar.setBackgroundColor({
      color: isDark ? NATIVE_THEME_COLORS.dark : NATIVE_THEME_COLORS.light,
    }).catch(() => {});
  }, [theme]);

  return null;
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
      enabled: isAuthenticated,
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
      staleTime: 5000,
    },
  );
  const settingsQuery = trpc.medical.getSystemSetting.useQuery(
    { key: APP_NOTIFICATION_SETTINGS_KEY },
    { enabled: isAuthenticated, staleTime: 60000, refetchOnWindowFocus: false },
  );

  const isInAppEnabled = (() => {
    const raw = (settingsQuery.data as any)?.value;
    if (!raw || typeof raw !== "object") return true;
    const patients = (raw as any).patients;
    if (!patients || typeof patients !== "object") return true;
    return patients.enabled === true && patients.inApp !== false;
  })();

  const isLocalEnabled = (() => {
    const raw = (settingsQuery.data as any)?.value;
    if (!raw || typeof raw !== "object") return false;
    const patients = (raw as any).patients;
    if (!patients || typeof patients !== "object") return false;
    return patients.enabled === true && patients.local === true;
  })();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const ids = Array.isArray(parsed)
        ? parsed.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [];
      seenIdsRef.current = new Set(ids);
    } catch {
      seenIdsRef.current = new Set();
    }
    initializedRef.current = false;
  }, [storageKey]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const itemsRaw = (notificationsQuery.data as any)?.value;
    const items = Array.isArray(itemsRaw)
      ? (itemsRaw as AppNotificationItem[])
          .filter((item) => item && typeof item === "object")
          .filter((item) =>
            canCurrentUserSeeNotification(user?.id, user?.role, item),
          )
      : [];
    if (items.length === 0) return;

    if (!initializedRef.current) {
      for (const item of items) {
        const id = String(item?.id ?? "").trim();
        if (id) seenIdsRef.current.add(id);
      }
      initializedRef.current = true;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(Array.from(seenIdsRef.current).slice(-200)),
        );
      }
      return;
    }

    const unseen = [...items].reverse().filter((item) => {
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
      if (isInAppEnabled) {
        if (tone === "success") toast.success(title, { description: message });
        else if (tone === "warning")
          toast.warning(title, { description: message });
        else if (tone === "error") toast.error(title, { description: message });
        else toast(title, { description: message });
      }
      if (isNative && isLocalEnabled) {
        void notifyNativeFeedItem(item).catch(() => {});
      }
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(Array.from(seenIdsRef.current).slice(-200)),
      );
    }
  }, [
    isAuthenticated,
    isInAppEnabled,
    isNative,
    isLocalEnabled,
    notificationsQuery.data,
    storageKey,
    user?.id,
    user?.role,
  ]);

  return null;
}

function NativePushNotificationsBridge({
  nativeAppInfo,
}: {
  nativeAppInfo: NativeAppInfo | null;
}) {
  const { isAuthenticated, user } = useAuth();
  const registerPushTokenMutation =
    trpc.medical.registerPushDeviceToken.useMutation();
  const unregisterPushTokenMutation =
    trpc.medical.unregisterPushDeviceToken.useMutation();
  const listenersReadyRef = useRef(false);
  const inFlightFingerprintRef = useRef("");
  const inFlightRegistrationRef = useRef<Promise<void> | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!shouldRegisterNativePush()) return;
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
        platform:
          platform === "ios"
            ? "ios"
            : platform === "android"
              ? "android"
              : "web",
        appVersion: nativeAppInfo?.version ?? "",
        build: nativeAppInfo?.build ?? "",
      });

      const storedFingerprint = loadPushRegistrationFingerprint();
      if (storedFingerprint === fingerprint) {
        window.localStorage.setItem(PUSH_TOKEN_KEY, value);
        return;
      }

      if (
        inFlightFingerprintRef.current === fingerprint &&
        inFlightRegistrationRef.current
      ) {
        await inFlightRegistrationRef.current;
        return;
      }

      window.localStorage.setItem(PUSH_TOKEN_KEY, value);
      inFlightFingerprintRef.current = fingerprint;

      const registrationPromise = registerPushTokenMutation
        .mutateAsync({
          token: value,
          platform:
            platform === "ios"
              ? "ios"
              : platform === "android"
                ? "android"
                : "web",
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
        name: "عيون الشروق",
        description: "إشعارات من تطبيق المركز",
        importance: 5,
        visibility: 1,
        vibration: true,
      }).catch(() => {});

      await PushNotifications.addListener("registration", async (token) => {
        if (!active) return;
        const value = String(token.value ?? "").trim();
        if (!value) return;
        console.log(
          "[Push] Device token received:",
          value.substring(0, 20) + "...",
        );
        await registerDeviceToken(value).catch((error) => {
          console.error("[Push] Failed to register device token", error);
        });
      });

      await PushNotifications.addListener("registrationError", (error) => {
        console.error("[Push] Registration error", error);
        toast.error("فشلت تسجيل الإشعارات");
      });

      await PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          const title =
            String(notification.title ?? "").trim() || "Notification";
          const body = String(notification.body ?? "").trim();
          toast(title, { description: body });
        },
      );

      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (event) => {
          const path = String(event.notification.data?.path ?? "").trim();
          if (path.startsWith("/")) {
            setLocation(path);
          }
        },
      );
    };

    const register = async () => {
      try {
        await attachListeners();

        const currentPermission = await PushNotifications.checkPermissions();
        const permission =
          currentPermission.receive === "prompt"
            ? await PushNotifications.requestPermissions()
            : currentPermission;
        if (permission.receive !== "granted") {
          console.warn(
            "[Push] Notification permission denied",
            currentPermission,
          );
          return;
        }
        await PushNotifications.register();
      } catch (error) {
        console.error("[Push] Native registration flow failed", error);
      }
    };

    void register();

    return () => {
      active = false;
      void PushNotifications.removeAllListeners().catch(() => {});
      listenersReadyRef.current = false;
    };
  }, [
    isAuthenticated,
    nativeAppInfo?.build,
    nativeAppInfo?.version,
    registerPushTokenMutation,
    user?.id,
  ]);

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

export default function MobileAppEnhancements({
  nativeAppInfo,
}: {
  nativeAppInfo: NativeAppInfo | null;
}) {
  return (
    <>
      <AppNotificationsBridge />
      <NativePushNotificationsBridge nativeAppInfo={nativeAppInfo} />
      <NativeApkUpdateCheck nativeAppInfo={nativeAppInfo} />
      <NativeThemeSync />
    </>
  );
}
