/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "cc.selrs.app",
  appName: "SELRS",
  webDir: "dist/public",
  server: {
    // Load the live site, same as the desktop WebView2 shell — web-layer
    // changes are then instant on every deploy, no new APK needed.
    url: "https://selrs.cc",
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
