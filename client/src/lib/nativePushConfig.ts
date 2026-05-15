import { Capacitor } from "@capacitor/core";

/**
 * Android: `PushNotifications.register()` reaches `FirebaseMessaging.getInstance()`, which crashes if Firebase
 * was never merged/initialized (`IllegalStateException: Default FirebaseApp is not initialized`). Probing only the
 * json file during the web bundle build is insufficient (Gradle plugin may skip, wrong packageId, CI ordering).
 *
 * Android push registration is enabled when:
 * - `android/app/google-services.json` was detected at **`vite build`** → `__SELRS_BUILD_HAS_ANDROID_GOOGLE_SERVICES__`
 *
 * `VITE_DISABLE_NATIVE_FCM=1` disables push everywhere it is checked here.
 * `VITE_ENABLE_ANDROID_FCM=0` / `false` can also explicitly disable Android FCM for temporary builds.
 */
export function shouldRegisterNativePush(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const raw = import.meta.env.VITE_DISABLE_NATIVE_FCM as string | boolean | undefined;
  const s =
    typeof raw === "boolean"
      ? raw
        ? "true"
        : ""
      : String(raw ?? "")
          .trim()
          .toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return false;

  if (Capacitor.getPlatform() !== "android") {
    return false;
  }

  if (!__SELRS_BUILD_HAS_ANDROID_GOOGLE_SERVICES__) {
    return false;
  }

  const rawEnable = import.meta.env.VITE_ENABLE_ANDROID_FCM as string | boolean | undefined;
  const enable =
    typeof rawEnable === "boolean"
      ? rawEnable
        ? "true"
        : "false"
      : String(rawEnable ?? "")
          .trim()
          .toLowerCase();

  if (enable === "0" || enable === "false" || enable === "no") {
    console.warn("[PushConfig] Push registration disabled by VITE_ENABLE_ANDROID_FCM=0/false");
    return false;
  }

  return true;
}
