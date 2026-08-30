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
  Filter,
  History,
  Hospital,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
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
  hideShortcuts?: boolean;
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
  hideShortcuts = false,
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
        const allowedRoles = leaf.roles?.map((role) => role.toLowerCase());
        if (allowedRoles?.length && !allowedRoles.includes(userRole)) {
          return false;
        }
        if (isAdmin) return true;
        const cleanPath = normalizeNavPath(leaf.path.split("?")[0]);
        if (pathGrantedByRoots(cleanPath, [])) return true; // always-granted paths
        if (!permissionsQuery.isSuccess) return false;
        return pathGrantedByRoots(cleanPath, allowedRoots);
      },
    [isAdmin, permissionsQuery.isSuccess, allowedRoots, userRole],
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
        icon: CalendarDays,
        label: "الروستر",
        path: "/attendance/shift-schedule",
        key: "roster",
        paths: ["/attendance/shift-schedule"],
        checkPath: "/attendance/shift-schedule",
        roles: ["doctor", "technician", "manager"],
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
      {
        icon: MessageCircle,
        label: "رسائل واتساب",
        path: "/admin/whatsapp-inbox",
        key: "whatsapp-inbox",
        paths: ["/admin/whatsapp-inbox"],
        checkPath: "/admin/whatsapp-inbox",
      },
    ],
    [],
  );

  const mainNavTabs = useMemo(() => {
    if (isAdmin) return [];
    if (!permissionsQuery.isSuccess) return [];
    return allNavTabs.filter((tab) => {
      if (tab.key === "more") return true;
      const allowedRoles = tab.roles?.map((role) => role.toLowerCase());
      if (allowedRoles?.length && !allowedRoles.includes(userRole)) {
        return false;
      }
      if (tab.key === "roster") return true;
      const cleanPath = normalizeNavPath(tab.checkPath?.split("?")[0] ?? "");
      return pathGrantedByRoots(cleanPath, allowedRoots);
    });
  }, [isAdmin, allNavTabs, permissionsQuery.isSuccess, allowedRoots, userRole]);

  const adminTopNavItems = useMemo(
    () => [
      {
        type: "link" as const,
        icon: LayoutDashboard,
        label: "لوحة التحكم",
        path: "/dashboard?tab=admin",
      },
      {
        type: "link" as const,
        icon: Network,
        label: "مركز المريض",
        path: "/patient-hub",
      },
      {
        type: "link" as const,
        icon: Banknote,
        label: "الحسابات",
        path: "/accounting",
      },
      {
        type: "menu" as const,
        key: "employees",
        icon: Users,
        label: "الموظفين",
        items: [
          { icon: Activity, label: "الحضور", path: "/attendance" },
          { icon: DollarSign, label: "المرتبات", path: "/salary" },
        ],
      },
      {
        type: "link" as const,
        icon: Hospital,
        label: "كفرالشيخ",
        path: "/kf",
      },
      {
        type: "link" as const,
        icon: Archive,
        label: "المخزن",
        path: "/stockroom",
      },
      {
        type: "menu" as const,
        key: "archive",
        icon: Archive,
        label: "أرشيف",
        items: [
          {
            icon: History,
            label: "سجل المرضى",
            path: "/admin/legacy-patients",
          },
          {
            icon: ScrollText,
            label: "سجل العمليات",
            path: "/admin/op-history",
          },
          {
            icon: Filter,
            label: "المرجع الطبي",
            path: "/medical-reference",
          },
        ],
      },
      {
        type: "link" as const,
        icon: MessageCircle,
        label: "رسائل واتساب",
        path: "/admin/whatsapp-inbox",
      },
      {
        type: "link" as const,
        icon: Settings,
        label: "مركز الإدارة",
        path: "/admin-hub",
      },
    ],
    [],
  );

  const accountingItems = useMemo(
    () => accountingNavGroup.items.filter(leafVisible),
    [leafVisible],
  );

  const moreGroups = useMemo(() => {
    const sections = navGroups.filter(
      (item): item is NavGroupSection => "items" in item,
    );
    const leafByPath = new Map(
      sections.flatMap((section) =>
        section.items.map((item) => [item.path, item] as const),
      ),
    );
    const recordItems = [
      ["/admin/legacy-patients", "المرضى"],
      ["/followups", "المتابعات"],
      ["/visits", "الزيارات"],
      ["/admin/op-history", "العمليات"],
      ["/sheets/autorefs/dashboard", "AutoRef"],
      ["/sheets/refractions/dashboard", "Refractions"],
      ["/sheets/pentacam/dashboard", "Pentacam"],
      ["/medical-reports", "Medical Reports"],
    ]
      .map(([path, label]) => {
        const leaf = leafByPath.get(path);
        return leaf ? { ...leaf, label } : null;
      })
      .filter((leaf): leaf is NavLeaf => leaf != null && leafVisible(leaf));

    const excludedSections = new Set([
      "accounting",
      "attendance",
      "salary",
      "clinics-file",
      "clinics-measurements",
      "clinics-prescriptions",
      "clinics-tests",
      "patients",
    ]);
    const movedPaths = new Set([
      "/sheets/pentacam/dashboard",
      "/medical-reports",
    ]);
    const remainingSections = sections
      .filter((section) => !excludedSections.has(section.navKey ?? ""))
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (leaf) => !movedPaths.has(leaf.path) && leafVisible(leaf),
        ),
      }))
      .filter((section) => section.items.length > 0);

    const marketingSection = isAdmin
      ? [
          {
            label: "التسويق",
            navKey: "marketing",
            groupPath: "/marketing",
            items: [{ icon: Megaphone, label: "التسويق", path: "/marketing" }],
          },
        ]
      : [];

    return [
      {
        label: "سجل",
        navKey: "records",
        groupPath: "/patients-hub",
        items: recordItems,
      },
      ...marketingSection,
      ...remainingSections,
    ].filter((section) => section.items.length > 0);
  }, [isAdmin, navGroups, leafVisible]);

  const logoTarget = "/home";

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
      data-app-top-nav
      dir="rtl"
      className="relative z-40 shrink-0 border-b border-[#dce5f3] bg-[#f8fbff]/95 pt-[env(safe-area-inset-top)] shadow-[0_8px_24px_rgba(42,79,154,0.08)] backdrop-blur-xl print:hidden"
    >
      <div className="selrs-gradient-bar h-1 w-full" aria-hidden />

      <div
        data-app-top-nav-row
        className={cn(
          "flex h-[4.5rem] w-full items-center gap-3 px-3 sm:px-4 lg:px-5",
          hideShortcuts && "justify-between",
        )}
        dir="rtl"
      >
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate(logoTarget)}
          className="flex h-11 shrink-0 items-center gap-2.5 rounded-2xl border border-[#dbe5f2] bg-white px-2.5 shadow-[0_4px_14px_rgba(42,79,154,0.07)] transition-all hover:-translate-y-0.5 hover:border-[#b8c9e3] hover:shadow-[0_8px_18px_rgba(42,79,154,0.12)] md:px-3.5"
          aria-label="الرئيسية"
        >
          <BrandLogo className="h-8 w-8 shrink-0 rounded-xl border border-[#dbe5f2] bg-[#f7faff]" />
          <span className="hidden text-sm font-black text-foreground 2xl:block">
            {BRAND_NAME_AR}
          </span>
        </button>

        {/* Main tabs, desktop only */}
        {!hideShortcuts && <nav
          className="hidden min-w-0 flex-1 items-stretch overflow-x-auto whitespace-nowrap md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="القائمة الرئيسية"
        >
          {isAdmin
            ? adminTopNavItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.type === "link"
                    ? tabActive(location, item.path)
                    : item.items.some((child) =>
                        tabActive(location, child.path),
                      );
                const triggerClassName = cn(
                  "my-1 flex h-10 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-xl border px-1.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:px-2 xl:text-[11px] 2xl:text-xs",
                  active
                    ? "border-primary/20 bg-primary text-primary-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70",
                );

                if (item.type === "link") {
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => onNavigate(item.path)}
                      className={triggerClassName}
                    >
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        strokeWidth={active ? 2.2 : 1.8}
                        aria-hidden
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                }

                return (
                  <DropdownMenu key={item.key}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className={triggerClassName}>
                        <Icon
                          className="h-3.5 w-3.5 shrink-0"
                          strokeWidth={active ? 2.2 : 1.8}
                          aria-hidden
                        />
                        <span>{item.label}</span>
                        <ChevronDown
                          className="h-3 w-3 shrink-0 opacity-70"
                          aria-hidden
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-48"
                      style={{ direction: "rtl" } satisfies CSSProperties}
                    >
                      {item.items.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <DropdownMenuItem
                            key={child.path}
                            className="cursor-pointer gap-2"
                            onClick={() => onNavigate(child.path)}
                          >
                            <ChildIcon className="h-4 w-4" aria-hidden />
                            {child.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                      "my-1 flex h-10 shrink-0 items-center gap-0.5 whitespace-nowrap rounded-xl border px-1.5 text-[10px] font-semibold transition-colors xl:px-2 xl:text-[11px] 2xl:text-xs",
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
        </nav>}

        {/* Controls */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-2xl border border-[#e0e8f3] bg-white/75 p-1 shadow-[0_3px_12px_rgba(42,79,154,0.05)]",
            hideShortcuts && "order-last",
          )}
          dir="rtl"
        >
          {isDashboardRoute && <DashboardAppbarIndicators />}

          {/* المزيد popover, desktop only, accordion sections closed by default */}
          {!hideShortcuts && moreGroups.length > 0 && (
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
