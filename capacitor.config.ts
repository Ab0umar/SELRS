/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cc.selrs.app",
  appName: "SELRS",
  webDir: "dist/public",
  server: {
    // Load the live site, same as the desktop WebView2 shell — web-layer
    // changes are then instant on every deploy, no new APK needed.
    // MainActivity.java overrides this at runtime with the user's saved
    // server choice (online vs internal LAN), same presets as the desktop
    // WebView2 shell (SelrsDesktop/Form1.cs UrlPresets) — this is just the
    // fallback for the very first launch before any preference exists.
    url: "https://selrs.cc",
    allowNavigation: ["selrs.cc", "*.selrs.cc", "192.168.1.100"],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
      smallIcon: "ic_notification",
      iconColor: "#1e40af",
    },
    StatusBar: {
      overlaysWebView: true,
      style: "LIGHT",
    },
  },
};

export default config;
