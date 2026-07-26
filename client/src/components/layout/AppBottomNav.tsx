import {
  Activity,
  Archive,
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock,
  DollarSign,
  GripVertical,
  Hospital,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Network,
  Pencil,
  Settings,
  Syringe,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeNavPath,
  pathGrantedByRoots,
} from "@/lib/nav-permission-utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  adminNavGroups,
  staffNavGroups,
  type NavGroupSection,
  type NavLeaf,
} from "./AppNav";

// All possible tabs per role
const ALL_ADMIN_TABS = [
  { key: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard, paths: ["/dashboard"] },
  { key: "patients",  label: "مركز المريض", icon: Network,          paths: ["/patient-hub", "/patients-hub", "/patients", "/followups", "/visits"] },
  { key: "accounting",label: "الحسابات",    icon: Banknote,         paths: ["/accounting"] },
  { key: "salary",    label: "المرتبات",    icon: DollarSign,       paths: ["/salary"] },
  { key: "attendance",label: "الحضور",      icon: Activity,         paths: ["/attendance"] },
  { key: "kf",        label: "كفرالشيخ",   icon: Hospital,         paths: ["/kf"] },
  { key: "stockroom", label: "المخزن",      icon: Archive,          paths: ["/stockroom"] },
  { key: "marketing", label: "التسويق",     icon: Megaphone,        paths: ["/marketing"] },
  { key: "admin",     label: "الإدارة",     icon: Settings,         paths: ["/admin-hub"] },
] as const;

const ALL_STAFF_TABS = [
  { key: "today",      label: "اليوم",        icon: Clock,        paths: ["/today", "/today-patients", "/dashboard"] },
  { key: "patients",   label: "مركز المريض",  icon: Users,        paths: ["/patient-hub", "/patients-hub", "/patients", "/followups", "/visits"] },
  { key: "operations", label: "العمليات",     icon: Syringe,      paths: ["/operations"] },
  { key: "accounting", label: "الحسابات",     icon: Banknote,     paths: ["/accounting"] },
  { key: "kf",         label: "كفرالشيخ",    icon: Hospital,     paths: ["/kf"] },
  { key: "roster",     label: "الروستر",      icon: CalendarDays, paths: ["/attendance/shift-schedule"] },
] as const;

type AdminKey = (typeof ALL_ADMIN_TABS)[number]["key"];
type StaffKey = (typeof ALL_STAFF_TABS)[number]["key"];

const DEFAULT_ADMIN_KEYS: AdminKey[] = ["dashboard", "patients", "accounting", "salary", "attendance", "kf", "admin"];
const DEFAULT_STAFF_KEYS: StaffKey[] = ["today", "patients", "operations", "accounting", "kf"];
const DEFAULT_STAFF_KEYS_DR: StaffKey[] = [...DEFAULT_STAFF_KEYS, "roster"];

const STORAGE_KEY_ADMIN = "selrs:bottom-nav-admin";
const STORAGE_KEY_STAFF = "selrs:bottom-nav-staff";

function loadKeys<T extends string>(storageKey: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as T[];
    }
  } catch {}
  return defaults;
}

function saveKeys(storageKey: string, keys: string[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(keys)); } catch {}
}

function isTabActive(location: string, paths: readonly string[]): boolean {
  const base = location.split("?")[0];
  return paths.some((p) => base === p || base.startsWith(`${p}/`));
}

interface AppBottomNavProps {
  location: string;
  onNavigate: (path: string) => void;
  onOpenMore?: () => void;
  moreOpen?: boolean;
  isAdmin?: boolean;
  userRole?: string;
  allowedRoots?: unknown;
  permissionsLoaded?: boolean;
}

export function AppBottomNav({
  location,
  onNavigate,
  onOpenMore,
  moreOpen,
  isAdmin = false,
  userRole = "",
  allowedRoots,
  permissionsLoaded = true,
}: AppBottomNavProps) {
  const storageKey = isAdmin ? STORAGE_KEY_ADMIN : STORAGE_KEY_STAFF;
  const allTabs = isAdmin ? ALL_ADMIN_TABS : ALL_STAFF_TABS;
  const defaultKeys = isAdmin
    ? DEFAULT_ADMIN_KEYS
    : ["doctor", "technician"].includes(userRole)
      ? DEFAULT_STAFF_KEYS_DR
      : DEFAULT_STAFF_KEYS;

  const [enabledKeys, setEnabledKeys] = useState<string[]>(() =>
    loadKeys(storageKey, defaultKeys as unknown as string[]),
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    saveKeys(storageKey, enabledKeys);
  }, [storageKey, enabledKeys]);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-app-scroll-container]",
    );
    if (!scrollContainer) return;

    let lastScrollTop = scrollContainer.scrollTop;
    const handleScroll = () => {
      const nextScrollTop = scrollContainer.scrollTop;
      const delta = nextScrollTop - lastScrollTop;
      // Android's overscroll "bounce" jitters scrollTop by a pixel or two at
      // the very bottom, flipping delta's sign every frame and rapidly
      // toggling navHidden (visible as the nav bar shaking). Treat "at/near
      // the bottom" as a stability zone, same as the existing top-of-scroll one.
      const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const nearBottom = maxScrollTop - nextScrollTop <= 12;

      if (nextScrollTop <= 12 || nearBottom || delta < -4) {
        setNavHidden(false);
      } else if (delta > 4 && nextScrollTop > 48) {
        setNavHidden(true);
      }

      lastScrollTop = nextScrollTop;
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setNavHidden(false);
  }, [location]);

  const toggleKey = useCallback((key: string) => {
    setEnabledKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  const leafVisible = useCallback(
    (leaf: NavLeaf): boolean => {
      const allowedRoles = leaf.roles?.map((role) => role.toLowerCase());
      if (allowedRoles?.length && !allowedRoles.includes(userRole)) return false;
      if (isAdmin) return true;
      if (!permissionsLoaded) return false;
      const cleanPath = normalizeNavPath(leaf.path.split("?")[0]);
      return pathGrantedByRoots(cleanPath, allowedRoots as any);
    },
    [allowedRoots, isAdmin, permissionsLoaded, userRole],
  );

  // Filter tabs: enabled + permission check for staff
  const visibleTabs = allTabs.filter((tab) => {
    if (!enabledKeys.includes(tab.key)) return false;
    if (isAdmin) return true;
    if (tab.key === "roster" && !["doctor", "technician"].includes(userRole)) return false;
    if (tab.key === "roster" && ["doctor", "technician"].includes(userRole)) return true;
    if (!permissionsLoaded) return false;
    const cleanPath = normalizeNavPath(tab.paths[0]?.split("?")[0] ?? "");
    return pathGrantedByRoots(cleanPath, allowedRoots as any);
  });

  const moreGroups = useMemo(() => {
    const navGroups = isAdmin ? adminNavGroups : staffNavGroups;
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

    return [
      {
        label: "سجل",
        navKey: "records",
        groupPath: "/patients-hub",
        items: recordItems,
      },
      ...remainingSections,
    ].filter((section) => section.items.length > 0);
  }, [isAdmin, leafVisible]);

  const handleMoreNavigate = (path: string) => {
    setMoreSheetOpen(false);
    setOpenSections({});
    onNavigate(path);
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        dir="rtl"
        className={cn(
          "md:hidden shrink-0 overflow-hidden bg-background transition-[max-height,transform,padding,border-color] duration-200 ease-out print:hidden",
          navHidden && !sheetOpen && !moreSheetOpen
            ? "pointer-events-none max-h-0 translate-y-full border-transparent"
            : "max-h-24 translate-y-0 border-t border-border",
        )}
        style={{
          paddingBottom:
            navHidden && !sheetOpen && !moreSheetOpen
              ? "0px"
              : "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex h-14 items-stretch overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(location, tab.paths);
            return (
              <button
                key={tab.key}
                type="button"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors shrink-0",
                  active
                    ? "text-primary"
                    : "text-muted-foreground/70 hover:text-muted-foreground",
                )}
                onClick={() => onNavigate(tab.paths[0])}
              >
                {active && (
                  <span className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary" aria-hidden />
                )}
                <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                <span className={cn("whitespace-nowrap text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            type="button"
            aria-label="المزيد"
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors shrink-0",
              moreSheetOpen || moreOpen ? "text-primary" : "text-muted-foreground/70 hover:text-muted-foreground",
            )}
            onClick={() => {
              setMoreSheetOpen(true);
              onOpenMore?.();
            }}
          >
            <LayoutGrid className="size-5 shrink-0" strokeWidth={moreSheetOpen || moreOpen ? 2.2 : 1.8} />
            <span className={cn("whitespace-nowrap text-[10px] leading-none", moreSheetOpen || moreOpen ? "font-semibold" : "font-medium")}>
              المزيد
            </span>
          </button>

        </div>
      </nav>

      <Sheet
        open={moreSheetOpen}
        onOpenChange={(open) => {
          setMoreSheetOpen(open);
          if (!open) setOpenSections({});
        }}
      >
        <SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto rounded-t-xl p-0" dir="rtl">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-right text-base">المزيد</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-border/70 pb-[env(safe-area-inset-bottom)]">
            {moreGroups.map((group, index) => {
              const key = group.navKey ?? `${group.label}-${index}`;
              const isSingle = group.items.length === 1;
              const isOpen = openSections[key] ?? false;
              return (
                <section key={key}>
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-start text-sm font-semibold text-foreground"
                    onClick={() => {
                      if (isSingle) {
                        handleMoreNavigate(group.items[0].path);
                      } else {
                        toggleSection(key);
                      }
                    }}
                  >
                    <span>{group.label}</span>
                    {!isSingle && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    )}
                  </button>
                  {!isSingle && isOpen && (
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isTabActive(location, [item.path]);
                        return (
                          <button
                            key={item.path}
                            type="button"
                            className={cn(
                              "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-start text-xs font-medium transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground hover:bg-muted",
                            )}
                            onClick={() => handleMoreNavigate(item.path)}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="min-w-0 truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            <div className="p-3">
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-start text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                onClick={() => {
                  setMoreSheetOpen(false);
                  setOpenSections({});
                  setSheetOpen(true);
                }}
              >
                <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>تخصيص شريط التنقل</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-2xl" dir="rtl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-right">تخصيص شريط التنقل</SheetTitle>
          </SheetHeader>
          <p className="text-xs text-muted-foreground mb-4">اختر الصفحات التي تظهر في شريط التنقل السفلي</p>
          <div className="space-y-2">
            {allTabs.map((tab) => {
              const Icon = tab.icon;
              const enabled = enabledKeys.includes(tab.key);
              return (
                <div
                  key={tab.key}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggleKey(tab.key)}
                  />
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
