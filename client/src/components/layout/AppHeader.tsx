import { useSyncExternalStore, type CSSProperties } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Eye,
  Menu,
  Moon,
  Search,
  Sun,
  User,
  LogOut,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME_AR } from "@/lib/brand";

export type AppHeaderProps = {
  userName: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void | Promise<void>;
  onHome: () => void;
  onProfile: () => void;
  isMobile: boolean;
  onOpenMobileNav: () => void;
  showMobileNavToggle?: boolean;
};

function dispatchOpenCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("selrs:open-command-palette"));
}

export function AppHeader({
  userName,
  theme,
  onToggleTheme,
  onLogout,
  onHome,
  onProfile,
  isMobile,
  onOpenMobileNav,
  showMobileNavToggle = true,
}: AppHeaderProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dateStr = mounted
    ? new Date().toLocaleDateString("ar-EG", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-background print:hidden md:bg-background/90 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/75">
      <div className="selrs-gradient-bar h-0.5 w-full" aria-hidden />

      {/* LTR صف واحد: يسار = حساب + المود، الوسط = بحث، يمين = التاريخ (ثابت بصرياً بغض النظر عن اتجاه الصفحة) */}
      <div
        className="flex h-14 w-full min-w-0 flex-row items-center gap-2 px-3 md:gap-3 md:px-6"
        dir="ltr"
      >
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-2 md:hidden"
          onClick={onHome}
          aria-label="الصفحة الرئيسية"
        >
          <BrandLogo className="h-7 w-7 shrink-0 rounded-lg border border-border/60 bg-white" />
          <span className="text-sm font-black tracking-tight">{BRAND_NAME_AR}</span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 shrink-0"
            onClick={() => onToggleTheme()}
            title={theme === "light" ? "Dark mode" : "Light mode"}
            aria-label={theme === "light" ? "Dark mode" : "Light mode"}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 shrink-0 gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {userName?.slice(0, 2).toUpperCase() || "؟"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:inline md:max-w-[140px]">
                  {userName || "—"}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[200px]"
              style={{ direction: "rtl" } satisfies CSSProperties}
            >
              <DropdownMenuLabel className="text-right">الحساب</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-end gap-2" onClick={() => onProfile()}>
                <User className="h-4 w-4" />
                الملف الشخصي
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer justify-end gap-2" onClick={onHome}>
                <Eye className="h-4 w-4" />
                لوحة التحكم
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer justify-end gap-2" onClick={() => void onLogout()}>
                <LogOut className="h-4 w-4" />
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-3">
          <div className="relative hidden w-full max-w-xl sm:block">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <button
              type="button"
              onClick={dispatchOpenCommandPalette}
              dir="rtl"
              className="flex h-9 w-full cursor-text items-center rounded-lg border border-border bg-muted/50 ps-10 pe-4 text-end text-sm text-muted-foreground transition-all hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              بحث عن مرضى، أطباء، مواعيد… (⌘K)
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 sm:hidden"
            title="بحث"
            aria-label="فتح لوحة البحث"
            onClick={dispatchOpenCommandPalette}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="inline-flex gap-1.5 whitespace-nowrap py-1 text-[10px] font-normal sm:text-xs">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            {dateStr || "…"}
          </Badge>
          {isMobile && showMobileNavToggle ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 md:hidden"
              onClick={onOpenMobileNav}
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </Button>
          ) : null}
        </div>
      </div>

    </header>
  );
}
