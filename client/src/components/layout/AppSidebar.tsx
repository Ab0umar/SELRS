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
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import {
  adminNavGroups,
  staffNavGroups,
  type NavGroup,
  type NavGroupSection,
  type NavLeaf,
} from "./AppNav";

const COLLAPSED_KEY = "selrs:sidebar-collapsed";
const DEFAULT_WIDTH = 220;

function isNavGroup(item: NavGroup): item is NavGroupSection {
  return "items" in item && Array.isArray((item as NavGroupSection).items);
}

function canShowNavLeaf(item: NavLeaf, userRole: string): boolean {
  return !item.roles || item.roles.map((role) => role.toLowerCase()).includes(userRole);
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
  const permissionsQuery = trpc.medical.getMyPermissions.useQuery(undefined, {
    enabled: Boolean(user) && !isAdmin,
    refetchOnWindowFocus: false,
  });

  const allowedRoots = useMemo(
    () => permissionsToAllowedRoots((permissionsQuery.data ?? []) as string[]),
    [permissionsQuery.data],
  );

  const menuItems: NavGroup[] = useMemo(() => {
    const leafPassesEffectivePaths = (leaf: NavLeaf): boolean => {
      if (isAdmin) return true;
      const cleanPath = normalizeNavPath(leaf.path.split("?")[0]);
      if (pathGrantedByRoots(cleanPath, [])) return true; // always-granted paths
      if (!permissionsQuery.isSuccess) return false;
      return pathGrantedByRoots(cleanPath, allowedRoots);
    };

    const leafVisible = (leaf: NavLeaf): boolean => {
      if (isAdmin) return true;
      if (!canShowNavLeaf(leaf, userRole)) return false;
      return leafPassesEffectivePaths(leaf);
    };

    return (isAdmin ? adminNavGroups : staffNavGroups)
      .map((item) => {
        if (!isNavGroup(item)) {
          return leafVisible(item) ? item : null;
        }

        const items = item.items.filter((leaf) => leafVisible(leaf));
        return items.length > 0 ? { ...item, items } : null;
      })
      .filter((item): item is NavGroup => Boolean(item));
  }, [allowedRoots, isAdmin, permissionsQuery.isSuccess, userRole]);

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [openNavGroups, setOpenNavGroups] = useState<Record<string, boolean>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);

  const navGroupExpanded = (navKey: string) => openNavGroups[navKey] ?? false;
  const toggleNavGroup = (navKey: string) => {
    setOpenNavGroups((prev) => ({ ...prev, [navKey]: !(prev[navKey] ?? false) }));
  };

  useEffect(() => {
    const locBase = location.split("?")[0];
    if (locBase.startsWith("/accounting")) {
      setOpenNavGroups((prev) => (prev.accounting ? prev : { ...prev, accounting: true }));
    } else if (locBase === "/dashboard" || locBase === "/today") {
      setOpenNavGroups((prev) => (prev.dashboard ? prev : { ...prev, dashboard: true }));
    }
  }, [location]);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const renderNavButton = (sub: NavLeaf, isActive: boolean, isMainItem?: boolean) => (
    <button
      key={sub.path}
      type="button"
      title={collapsed && !isMobile ? sub.label : undefined}
      onClick={() => {
        onNavigate(sub.path);
        if (isMobile) onMobileOpenChange(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
        collapsed && !isMobile ? "justify-center px-0 py-2.5" : "text-right",
        isActive
          ? "bg-primary text-primary-foreground font-semibold"
          : "font-medium text-muted-foreground hover:bg-muted text-muted-foreground",
      )}
    >
      {(!collapsed || isMobile) && <span className="min-w-0 flex-1 truncate">{sub.label}</span>}
      <sub.icon className={cn("shrink-0", isMainItem ? "h-6 w-6" : "h-[18px] w-[18px]")} />
    </button>
  );

  const sidebarInner = (
    <div
      dir="rtl"
      className="flex h-full min-h-0 flex-col overflow-hidden border-e border-border/80 bg-sidebar text-sidebar-foreground"
      style={{ width: isMobile ? "max-content" : collapsed ? 56 : DEFAULT_WIDTH }}
    >
      <div className="h-1 selrs-gradient-bar shrink-0" aria-hidden />
      <div className={cn("flex h-14 shrink-0 items-center border-b border-border/80 bg-sidebar", collapsed && !isMobile ? "justify-center px-1" : "justify-between gap-1 px-3")}>
        {/* Collapsed desktop: logo only */}
        {collapsed && !isMobile && (
          <BrandLogo className="h-9 w-9 shrink-0 rounded-xl border border-border/60 bg-background shadow-sm" />
        )}
        {/* Expanded or mobile: logo+name right, toggle/close button left */}
        {(!collapsed || isMobile) && (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <BrandLogo className="h-9 w-9 shrink-0 rounded-xl border border-border/60 bg-background shadow-sm" />
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

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2 scrollbar-none bg-sidebar">
        {(() => {
          let firstGroupSeen = false;
          return menuItems.map((item, idx) => {
            if (collapsed && !isMobile && !item.isMain) {
              return null;
            }
            if (isNavGroup(item)) {
              const needsSeparator = !firstGroupSeen && !collapsed;
              firstGroupSeen = true;
              const navKey = item.navKey ?? `g-${idx}`;
              const sectionOpen = collapsed && !isMobile ? true : navGroupExpanded(navKey);
              const locBase = location.split("?")[0];
              const groupPathBase =
                typeof item.groupPath === "string" ? item.groupPath.split("?")[0] : "";
              const groupPathClean = groupPathBase ? normalizeNavPath(groupPathBase) : "";
              const groupNavigateAllowed =
                !item.groupPath ||
                isAdmin ||
                !permissionsQuery.isSuccess ||
                pathGrantedByRoots(groupPathClean, allowedRoots);
              const headerNavDisabled = Boolean(item.groupPath) && !groupNavigateAllowed;
              const headerActive =
                groupPathBase.length > 1 &&
                locBase === groupPathBase &&
                !item.items.some((sub) => navLeafActive(location, sub.path));

              return (
                <Fragment key={navKey}>
                  {needsSeparator && (
                    <div className="my-1.5 mx-1 border-t border-border/50" />
                  )}
                  <div className="mb-1">
                    {(!collapsed || isMobile) ? (
                      <div
                        className="flex w-full items-center gap-0.5 rounded-lg px-1 py-0.5"
                        role="group"
                        aria-expanded={sectionOpen}
                      >
                        <button
                          type="button"
                          disabled={headerNavDisabled}
                          onClick={() => {
                            if (item.groupPath) {
                              if (!groupNavigateAllowed) return;
                              onNavigate(item.groupPath);
                              setOpenNavGroups((prev) => ({ ...prev, [navKey]: true }));
                              if (isMobile) onMobileOpenChange(false);
                            } else {
                              toggleNavGroup(navKey);
                            }
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-center rounded-lg px-2 py-1.5 text-right text-sm transition-colors hover:bg-muted/50",
                            headerNavDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                            headerActive
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "font-medium text-muted-foreground",
                          )}
                        >
                          <span className="min-w-0 truncate">{item.label}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={sectionOpen ? "طي القسم" : "توسيع القسم"}
                          title={sectionOpen ? "طي القسم" : "توسيع القسم"}
                          onClick={() => toggleNavGroup(navKey)}
                          className={cn(
                            "shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50",
                            headerActive && "text-primary",
                          )}
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200",
                              sectionOpen ? "rotate-0" : "-rotate-90",
                            )}
                          />
                        </button>
                      </div>
                    ) : null}
                    {sectionOpen ? (
                      <div className="max-h-80 space-y-0.5 overflow-y-auto">
                        {item.items.map((sub) => {
                          const isActive = navLeafActive(location, sub.path);
                          return renderNavButton(sub, isActive, false);
                        })}
                      </div>
                    ) : null}
                  </div>
                </Fragment>
              );
            }
            const leaf = item as NavLeaf;
            const isActive = navLeafActive(location, leaf.path);
            return (
              <div key={leaf.path} className="mb-0.5">
                {renderNavButton(leaf, isActive, leaf.isMain)}
              </div>
            );
          });
        })()}
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
    </div>
  );
}
