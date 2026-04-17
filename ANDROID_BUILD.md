# Android Build

Build from the repo root at `C:\Users\drels\OneDrive\OfficeMobile\Web.selrs`.

## Prerequisites

- `pnpm install`
- Android SDK and JDK available to Gradle
- Local signing files for release builds:
  - `android/key.properties`
  - `android/app/selrs-release.jks`

Use `android/key.properties.example` as the template for `android/key.properties`.

## Build Web Assets

```powershell
pnpm build
```

## Build Debug APK

```powershell
cd android
.\gradlew.bat assembleDebug
```

Output:
- `android/app/build/outputs/apk/debug/app-debug.apk`

## Build Release APK

```powershell
cd android
.\gradlew.bat assembleRelease
```

Output:
- `android/app/build/outputs/apk/release/app-release.apk`

## Notes

- `android/app/src/main/res` is required for Android packaging and should stay tracked in git.
- `android/key.properties` and the release keystore are local secrets and should not be committed.
- If Android is regenerated with Capacitor, restore the signing config and verify both debug and release builds.
