import React, { createContext, useContext, useEffect, useState } from "react";
import { NATIVE_THEME_KEY, hydrateDurableValue, saveDurableValue, writeLocalStorageValue } from "@/lib/nativeStorage";

function isNativeApp(): boolean {
  try { return (window as any).Capacitor?.isNative === true; } catch { return false; }
}

export type ThemePref = "light" | "dark";
type EffectiveTheme = "light" | "dark";

interface ThemeContextType {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  effectiveTheme: EffectiveTheme;
  switchable: boolean;
  isAndroid: boolean;
  theme: EffectiveTheme;
  toggleTheme?: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "theme";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadStoredPref(): ThemePref {
  if (!canUseStorage()) return "light";
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {}
  return "light";
}

function savePref(pref: ThemePref) {
  if (!canUseStorage()) return;
  try {
    writeLocalStorageValue(THEME_STORAGE_KEY, pref);
    void saveDurableValue(NATIVE_THEME_KEY, pref, THEME_STORAGE_KEY);
  } catch {}
}

function ensureThemeColorMeta(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (existing) return existing;
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  document.head.appendChild(meta);
  return meta;
}

function applyDocumentTheme(effective: EffectiveTheme) {
  const isDark = effective === "dark";
  const root = document.documentElement;
  root.classList.remove("win7", "legacy-win7");
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = effective;
  document.body?.classList.toggle("dark", isDark);
  ensureThemeColorMeta().content = isDark ? "#0d1117" : "#FBFDFF";
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: EffectiveTheme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable: switchableProp,
}: ThemeProviderProps) {
  const switchable = switchableProp ?? isNativeApp();

  const [pref, setPrefState] = useState<ThemePref>(() =>
    switchable ? loadStoredPref() : defaultTheme
  );

  useEffect(() => {
    if (!switchable) return;
    void hydrateDurableValue(NATIVE_THEME_KEY, THEME_STORAGE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light") {
        setPrefState(stored);
      }
    });
  }, [switchable]);

  useEffect(() => {
    applyDocumentTheme(switchable ? pref : defaultTheme);
  }, [pref, switchable, defaultTheme]);

  const setPref = (next: ThemePref) => {
    if (!switchable) return;
    setPrefState(next);
    savePref(next);
  };

  const effectiveTheme: EffectiveTheme = switchable ? pref : defaultTheme;

  const toggleTheme = switchable
    ? () => setPref(pref === "dark" ? "light" : "dark")
    : undefined;

  return (
    <ThemeContext.Provider
      value={{
        pref,
        setPref,
        effectiveTheme,
        switchable,
        isAndroid: false,
        theme: effectiveTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
