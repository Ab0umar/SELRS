import type { ReactNode } from "react";
import { Link } from "wouter";
import { Moon, Sun } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

/**
 * Shared look of the patient, doctor and staff login pages.
 *
 * The global dark theme rewrites every `bg-white`/`bg-card`/`bg-muted` class and
 * every input to a solid surface with !important. These pages use their own dark
 * palette (solid navy, translucent panels, orange accent), so the two palettes
 * are chosen in JS and the dark one avoids those class names; field colors are
 * applied inline with !important.
 */
export const LOGIN_PALETTE = {
  light: {
    page: "bg-[#e9f1fc] text-foreground",
    title: "text-primary",
    muted: "text-muted-foreground",
    accent: "text-primary",
    heading: "",
    label: "",
    panel:
      "border border-white/80 bg-[rgba(255,255,255,0.35)] backdrop-blur-xl shadow-[0_10px_40px_rgba(0,61,130,0.12)]",
    seg: "border border-white/70 bg-[rgba(255,255,255,0.40)]",
    tabOn: "border border-white/80 bg-[rgba(255,255,255,0.9)] text-primary shadow-sm",
    tabOff: "text-muted-foreground hover:text-foreground",
    list: "border border-white/70 bg-[rgba(255,255,255,0.45)]",
    tile: "border border-white/70 bg-[rgba(255,255,255,0.35)] text-foreground backdrop-blur-md",
    tileIcon: "bg-primary/10 text-primary",
    chip: "border border-white/70 bg-[rgba(255,255,255,0.35)] text-primary backdrop-blur-md",
    cta: "bg-primary text-primary-foreground hover:bg-primary/90",
    toggle: "text-primary hover:bg-primary/10",
    footStrong: "text-foreground",
    field: "border-white/80 bg-[rgba(255,255,255,0.60)] backdrop-blur-sm",
  },
  dark: {
    page: "bg-[#0a1a2f] text-white",
    title: "text-white",
    muted: "text-[#9fb3d6]",
    accent: "text-[#f7941d]",
    heading: "text-white",
    label: "text-[#cfdcf5]",
    panel:
      "border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.07)] backdrop-blur-md",
    seg: "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.08)]",
    tabOn: "bg-[#f7941d] text-[#0a1a2f]",
    tabOff: "text-[#9fb3d6] hover:text-white",
    list: "border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)]",
    tile: "border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] text-white",
    tileIcon: "bg-[rgba(255,255,255,0.10)] text-[#f7941d]",
    chip: "border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] text-[#cfdcf5]",
    cta: "bg-[#f7941d] text-[#0a1a2f] hover:bg-[#f7941d]/90",
    toggle: "text-[#cfdcf5] hover:bg-[rgba(255,255,255,0.10)]",
    footStrong: "text-white",
    field: "placeholder:text-[#8aa0c8]",
  },
} as const;

export function useLoginPalette() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const p = LOGIN_PALETTE[isDark ? "dark" : "light"];

  const fieldRef = (el: HTMLElement | null) => {
    if (!el) return;
    const style = el.style;
    if (isDark) {
      style.setProperty("background-color", "rgba(255,255,255,0.08)", "important");
      style.setProperty("border-color", "rgba(255,255,255,0.16)", "important");
      style.setProperty("color", "#ffffff", "important");
    } else {
      style.removeProperty("background-color");
      style.removeProperty("border-color");
      style.removeProperty("color");
    }
  };
  const fieldClass = cn("h-12 rounded-xl font-medium focus-visible:ring-primary/10", p.field);

  return { isDark, p, toggleTheme, fieldRef, fieldClass };
}

export function LoginShell({
  title,
  subtitle,
  headerLink,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  headerLink?: { href: string; label: string };
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { isDark, p, toggleTheme } = useLoginPalette();

  return (
    <div
      className={cn(
        "relative min-h-dvh w-full overflow-x-hidden overflow-y-auto font-sans selection:bg-primary/10 selection:text-primary",
        p.page,
      )}
      dir="rtl"
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[#0b5cc2] blur-[90px]",
          isDark ? "opacity-55" : "opacity-60",
        )}
      />
      {!isDark && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-[#f7941d] opacity-50 blur-[80px]"
        />
      )}
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-4 py-5 sm:py-8">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo className="size-11 shrink-0 select-none object-contain" />
            <div className="min-w-0 leading-tight">
              <h1 className={cn("m-0 text-base font-extrabold", p.title)}>
                {title}
              </h1>
              <p className={cn("m-0 text-[13px]", p.muted)}>{subtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {toggleTheme && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full",
                  p.toggle,
                )}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            )}
            {headerLink && (
              <Link
                href={headerLink.href}
                className={cn("text-[13px] font-bold hover:underline", p.accent)}
              >
                {headerLink.label}
              </Link>
            )}
          </div>
        </header>

        <main className="my-auto py-6">{children}</main>

        <footer
          className={cn(
            "flex flex-col items-center gap-1 text-center text-xs",
            p.muted,
          )}
        >
          {footer}
          <p className="m-0">© {new Date().getFullYear()} مركز عيون الشروق</p>
        </footer>
      </div>
    </div>
  );
}
