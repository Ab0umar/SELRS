# SELRS AI for Android

An additional app (`cc.selrs.ai`, display name **SELRS AI**) that installs alongside
SELRS (`cc.selrs.app`). The existing Android project and website are unchanged by
building this app.

The APK bundles the current SELRS frontend. Its dedicated user-agent marker selects
AI navigation, the AI login title, and a logout action. It opens `/ai`, keeps all AI
sections, and redirects other application routes to `/ai`. Login and mandatory
password changes remain available. This presentation mode does not grant access;
existing server authentication and permissions still apply.

Data and AI requests use the existing `https://selrs.cc` API through the existing
native HTTP/session implementation. Login uses the same account, with session
storage isolated by Android package. Scheduling continues on the SELRS server.
The SELRS APK updater and general notification feed are excluded from this app.
Frontend changes require rebuilding this bundled APK; no web deployment is needed.

## Build

From the repository root after installing its locked dependencies:

```powershell
& ./scripts/build-ai-android.ps1
```

The script builds web assets into `outputs/ai-mobile/web`, syncs only the
`mobile-ai/android` project, then builds a signed release at
`mobile-ai/releases/SELRS-AI-1.0-release.apk`. It never runs the main SELRS Android
release script, bumps its version, or publishes into its update directory.

Release signing reuses the existing untracked `android/app/key.properties` and
keystore. No signing values are copied into this project. Java 21 and the Android
SDK are required; the Gradle toolchain matches the repository's patched Capacitor
dependencies. `-DebugBuild` builds a debug-signed development APK instead.

## Verification

```powershell
pnpm check
node node_modules/vitest/vitest.mjs run client/src/lib/ai-mobile.test.ts
node node_modules/vite/bin/vite.js preview --outDir ../outputs/ai-mobile/web --port 4179
# In another terminal, with an installed Playwright Chromium browser:
node scripts/verify-ai-mobile.mjs
```

The browser verifier uses intercepted API fixtures and makes no real posts,
paid AI calls, or medical writes. Native installation/startup and actual signed-in
workflows are separate checks; browser emulation alone does not establish them.

Verified on 2026-10-28: signed release build and APK signature verification;
installation and login-screen startup on an Android 14/API 34 emulator; the native
app identity instrumentation test; TypeScript; all 98 client test files / 672 tests;
and fixture browser checks for all eight AI sections, logout, denied access, and
unchanged web navigation. Evidence is under `outputs/ai-mobile/verification`.
Actual account login, provider requests, and microphone capture on a physical
phone have not been tested.
