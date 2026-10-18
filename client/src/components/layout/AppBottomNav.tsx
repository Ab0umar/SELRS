import {
  Activity,
  Archive,
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock,
  DollarSign,
  Ellipsis,
  ArrowUp,
  ArrowDown,
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
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  moveBottomNavKey,
  normalizeBottomNavKeys,
} from "@/lib/bottomNavPreferences";
import {
  adminNavGroups,
  staffNavGroups,
  type NavGroupSection,
  type NavLeaf,
} from "./AppNav";
import { Button } from "@/components/ui/button";

// All possible tabs per role
const ALL_ADMIN_TABS = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    paths: ["/dashboard"],
  },
  {
    key: "patients",
    label: "مركز المريض",
    icon: Network,
    paths: [
      "/patient-hub",
      "/patients-hub",
      "/patients",
      "/followups",
      "/visits",
    ],
  },
  {
    key: "operations",
    label: "العمليات",
    icon: Syringe,
    paths: ["/operations"],
  },
  {
    key: "accounting",
    label: "الحسابات",
    icon: Banknote,
    paths: ["/accounting"],
  },
  { key: "salary", label: "المرتبات", icon: DollarSign, paths: ["/salary"] },
  {
    key: "attendance",
    label: "الحضور",
    icon: Activity,
    paths: ["/attendance"],
  },
  { key: "kf", label: "كفرالشيخ", icon: Hospital, paths: ["/kf"] },
  { key: "stockroom", label: "المخزن", icon: Archive, paths: ["/stockroom"] },
  {
    key: "marketing",
    label: "التسويق",
    icon: Megaphone,
    paths: ["/marketing"],
  },
  { key: "admin", label: "الإدارة", icon: Settings, paths: ["/admin-hub"] },
] as const;

const ALL_STAFF_TABS = [
  {
    key: "today",
    label: "اليوم",
    icon: Clock,
    paths: ["/today", "/today-patients", "/dashboard"],
  },
  {
    key: "patients",
    label: "مركز المريض",
    icon: Users,
    paths: [
      "/patient-hub",
      "/patients-hub",
      "/patients",
      "/followups",
      "/visits",
    ],
  },
  {
    key: "operations",
    label: "العمليات",
    icon: Syringe,
    paths: ["/operations"],
  },
  {
    key: "accounting",
    label: "الحسابات",
    icon: Banknote,
    paths: ["/accounting"],
  },
  { key: "kf", label: "كفرالشيخ", icon: Hospital, paths: ["/kf"] },
  {
    key: "roster",
    label: "الروستر",
    icon: CalendarDays,
    paths: ["/attendance/shift-schedule"],
  },
] as const;

type AdminKey = (typeof ALL_ADMIN_TABS)[number]["key"];
type StaffKey = (typeof ALL_STAFF_TABS)[number]["key"];

const DEFAULT_ADMIN_KEYS: AdminKey[] = [
  "dashboard",
  "patients",
  "operations",
  "accounting",
  "salary",
  "attendance",
  "kf",
  "admin",
];
const DEFAULT_STAFF_KEYS: StaffKey[] = [
  "today",
  "patients",
  "operations",
  "accounting",
  "kf",
];
const DEFAULT_STAFF_KEYS_DR: StaffKey[] = [...DEFAULT_STAFF_KEYS, "roster"];

const STORAGE_KEY_ADMIN = "selrs:bottom-nav-admin";
const STORAGE_KEY_STAFF = "selrs:bottom-nav-staff";

function getStorageKey(isAdmin: boolean, userRole: string): string {
  if (isAdmin) return STORAGE_KEY_ADMIN;
  if (["doctor", "technician", "manager"].includes(userRole)) {
    return `${STORAGE_KEY_STAFF}-${userRole}`;
  }
  return STORAGE_KEY_STAFF;
}

function loadKeys(
  storageKey: string,
  defaults: readonly string[],
  allowed: readonly string[],
): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = normalizeBottomNavKeys(JSON.parse(raw), allowed);
      if (parsed) return parsed;
    }
  } catch {}
  return [...defaults];
}

function saveKeys(storageKey: string, keys: string[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {}
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
  const isRosterRole = ["doctor", "technician", "manager"].includes(userRole);
  const storageKey = getStorageKey(isAdmin, userRole);
  const allTabs = isAdmin ? ALL_ADMIN_TABS : ALL_STAFF_TABS;
  const defaultKeys = isAdmin
    ? DEFAULT_ADMIN_KEYS
    : isRosterRole
      ? DEFAULT_STAFF_KEYS_DR
      : DEFAULT_STAFF_KEYS;

  const [preferences, setPreferences] = useState(() => ({
    storageKey,
    keys: loadKeys(
      storageKey,
      defaultKeys,
      allTabs.map((tab) => tab.key),
    ),
  }));
  const enabledKeys =
    preferences.storageKey === storageKey
      ? preferences.keys
      : loadKeys(
          storageKey,
          defaultKeys,
          allTabs.map((tab) => tab.key),
        );
  const setEnabledKeys = useCallback(
    (update: (keys: string[]) => string[]) => {
      setPreferences((previous) => ({
        storageKey,
        keys: update(
          previous.storageKey === storageKey
            ? previous.keys
            : loadKeys(
                storageKey,
                defaultKeys,
                allTabs.map((tab) => tab.key),
              ),
        ),
      }));
    },
    [storageKey, allTabs, defaultKeys],
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [navHidden, setNavHidden] = useState(false);
  const navSuppressed = navHidden && !sheetOpen && !moreSheetOpen;

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
      const maxScrollTop =
        scrollContainer.scrollHeight - scrollContainer.clientHeight;
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
  }, [setEnabledKeys]);

  const leafVisible = useCallback(
    (leaf: NavLeaf): boolean => {
      const allowedRoles = leaf.roles?.map((role) => role.toLowerCase());
      if (allowedRoles?.length && !allowedRoles.includes(userRole))
        return false;
      if (isAdmin) return true;
      if (!permissionsLoaded) return false;
      const cleanPath = normalizeNavPath(leaf.path.split("?")[0]);
      return pathGrantedByRoots(cleanPath, allowedRoots as any);
    },
    [allowedRoots, isAdmin, permissionsLoaded, userRole],
  );

  // Filter tabs: enabled + permission check for staff
  const availableTabs = allTabs.filter((tab) => {
    if (isAdmin) return true;
    if (tab.key === "roster") return isRosterRole;
    if (!permissionsLoaded) return false;
    const cleanPath = normalizeNavPath(tab.paths[0]?.split("?")[0] ?? "");
    return pathGrantedByRoots(cleanPath, allowedRoots as any);
  });
  const orderedKeys = [...enabledKeys];
  if (isRosterRole && !orderedKeys.includes("roster"))
    orderedKeys.push("roster");
  const visibleTabs = orderedKeys.flatMap((key) =>
    availableTabs.filter((tab) => tab.key === key),
  );
  const customizableTabs = [
    ...visibleTabs,
    ...availableTabs.filter((tab) => !orderedKeys.includes(tab.key)),
  ];
  const moveKey = (key: string, direction: -1 | 1) => {
    const reordered = moveBottomNavKey(
      visibleTabs.map((tab) => tab.key),
      key,
      direction,
    );
    setEnabledKeys((previous) => [
      ...reordered,
      ...previous.filter((item) => !reordered.includes(item)),
    ]);
  };
  const mobilePrimaryTabs = visibleTabs.slice(0, 5);
  const mobileOverflowItems: NavLeaf[] = visibleTabs.slice(5).map((tab) => ({
    icon: tab.icon,
    label: tab.label,
    path: tab.paths[0],
  }));

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
      ["/records/patients", "سجلات المرضى"],
      ["/records/medical", "السجلات الطبية"],
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
      "/pentacam",
      "/records/medical",
      "/records/patients",
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
    const mobileOverflowGroup =
      mobileOverflowItems.length > 0
        ? [
            {
              label: "روابط الشريط",
              navKey: "mobile-primary",
              items: mobileOverflowItems,
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
      ...mobileOverflowGroup,
      ...remainingSections,
    ].filter((section) => section.items.length > 0);
  }, [isAdmin, leafVisible, mobileOverflowItems]);

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
        data-app-bottom-nav
        aria-label="التنقل الرئيسي"
        inert={navSuppressed}
        aria-hidden={navSuppressed ? true : undefined}
        dir="rtl"
        className={cn(
          "fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-40 md:hidden overflow-hidden rounded-[28px] border border-border bg-card text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.14)] transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none print:hidden",
          navSuppressed
            ? "pointer-events-none translate-y-[calc(100%+24px+env(safe-area-inset-bottom))] opacity-0"
            : "translate-y-0 opacity-100",
        )}
        style={{
          paddingBottom: "0px",
        }}
      >
        <div className="flex h-16 items-stretch gap-1 overflow-hidden px-1">
          {mobilePrimaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(location, tab.paths);
            return (
              <Button variant="bare"
                key={tab.key}
                type="button"
                aria-label={tab.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-16 flex-1 shrink-0 flex-col items-center justify-center gap-1 px-2 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary",
                  active
                    ? "text-foreground bg-muted/70 rounded-[22px]"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onNavigate(tab.paths[0])}
              >
                <Icon
                  className="size-6 shrink-0"
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {tab.key !== "dashboard" && <span
                  className={cn(
                    "max-w-full whitespace-normal text-center text-xs leading-tight",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {tab.label}
                </span>}
              </Button>
            );
          })}

          {/* More button */}
          <Button variant="bare"
            ref={moreButtonRef}
            type="button"
            aria-label="المزيد"
            aria-expanded={moreSheetOpen || moreOpen}
            className={cn(
              "relative flex min-w-16 flex-1 shrink-0 flex-col items-center justify-center gap-1 px-2 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary",
              moreSheetOpen || moreOpen
                ? "text-foreground bg-muted/70 rounded-[22px]"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setMoreSheetOpen(true);
              onOpenMore?.();
            }}
          >
            <Ellipsis
              className="size-6 shrink-0"
              strokeWidth={moreSheetOpen || moreOpen ? 2.2 : 1.8}
            />
            <span
              className={cn(
                "whitespace-nowrap text-xs leading-tight",
                moreSheetOpen || moreOpen ? "font-semibold" : "font-medium",
              )}
            >
              المزيد
            </span>
          </Button>
        </div>
      </nav>

      <Sheet
        open={moreSheetOpen}
        onOpenChange={(open) => {
          setMoreSheetOpen(open);
          if (!open) setOpenSections({});
        }}
      >
        <SheetContent
          side="bottom"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            moreButtonRef.current?.focus();
          }}
          className="max-h-[82vh] overflow-y-auto rounded-t-xl p-0"
          dir="rtl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-start text-base">المزيد</SheetTitle>
          </SheetHeader>
          <div className="divide-y divide-border/70 pb-[env(safe-area-inset-bottom)]">
            {moreGroups.map((group, index) => {
              const key = group.navKey ?? `${group.label}-${index}`;
              const isSingle = group.items.length === 1;
              const isOpen = openSections[key] ?? false;
              return (
                <section key={key}>
                  <Button variant="bare"
                    type="button"
                    aria-expanded={isSingle ? undefined : isOpen}
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
                  </Button>
                  {!isSingle && isOpen && (
                    <div className="grid grid-cols-2 gap-2 p-3">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isTabActive(location, [item.path]);
                        return (
                          <Button variant="bare"
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
                            <span className="min-w-0 break-words">
                              {item.label}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
            <div className="p-3">
              <Button variant="bare"
                type="button"
                className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-start text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                onClick={() => {
                  setMoreSheetOpen(false);
                  setOpenSections({});
                  setSheetOpen(true);
                }}
              >
                <Pencil
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span>تخصيص شريط التنقل</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] overflow-y-auto rounded-t-2xl"
          dir="rtl"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-start">تخصيص شريط التنقل</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {customizableTabs.map((tab) => {
              const Icon = tab.icon;
              const rosterLocked = tab.key === "roster" && isRosterRole;
              const enabled = rosterLocked || enabledKeys.includes(tab.key);
              const position = visibleTabs.findIndex(
                (item) => item.key === tab.key,
              );
              return (
                <div
                  key={tab.key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="bare"
                      type="button"
                      title={`تقديم ${tab.label}`}
                      aria-label={`تقديم ${tab.label}`}
                      disabled={!enabled || position <= 0}
                      onClick={() => moveKey(tab.key, -1)}
                      className="flex size-11 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <ArrowUp className="size-4" aria-hidden />
                    </Button>
                    <Button variant="bare"
                      type="button"
                      title={`تأخير ${tab.label}`}
                      aria-label={`تأخير ${tab.label}`}
                      disabled={!enabled || position === visibleTabs.length - 1}
                      onClick={() => moveKey(tab.key, 1)}
                      className="flex size-11 items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <ArrowDown className="size-4" aria-hidden />
                    </Button>
                    <Switch
                      checked={enabled}
                      disabled={rosterLocked}
                      onCheckedChange={() => toggleKey(tab.key)}
                      aria-label={
                        rosterLocked
                          ? "الروستر متاح دائما لهذا الحساب"
                          : `إظهار ${tab.label}`
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
