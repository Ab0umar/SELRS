import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { Link } from "wouter";
import { Menu, Moon, Sun, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { ROUTES } from "../../../../shared/routes";
import { CONTACT, DOCTORS, type Localized, type SiteLang } from "./siteContent";

const LANG_STORAGE_KEY = "selrs:site-lang";

function readStoredLang(): SiteLang {
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

type SiteLangContextValue = {
  lang: SiteLang;
  setLang: (lang: SiteLang) => void;
  t: (value: Localized) => string;
};

const SiteLangContext = createContext<SiteLangContextValue | null>(null);

export function useSiteLang() {
  const context = useContext(SiteLangContext);
  if (!context) throw new Error("useSiteLang must be used inside PublicSiteShell");
  return context;
}

const UI = {
  brand: { ar: "مركز عيون الشروق", en: "Al Shrouq Eye Center" },
  brandSub: { ar: "لليزك والمياه البيضاء", en: "LASIK and cataract surgery" },
  skip: { ar: "تخطَّ إلى المحتوى", en: "Skip to content" },
  about: { ar: "عن المركز", en: "About" },
  services: { ar: "الخدمات", en: "Services" },
  doctors: { ar: "الأطباء", en: "Doctors" },
  branches: { ar: "الفروع", en: "Branches" },
  contact: { ar: "تواصل معنا", en: "Contact" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  book: { ar: "احجز موعداً", en: "Book a visit" },
  menu: { ar: "القائمة", en: "Menu" },
  closeMenu: { ar: "إغلاق القائمة", en: "Close menu" },
  mainNav: { ar: "التنقل الرئيسي", en: "Main navigation" },
  toDark: { ar: "تفعيل الوضع الداكن", en: "Switch to dark mode" },
  toLight: { ar: "تفعيل الوضع الفاتح", en: "Switch to light mode" },
  switchLang: { ar: "Switch to English", en: "التبديل إلى العربية" },
  privacy: { ar: "سياسة الخصوصية", en: "Privacy policy" },
  facebook: { ar: "فيسبوك", en: "Facebook" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  phone: { ar: "هاتف", en: "Phone" },
  rights: {
    ar: "مركز عيون الشروق لليزك وجراحات تصحيح الإبصار",
    en: "Shorouk Eyes for LASIK and Refractive Surgery",
  },
} satisfies Record<string, Localized>;

export const SITE_UI = UI;

const SIGN_INS = [
  { href: ROUTES.myLogin, label: { ar: "دخول المرضى", en: "Patient sign-in" } },
  { href: ROUTES.doctorPortalLogin, label: { ar: "دخول الأطباء", en: "Doctor sign-in" } },
  { href: ROUTES.login, label: { ar: "دخول الموظفين", en: "Staff sign-in" } },
] satisfies Array<{ href: string; label: Localized }>;

type NavItem = { id: string; label: Localized };

function getNavItems(): NavItem[] {
  return [
    { id: "about", label: UI.about },
    { id: "services", label: UI.services },
    ...(DOCTORS.length ? [{ id: "doctors", label: UI.doctors }] : []),
    { id: "branches", label: UI.branches },
    { id: "contact", label: UI.contact },
  ];
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export const siteButton = {
  base: cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors",
    focusRing,
  ),
  accent: "bg-secondary text-secondary-foreground hover:bg-secondary/85",
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline:
    "border border-border bg-background text-foreground hover:border-primary hover:text-primary",
  ghost: "text-foreground hover:bg-muted",
};

type PublicSiteShellProps = {
  /** On the landing page nav links are in-page anchors; elsewhere they go back to "/". */
  onLanding: boolean;
  title: Localized;
  children: ReactNode;
};

export function PublicSiteShell({ onLanding, title, children }: PublicSiteShellProps) {
  const [lang, setLangState] = useState<SiteLang>(() => readStoredLang());
  const [menuOpen, setMenuOpen] = useState(false);
  const { effectiveTheme, toggleTheme } = useTheme();
  const menuId = useId();

  const setLang = useCallback((next: SiteLang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the choice still applies for this visit.
    }
  }, []);

  const t = useCallback((value: Localized) => value[lang], [lang]);

  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    document.title = `${title[lang]} | ${UI.brand[lang]}`;
    document.documentElement.lang = lang;
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, [lang, title]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navItems = getNavItems();
  const hrefFor = (id: string) => (onLanding ? `#${id}` : `/#${id}`);
  const isDark = effectiveTheme === "dark";

  return (
    <SiteLangContext.Provider value={{ lang, setLang, t }}>
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        lang={lang}
        className="public-site min-h-dvh bg-background text-foreground"
      >
        <a
          href="#main"
          className={cn(
            "sr-only z-[60] rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-3",
            focusRing,
          )}
        >
          {t(UI.skip)}
        </a>

        <nav aria-label={t(UI.signIn)} className="bg-primary text-primary-foreground">
          <ul className="mx-auto flex max-w-6xl flex-wrap justify-between gap-1 px-4 sm:justify-end">
            {SIGN_INS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn("inline-flex min-h-10 items-center rounded px-2 text-sm font-bold hover:underline sm:px-3", focusRing)}
                >
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <Link
              href={ROUTES.root}
              className={cn("flex min-w-0 items-center gap-2.5 rounded-lg", focusRing)}
            >
              <BrandLogo className="size-10 shrink-0" imgClassName="size-10 object-contain" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-base font-bold text-primary">
                  {t(UI.brand)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {t(UI.brandSub)}
                </span>
              </span>
            </Link>

            <nav aria-label={t(UI.mainNav)} className="ms-auto hidden lg:block">
              <ul className="flex items-center gap-1">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={hrefFor(item.id)}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-foreground hover:text-primary",
                        focusRing,
                      )}
                    >
                      {t(item.label)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="ms-auto flex items-center gap-1.5 lg:ms-2">
              <button
                type="button"
                onClick={() => setLang(lang === "ar" ? "en" : "ar")}
                aria-label={t(UI.switchLang)}
                className={cn(siteButton.base, siteButton.ghost, "min-w-11 px-2.5")}
              >
                <span lang={lang === "ar" ? "en" : "ar"}>{lang === "ar" ? "EN" : "ع"}</span>
              </button>
              {toggleTheme && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={t(isDark ? UI.toLight : UI.toDark)}
                  className={cn(siteButton.base, siteButton.ghost, "min-w-11 px-2.5")}
                >
                  {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
                </button>
              )}
              <Link
                href={ROUTES.myLogin}
                className={cn(siteButton.base, siteButton.accent, "hidden sm:inline-flex")}
              >
                {t(UI.book)}
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls={menuId}
                className={cn(siteButton.base, siteButton.ghost, "px-3 lg:hidden")}
              >
                {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
                <span>{t(menuOpen ? UI.closeMenu : UI.menu)}</span>
              </button>
            </div>
          </div>

          {menuOpen && (
            <div id={menuId} className="border-t border-border bg-background lg:hidden">
              <nav aria-label={t(UI.mainNav)} className="mx-auto max-w-6xl px-4 py-3">
                <ul className="grid gap-1">
                  {navItems.map((item) => (
                    <li key={item.id}>
                      <a
                        href={hrefFor(item.id)}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex min-h-11 items-center rounded-lg px-3 text-base font-semibold hover:bg-muted",
                          focusRing,
                        )}
                      >
                        {t(item.label)}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 grid gap-2 border-t border-border pt-3 sm:hidden">
                  <Link href={ROUTES.myLogin} className={cn(siteButton.base, siteButton.accent)}>
                    {t(UI.book)}
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </header>

        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>

        <footer className="border-t border-border bg-muted/50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr]">
            <div className="space-y-2">
              <p className="text-base font-bold text-primary">{t(UI.brand)}</p>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">{t(UI.rights)}</p>
              <p className="pt-2 text-sm text-muted-foreground">
                © {new Date().getFullYear()} {t(UI.brand)}
              </p>
            </div>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a href={hrefFor(item.id)} className={cn("inline-flex min-h-11 items-center rounded hover:text-primary", focusRing)}>
                    {t(item.label)}
                  </a>
                </li>
              ))}
              {SIGN_INS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={cn("inline-flex min-h-11 items-center rounded hover:text-primary", focusRing)}>
                    {t(item.label)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={ROUTES.privacy} className={cn("inline-flex min-h-11 items-center rounded hover:text-primary", focusRing)}>
                  {t(UI.privacy)}
                </Link>
              </li>
              <li>
                <a href={`tel:${CONTACT.landline}`} className={cn("inline-flex min-h-11 items-center gap-2 rounded hover:text-primary", focusRing)}>
                  {t(UI.phone)} <span dir="ltr">{CONTACT.landline}</span>
                </a>
              </li>
              <li>
                <a href={CONTACT.facebookUrl} className={cn("inline-flex min-h-11 items-center rounded hover:text-primary", focusRing)}>
                  {t(UI.facebook)}
                </a>
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </SiteLangContext.Provider>
  );
}
