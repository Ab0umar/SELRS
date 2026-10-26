# Android Build and Push Notifications

## Android build

From the repo root:

1. `pnpm install`, then `pnpm build` (web assets).
2. Android SDK and JDK must be available to Gradle.
3. Release signing needs two local files that are never committed:
   `android/key.properties` (copy `android/key.properties.example`) and the release
   keystore `android/app/selrs-release.jks`.

```powershell
cd android
.\gradlew.bat assembleDebug     # android/app/build/outputs/apk/debug/app-debug.apk
.\gradlew.bat assembleRelease   # android/app/build/outputs/apk/release/app-release.apk
```

Notes:

- `android/app/src/main/res` is required for packaging and stays tracked.
- If Android is regenerated with Capacitor, restore the signing config and verify both
  debug and release builds. Run `npx cap sync android` after a web build.

## Push architecture

| Platform | Mechanism | Client code |
| --- | --- | --- |
| Android app | Firebase Cloud Messaging through `@capacitor/push-notifications` | `client/src/components/MobileAppEnhancements.tsx`, `client/src/lib/nativePushConfig.ts` |
| Web | Browser Push API with a service worker | `client/src/lib/pushNotifications.ts`, `client/public/sw.js`, `WebPushNotificationBridge` in `client/src/components/WebAppEnhancements.tsx` |

Both register their token through the `registerPushDeviceToken` mutation into
`push_device_registrations` (`platform` is `android`, `ios` or `web`; for web the token
is the full subscription JSON and `deviceId` is `web-{hostname}`). The server sends with
`server/_core/fcmPush.ts` (FCM) and `server/_core/webPush.ts` (`sendWebPushNotifications`,
which disables registrations answering 404/410). iOS push is not enabled.

### Android 13+

The `POST_NOTIFICATIONS` permission must be declared in `AndroidManifest.xml`, and the app
must request it explicitly before `register()`. Gradle SDK values were aligned in
`android/variables.gradle` and `android/app/build.gradle` (compile/target 33, min 24).
`android/app/google-services.json` carries the Firebase config.

### Web push configuration

```bash
npx web-push generate-vapid-keys
```

- `VITE_VAPID_PUBLIC_KEY` — public key, exposed to the client.
- `VAPID_PRIVATE_KEY` — private key, server only (`server/_core/env.ts`).

Flow: login registers `/sw.js`, asks browser permission, subscribes, and posts the
subscription to the server; logout unregisters the worker and disables the registration.
HTTPS is required in production (localhost works in development). Safari support is
limited.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No token on Android | `google-services.json` valid, Google Play Services present, device Android 7+, logs for `[Push] Registration error` |
| Permission denied | App settings, Notifications, enable; relaunch to re-register; manifest has `POST_NOTIFICATIONS` |
| Token registered but nothing arrives | Row exists in `push_device_registrations`; send a test from the Firebase console; device-level notification settings; FCM enabled for the project |
| Web push silent | HTTPS, VAPID keys set on both sides, `[Push] Web push subscription successful` in the console |

If push is unavailable the app falls back to the browser `Notification` API, `sonner`
toasts, and the in-app notification feed. Local notifications use
`@capacitor/local-notifications` and are independent of FCM.
