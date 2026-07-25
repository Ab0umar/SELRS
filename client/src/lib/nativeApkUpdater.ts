import { Capacitor, registerPlugin } from "@capacitor/core";

interface ApkUpdaterPlugin {
  downloadAndInstall(options: {
    url: string;
  }): Promise<{ status: "downloading" | "needs_permission" }>;
}

const ApkUpdater = registerPlugin<ApkUpdaterPlugin>("ApkUpdater");

export function canUseNativeApkUpdater() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/**
 * Downloads the APK via Android's DownloadManager and launches the system
 * installer on completion. If the app doesn't yet have "install unknown
 * apps" permission, opens the Settings screen for it instead — the caller
 * should tell the user to retry the update after granting it.
 */
export async function downloadAndInstallApk(
  url: string,
): Promise<"downloading" | "needs_permission" | null> {
  if (!canUseNativeApkUpdater()) return null;
  const result = await ApkUpdater.downloadAndInstall({ url });
  return result.status;
}
