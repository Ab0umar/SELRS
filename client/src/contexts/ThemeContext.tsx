import React, { createContext, useContext, useEffect, useState } from "react";
import { NATIVE_THEME_KEY, hydrateDurableValue, saveDurableValue, writeLocalStorageValue } from "@/lib/nativeStorage";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = "theme";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const loadStoredTheme = (fallback: Theme): Theme => {
  if (!canUseStorage()) return fallback;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? (stored as Theme) : fallback;
  } catch {
    return fallback;
  }
};

const saveStoredTheme = (theme: Theme) => {
  if (!canUseStorage()) return;
  try {
    writeLocalStorageValue(THEME_STORAGE_KEY, theme);
    void saveDurableValue(NATIVE_THEME_KEY, theme, THEME_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => (switchable ? loadStoredTheme(defaultTheme) : defaultTheme));

  useEffect(() => {
    if (!switchable) return;
    setTheme(loadStoredTheme(defaultTheme));
  }, [defaultTheme, switchable]);

  useEffect(() => {
    if (!switchable) return;
    void hydrateDurableValue(NATIVE_THEME_KEY, THEME_STORAGE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light") {
        setTheme(stored as Theme);
      }
    });
  }, [switchable]);

  useEffect(() => {
    const root = document.documentElement;
    // Clean up any stale legacy theme classes from earlier builds.
    root.classList.remove("win7", "legacy-win7");
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      saveStoredTheme(theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
