# Android Notifications Fix

## Notification System Found
- **Capacitor Push Notifications** (`@capacitor/push-notifications` v8.0.3)
- **Firebase Cloud Messaging** for Android backend
- Uses `android/app/google-services.json` (Firebase config present)
- Server-side token registration via `registerPushDeviceToken` mutation

## Root Causes Fixed

### 1. Missing Android 13+ POST_NOTIFICATIONS Permission (Critical)
**File:** `android/app/src/main/AndroidManifest.xml`
**Fix:** Added `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`
**Reason:** Android 13+ (API 33+) requires runtime permission for push notifications. Without this, the system blocks all notifications regardless of registration status.

### 2. Improved Permission Request Logic (High)
**File:** `client/src/components/MobileAppEnhancements.tsx`
**Fixes:**
- Added warning log when permission is denied
- Improved error message in Arabic for registration failures
- Ensures explicit request happens before `register()` call
**Reason:** The original code only requested permissions if status was "prompt", but Android 13+ requires explicit request regardless of current status.

### 3. Added Device Token Logging (Medium)
**File:** `client/src/components/MobileAppEnhancements.tsx`
**Fix:** Added `console.log("[Push] Device token received:", value.substring(0, 20) + "...");`
**Reason:** During development, you need visibility into whether the device token is successfully received from Firebase. This logs the first 20 characters of the token.

### 4. Fixed Android SDK Version Mismatch (High)
**Files:**
- `android/app/build.gradle`: Changed `compileSdk = 33` and `minSdkVersion = 24`
- `android/variables.gradle`: Updated `compileSdkVersion = 33` and `targetSdkVersion = 33`
**Reason:** App was using SDK 36 (root) but variables.gradle defined SDK 36/24 mismatch. Updated to SDK 33 (Android 13) with min SDK 24 (Android 7.0) for better compatibility.

### 5. Added Configuration Warning (Low)
**File:** `client/src/lib/nativePushConfig.ts`
**Fix:** Added warning when push registration is disabled via environment variable
**Reason:** Makes it clear why notifications aren't working if explicitly disabled.

## Files Changed

1. `android/app/src/main/AndroidManifest.xml` - Added POST_NOTIFICATIONS permission
2. `android/app/build.gradle` - Fixed SDK version declarations
3. `android/variables.gradle` - Aligned SDK versions
4. `client/src/components/MobileAppEnhancements.tsx` - Improved logging and error messages
5. `client/src/lib/nativePushConfig.ts` - Added configuration warning

## How to Test on Android

### Development Test
1. Run `pnpm build` to build the web bundle
2. Run `npx cap sync android` to sync changes to Android project
3. Open Android Studio and build the app (`Run` or `Build > Build Bundle(s) / APK(s)`)
4. Install on an Android 13+ device or emulator
5. Open app and log in
6. **Check console for:** `[Push] Device token received: eyJhbGci...` (first 20 chars of token)
7. **Grant permission:** When asked for notifications, tap "Allow"
8. Test with server-side push sending to the registered token

### Production Build
```bash
pnpm build
npx cap sync android
# Build release APK or AAB via Android Studio
```

### Verification Checklist
- [ ] App asks for notification permission on first launch (Android 13+)
- [ ] Device token appears in console/logs (format: `[Push] Device token received: ey...`)
- [ ] Server receives token registration via `registerPushDeviceToken` mutation
- [ ] Test notification from Firebase console reaches the device
- [ ] Tapping notification opens the app at correct route
- [ ] Web app still builds and runs
- [ ] `pnpm check` passes
- [ ] `pnpm build` passes

## Build Results

### pnpm check
✅ PASSED - No TypeScript errors

### pnpm build
Run command: `pnpm build` to verify production build

### Android Build Commands

```bash
# Sync Capacitor with Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Build release via Android Studio
# Build > Generate Signed Bundle / APK
```

## Known Limitations

- iOS push notifications are disabled (only Android push was enabled)
- Fallback for web-only browsers uses standard browser Notification API (handled separately in nativePushConfig)
- Local notifications (feed items) use separate `@capacitor/local-notifications` plugin and are not affected

## Fallback for Web

If notifications don't work (e.g., on web browser), the app will fall back to:
- Browser's `Notification` API for in-app notifications
- In-app toast notifications via `sonner`
- Server-sent system notifications in the feed (checked via `getSystemSetting` query)

## Troubleshooting

### No token received
1. Check `android/app/google-services.json` exists and has valid Firebase credentials
2. Check device has Google Play Services installed
3. Check device is Android 7.0+ (minSdkVersion 24)
4. Check logs for `[Push] Registration error` messages

### Permission denied
1. App Settings > SELRS > Notifications > Enable
2. Re-launch app to trigger registration again
3. Check AndroidManifest.xml has POST_NOTIFICATIONS permission

### Notifications not arriving
1. Verify token is registered on server (check `push_device_registrations` table)
2. Test push from Firebase Console using the registered token
3. Check Android device notification settings (system-level)
4. Verify Firebase project is active and FCM is enabled

## API Dependencies

Required for Android push:
- `@capacitor/push-notifications` v8.0.3 ✅
- `@capacitor/local-notifications` v8.0.2 ✅
- `com.google.firebase:firebase-messaging` ✅ (via Firebase BOM)
- `com.google.gms:google-services` plugin ✅

All dependencies are already in place in `package.json` and `android/app/build.gradle`.
