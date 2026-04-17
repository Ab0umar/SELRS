# Android App Icons Setup for SELRS

## Current Issue
The app is currently showing the default Gradle/Kotlin icon at startup and in notifications. To use the SELRS logo as the app icon, follow these steps:

## Solution: Replace with SELRS Logo Icons

### Option 1: Using Android Studio (Recommended)
1. Open the project in Android Studio
2. Right-click on `android/app/src/main/res` → **New** → **Image Asset**
3. Configure as follows:
   - **Icon Type**: Launcher Icons (Adaptive and Legacy)
   - **Name**: ic_launcher
   - **Foreground**: Use `client/public/logo.png`
   - **Background color**: `#1e40af` (SELRS blue)
   - Click **Next** → **Finish**

This will automatically generate all required icon sizes for different screen densities.

### Option 2: Using Online Tool
1. Go to https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload `client/public/logo.png` as the foreground
3. Set background color to `#1e40af`
4. Download the generated icons
5. Copy the contents to `android/app/src/main/res/`

### Option 3: Using AppIcon Tool
Use https://appicon.co/ to generate all icon sizes:
- Upload `client/public/logo.png`
- Download Android app icons
- Copy the mipmap folders to `android/app/src/main/res/`

## Files That Will Be Updated
After following any of the above options, these files will have the new SELRS logo icons:
- `mipmap-mdpi/ic_launcher.png`
- `mipmap-hdpi/ic_launcher.png`
- `mipmap-xhdpi/ic_launcher.png`
- `mipmap-xxhdpi/ic_launcher.png`
- `mipmap-xxxhdpi/ic_launcher.png`
- `mipmap-hdpi/ic_launcher_foreground.png`
- `mipmap-xhdpi/ic_launcher_foreground.png`
- `mipmap-xxhdpi/ic_launcher_foreground.png`
- `mipmap-xxxhdpi/ic_launcher_foreground.png`

## Notification Icon
✅ Already configured! A notification icon has been added to:
- `drawable/ic_notification.xml` (simple eye icon)
- `capacitor.config.ts` (configured with smallIcon and color)

## Testing
After replacing icons:
1. Run `gradle clean`
2. Rebuild the APK
3. Test on device/emulator - you should see the SELRS logo instead of the Gradle icon

## Colors Reference
- Primary Blue: `#1e40af`
- Accent Orange: `#ea8c3c`
