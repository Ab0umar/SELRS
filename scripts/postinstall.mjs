#!/usr/bin/env node
// Patches third-party packages after install.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(import.meta.url), "../..");

// @bcyesil/capacitor-plugin-printer — replace deprecated proguard file
// proguard-android.txt is removed in AGP 8.7+; use proguard-android-optimize.txt
const gradlePath = resolve(
  root,
  "node_modules/@bcyesil/capacitor-plugin-printer/android/build.gradle"
);
try {
  const original = readFileSync(gradlePath, "utf8");
  const patched = original.replace(
    "getDefaultProguardFile('proguard-android.txt')",
    "getDefaultProguardFile('proguard-android-optimize.txt')"
  );
  if (patched !== original) {
    writeFileSync(gradlePath, patched, "utf8");
    console.log("[postinstall] Patched @bcyesil/capacitor-plugin-printer build.gradle");
  }
} catch {
  // Package not installed (e.g. CI without native deps) — skip silently
}
