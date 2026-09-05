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
    SplashScreen: {
      // Keep the native splash up until the web boot-splash (client/index.html
      // #boot-splash, blinking-eye logo) takes over and main.tsx calls hide()
      // once the app shell is actually ready — see selrs-shell-ready in App.tsx.
      launchAutoHide: false,
      backgroundColor: "#FFFFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
