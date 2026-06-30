import {
  Activity,
  Archive,
  Banknote,
  CalendarDays,
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
import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

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
  onOpenMore: () => void;
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

  useEffect(() => {
    saveKeys(storageKey, enabledKeys);
  }, [storageKey, enabledKeys]);

  const toggleKey = useCallback((key: string) => {
    setEnabledKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

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

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        dir="rtl"
        className="md:hidden shrink-0 border-t border-border bg-background print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
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
              moreOpen ? "text-primary" : "text-muted-foreground/70 hover:text-muted-foreground",
            )}
            onClick={onOpenMore}
          >
            <LayoutGrid className="size-5 shrink-0" strokeWidth={moreOpen ? 2.2 : 1.8} />
            <span className={cn("whitespace-nowrap text-[10px] leading-none", moreOpen ? "font-semibold" : "font-medium")}>
              المزيد
            </span>
          </button>

          {/* Customize button */}
          <button
            type="button"
            aria-label="تخصيص"
            className="relative flex flex-col items-center justify-center gap-0.5 px-3 transition-colors text-muted-foreground/50 hover:text-muted-foreground shrink-0"
            onClick={() => setSheetOpen(true)}
          >
            <Pencil className="size-4 shrink-0" strokeWidth={1.8} />
            <span className="whitespace-nowrap text-[9px] leading-none font-medium">تخصيص</span>
          </button>
        </div>
      </nav>

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
