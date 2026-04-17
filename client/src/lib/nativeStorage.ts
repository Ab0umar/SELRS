import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export const NATIVE_THEME_KEY = "selrs_theme_v1";
export const NATIVE_LAST_USERNAME_KEY = "selrs_last_username_v1";
export const NATIVE_USER_SNAPSHOT_KEY = "selrs_user_snapshot_v1";

const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const readLocalStorageValue = (key: string) => {
  if (!canUseLocalStorage()) return "";
  try {
    return String(window.localStorage.getItem(key) ?? "").trim();
  } catch {
    return "";
  }
};

export const writeLocalStorageValue = (key: string, value: string) => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
};

export const removeLocalStorageValue = (key: string) => {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

export const readNativeValue = async (key: string) => {
  try {
    const result = await Preferences.get({ key });
    return String(result.value ?? "").trim();
  } catch {
    return "";
  }
};

export const writeNativeValue = async (key: string, value: string) => {
  try {
    await Preferences.set({ key, value });
  } catch {
    // Ignore native storage failures.
  }
};

export const removeNativeValue = async (key: string) => {
  try {
    await Preferences.remove({ key });
  } catch {
    // Ignore native storage failures.
  }
};

export const saveDurableValue = async (key: string, value: string, localKey = key) => {
  writeLocalStorageValue(localKey, value);
  if (!Capacitor.isNativePlatform()) return;
  await writeNativeValue(key, value);
};

export const removeDurableValue = async (key: string, localKey = key) => {
  removeLocalStorageValue(localKey);
  if (!Capacitor.isNativePlatform()) return;
  await removeNativeValue(key);
};

export const hydrateDurableValue = async (key: string, localKey = key) => {
  const localValue = readLocalStorageValue(localKey);
  if (localValue) return localValue;
  if (!Capacitor.isNativePlatform()) return "";
  const nativeValue = await readNativeValue(key);
  if (nativeValue) {
    writeLocalStorageValue(localKey, nativeValue);
  }
  return nativeValue;
};
