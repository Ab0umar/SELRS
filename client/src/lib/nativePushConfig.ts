import { Capacitor } from "@capacitor/core";

/**
 * Android: `PushNotifications.register()` reaches `FirebaseMessaging.getInstance()`, which crashes if Firebase
 * was never merged/initialized (`IllegalStateException: Default FirebaseApp is not initialized`). Probing only the
 * json file during the web bundle build is insufficient (Gradle plugin may skip, wrong packageId, CI ordering).
 *
 * Android push registration is gated on both:
 * - `android/app/google-services.json` detected at **`vite build`** → `__SELRS_BUILD_HAS_ANDROID_GOOGLE_SERVICES__`
 * - `VITE_ENABLE_ANDROID_FCM=1` / `true` on that same web build (e.g. set in release script when config is valid)
 *
 * `VITE_DISABLE_NATIVE_FCM=1` disables push everywhere it is checked here.
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
      : String(rawEnable ?? "")
          .trim()
          .toLowerCase();

  if (!(enable === "1" || enable === "true")) {
    console.warn("[PushConfig] Push registration disabled: set VITE_ENABLE_ANDROID_FCM=1 to enable");
  }

  return enable === "1" || enable === "true";
}
