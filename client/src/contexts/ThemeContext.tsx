import React, { createContext, useContext, useEffect, useState } from "react";
import { NATIVE_THEME_KEY, hydrateDurableValue, saveDurableValue, writeLocalStorageValue } from "@/lib/nativeStorage";

type Theme = "light" | "dark" | "win7";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  cycleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = "theme";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const isWindows7 = () =>
  typeof navigator !== "undefined" && /Windows NT 6\.1/i.test(navigator.userAgent || "");

const loadStoredTheme = (fallback: Theme): Theme => {
  if (!canUseStorage()) return fallback;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" || stored === "win7" ? (stored as Theme) : fallback;
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
      if (stored === "dark" || stored === "light" || stored === "win7") {
        setTheme(stored as Theme);
      }
    });
  }, [switchable]);

  useEffect(() => {
    if (isWindows7() && theme !== "win7") {
      setTheme("win7");
      return;
    }

    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove("dark", "win7", "legacy-win7");

    // Apply current theme
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "win7") {
      root.classList.add("win7");
      root.classList.add("legacy-win7");
    }
    // "light" is the default, no class needed

    if (switchable) {
      saveStoredTheme(theme);
    }
  }, [theme, switchable]);

  const cycleTheme = switchable
    ? () => {
        setTheme(prev => {
          if (prev === "light") return "dark";
          if (prev === "dark") return "win7";
          return "light";
        });
      }
    : undefined;

  // Keep toggleTheme for backwards compatibility (light <-> dark)
  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, cycleTheme, switchable }}>
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
