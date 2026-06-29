import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useMedicalFileLauncher } from "@/hooks/useMedicalFileLauncher";
import { AppointmentsSection } from "@/components/dashboard/appointments-activity";
import {
  Clock,
  Activity,
  Eye,
  Users,
  RefreshCw,
  Syringe,
  CircleDot,
  Glasses,
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Zap,
  Cpu,
  UserX,
  Shield,
  Settings,
  Stethoscope,
  Database,
  Bell,
  HeartPulse,
  Terminal,
} from "lucide-react";
import { serviceTypeLabels } from "@/lib/dashboard-data";
import { usePermissions } from "@/hooks/usePermissions";
import { trpc } from "@/lib/trpc";
import { useTodayQueuePatientsMerged } from "@/hooks/useTodayQueuePatientsMerged";
import { cn } from "@/lib/utils";
import { OperationsBookingQuickDialog } from "@/components/operations/OperationsBookingQuickDialog";
import { getLocalDateIso } from "@/hooks/operations/operationsShared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatMoneyAr } from "../features/accounting/accountingFormat";

const LazyPortalBookings = lazy(
  () => import("@/features/admin/AdminPortalBookings"),
);

// ─── Lazy charts ────────────────────────────────────────────────────────────
const ChartLoading = () => (
  <div className="h-[200px] animate-pulse rounded-lg bg-muted/40" />
);
const PatientTrendChart = lazy(() =>
  import("@/components/dashboard/charts").then((m) => ({
    default: m.PatientTrendChart,
  })),
);
const DepartmentWorkloadChart = lazy(() =>
  import("@/components/dashboard/charts").then((m) => ({
    default: m.DepartmentWorkloadChart,
  })),
);

// ─── Tabs config ────────────────────────────────────────────────────────────
type TabId =
  | "today"
  | "hub"
  | "accounting"
  | "attendance"
  | "stockroom"
  | "bookings"
  | "admin";

const TABS: Array<{
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconWrapCls: string;
  permPath: string | null;
}> = [
  {
    id: "today",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    iconWrapCls: "bg-primary/10 text-primary",
    permPath: null, // always visible
  },
  {
    id: "hub",
    label: "مركز المريض",
    icon: Users,
    iconWrapCls: "bg-secondary/15 text-secondary",
    permPath: "/patient-hub",
  },
  {
    id: "accounting",
    label: "الحسابات",
    icon: Wallet,
    iconWrapCls: "bg-warning/20 text-warning",
    permPath: "/accounting",
  },
  {
    id: "attendance",
    label: "الحضور",
    icon: Clock,
    iconWrapCls: "bg-success/15 text-success",
    permPath: "/attendance",
  },
  {
    id: "stockroom",
    label: "المخزن",
    icon: Archive,
    iconWrapCls: "bg-muted text-muted-foreground",
    permPath: "/stockroom",
  },
  {
    id: "bookings",
    label: "الحجوزات",
    icon: CalendarDays,
    iconWrapCls: "bg-info/15 text-info",
    permPath: "/booking-triage/portal-bookings",
  },
  {
    id: "admin",
    label: "الإدارة",
    icon: Shield,
    iconWrapCls: "bg-slate-900 text-white",
    permPath: "/admin-hub",
  },
];

// ─── Shared helpers ──────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function SectionHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
      <h3 className="text-base font-semibold leading-tight text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-background shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  valueClass = "",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        <span>{label}</span>
      </div>
      <span className={cn("font-semibold tabular-nums", valueClass)}>
        {value}
      </span>
    </div>
  );
}

function PanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      {label}
      <ChevronLeft className="h-3 w-3" aria-hidden />
    </Link>
  );
}

// ─── Today panel ─────────────────────────────────────────────────────────────
function ServiceBreakdown({ selectedDate }: { selectedDate: string }) {
  const { merged, isLoading } = useTodayQueuePatientsMerged(selectedDate);

  if (isLoading) {
    return (
      <div className="space-y-3 py-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-background px-3 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <Skeleton className="h-2.5 w-32 rounded-full" />
              </div>
              <Skeleton className="h-8 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const serviceCounts = merged.reduce<Record<string, number>>((acc, p) => {
    const k = String(p.serviceType ?? "unknown");
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const colors: Record<string, string> = {
    consultant: "bg-primary",
    specialist: "bg-primary/60",
    lasik: "bg-secondary",
    surgery: "bg-warning",
    external: "bg-muted-foreground/40",
  };

  const total = merged.length;
  const items = Object.entries(serviceCounts).map(([key, count]) => ({
    label: serviceTypeLabels[key as keyof typeof serviceTypeLabels] || key,
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
    color: colors[key] || "bg-muted-foreground/40",
  }));

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        لا يوجد مرضى اليوم
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className={cn("inline-block h-2 w-2 rounded-full", item.color)}
                aria-hidden
              />
              <span className="font-medium">{item.label}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {item.count}، {item.pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full w-full origin-right rounded-full transition-transform duration-500 ease-out",
                item.color,
              )}
              style={{ transform: `scaleX(${item.pct / 100})` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MedicalTotals() {
  const q = trpc.medical.getMedicalTotals.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const fmt = (n: number | undefined, loading: boolean) =>
    loading ? "-" : (n ?? 0).toLocaleString("ar-EG");
  const t = q.data;

  return (
    <div className="space-y-1">
      {[
        {
          label: "إجمالي المرضى",
          value: fmt(t?.patients, q.isLoading),
          icon: Users,
        },
        { label: "Autoref", value: fmt(t?.autoref, q.isLoading), icon: Eye },
        {
          label: "Refraction",
          value: fmt(t?.refraction, q.isLoading),
          icon: Glasses,
        },
        {
          label: "بنتاكام",
          value: fmt(t?.pentacam, q.isLoading),
          icon: CircleDot,
        },
        {
          label: "عمليات",
          value: fmt(t?.operations, q.isLoading),
          icon: Syringe,
        },
      ].map((r) => (
        <StatRow key={r.label} label={r.label} value={r.value} icon={r.icon} />
      ))}
    </div>
  );
}

const LEAVE_TYPE_AR: Record<string, string> = {
  annual: "سنوية",
  sick: "مرضية",
  unpaid: "بدون راتب",
  other: "أخرى",
};

function OffUsersTodayCard() {
  const q = (trpc as any).attendance.offTodayList.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const list: Array<{
    empCd: string;
    fullName: string;
    department: string | null;
    type: string;
    approved: boolean;
  }> = q.data ?? [];

  return (
    <div className="rounded-lg border border-border/70 bg-background">
      <SectionHeader title="إجازات اليوم">
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/15 px-1.5 text-[11px] font-semibold text-warning tabular-nums">
          {q.isLoading ? "…" : list.length}
        </span>
      </SectionHeader>
      <div className="px-4 py-3">
        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 rounded" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            لا توجد إجازات اليوم
          </p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((emp) => (
              <li key={emp.empCd} className="flex items-center gap-2 text-sm">
                <UserX
                  className="h-3.5 w-3.5 shrink-0 text-warning/70"
                  aria-hidden
                />
                <span className="flex-1 truncate font-medium">
                  {emp.fullName}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {LEAVE_TYPE_AR[emp.type] ?? emp.type}
                  {!emp.approved && " (معلق)"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!q.isLoading && list.length > 0 && (
        <div className="border-t border-border/40 px-4 py-2">
          <Link
            href="/attendance/employees"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            عرض تفاصيل الحضور
            <ChevronLeft className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

function TodayPanel({
  selectedDate,
  onSelectedDateChange,
  openMedicalFileForPatient,
}: {
  selectedDate: string;
  onSelectedDateChange: (d: string) => void;
  openMedicalFileForPatient: (id: number) => void;
}) {
  const { merged, isLoading: queueLoading } =
    useTodayQueuePatientsMerged(selectedDate);
  const opsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false },
  );

  const [totalsOpen, setTotalsOpen] = useState(true);
  const [subTab, setSubTab] = useState<"queue" | "analytics">("queue");

  const total = merged.length;
  const treated = merged.filter((p) => p.queueStatus === "treated").length;
  const waiting = total - treated;
  const completionRate = total > 0 ? Math.round((treated / total) * 100) : 0;
  const opsCount = opsQuery.data?.length ?? 0;

  const tiles = [
    {
      label: "مرضى اليوم",
      value: total,
      icon: Users,
      cls: "bg-primary text-primary-foreground",
      bgCls:
        "bg-primary/5 border-primary/20 hover:border-primary/40 text-foreground",
      labelCls: "text-primary/80",
    },
    {
      label: "تم معالجتهم",
      value: treated,
      icon: Activity,
      cls: "bg-success text-white",
      bgCls:
        "bg-success/5 border-success/20 hover:border-success/40 text-foreground",
      labelCls: "text-success/80",
    },
    {
      label: "في الانتظار",
      value: waiting,
      icon: Clock,
      cls: "bg-warning text-white",
      bgCls:
        "bg-warning/5 border-warning/20 hover:border-warning/40 text-foreground",
      labelCls: "text-warning/80",
    },
    {
      label: "العمليات",
      value: opsCount,
      icon: Syringe,
      cls: "bg-secondary text-secondary-foreground",
      bgCls:
        "bg-secondary/5 border-secondary/20 hover:border-secondary/40 text-foreground",
      labelCls: "text-secondary/80",
    },
  ];

  if (queueLoading || opsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setTotalsOpen((value) => !value)}
          className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-background px-4 py-3 text-right transition-colors hover:bg-muted/40"
          aria-expanded={totalsOpen}
        >
          <span className="text-sm font-bold text-foreground">
            إحصائيات اليوم
          </span>
          {totalsOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        {totalsOpen && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {tiles.map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/50 bg-background px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-20 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Skeleton className="h-10 rounded-lg" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub tabs configuration */}
      <div className="flex border-b border-border/40 gap-4 mb-4">
        <button
          onClick={() => setSubTab("queue")}
          className={cn(
            "px-4 py-2.5 text-sm font-bold border-b-2 transition-colors duration-200 cursor-pointer",
            subTab === "queue"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          العمل اليومي والانتظار
        </button>
        <button
          onClick={() => setSubTab("analytics")}
          className={cn(
            "px-4 py-2.5 text-sm font-bold border-b-2 transition-colors duration-200 cursor-pointer",
            subTab === "analytics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          التحليلات وإحصائيات اليوم
        </button>
      </div>

      {subTab === "queue" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setTotalsOpen((value) => !value)}
            className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-background px-4 py-3 text-right transition-colors hover:bg-muted/40"
            aria-expanded={totalsOpen}
          >
            <span className="text-sm font-bold text-foreground">
              إحصائيات اليوم
            </span>
            <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              {total.toLocaleString("ar-EG")} مريض
              {totalsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </span>
          </button>
          {totalsOpen && (
            <>
              {/* Tiles */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {tiles.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.label}
                      className={cn(
                        "rounded-lg border px-3.5 py-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
                        t.bgCls,
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md shadow-xs",
                            t.cls,
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xl font-bold leading-none tabular-nums">
                            {t.value}
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-xs font-semibold",
                              t.labelCls,
                            )}
                          >
                            {t.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Completion bar */}
              <div className="rounded-lg border border-primary/10 bg-primary/5 px-4 py-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 text-sm font-bold text-foreground">
                    نسبة إنجاز اليوم
                  </span>
                  <div
                    className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e2edf7]"
                    role="progressbar"
                    aria-valuenow={completionRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="نسبة الإنجاز"
                  >
                    <div
                      className={cn(
                        "h-full w-full origin-right rounded-full transition-transform duration-500 ease-out",
                        completionRate >= 80
                          ? "bg-success"
                          : completionRate >= 50
                            ? "bg-primary"
                            : "bg-secondary",
                      )}
                      style={{ transform: `scaleX(${completionRate / 100})` }}
                    />
                  </div>
                  <span className="w-10 text-left text-sm font-bold text-foreground tabular-nums">
                    {completionRate}%
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Appointments list occupying full width */}
          <Surface className="w-full">
            <SectionHeader title="مرضى اليوم و العمليات" />
            <div className="p-3">
              <AppointmentsSection
                selectedDate={selectedDate}
                onSelectedDateChange={onSelectedDateChange}
                onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
              />
            </div>
          </Surface>
        </div>
      )}

      {subTab === "analytics" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
          {/* Left: Charts */}
          <div className="space-y-5 lg:col-span-2">
            <Surface>
              <SectionHeader title="اتجاه المرضى" />
              <div className="p-3 sm:p-4">
                <Suspense fallback={<ChartLoading />}>
                  <PatientTrendChart />
                </Suspense>
              </div>
            </Surface>
            <Surface>
              <SectionHeader title="أقسام المركز" />
              <div className="p-3 sm:p-4">
                <Suspense fallback={<ChartLoading />}>
                  <DepartmentWorkloadChart />
                </Suspense>
              </div>
            </Surface>
          </div>

          {/* Right: Sidebar statistics */}
          <div className="space-y-4">
            <Surface className="overflow-hidden">
              <SectionHeader title="توزيع الخدمات" />
              <div className="px-4 py-3.5">
                <ServiceBreakdown selectedDate={selectedDate} />
              </div>
            </Surface>
            <OffUsersTodayCard />
            <Surface className="overflow-hidden">
              <SectionHeader title="إحصائيات طبية" />
              <div className="px-4 py-3.5">
                <MedicalTotals />
              </div>
            </Surface>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Patient Hub panel ───────────────────────────────────────────────────────
type RecentPatient = {
  id: number;
  name: string;
  code: string;
  lastVisit: string;
};

function PatientHubPanel() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 350);
  const [recent, setRecent] = useState<RecentPatient[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("hub_recent_patients");
      if (raw) setRecent(JSON.parse(raw) as RecentPatient[]);
    } catch {
      /* ignore */
    }
  }, []);

  const searchQuery = trpc.medical.searchPatients.useQuery(
    { searchTerm: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 },
  );
  const totalsQuery = trpc.medical.getMedicalTotals.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString("ar-EG");

  const showSearch = debouncedQuery.length >= 2;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Search + results */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg border border-border/50 bg-background">
          <SectionHeader title="البحث عن مريض">
            <PanelLink href="/patients" label="كل المرضى" />
          </SectionHeader>
          <div className="p-4">
            <div className="relative">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اسم المريض أو رقم الملف..."
                className="w-full rounded-md border border-border bg-background py-2 pr-9 pl-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                dir="rtl"
              />
            </div>

            {showSearch && (
              <div className="mt-3">
                {searchQuery.isLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-10 rounded-md" />
                    ))}
                  </div>
                )}
                {searchQuery.data && searchQuery.data.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    لا نتائج لـ «{debouncedQuery}»
                  </p>
                )}
                {searchQuery.data && searchQuery.data.length > 0 && (
                  <div className="divide-y divide-border/40">
                    {searchQuery.data.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        href={`/patients/${p.id}`}
                        className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors"
                      >
                        <span className="font-medium">{p.fullName}</span>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {p.patientCode ?? "-"}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showSearch && recent.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  آخر المرضى
                </p>
                <div className="divide-y divide-border/40">
                  {recent.map((p) => (
                    <Link
                      key={p.id}
                      href={`/patients/${p.id}`}
                      className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {p.code}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!showSearch && recent.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                ابحث عن مريض للبدء
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="إحصائيات المرضى">
          <PanelLink href="/patients" label="التفاصيل" />
        </SectionHeader>
        <div className="px-4 py-3 space-y-1">
          {totalsQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 rounded" />
            ))
          ) : (
            <>
              <StatRow
                label="إجمالي المرضى"
                value={fmt(totalsQuery.data?.patients)}
                icon={Users}
              />
              <StatRow
                label="عمليات"
                value={fmt(totalsQuery.data?.operations)}
                icon={Syringe}
              />
              <StatRow
                label="بنتاكام"
                value={fmt(totalsQuery.data?.pentacam)}
                icon={CircleDot}
              />
              <StatRow
                label="Autoref"
                value={fmt(totalsQuery.data?.autoref)}
                icon={Eye}
              />
              <StatRow
                label="Refraction"
                value={fmt(totalsQuery.data?.refraction)}
                icon={Glasses}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Accounting panel ────────────────────────────────────────────────────────
function AccountingPanel() {
  const today = getLocalDateIso();
  const q = trpc.accounting.dashboardSummary.useQuery({ date: today });

  const d = q.data;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Today */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="اليوم">
          <PanelLink href="/accounting" label="الحسابات" />
        </SectionHeader>
        <div className="px-4 py-3 space-y-1">
          {q.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 rounded" />
            ))
          ) : (
            <>
              <StatRow
                label="إيرادات اليوم"
                value={
                  <span className="text-success">
                    {formatMoneyAr(d?.totalRevenueToday ?? 0)} ج.م
                  </span>
                }
                icon={Wallet}
              />
              <StatRow
                label="إيصالات اليوم"
                value={d?.totalReceiptsToday ?? 0}
                icon={Activity}
              />
              <div className="my-2 border-t border-border/40" />
              <StatRow
                label="إيرادات الشهر"
                value={
                  <span>
                    {formatMoneyAr(d?.totalRevenueThisMonth ?? 0)} ج.م
                  </span>
                }
                icon={Wallet}
              />
              <StatRow
                label="إيصالات الشهر"
                value={d?.totalReceiptsThisMonth ?? 0}
                icon={Activity}
              />
            </>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="روابط سريعة" />
        <div className="divide-y divide-border/40 px-4">
          {[
            { href: "/accounting/ledger", label: "الخزنة، قيود" },
            { href: "/accounting/cashbook", label: "الخزنة، رصيد" },
            { href: "/accounting/advances", label: "كشف السلف" },
            { href: "/accounting/loans", label: "القروض" },
            { href: "/accounting", label: "لوحة الحسابات الكاملة" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors"
            >
              <span>{label}</span>
              <ChevronLeft
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Attendance panel ────────────────────────────────────────────────────────
function AttendancePanel() {
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const q = (trpc as any).attendance.dashboardSummary.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const d = q.data;

  const syncMut = (trpc as any).attendance.syncNow.useMutation({
    onSuccess: (res: any) => {
      setSyncMsg(
        res.success
          ? `✓ ${res.rowsInserted ?? 0} سجل جديد`
          : `✗ ${res.error ?? "خطأ"}`,
      );
      q.refetch();
    },
    onError: (err: any) => setSyncMsg(`✗ ${err.message}`),
  });

  const matMut = (trpc as any).attendance.materializeDaily.useMutation({
    onSuccess: (res: any) => {
      setSyncMsg(`✓ حساب ${res.rowsWritten ?? 0} يوم`);
      q.refetch();
    },
    onError: (err: any) => setSyncMsg(`✗ ${err.message}`),
  });

  const handleSync = () => {
    setSyncMsg(null);
    syncMut.mutate({});
  };
  const handleMat = () => {
    setSyncMsg(null);
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 90);
    matMut.mutate({
      fromDate: from.toISOString().slice(0, 10),
      toDate: today.toISOString().slice(0, 10),
    });
  };

  const stats = [
    { label: "حاضر اليوم", value: d?.presentToday ?? 0, cls: "text-success" },
    {
      label: "غائب اليوم",
      value: d?.absentToday ?? 0,
      cls: "text-destructive",
    },
    { label: "متأخر اليوم", value: d?.lateToday ?? 0, cls: "text-warning" },
    { label: "داخل الآن", value: d?.insideNow ?? 0, cls: "text-primary" },
    {
      label: "لم يسجل الخروج أمس",
      value: d?.missingCheckoutYesterday ?? 0,
      cls: "text-secondary",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Stats */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="ملخص الحضور">
          <PanelLink href="/attendance" label="الحضور" />
        </SectionHeader>
        <div className="px-4 py-3 space-y-1">
          {q.isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 rounded" />
              ))
            : stats.map((s) => (
                <StatRow
                  key={s.label}
                  label={s.label}
                  value={
                    <span className={cn("text-lg font-bold", s.cls)}>
                      {s.value}
                    </span>
                  }
                />
              ))}
        </div>
        {!q.isLoading && d?.lastSync && (
          <div className="border-t border-border/40 px-4 py-2.5 text-sm text-muted-foreground">
            آخر مزامنة:{" "}
            <span className="font-medium">
              {d.lastSync.status === "never"
                ? "لم تتم"
                : d.lastSync.status === "ok"
                  ? "ناجحة"
                  : d.lastSync.status === "failed"
                    ? "فشلت"
                    : d.lastSync.status}
            </span>
            {d.lastSync.finishedAt && (
              <span className="mr-2">
                ،{" "}
                {new Date(d.lastSync.finishedAt).toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}
        <div className="border-t border-border/40 px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-2.5 text-sm"
            onClick={handleSync}
            disabled={syncMut.isPending}
          >
            <Zap className="h-3 w-3" />
            {syncMut.isPending ? "جارٍ…" : "مزامنة FK"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-2.5 text-sm"
            onClick={handleMat}
            disabled={matMut.isPending}
          >
            <Cpu className="h-3 w-3" />
            {matMut.isPending ? "جارٍ…" : "إعادة الحساب"}
          </Button>
          {syncMsg && (
            <span className="text-sm text-muted-foreground">{syncMsg}</span>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="روابط سريعة" />
        <div className="divide-y divide-border/40 px-4">
          {[
            { href: "/attendance/live", label: "اللوحة المباشرة" },
            { href: "/attendance/employees", label: "الموظفون" },
            { href: "/attendance/reports", label: "التقارير" },
            { href: "/attendance/settings", label: "الإعدادات" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors"
            >
              <span>{label}</span>
              <ChevronLeft
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Stockroom panel ─────────────────────────────────────────────────────────
const STOCK_CATEGORIES = [
  { key: "قطرات العين", label: "قطرات العين", icon: Eye },
  { key: "غرفة العمليات", label: "غرفة العمليات", icon: Syringe },
  { key: "مستلزمات وأدوات جراحية", label: "مستلزمات جراحية", icon: Archive },
  { key: "لوازم مكتبية", label: "لوازم مكتبية", icon: Activity },
];

function StockroomPanel() {
  const q = trpc.stockroom.getReports.useQuery({});
  const inventory = q.data?.inventory ?? [];

  const getCategoryStats = (key: string) => {
    const items = inventory.filter((i: any) => i.category === key);
    return {
      total: items.length,
      low: items.filter((i: any) => i.status === "كمية قليلة").length,
      out: items.filter((i: any) => i.status === "نفذ المخزون").length,
    };
  };

  const totalAlerts = inventory.filter(
    (i: any) => i.status === "كمية قليلة" || i.status === "نفذ المخزون",
  ).length;

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {!q.isLoading && totalAlerts > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-warning"
            aria-hidden
          />
          <p className="text-sm text-warning font-medium">
            {totalAlerts} صنف يحتاج إعادة تعبئة
          </p>
          <div className="mr-auto">
            <PanelLink href="/stockroom" label="المخزن" />
          </div>
        </div>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {STOCK_CATEGORIES.map(({ key, label, icon: Icon }) => {
          const stats = getCategoryStats(key);
          return (
            <div
              key={key}
              className="rounded-lg border border-border/50 bg-background"
            >
              <div className="flex items-center gap-2.5 border-b border-border/40 px-4 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold">{label}</h3>
              </div>
              <div className="px-4 py-3 space-y-1">
                {q.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 rounded" />
                  ))
                ) : (
                  <>
                    <StatRow label="إجمالي الأصناف" value={stats.total} />
                    <StatRow
                      label="كمية قليلة"
                      value={stats.low}
                      valueClass={stats.low > 0 ? "text-warning" : ""}
                    />
                    <StatRow
                      label="نفذ المخزون"
                      value={stats.out}
                      valueClass={stats.out > 0 ? "text-destructive" : ""}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin panel ─────────────────────────────────────────────────────────────
const ADMIN_GROUPS = [
  {
    title: "الأفراد والصلاحيات",
    description: "حسابات الدخول، الأدوار، وصلاحيات الوصول",
    icon: Users,
    items: [
      {
        href: "/booking-triage/users",
        label: "المستخدمون والموظفون",
        description: "إدارة الحسابات، الحالة، والأدوار",
        icon: Users,
      },
      {
        href: "/booking-triage/permissions",
        label: "صلاحيات الأدوار",
        description: "تحديد صفحات القراءة والتعديل لكل دور",
        icon: Shield,
      },
      {
        href: "/booking-triage/doctors",
        label: "الأطباء",
        description: "بيانات الأطباء وربط الحسابات",
        icon: Stethoscope,
      },
    ],
  },
  {
    title: "تعريفات المركز",
    description: "الخدمات والنماذج والشيتات الطبية",
    icon: Settings,
    items: [
      {
        href: "/booking-triage/services",
        label: "الخدمات والأسعار",
        description: "تسعير الخدمات وقواعد الحساب",
        icon: HeartPulse,
      },
      {
        href: "/booking-triage/forms",
        label: "مركز النماذج",
        description: "نماذج التشغيل والفحص",
        icon: LayoutDashboard,
      },
      {
        href: "/booking-triage/settings",
        label: "الإعدادات العامة",
        description: "إعدادات المركز والتكاملات",
        icon: Settings,
      },
    ],
  },
  {
    title: "النظام والتدقيق",
    description: "تشخيص، بيانات، إشعارات، وترحيل",
    icon: Terminal,
    items: [
      {
        href: "/booking-triage/status",
        label: "حالة النظام",
        description: "الخدمات، الكاش، والاتصال",
        icon: Terminal,
      },
      {
        href: "/booking-triage/migrations",
        label: "ترحيل البيانات",
        description: "متابعة مهام الترحيل والصيانة",
        icon: Database,
      },
      {
        href: "/booking-triage/notifications",
        label: "إخطارات التطبيق",
        description: "إعدادات التنبيهات والإرسال",
        icon: Bell,
      },
    ],
  },
];

function AdminPanel() {
  const { canAccess } = usePermissions();
  const navItems = ADMIN_GROUPS.flatMap((group) =>
    group.items.filter((item) => canAccess(item.href)),
  );
  const adminStats = [
    {
      label: "مجموعات الإدارة",
      value: ADMIN_GROUPS.length,
      cls: "text-slate-900",
    },
    { label: "مسارات مباشرة", value: navItems.length, cls: "text-primary" },
    { label: "حالة الوصول", value: "مفعل", cls: "text-success" },
  ];

  return (
    <div className="space-y-4">
      {/* Flat top navigation chips */}
      <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 print:hidden scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Hero / stats */}
        <Surface className="overflow-hidden lg:col-span-1">
          <SectionHeader title="إدارة النظام">
            <PanelLink href="/booking-triage" label="مركز الإدارة" />
          </SectionHeader>
          <div className="px-4 py-3">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-slate-50">
                  <Shield className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Admin Console
                  </p>
                  <h3 className="mt-0.5 text-lg font-bold leading-tight text-foreground">
                    لوحة التحكم الإدارية
                  </h3>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                مسارات المستخدمين، الصلاحيات، تعريفات المركز، وحالة النظام في مكان
                واحد بنفس إيقاع صفحات التشغيل.
              </p>
            </div>

            <div className="mt-3 space-y-1">
              {adminStats.map((stat) => (
                <StatRow
                  key={stat.label}
                  label={stat.label}
                  value={<span className={stat.cls}>{stat.value}</span>}
                  icon={Activity}
                />
              ))}
            </div>

            <div className="mt-3 border-t border-border/40 pt-3">
              <Link
                href="/booking-triage"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-slate-50 transition-colors hover:bg-slate-800"
              >
                فتح مركز الإدارة
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </Surface>

        {/* Bento cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <Surface className="h-full overflow-hidden transition-all hover:shadow-md">
                  <div className="flex h-full items-start gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-tight text-foreground group-hover:text-primary">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <ChevronLeft
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                </Surface>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tab strip badge ──────────────────────────────────────────────────────────
function TabBadge({ count, cls }: { count: number; cls: string }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.8125rem] font-medium leading-none",
        cls,
      )}
    >
      {count}
    </span>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  cls,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  cls: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 min-w-0 flex-row items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold sm:px-3 sm:text-sm",
        cls,
      )}
      dir="rtl"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="tabular-nums">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function WorkspaceButton({
  tab,
  active,
  badge,
  onClick,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center gap-3 rounded-lg border px-0 py-0 text-sm transition-[background-color,border-color] xl:h-auto xl:w-full xl:justify-between xl:px-3 xl:py-2.5",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/30 hover:text-foreground",
      )}
      aria-selected={active}
      role="tab"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            active ? "bg-primary text-primary-foreground" : tab.iconWrapCls,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="hidden truncate font-semibold xl:inline">
          {tab.label}
        </span>
      </span>
      <span className="hidden xl:inline">{badge}</span>
    </button>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    medicalFilePortal,
    openMedicalFilePicker,
    openMedicalFileForPatient,
  } = useMedicalFileLauncher();
  const { canAccess, isLoaded: permsLoaded } = usePermissions();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateIso);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window === "undefined") return "today";
    const tab = new URLSearchParams(window.location.search).get("tab");
    return TABS.some((item) => item.id === tab) ? (tab as TabId) : "today";
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.permPath === null || canAccess(t.permPath)),
    [canAccess, permsLoaded], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // If the active tab gets hidden, fall back to the first visible one.
  useEffect(() => {
    if (permsLoaded && !visibleTabs.find((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? "today");
    }
  }, [permsLoaded, visibleTabs, activeTab]);
  const [mobileAsidePanel, setMobileAsidePanel] = useState<"workspaces" | null>(
    "workspaces",
  );
  const utils = trpc.useUtils();
  const now = useClock();

  // Lightweight badge data loaded on mount.
  const { merged } = useTodayQueuePatientsMerged(selectedDate);
  const attQ = trpc.attendance.dashboardSummary.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const stockQ = trpc.stockroom.getReports.useQuery({});
  const bookingsQ = (trpc as any).patientPortal.listBookings.useQuery(
    { status: "pending", limit: 200 },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: canAccess("/booking-triage/portal-bookings"),
    },
  );

  const todayBadge = merged.length;
  const attBadge = attQ.data?.absentToday ?? 0;
  const stockBadge = (stockQ.data?.inventory ?? []).filter(
    (i: any) => i.status === "كمية قليلة" || i.status === "نفذ المخزون",
  ).length;

  const bookingsBadge = ((bookingsQ.data ?? []) as any[]).length;
  const badges: Partial<Record<TabId, React.ReactNode>> = {
    today: <TabBadge count={todayBadge} cls="bg-primary/10 text-primary" />,
    bookings:
      bookingsBadge > 0 ? (
        <TabBadge count={bookingsBadge} cls="bg-info/20 text-info" />
      ) : null,
    attendance:
      attBadge > 0 ? (
        <TabBadge count={attBadge} cls="bg-warning/20 text-warning" />
      ) : null,
    stockroom:
      stockBadge > 0 ? (
        <TabBadge count={stockBadge} cls="bg-destructive/10 text-destructive" />
      ) : null,
  };

  const dateStr = now.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeStr = now.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handleRefreshToday = () => {
    void utils.medical.getMedicalTotals.invalidate();
    void utils.medical.getTodayOperationLists.invalidate();
    void utils.medical.getTodayPatientsByQueueStatus.invalidate();
  };

  const selectTab = (tab: TabId) => {
    setActiveTab(tab);
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (tab === "today") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  const activeTabMeta = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const ActiveTabIcon = activeTabMeta.icon;

  return (
    <div
      className="min-h-screen bg-background text-foreground p-4 sm:p-6"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {medicalFilePortal}
        <OperationsBookingQuickDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          onSaved={() => {
            void utils.medical.getTodayOperationLists.invalidate();
          }}
        />

        {/* ── 1. Floating Bento Top Header Capsule ── */}
        <header className="bg-card border border-border/60 rounded-3xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden xl:flex h-10 w-10 rounded-2xl shrink-0 hover:bg-muted/50 cursor-pointer"
              aria-label={
                sidebarOpen
                  ? "إغلاق القائمة الجانبية"
                  : "فتح القائمة الجانبية"
              }
            >
              {sidebarOpen ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
            <div className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-mono font-black text-sm shrink-0">
              <Zap className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-sm font-black text-foreground leading-none">
                أوامر التشغيل
              </h1>
              <span className="text-[10px] text-muted-foreground block mt-1 font-medium">
                {dateStr}، {timeStr}
              </span>
            </div>
          </div>

          {/* Top metrics */}
          <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-3 md:w-auto md:min-w-[420px]">
            <div className="rounded-2xl border p-2.5 px-3 flex flex-col justify-center bg-primary/10 border-primary/20">
              <span className="text-[9px] font-bold text-muted-foreground block leading-none">
                مرضى اليوم
              </span>
              <span className="mt-1 text-xs font-black font-mono leading-none text-primary">
                {todayBadge.toLocaleString("ar-EG")}
              </span>
            </div>
            <div className="rounded-2xl border p-2.5 px-3 flex flex-col justify-center bg-warning/10 border-warning/20">
              <span className="text-[9px] font-bold text-muted-foreground block leading-none">
                غياب اليوم
              </span>
              <span className="mt-1 text-xs font-black font-mono leading-none text-warning">
                {attBadge.toLocaleString("ar-EG")}
              </span>
            </div>
            <div className="rounded-2xl border p-2.5 px-3 flex flex-col justify-center bg-destructive/10 border-destructive/20">
              <span className="text-[9px] font-bold text-muted-foreground block leading-none">
                تنبيه مخزون
              </span>
              <span className="mt-1 text-xs font-black font-mono leading-none text-destructive">
                {stockBadge.toLocaleString("ar-EG")}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-success/15 px-3 text-xs font-semibold text-success shrink-0">
              <Activity className="h-3.5 w-3.5" aria-hidden />
              مباشر
            </span>
            {activeTab === "today" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshToday}
                className="h-8 gap-1.5 text-xs rounded-xl"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                تحديث
              </Button>
            )}
          </div>
        </header>

        {/* Quick Actions Bar */}
        <div className="bg-card border border-border/60 rounded-3xl px-4 py-3 shadow-sm">
          <QuickActions
            onOpenMeasurementsMedicalFile={openMedicalFilePicker}
            onOpenOperationsBooking={() => setBookingOpen(true)}
          />
        </div>

        {/* ── 2. Two-Column Floating Console Layout ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Floating Sidebar */}
          <aside
            className={cn(
              "shrink-0 bg-card border border-border/60 rounded-3xl p-4 transition-all duration-200 shadow-sm",
              sidebarOpen
                ? "hidden xl:flex xl:flex-col w-[260px] min-h-[400px]"
                : "hidden",
            )}
          >
            {/* Workspaces header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/40">
              <h2 className="text-xs font-black text-foreground">مساحات العمل</h2>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-semibold text-success">
                مباشر
              </span>
            </div>

            <nav className="space-y-1.5" role="tablist" aria-label="أقسام لوحة التحكم">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all duration-150",
                      isActive
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-primary dark:text-primary-foreground dark:shadow-primary/10"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                    aria-selected={isActive}
                    role="tab"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
                        isActive
                          ? "bg-white/20"
                          : tab.iconWrapCls,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="flex-1 text-right truncate">{tab.label}</span>
                    {badges[tab.id] && (
                      <span className="shrink-0">{badges[tab.id]}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Live indicators */}
            <div className="mt-auto pt-4 border-t border-border/40 space-y-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
                مؤشرات فورية
              </span>
              <StatusPill
                icon={Users}
                label="مريض اليوم"
                value={todayBadge.toLocaleString("ar-EG")}
                cls="bg-primary/10 text-primary"
              />
              <StatusPill
                icon={UserX}
                label="غياب"
                value={attBadge.toLocaleString("ar-EG")}
                cls="bg-warning/15 text-warning"
              />
              <StatusPill
                icon={Archive}
                label="تنبيه مخزون"
                value={stockBadge.toLocaleString("ar-EG")}
                cls="bg-destructive/15 text-destructive"
              />
            </div>
          </aside>

          {/* Mobile tab bar */}
          <div
            className="flex items-center gap-2 overflow-x-auto scrollbar-none xl:hidden w-full bg-card border border-border/60 rounded-3xl p-3 shadow-sm"
            role="tablist"
            aria-label="أقسام لوحة التحكم"
          >
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition-all",
                    isActive
                      ? "bg-slate-900 text-white shadow-md dark:bg-primary dark:text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content Floating Bento Container */}
          <main className="flex-1 w-full min-w-0 bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
            {/* Active workspace title bar */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ActiveTabIcon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  المساحة الحالية
                </p>
                <h2 className="truncate text-sm font-black text-foreground">
                  {activeTabMeta.label}
                </h2>
              </div>

              {/* Quick nav links */}
              <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  {
                    href: "/today",
                    label: "مرضى اليوم",
                    icon: Users,
                  },
                  { href: "/operations", label: "العمليات", icon: Syringe },
                  { href: "/patients", label: "كل المرضى", icon: Search },
                  { href: "/accounting", label: "الحسابات", icon: Wallet },
                ].map(({ href, label, icon: NavIcon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-xl border border-border/50 bg-background px-2.5 text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <NavIcon className="h-3 w-3" aria-hidden />
                    {label}
                  </Link>
                ))}
              </div>

              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 text-[10px] font-bold text-secondary tabular-nums shrink-0">
                <Clock className="h-3 w-3" aria-hidden />
                {timeStr}
              </span>
            </div>

            {/* Tab content */}
            <div>
              {activeTab === "today" && (
                <TodayPanel
                  selectedDate={selectedDate}
                  onSelectedDateChange={setSelectedDate}
                  openMedicalFileForPatient={openMedicalFileForPatient}
                />
              )}
              {activeTab === "hub" && <PatientHubPanel />}
              {activeTab === "accounting" && <AccountingPanel />}
              {activeTab === "attendance" && <AttendancePanel />}
              {activeTab === "stockroom" && <StockroomPanel />}
              {activeTab === "bookings" && (
                <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
                  <LazyPortalBookings />
                </Suspense>
              )}
              {activeTab === "admin" && <AdminPanel />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

