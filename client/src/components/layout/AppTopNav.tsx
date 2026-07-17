import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import { BRAND_NAME_AR } from "@/lib/brand";
import type { User } from "@shared/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  Archive,
  Banknote,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Clock,
  DollarSign,
  History,
  Hospital,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Network,
  ScrollText,
  Search,
  Settings,
  Syringe,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import {
  type CSSProperties,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTodayQueuePatientsMerged } from "@/hooks/useTodayQueuePatientsMerged";
import {
  normalizeNavPath,
  pathGrantedByRoots,
  permissionsToAllowedRoots,
} from "@/lib/nav-permission-utils";
import {
  accountingNavGroup,
  adminNavGroups,
  staffNavGroups,
  type NavGroupSection,
  type NavLeaf,
} from "./AppNav";

function dispatchOpenCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("selrs:open-command-palette"));
}

function tabActive(location: string, path: string): boolean {
  const navBase = path.split("?")[0];
  const locBase = location.split("?")[0];
  if (locBase === navBase) return true;
  if (navBase.length <= 1) return false;
  return locBase.startsWith(`${navBase}/`);
}

type AppTopNavProps = {
  location: string;
  onNavigate: (path: string) => void;
  onOpenAccount: () => void;
  onOpenPassword: () => void;
  onLogout: () => void;
};

function DashboardAppbarIndicators() {
  const { merged } = useTodayQueuePatientsMerged();
  const attQ = trpc.attendance.dashboardSummary.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const stockQ = trpc.stockroom.getReports.useQuery({});
  const stockBadge = (stockQ.data?.inventory ?? []).filter(
    (i: any) => i.status === "كمية قليلة" || i.status === "نفذ المخزون",
  ).length;

  const items = [
    {
      label: "مرضى اليوم",
      value: merged.length,
      icon: Users,
      cls: "bg-primary/10 text-primary",
    },
    {
      label: "غياب اليوم",
      value: attQ.data?.absentToday ?? 0,
      icon: UserX,
      cls: "bg-warning/15 text-warning",
    },
    {
      label: "تنبيهات المخزن",
      value: stockBadge,
      icon: Archive,
      cls: "bg-destructive/15 text-destructive",
    },
  ];

  return (
    <div
      className="flex min-w-0 shrink items-center gap-1 md:hidden"
      aria-label="مؤشرات فورية"
    >
      {items.map(({ label, value, icon: Icon, cls }) => (
        <span
          key={label}
          className={cn(
            "inline-flex h-8 min-w-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold tabular-nums",
            cls,
          )}
          title={label}
          aria-label={`${label}: ${value.toLocaleString("ar-EG")}`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{value.toLocaleString("ar-EG")}</span>
        </span>
      ))}
    </div>
  );
}

export function AppTopNav({
  location,
  onNavigate,
  onOpenAccount,
  onOpenPassword,
  onLogout,
}: AppTopNavProps) {
  const { user } = useAuth();
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

  const leafVisible = useMemo(
    () =>
      (leaf: NavLeaf): boolean => {
        if (isAdmin) return true;
        const cleanPath = normalizeNavPath(leaf.path.split("?")[0]);
        if (pathGrantedByRoots(cleanPath, [])) return true; // always-granted paths
        if (!permissionsQuery.isSuccess) return false;
        return pathGrantedByRoots(cleanPath, allowedRoots);
      },
    [isAdmin, permissionsQuery.isSuccess, allowedRoots],
  );

  const navGroups = isAdmin ? adminNavGroups : staffNavGroups;

  const mainTabs = useMemo(
    () =>
      navGroups.filter(
        (item): item is NavLeaf =>
          !("items" in item) && Boolean(item.isMain) && leafVisible(item),
      ),
    [leafVisible, navGroups],
  );

  const allNavTabs = useMemo(
    () => [
      {
        icon: Clock,
        label: "اليوم",
        path: "/bookings",
        key: "today",
        paths: ["/today", "/today-patients", "/dashboard", "/bookings"],
        checkPath: "/bookings",
      },
      {
        icon: Users,
        label: "مركز المريض",
        path: "/patient-hub",
        key: "patients",
        paths: [
          "/patient-hub",
          "/patients-hub",
          "/patients",
          "/new-cases",
          "/followups",
          "/visits",
        ],
        checkPath: "/patient-hub",
      },
      {
        icon: Syringe,
        label: "العمليات",
        path: "/operations",
        key: "operations",
        paths: ["/operations"],
        checkPath: "/operations",
      },
      {
        icon: Banknote,
        label: "الحسابات",
        path: "/accounting",
        key: "accounting",
        paths: ["/accounting"],
        checkPath: "/accounting",
      },
      {
        icon: Hospital,
        label: "كفرالشيخ",
        path: "/kf",
        key: "kf",
        paths: ["/kf"],
        checkPath: "/kf",
      },
      {
        icon: Archive,
        label: "المخزن",
        path: "/stockroom",
        key: "stockroom",
        paths: ["/stockroom"],
        checkPath: "/stockroom",
      },
      {
        icon: DollarSign,
        label: "المرتبات",
        path: "/salary",
        key: "salary",
        paths: ["/salary"],
        checkPath: "/salary",
      },
      {
        icon: Activity,
        label: "الحضور",
        path: "/attendance",
        key: "attendance",
        paths: ["/attendance"],
        checkPath: "/attendance",
      },
      {
        icon: History,
        label: "سجل المرضى",
        path: "/admin/legacy-patients",
        key: "legacy-patients",
        paths: ["/admin/legacy-patients"],
        checkPath: "/admin/legacy-patients",
      },
      {
        icon: ScrollText,
        label: "سجل العمليات",
        path: "/admin/op-history",
        key: "op-history",
        paths: ["/admin/op-history"],
        checkPath: "/admin/op-history",
      },
    ],
    [],
  );

  const mainNavTabs = useMemo(() => {
    if (isAdmin) return [];
    if (!permissionsQuery.isSuccess) return [];
    return allNavTabs.filter((tab) => {
      if (tab.key === "more") return true;
      const cleanPath = normalizeNavPath(tab.checkPath?.split("?")[0] ?? "");
      return pathGrantedByRoots(cleanPath, allowedRoots);
    });
  }, [isAdmin, allNavTabs, permissionsQuery.isSuccess, allowedRoots]);

  const adminQuickTabs = useMemo(
    () => [
      {
        icon: LayoutDashboard,
        label: "لوحة التحكم",
        path: "/dashboard?tab=admin",
      },
      { icon: Network, label: "مركز المريض", path: "/patient-hub" },
      { icon: Banknote, label: "الحسابات", path: "/accounting" },
      { icon: DollarSign, label: "المرتبات", path: "/salary" },
      { icon: Activity, label: "الحضور", path: "/attendance" },
      { icon: Hospital, label: "كفرالشيخ", path: "/kf" },
      { icon: Archive, label: "المخزن", path: "/stockroom" },
      { icon: Megaphone, label: "التسويق", path: "/marketing" },
      { icon: History, label: "سجل المرضى", path: "/admin/legacy-patients" },
      { icon: ScrollText, label: "سجل العمليات", path: "/admin/op-history" },
      { icon: Settings, label: "مركز الإدارة", path: "/admin-hub" },
    ],
    [],
  );

  const accountingItems = useMemo(
    () => accountingNavGroup.items.filter(leafVisible),
    [leafVisible],
  );

  const moreGroups = useMemo(
    () =>
      navGroups
        .filter(
          (item): item is NavGroupSection =>
            "items" in item &&
            item.navKey !== "accounting" &&
            item.navKey !== "attendance" &&
            item.navKey !== "salary",
        )
        .map((group) => ({ ...group, items: group.items.filter(leafVisible) }))
        .filter((group) => group.items.length > 0),
    [navGroups, leafVisible],
  );

  const logoTarget = isAdmin ? "/dashboard?tab=admin" : "/today";

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

  const userName =
    user && typeof user.name === "string" && String(user.name).trim()
      ? String((user as User).name).trim()
      : String((user as User | null)?.username ?? "").trim() || "-";

  const accountingActive = tabActive(location, "/accounting");
  const isDashboardRoute = location.split("?")[0] === "/dashboard";

  const [moreOpen, setMoreOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <header
      dir="rtl"
      className="relative z-40 shrink-0 border-b border-border/80 bg-card/95 pt-[env(safe-area-inset-top)] shadow-[0_1px_2px_oklch(0.28_0.04_257_/_0.06)] print:hidden"
    >
      <div className="selrs-gradient-bar h-0.5 w-full" aria-hidden />

      <div className="flex h-14 w-full items-center gap-2 px-2">
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate(logoTarget)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-2xl border border-border bg-background/80 px-2.5 transition-opacity hover:opacity-90 md:px-3"
          aria-label="الرئيسية"
        >
          <BrandLogo className="h-7 w-7 shrink-0 rounded-xl border border-border/60 bg-background" />
          <span className="hidden text-sm font-black text-foreground 2xl:block">
            {BRAND_NAME_AR}
          </span>
        </button>

        {/* Main tabs, desktop only */}
        <nav
          className="hidden min-w-0 flex-1 items-stretch whitespace-nowrap md:flex"
          aria-label="القائمة الرئيسية"
        >
          {isAdmin
            ? adminQuickTabs.map((tab) => {
                const active = tabActive(location, tab.path);
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.path}
                    type="button"
                    onClick={() => onNavigate(tab.path)}
                    className={cn(
                      "my-1 flex h-10 min-w-0 items-center gap-0.5 whitespace-nowrap rounded-xl border px-1.5 text-[10px] font-semibold transition-colors xl:px-2 xl:text-[11px] 2xl:text-xs",
                      active
                        ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                    )}
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={active ? 2.2 : 1.8}
                      aria-hidden
                    />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })
            : mainNavTabs.map((tab) => {
                const active = tab.paths.some((p) => {
                  const base = location.split("?")[0];
                  return base === p || base.startsWith(`${p}/`);
                });
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onNavigate(tab.path)}
                    className={cn(
                      "my-1 flex h-10 min-w-0 items-center gap-0.5 whitespace-nowrap rounded-xl border px-1.5 text-[10px] font-semibold transition-colors xl:px-2 xl:text-[11px] 2xl:text-xs",
                      active
                        ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                    )}
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={active ? 2.2 : 1.8}
                      aria-hidden
                    />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}

          {/* الحسابات dropdown — only shown when not already in mainNavTabs */}
          {!isAdmin &&
            accountingItems.length > 0 &&
            !mainNavTabs.some((t) => t.key === "accounting") && (
              <div className="flex h-full items-stretch whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onNavigate("/accounting")}
                  className={cn(
                    "my-1 flex h-10 min-w-0 items-center whitespace-nowrap rounded-s-xl border px-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none xl:text-[11px] 2xl:text-xs",
                    accountingActive
                      ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                  )}
                >
                  <span className="whitespace-nowrap">الحسابات</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "my-1 flex h-10 items-center rounded-e-xl border px-1 text-xs transition-colors focus-visible:outline-none",
                        accountingActive
                          ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                      )}
                      aria-label="فتح قائمة الحسابات"
                    >
                      <ChevronDown
                        className="h-3.5 w-3.5 opacity-70"
                        aria-hidden
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52"
                    style={{ direction: "rtl" } satisfies CSSProperties}
                  >
                    {(() => {
                      const byPath = new Map(
                        accountingItems.map((i) => [i.path, i]),
                      );
                      const pick = (paths: string[]) =>
                        paths
                          .map((p) => byPath.get(p))
                          .filter(Boolean) as typeof accountingItems;
                      const treasury = pick([
                        "/accounting/ledger",
                        "/accounting/daily-revenue",
                        "/accounting/service-revenue",
                        "/accounting/receipts",
                      ]);
                      const statements = pick([
                        "/accounting/cashbook",
                        "/accounting/advances",
                        "/accounting/instapay",
                        "/accounting/home-fund",
                        "/accounting/dr-saadany",
                      ]);
                      const loans = pick(["/accounting/loans"]);
                      const knownPaths = new Set(
                        [...treasury, ...statements, ...loans].map(
                          (i) => i.path,
                        ),
                      );
                      const reports = accountingItems.filter(
                        (i) => !knownPaths.has(i.path),
                      );
                      const labelOverrides: Record<string, string> = {
                        "/accounting/cashbook": "الخزينة",
                        "/accounting/advances": "السلف",
                        "/accounting/home-fund": "البيت",
                      };
                      const renderSection = (
                        label: string,
                        items: typeof accountingItems,
                        sep = true,
                      ) =>
                        items.length > 0 ? (
                          <>
                            {sep && <DropdownMenuSeparator />}
                            <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {label}
                            </DropdownMenuLabel>
                            {items.map((item) => (
                              <DropdownMenuItem
                                key={item.path}
                                className="cursor-pointer gap-2"
                                onClick={() => onNavigate(item.path)}
                              >
                                <item.icon className="h-4 w-4" />
                                {labelOverrides[item.path] ?? item.label}
                              </DropdownMenuItem>
                            ))}
                          </>
                        ) : null;
                      return (
                        <>
                          {renderSection("الخزينة", treasury, false)}
                          {renderSection("كشف حساب", statements, true)}
                          {renderSection("صندوق القرض", loans, true)}
                          {renderSection("تقارير", reports, true)}
                        </>
                      );
                    })()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
        </nav>

        {/* Controls */}
        <div className="flex shrink-0 items-center gap-0.5 px-1">
          {isDashboardRoute && <DashboardAppbarIndicators />}

          {/* المزيد popover, desktop only, accordion sections closed by default */}
          {moreGroups.length > 0 && (
            <Popover
              open={moreOpen}
              onOpenChange={(o) => {
                setMoreOpen(o);
                if (!o) setOpenSections({});
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="hidden h-9 shrink-0 gap-0.5 whitespace-nowrap rounded-xl border border-border bg-background/70 px-2 text-[10px] font-semibold md:flex xl:text-xs"
                >
                  <span>المزيد</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 opacity-70 transition-transform duration-200",
                      moreOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-56 p-0 overflow-hidden"
                style={{ direction: "rtl" } satisfies CSSProperties}
              >
                {moreGroups.map((group, gi) => {
                  const key = group.navKey ?? String(gi);
                  const isOpen = openSections[key] ?? false;
                  const isSingle = group.items.length === 1;
                  return (
                    <div
                      key={key}
                      className={cn(gi > 0 && "border-t border-border/50")}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (isSingle) {
                            onNavigate(group.items[0].path);
                            setMoreOpen(false);
                            setOpenSections({});
                          } else {
                            toggleSection(key);
                          }
                        }}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground bg-muted/40"
                      >
                        <span>{group.label}</span>
                        {!isSingle && (
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                              isOpen && "rotate-180",
                            )}
                            aria-hidden
                          />
                        )}
                      </button>
                      {!isSingle && isOpen && (
                        <div className="pb-1">
                          {group.items.map((item) => (
                            <button
                              key={item.path}
                              type="button"
                              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted text-muted-foreground"
                              onClick={() => {
                                onNavigate(item.path);
                                setMoreOpen(false);
                                setOpenSections({});
                              }}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </PopoverContent>
            </Popover>
          )}

          {/* Search */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-2xl border border-border bg-background/70"
            title="بحث (⌘K)"
            aria-label="فتح لوحة البحث"
            onClick={dispatchOpenCommandPalette}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Date badge, hidden on small screens */}
          <Badge
            variant="outline"
            className="hidden rounded-2xl bg-background/70 py-1 text-[10px] font-semibold 2xl:inline-flex"
          >
            <span className="me-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success/100" />
            {dateStr || "…"}
          </Badge>

          {/* Avatar + user dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 shrink-0 gap-1.5 rounded-2xl border border-border bg-background/70 px-1.5"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {userName.slice(0, 2).toUpperCase() || "؟"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[100px] truncate text-sm font-semibold 2xl:inline">
                  {userName}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground 2xl:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48"
              style={{ direction: "rtl" } satisfies CSSProperties}
            >
              <DropdownMenuLabel>الحساب</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => onNavigate("/profile")}
              >
                <UserCog className="h-4 w-4" />
                الملف الشخصي
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => onNavigate("/attendance/my")}
              >
                <CalendarCheck className="h-4 w-4" />
                حضوري
              </DropdownMenuItem>
              {!isAdmin && ["doctor", "technician"].includes(userRole) && (
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => onNavigate("/attendance/shift-schedule")}
                >
                  <CalendarDays className="h-4 w-4" />
                  الروستر الشهري
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => onNavigate("/admin-hub")}
                >
                  <Settings className="h-4 w-4" />
                  مركز الإدارة
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={onOpenAccount}
              >
                <UserCog className="h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={onOpenPassword}
              >
                <KeyRound className="h-4 w-4" />
                تغيير كلمة المرور
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                خروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
