import { lazy, Suspense, useState, useEffect } from 'react'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { useMedicalFileLauncher } from '@/hooks/useMedicalFileLauncher'
import { AppointmentsSection } from '@/components/dashboard/appointments-activity'
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
  Wallet,
  Archive,
  Search,
  ChevronLeft,
  AlertTriangle,
  Zap,
  Cpu,
} from 'lucide-react'
import { serviceTypeLabels } from '@/lib/dashboard-data'
import { trpc } from '@/lib/trpc'
import { useTodayQueuePatientsMerged } from '@/hooks/useTodayQueuePatientsMerged'
import { cn } from '@/lib/utils'
import { OperationsBookingQuickDialog } from '@/components/operations/OperationsBookingQuickDialog'
import { getLocalDateIso } from '@/hooks/operations/operationsShared'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'wouter'
import { formatMoneyAr } from './accounting/accountingFormat'

// ─── Lazy charts ────────────────────────────────────────────────────────────
const ChartLoading = () => (
  <div className="h-[200px] bg-muted/30 animate-pulse rounded-lg" />
)
const PatientTrendChart = lazy(() =>
  import('@/components/dashboard/charts').then((m) => ({ default: m.PatientTrendChart }))
)
const DepartmentWorkloadChart = lazy(() =>
  import('@/components/dashboard/charts').then((m) => ({ default: m.DepartmentWorkloadChart }))
)

// ─── Tabs config ────────────────────────────────────────────────────────────
type TabId = 'today' | 'hub' | 'accounting' | 'attendance' | 'stockroom'

const TABS: Array<{
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconWrapCls: string
}> = [
  { id: 'today',      label: 'لوحة التحكم',  icon: LayoutDashboard, iconWrapCls: 'bg-primary/10 text-primary' },
  { id: 'hub',        label: 'مركز المريض',  icon: Users,         iconWrapCls: 'bg-secondary/15 text-secondary' },
  { id: 'accounting', label: 'الحسابات',     icon: Wallet,        iconWrapCls: 'bg-warning/20 text-warning' },
  { id: 'attendance', label: 'الحضور',       icon: Clock,         iconWrapCls: 'bg-success/15 text-success' },
  { id: 'stockroom',  label: 'المخزن',       icon: Archive,       iconWrapCls: 'bg-muted text-muted-foreground' },
]

// ─── Shared helpers ──────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function StatRow({
  label,
  value,
  valueClass = '',
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  valueClass?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        <span>{label}</span>
      </div>
      <span className={cn('font-semibold tabular-nums', valueClass)}>{value}</span>
    </div>
  )
}

function PanelLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}>
      <a className="flex items-center gap-1 text-xs text-primary hover:underline">
        {label}
        <ChevronLeft className="h-3 w-3" aria-hidden />
      </a>
    </Link>
  )
}

// ─── Today panel ─────────────────────────────────────────────────────────────
function ServiceBreakdown({ selectedDate }: { selectedDate: string }) {
  const { merged, isLoading } = useTodayQueuePatientsMerged(selectedDate)

  if (isLoading) {
    return (
      <div className="space-y-3 py-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/60 bg-background px-3 py-3">
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
    )
  }

  const serviceCounts = merged.reduce<Record<string, number>>((acc, p) => {
    const k = String(p.serviceType ?? 'unknown')
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const colors: Record<string, string> = {
    consultant: 'bg-primary',
    specialist: 'bg-primary/60',
    lasik: 'bg-secondary',
    surgery: 'bg-warning',
    external: 'bg-muted-foreground/40',
  }

  const total = merged.length
  const items = Object.entries(serviceCounts).map(([key, count]) => ({
    label: serviceTypeLabels[key as keyof typeof serviceTypeLabels] || key,
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
    color: colors[key] || 'bg-muted-foreground/40',
  }))

  if (items.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">لا يوجد مرضى اليوم</p>
    )
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn('inline-block h-2 w-2 rounded-full', item.color)} aria-hidden />
              <span className="font-medium">{item.label}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {item.count} — {item.pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', item.color)}
              style={{ width: `${item.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function MedicalTotals() {
  const q = trpc.medical.getMedicalTotals.useQuery(undefined, { refetchOnWindowFocus: false })
  const fmt = (n: number | undefined, loading: boolean) =>
    loading ? '—' : (n ?? 0).toLocaleString('ar-EG')
  const t = q.data

  return (
    <div className="space-y-1">
      {[
        { label: 'إجمالي المرضى', value: fmt(t?.patients, q.isLoading), icon: Users },
        { label: 'Autoref',       value: fmt(t?.autoref,   q.isLoading), icon: Eye },
        { label: 'Refraction',    value: fmt(t?.refraction,q.isLoading), icon: Glasses },
        { label: 'بنتاكام',      value: fmt(t?.pentacam,  q.isLoading), icon: CircleDot },
        { label: 'عمليات',        value: fmt(t?.operations,q.isLoading), icon: Syringe },
      ].map((r) => (
        <StatRow key={r.label} label={r.label} value={r.value} icon={r.icon} />
      ))}
    </div>
  )
}

function TodayPanel({
  selectedDate,
  onSelectedDateChange,
  openMedicalFileForPatient,
}: {
  selectedDate: string
  onSelectedDateChange: (d: string) => void
  openMedicalFileForPatient: (id: number) => void
}) {
  const { merged, isLoading: queueLoading } = useTodayQueuePatientsMerged(selectedDate)
  const opsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false }
  )

  const total = merged.length
  const treated = merged.filter((p) => p.queueStatus === 'treated').length
  const waiting = total - treated
  const completionRate = total > 0 ? Math.round((treated / total) * 100) : 0
  const opsCount = opsQuery.data?.length ?? 0

  const tiles = [
    { label: 'مرضى اليوم',   value: total,   icon: Users },
    { label: 'تم معالجتهم',  value: treated, icon: Activity },
    { label: 'في الانتظار',  value: waiting, icon: Clock },
    { label: 'العمليات',     value: opsCount, icon: Syringe },
  ]

  if (queueLoading || opsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {tiles.map((_, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-background px-3 py-2.5">
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
        <Skeleton className="h-10 rounded-lg" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {tiles.map((t, i) => {
          const Icon = t.icon
          const isAccent = i === 1
          return (
            <div
              key={t.label}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 sm:px-4',
                isAccent
                  ? 'bg-primary/[0.06] ring-1 ring-primary/15'
                  : 'bg-background border border-border/50'
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                  isAccent ? 'bg-primary text-primary-foreground' : 'bg-primary text-primary-foreground/70'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className={cn('text-lg leading-none tabular-nums tracking-tight sm:text-xl', isAccent ? 'font-extrabold text-primary' : 'font-bold')}>
                  {t.value}
                </p>
                <p className={cn('mt-0.5 text-[11px]', isAccent ? 'text-primary/70 font-medium' : 'text-muted-foreground')}>
                  {t.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Completion bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-2.5">
        <span className="text-xs text-muted-foreground shrink-0">نسبة الإنجاز</span>
        <div
          className="h-2 flex-1 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={completionRate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="نسبة الإنجاز"
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              completionRate >= 80 ? 'bg-success/100' : completionRate >= 50 ? 'bg-primary' : 'bg-secondary'
            )}
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <span className="text-sm font-semibold tabular-nums w-10 text-left">{completionRate}%</span>
      </div>

      {/* Queue + side */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border/50 bg-background shadow-sm">
          <SectionHeader title="مرضى اليوم و العمليات" />
          <div className="p-2 sm:p-3">
            <AppointmentsSection
              selectedDate={selectedDate}
              onSelectedDateChange={onSelectedDateChange}
              onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
            />
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-lg border border-border/50 bg-background">
            <SectionHeader title="توزيع الخدمات" />
            <div className="p-4">
              <ServiceBreakdown selectedDate={selectedDate} />
            </div>
          </div>
          <div className="rounded-lg border border-border/50 bg-background">
            <SectionHeader title="إحصائيات طبية" />
            <div className="px-4 py-3">
              <MedicalTotals />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg bg-muted/30 ring-1 ring-border/30">
          <SectionHeader title="اتجاه المرضى" />
          <div className="p-3 sm:p-4">
            <Suspense fallback={<ChartLoading />}>
              <PatientTrendChart />
            </Suspense>
          </div>
        </div>
        <div className="rounded-lg bg-muted/30 ring-1 ring-border/30">
          <SectionHeader title="أقسام المركز" />
          <div className="p-3 sm:p-4">
            <Suspense fallback={<ChartLoading />}>
              <DepartmentWorkloadChart />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Patient Hub panel ───────────────────────────────────────────────────────
type RecentPatient = { id: number; name: string; code: string; lastVisit: string }

function PatientHubPanel() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 350)
  const [recent, setRecent] = useState<RecentPatient[]>([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('hub_recent_patients')
      if (raw) setRecent(JSON.parse(raw) as RecentPatient[])
    } catch { /* ignore */ }
  }, [])

  const searchQuery = trpc.medical.searchPatients.useQuery(
    { searchTerm: debouncedQuery },
    { enabled: debouncedQuery.length >= 2 }
  )
  const totalsQuery = trpc.medical.getMedicalTotals.useQuery(undefined, { refetchOnWindowFocus: false })

  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('ar-EG')

  const showSearch = debouncedQuery.length >= 2

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
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
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
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
                  </div>
                )}
                {searchQuery.data && searchQuery.data.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">لا نتائج لـ «{debouncedQuery}»</p>
                )}
                {searchQuery.data && searchQuery.data.length > 0 && (
                  <div className="divide-y divide-border/40">
                    {searchQuery.data.slice(0, 8).map((p) => (
                      <Link key={p.id} href={`/patients/${p.id}`}>
                        <a className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors">
                          <span className="font-medium">{p.fullName}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{p.patientCode ?? '—'}</span>
                        </a>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showSearch && recent.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">آخر المرضى</p>
                <div className="divide-y divide-border/40">
                  {recent.map((p) => (
                    <Link key={p.id} href={`/patients/${p.id}`}>
                      <a className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{p.code}</span>
                      </a>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!showSearch && recent.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">ابحث عن مريض للبدء</p>
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
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)
          ) : (
            <>
              <StatRow label="إجمالي المرضى" value={fmt(totalsQuery.data?.patients)} icon={Users} />
              <StatRow label="عمليات"         value={fmt(totalsQuery.data?.operations)} icon={Syringe} />
              <StatRow label="بنتاكام"        value={fmt(totalsQuery.data?.pentacam)} icon={CircleDot} />
              <StatRow label="Autoref"         value={fmt(totalsQuery.data?.autoref)} icon={Eye} />
              <StatRow label="Refraction"      value={fmt(totalsQuery.data?.refraction)} icon={Glasses} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Accounting panel ────────────────────────────────────────────────────────
function AccountingPanel() {
  const today = getLocalDateIso()
  const q = trpc.accounting.dashboardSummary.useQuery({ date: today })

  const d = q.data

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Today */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="اليوم">
          <PanelLink href="/accounting" label="الحسابات" />
        </SectionHeader>
        <div className="px-4 py-3 space-y-1">
          {q.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)
          ) : (
            <>
              <StatRow
                label="إيرادات اليوم"
                value={<span className="text-success">{formatMoneyAr(d?.totalRevenueToday ?? 0)} ج.م</span>}
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
                value={<span>{formatMoneyAr(d?.totalRevenueThisMonth ?? 0)} ج.م</span>}
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
            { href: '/accounting/ledger',   label: 'الخزنة — قيود' },
            { href: '/accounting/cashbook', label: 'الخزنة — رصيد' },
            { href: '/accounting/advances', label: 'كشف السلف' },
            { href: '/accounting/loans',    label: 'القروض' },
            { href: '/accounting',          label: 'لوحة الحسابات الكاملة' },
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              <a className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors">
                <span>{label}</span>
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </a>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Attendance panel ────────────────────────────────────────────────────────
function AttendancePanel() {
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const q = (trpc as any).attendance.dashboardSummary.useQuery(undefined, {
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
  const d = q.data

  const syncMut = (trpc as any).attendance.syncNow.useMutation({
    onSuccess: (res: any) => {
      setSyncMsg(res.success ? `✓ ${res.rowsInserted ?? 0} سجل جديد` : `✗ ${res.error ?? 'خطأ'}`)
      q.refetch()
    },
    onError: (err: any) => setSyncMsg(`✗ ${err.message}`),
  })

  const matMut = (trpc as any).attendance.materializeDaily.useMutation({
    onSuccess: (res: any) => {
      setSyncMsg(`✓ حساب ${res.rowsWritten ?? 0} يوم`)
      q.refetch()
    },
    onError: (err: any) => setSyncMsg(`✗ ${err.message}`),
  })

  const handleSync = () => { setSyncMsg(null); syncMut.mutate({}) }
  const handleMat = () => {
    setSyncMsg(null)
    const today = new Date()
    const from = new Date(today); from.setDate(from.getDate() - 90)
    matMut.mutate({ fromDate: from.toISOString().slice(0, 10), toDate: today.toISOString().slice(0, 10) })
  }

  const stats = [
    { label: 'حاضر اليوم',         value: d?.presentToday ?? 0,            cls: 'text-success' },
    { label: 'غائب اليوم',          value: d?.absentToday ?? 0,             cls: 'text-destructive' },
    { label: 'متأخر اليوم',         value: d?.lateToday ?? 0,               cls: 'text-warning' },
    { label: 'داخل الآن',           value: d?.insideNow ?? 0,               cls: 'text-primary' },
    { label: 'لم يسجل الخروج أمس',  value: d?.missingCheckoutYesterday ?? 0, cls: 'text-secondary' },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Stats */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="ملخص الحضور">
          <PanelLink href="/attendance" label="الحضور" />
        </SectionHeader>
        <div className="px-4 py-3 space-y-1">
          {q.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 rounded" />)
          ) : (
            stats.map((s) => (
              <StatRow
                key={s.label}
                label={s.label}
                value={<span className={cn('text-lg font-bold', s.cls)}>{s.value}</span>}
              />
            ))
          )}
        </div>
        {!q.isLoading && d?.lastSync && (
          <div className="border-t border-border/40 px-4 py-2.5 text-xs text-muted-foreground">
            آخر مزامنة:{' '}
            <span className="font-medium">
              {d.lastSync.status === 'never'   ? 'لم تتم' :
               d.lastSync.status === 'ok'      ? 'ناجحة'  :
               d.lastSync.status === 'failed'  ? 'فشلت'   :
               d.lastSync.status}
            </span>
            {d.lastSync.finishedAt && (
              <span className="mr-2">
                — {new Date(d.lastSync.finishedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
        <div className="border-t border-border/40 px-4 py-2.5 flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 px-2.5"
            onClick={handleSync} disabled={syncMut.isPending}>
            <Zap className="h-3 w-3" />
            {syncMut.isPending ? 'جارٍ…' : 'مزامنة FK'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 px-2.5"
            onClick={handleMat} disabled={matMut.isPending}>
            <Cpu className="h-3 w-3" />
            {matMut.isPending ? 'جارٍ…' : 'إعادة الحساب'}
          </Button>
          {syncMsg && <span className="text-xs text-muted-foreground">{syncMsg}</span>}
        </div>
      </div>

      {/* Quick links */}
      <div className="rounded-lg border border-border/50 bg-background">
        <SectionHeader title="روابط سريعة" />
        <div className="divide-y divide-border/40 px-4">
          {[
            { href: '/attendance/live',      label: 'اللوحة المباشرة' },
            { href: '/attendance/employees', label: 'الموظفون' },
            { href: '/attendance/reports',   label: 'التقارير' },
            { href: '/attendance/settings',  label: 'الإعدادات' },
          ].map(({ href, label }) => (
            <Link key={href} href={href}>
              <a className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors">
                <span>{label}</span>
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </a>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Stockroom panel ─────────────────────────────────────────────────────────
const STOCK_CATEGORIES = [
  { key: 'قطرات العين',                label: 'قطرات العين',                icon: Eye },
  { key: 'غرفة العمليات',              label: 'غرفة العمليات',              icon: Syringe },
  { key: 'مستلزمات وأدوات جراحية',    label: 'مستلزمات جراحية',            icon: Archive },
  { key: 'لوازم مكتبية',              label: 'لوازم مكتبية',               icon: Activity },
]

function StockroomPanel() {
  const q = trpc.stockroom.getReports.useQuery({})
  const inventory = q.data?.inventory ?? []

  const getCategoryStats = (key: string) => {
    const items = inventory.filter((i) => i.category === key)
    return {
      total: items.length,
      low: items.filter((i) => i.status === 'كمية قليلة').length,
      out: items.filter((i) => i.status === 'نفذ المخزون').length,
    }
  }

  const totalAlerts = inventory.filter(
    (i) => i.status === 'كمية قليلة' || i.status === 'نفذ المخزون'
  ).length

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {!q.isLoading && totalAlerts > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
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
          const stats = getCategoryStats(key)
          return (
            <div key={key} className="rounded-lg border border-border/50 bg-background">
              <div className="flex items-center gap-2.5 border-b border-border/40 px-4 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </div>
                <h3 className="text-sm font-semibold">{label}</h3>
              </div>
              <div className="px-4 py-3 space-y-1">
                {q.isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 rounded" />)
                ) : (
                  <>
                    <StatRow label="إجمالي الأصناف"  value={stats.total} />
                    <StatRow
                      label="كمية قليلة"
                      value={stats.low}
                      valueClass={stats.low > 0 ? 'text-warning' : ''}
                    />
                    <StatRow
                      label="نفذ المخزون"
                      value={stats.out}
                      valueClass={stats.out > 0 ? 'text-destructive' : ''}
                    />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab strip badge ──────────────────────────────────────────────────────────
function TabBadge({ count, cls }: { count: number; cls: string }) {
  if (count === 0) return null
  return (
    <span className={cn('ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none', cls)}>
      {count}
    </span>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { medicalFilePortal, openMedicalFilePicker, openMedicalFileForPatient } =
    useMedicalFileLauncher()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getLocalDateIso)
  const [activeTab, setActiveTab] = useState<TabId>('today')
  const utils = trpc.useUtils()
  const now = useClock()

  // Badge data — lightweight, loaded on mount
  const { merged } = useTodayQueuePatientsMerged(selectedDate)
  const attQ = trpc.attendance.dashboardSummary.useQuery(undefined, { refetchInterval: 60_000 })
  const stockQ = trpc.stockroom.getReports.useQuery({})

  const todayBadge = merged.length
  const attBadge = attQ.data?.absentToday ?? 0
  const stockBadge = (stockQ.data?.inventory ?? []).filter(
    (i) => i.status === 'كمية قليلة' || i.status === 'نفذ المخزون'
  ).length

  const badges: Partial<Record<TabId, React.ReactNode>> = {
    today:      <TabBadge count={todayBadge} cls="bg-primary/10 text-primary" />,
    attendance: attBadge > 0 ? <TabBadge count={attBadge} cls="bg-warning/20 text-warning" /> : null,
    stockroom:  stockBadge > 0 ? <TabBadge count={stockBadge} cls="bg-destructive/10 text-destructive" /> : null,
  }

  const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })

  const handleRefreshToday = () => {
    void utils.medical.getMedicalTotals.invalidate()
    void utils.medical.getTodayOperationLists.invalidate()
    void utils.medical.getTodayPatientsByQueueStatus.invalidate()
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 sm:space-y-5" dir="rtl">
      {medicalFilePortal}
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => { void utils.medical.getTodayOperationLists.invalidate() }}
      />

      {/* Quick actions */}
      <QuickActions
        onOpenMeasurementsMedicalFile={openMedicalFilePicker}
        onOpenOperationsBooking={() => setBookingOpen(true)}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">لوحة تحكم المشرف</h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {dateStr} — {timeStr}
          </p>
        </div>
        {activeTab === 'today' && (
          <Button variant="outline" size="sm" onClick={handleRefreshToday} className="gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" aria-hidden />
            تحديث
          </Button>
        )}
      </div>

      {/* Tab strip */}
      <div className="border-b border-border/50">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isActive
                    ? 'border-b-2 border-primary -mb-px font-semibold text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t'
                )}
                aria-selected={isActive}
                role="tab"
              >
                <span className={cn('flex h-6 w-6 items-center justify-center rounded', tab.iconWrapCls)}>
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {tab.label}
                {badges[tab.id]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Panel */}
      <div>
        {activeTab === 'today' && (
          <TodayPanel
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            openMedicalFileForPatient={openMedicalFileForPatient}
          />
        )}
        {activeTab === 'hub'        && <PatientHubPanel />}
        {activeTab === 'accounting' && <AccountingPanel />}
        {activeTab === 'attendance' && <AttendancePanel />}
        {activeTab === 'stockroom'  && <StockroomPanel />}
      </div>
    </div>
  )
}
