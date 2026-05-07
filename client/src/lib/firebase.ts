import { Capacitor } from "@capacitor/core";

// Firebase utilities for Analytics and Crashlytics
export async function initFirebase() {
  if (!Capacitor.isNativePlatform()) {
    console.debug("Firebase: Not on native platform, skipping init");
    return;
  }

  try {
    // Firebase is available via cordova-plugin-firebase
    // Access via (window as any).FirebasePlugin
    const FirebasePlugin = (window as any).FirebasePlugin;
    if (!FirebasePlugin) {
      console.debug("Firebase plugin not available");
      return;
    }

    // Enable analytics
    FirebasePlugin.setAnalyticsCollectionEnabled(true);
    console.debug("Firebase Analytics enabled");
  } catch (e) {
    console.debug("Firebase init failed:", e);
  }
}

export async function logEvent(name: string, params?: Record<string, any>) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const FirebasePlugin = (window as any).FirebasePlugin;
    if (FirebasePlugin?.logEvent) {
      FirebasePlugin.logEvent(name, params || {});
    }
  } catch (e) {
    console.debug("Firebase logEvent failed:", e);
  }
}

export async function setUserProperty(name: string, value: string) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const FirebasePlugin = (window as any).FirebasePlugin;
    if (FirebasePlugin?.setUserProperty) {
      FirebasePlugin.setUserProperty(name, value);
    }
  } catch (e) {
    console.debug("Firebase setUserProperty failed:", e);
  }
}

export async function recordException(error: Error) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const FirebasePlugin = (window as any).FirebasePlugin;
    if (FirebasePlugin?.recordException) {
      FirebasePlugin.recordException(error.message);
    }
  } catch (e) {
    console.debug("Firebase recordException failed:", e);
  }
}
