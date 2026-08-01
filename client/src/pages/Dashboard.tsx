import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { useMedicalFileLauncher } from "@/hooks/useMedicalFileLauncher";
import { AppointmentsSection } from "@/components/dashboard/appointments-activity";
import {
  Clock,
  Activity,
  Eye,
  Users,
  Syringe,
  CircleDot,
  Glasses,
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Archive,
  Search,
  ChevronLeft,
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
  titleExtra,
  children,
}: {
  title: string;
  titleExtra?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <h3 className="text-base font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {titleExtra}
      </div>
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

  const [subTab, setSubTab] = useState<"queue" | "analytics">("queue");

  if (queueLoading || opsQuery.isLoading) {
    return (
      <div className="space-y-4">
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
          {/* Appointments list occupying full width */}
          <Surface className="w-full">
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

  return (
    <div className="space-y-12 pb-12 animate-in fade-in duration-500">
      
      {/* ── Top Nav Chips (Flattened) ── */}
      <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 print:hidden scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Main Layout: Hero vs Links ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
        
        {/* Left Side (Hero & Stats) */}
        <div className="xl:col-span-4 flex flex-col space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="flex items-center gap-2.5 text-2xl font-black text-slate-900 dark:text-white">
              <Shield className="h-6 w-6 text-slate-900 dark:text-white" />
              لوحة التحكم الإدارية
            </h2>
            <p className="mt-3 text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              مسارات المستخدمين، الصلاحيات، تعريفات المركز، وحالة النظام في مكان واحد بنفس إيقاع صفحات التشغيل.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between py-2 text-base">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">مجموعات الإدارة</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">{ADMIN_GROUPS.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 text-base">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">مسارات مباشرة</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{navItems.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 text-base">
              <span className="text-slate-600 dark:text-slate-400 font-semibold">حالة الوصول</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">مفعل</span>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/admin-hub"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-base font-bold transition-transform hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              فتح مركز الإدارة الكامل
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Right Side (List of Admin Links) */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group block">
                <div className="flex items-start gap-4 p-4 -m-4 rounded-2xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-400">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="pt-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.label}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </div>
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

  const timeStr = now.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

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

        {/* Quick Actions Bar */}
        <div className="bg-card border border-border/60 rounded-3xl px-4 py-3 shadow-sm">
          <QuickActions
            onOpenMeasurementsMedicalFile={openMedicalFilePicker}
            onOpenOperationsBooking={() => setBookingOpen(true)}
          />
        </div>

        {/* Workspace navigation */}
        <div className="flex flex-col gap-6">
          <div
            className="flex w-full items-center gap-2 overflow-x-auto rounded-3xl border border-border/60 bg-card p-3 shadow-sm scrollbar-none"
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
                    "flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold transition-all sm:px-4",
                    isActive
                      ? "bg-slate-900 text-white shadow-md dark:bg-primary dark:text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {badges[tab.id] && (
                    <span className="shrink-0">{badges[tab.id]}</span>
                  )}
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
