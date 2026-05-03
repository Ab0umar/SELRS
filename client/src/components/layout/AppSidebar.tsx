import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, KeyRound, LogOut, PanelLeft, Settings, UserCog } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME_AR, BRAND_TAGLINE_AR } from "@/lib/brand";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adminNavGroups, staffNavGroups, type NavGroup, type NavLeaf } from "./AppNav";

const SIDEBAR_WIDTH_KEY = "sidebar-width-v2";
const COLLAPSED_KEY = "selrs:sidebar-collapsed";
const DEFAULT_WIDTH = 210;
const MIN_WIDTH = 170;
const MAX_WIDTH = 480;

function isNavGroup(item: NavGroup): item is { label: string; items: NavLeaf[] } {
  return "items" in item && Array.isArray((item as { items?: unknown }).items);
}

/** Match current route to nav path (exact, or child path under same base; ignores query on location). */
function navLeafActive(location: string, navPath: string): boolean {
  const navBase = navPath.split("?")[0];
  const locBase = location.split("?")[0];
  if (locBase === navBase) return true;
  if (navBase.length <= 1) return false;
  return locBase.startsWith(`${navBase}/`);
}

type AppSidebarProps = {
  location: string;
  onNavigate: (path: string) => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onOpenAccount: () => void;
  onOpenPassword: () => void;
  footerSlot?: ReactNode;
};

export function AppSidebar({
  location,
  onNavigate,
  isMobile,
  mobileOpen,
  onMobileOpenChange,
  onOpenAccount,
  onOpenPassword,
  footerSlot,
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const userRole = String(user?.role ?? "").toLowerCase();
  const isAdmin = userRole === "admin";
  const menuItems: NavGroup[] = isAdmin ? adminNavGroups : staffNavGroups;

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({});
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const navGroupExpanded = (idx: number) => openNavGroups[`g-${idx}`] ?? false;
  const toggleNavGroup = (idx: number) => {
    const key = `g-${idx}`;
    setOpenNavGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  };

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const rect = sidebarRef.current?.getBoundingClientRect();
      if (!rect) return;
      const newWidth = e.clientX - rect.left;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const onUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  const renderNavButton = (sub: NavLeaf, isActive: boolean) => (
    <button
      key={sub.path}
      type="button"
      title={collapsed && !isMobile ? sub.label : undefined}
      onClick={() => {
        onNavigate(sub.path);
        if (isMobile) onMobileOpenChange(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
        collapsed && !isMobile ? "justify-center px-0 py-2.5" : "text-right",
        isActive ? "selrs-active-nav font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {(!collapsed || isMobile) && <span className="min-w-0 flex-1 truncate">{sub.label}</span>}
      <sub.icon className="h-[18px] w-[18px] shrink-0" />
    </button>
  );

  const sidebarInner = (
    <div
      dir="rtl"
      className="flex h-full min-h-0 flex-col overflow-hidden border-e border-border/80 bg-sidebar text-sidebar-foreground"
      style={{ width: isMobile ? "max-content" : collapsed ? 56 : sidebarWidth }}
    >
      <div className="h-1 selrs-gradient-bar shrink-0" aria-hidden />
      <div className={cn("flex h-14 shrink-0 items-center border-b border-border/80 bg-sidebar", collapsed && !isMobile ? "justify-center px-1" : "justify-between gap-1 px-3")}>
        {/* Collapsed desktop: logo only */}
        {collapsed && !isMobile && (
          <BrandLogo className="h-9 w-9 shrink-0 rounded-xl border border-border/60 bg-white shadow-sm" />
        )}
        {/* Expanded or mobile: logo+name right, toggle/close button left */}
        {(!collapsed || isMobile) && (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <BrandLogo className="h-9 w-9 shrink-0 rounded-xl border border-border/60 bg-white shadow-sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-foreground">{BRAND_NAME_AR}</div>
                <div className="truncate text-[11px] text-muted-foreground">{BRAND_TAGLINE_AR}</div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label={isMobile ? "إغلاق القائمة" : "طي القائمة"}
              title={isMobile ? "إغلاق القائمة" : "طي القائمة"}
              onClick={isMobile ? () => onMobileOpenChange(false) : () => setCollapsed((c) => !c)}
            >
              <PanelLeft className={cn("h-4 w-4 transition-transform", isMobile && "rotate-180")} />
            </Button>
          </>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3 scrollbar-none bg-sidebar">
        {menuItems.map((item, idx) => {
          if (isNavGroup(item)) {
            const sectionOpen = collapsed && !isMobile ? true : navGroupExpanded(idx);
            return (
              <div key={`g-${idx}`} className="mb-3">
                {(!collapsed || isMobile) ? (
                  <button
                    type="button"
                    onClick={() => toggleNavGroup(idx)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50"
                    aria-expanded={sectionOpen}
                  >
                    <span className="min-w-0 truncate">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                        sectionOpen ? "rotate-0" : "-rotate-90",
                      )}
                    />
                  </button>
                ) : null}
                {sectionOpen ? (
                  <div className="space-y-0.5">
                    {item.items.map((sub) => {
                      const isActive = navLeafActive(location, sub.path);
                      return renderNavButton(sub, isActive);
                    })}
                  </div>
                ) : null}
              </div>
            );
          }
          const leaf = item as NavLeaf;
          const isActive = navLeafActive(location, leaf.path);
          return <div key={leaf.path}>{renderNavButton(leaf, isActive)}</div>;
        })}
      </nav>

      <div className="shrink-0 border-t border-border/80 p-2">
        {collapsed && !isMobile && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mb-2 h-9 w-full"
            aria-label="توسيع القائمة"
            title="توسيع القائمة"
            onClick={() => setCollapsed(false)}
          >
            <PanelLeft className="h-4 w-4 rotate-180" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-2xl border border-border/80 bg-card/90 px-2 py-2 transition-colors hover:bg-muted/50",
                collapsed && !isMobile && "justify-center px-0",
              )}
            >
              <Avatar className="h-9 w-9 shrink-0 border border-border">
                <AvatarFallback className="text-xs font-medium">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {(!collapsed || isMobile) && (
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-sm font-medium leading-none">{user?.name || "—"}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email || "—"}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                onNavigate("/profile");
                if (isMobile) onMobileOpenChange(false);
              }}
            >
              <UserCog className="ms-2 h-4 w-4" />
              <span>الملف الشخصي</span>
            </DropdownMenuItem>
            {isAdmin ? (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  onNavigate("/admin-hub");
                  if (isMobile) onMobileOpenChange(false);
                }}
              >
                <Settings className="ms-2 h-4 w-4" />
                <span>مركز الإدارة</span>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem className="cursor-pointer" onClick={onOpenAccount}>
              <UserCog className="ms-2 h-4 w-4" />
              <span>Account Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={onOpenPassword}>
              <KeyRound className="ms-2 h-4 w-4" />
              <span>تغيير كلمة المرور</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => void logout()}>
              <LogOut className="ms-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {footerSlot}
      </div>
    </div>
  );

  if (isMobile) {
    if (!mobileOpen) return null;
    const portalTarget = typeof document !== "undefined" ? document.body : null;
    if (!portalTarget) return null;

    return createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[200] bg-black/55 backdrop-blur-[1px] print:hidden"
          aria-label="إغلاق القائمة"
          onClick={() => onMobileOpenChange(false)}
        />
        <aside
          dir="rtl"
          className="fixed inset-y-0 right-0 z-[210] flex w-max min-w-[10.25rem] max-w-[min(88vw,14rem)] flex-col overflow-hidden border-s border-border bg-sidebar pt-[env(safe-area-inset-top)] text-sidebar-foreground shadow-2xl print:hidden"
          role="dialog"
          aria-modal="true"
        >
          {sidebarInner}
        </aside>
      </>,
      portalTarget,
    );
  }

  return (
    <div ref={sidebarRef} className="relative flex h-full shrink-0 print:hidden">
      {sidebarInner}
      {!collapsed ? (
        <button
          type="button"
          aria-label="تغيير عرض القائمة"
          className="absolute end-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/20"
          onMouseDown={() => setIsResizing(true)}
        />
      ) : null}
    </div>
  );
}
