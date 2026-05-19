import { lazy, Suspense, useState } from 'react'
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
} from 'lucide-react'
import { serviceTypeLabels } from '@/lib/dashboard-data'
import { trpc } from '@/lib/trpc'
import { useTodayQueuePatientsMerged } from '@/hooks/useTodayQueuePatientsMerged'
import { cn } from '@/lib/utils'
import { OperationsBookingQuickDialog } from '@/components/operations/OperationsBookingQuickDialog'
import { getLocalDateIso } from '@/hooks/operations/operationsShared'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const ChartLoading = () => (
  <div className="h-[200px] bg-muted/30 animate-pulse rounded-lg" />
)
const PatientTrendChart = lazy(() =>
  import('@/components/dashboard/charts').then((m) => ({
    default: m.PatientTrendChart,
  }))
)
const DepartmentWorkloadChart = lazy(() =>
  import('@/components/dashboard/charts').then((m) => ({
    default: m.DepartmentWorkloadChart,
  }))
)

function ServiceBreakdown({
  selectedDate,
}: {
  selectedDate: string
}) {
  const { merged, isLoading } = useTodayQueuePatientsMerged(selectedDate)

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
      <p className="py-4 text-center text-xs text-muted-foreground">
        لا يوجد مرضى اليوم
      </p>
    )
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  item.color
                )}
                aria-hidden
              />
              <span className="font-medium">{item.label}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {item.count} — {item.pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                item.color
              )}
              style={{ width: `${item.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function MedicalTotals() {
  const q = trpc.medical.getMedicalTotals.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  const fmt = (n: number | undefined, loading: boolean) =>
    loading ? '—' : (n ?? 0).toLocaleString('ar-EG')

  const t = q.data
  const rows = [
    {
      label: 'إجمالي المرضى',
      value: fmt(t?.patients, q.isLoading),
      icon: Users,
    },
    {
      label: 'Autoref',
      value: fmt(t?.autoref, q.isLoading),
      icon: Eye,
    },
    {
      label: 'Refraction',
      value: fmt(t?.refraction, q.isLoading),
      icon: Glasses,
    },
    {
      label: 'بنتاكام',
      value: fmt(t?.pentacam, q.isLoading),
      icon: CircleDot,
    },
    {
      label: 'عمليات',
      value: fmt(t?.operations, q.isLoading),
      icon: Syringe,
    },
  ]

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between py-1.5 text-sm"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <r.icon className="h-3.5 w-3.5" aria-hidden />
            <span>{r.label}</span>
          </div>
          <span className="font-semibold tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function SectionHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border/50 bg-background shadow-sm">
          <SectionHeader title="مرضى اليوم و العمليات" />
          <div className="space-y-3 p-3 sm:p-4">
            <Skeleton className="h-11 w-full rounded-xl" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border/50 bg-background">
            <SectionHeader title="توزيع الخدمات" />
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-3.5 w-24 rounded-full" />
                    <Skeleton className="h-3.5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/50 bg-background">
            <SectionHeader title="إحصائيات طبية" />
            <div className="space-y-2 px-4 py-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <Skeleton className="h-3.5 w-24 rounded-full" />
                  <Skeleton className="h-3.5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border/50 bg-background ring-1 ring-border/30">
          <SectionHeader title="اتجاه المرضى" />
          <div className="p-3 sm:p-4">
            <Skeleton className="h-[220px] w-full rounded-2xl" />
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-background ring-1 ring-border/30">
          <SectionHeader title="أقسام المركز" />
          <div className="p-3 sm:p-4">
            <Skeleton className="h-[220px] w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { medicalFilePortal, openMedicalFilePicker, openMedicalFileForPatient } =
    useMedicalFileLauncher()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getLocalDateIso)
  const utils = trpc.useUtils()

  const { merged, isLoading: queueLoading } =
    useTodayQueuePatientsMerged(selectedDate)
  const opsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false }
  )

  const total = merged.length
  const treated = merged.filter((p) => p.queueStatus === 'treated').length
  const waiting = total - treated
  const completionRate = total > 0 ? Math.round((treated / total) * 100) : 0
  const opsCount = opsQuery.data?.length ?? 0

  const handleRefresh = () => {
    void utils.medical.getMedicalTotals.invalidate()
    void utils.medical.getTodayOperationLists.invalidate()
    void utils.medical.getTodayPatientsByQueueStatus.invalidate()
  }

  const tiles = [
    { label: 'مرضى اليوم', value: total, icon: Users },
    { label: 'تم معالجتهم', value: treated, icon: Activity },
    { label: 'في الانتظار', value: waiting, icon: Clock },
    { label: 'العمليات', value: opsCount, icon: Syringe },
  ]

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 sm:space-y-5">
      {medicalFilePortal}
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => {
          void utils.medical.getTodayOperationLists.invalidate()
        }}
      />

      {/* Quick actions */}
      <QuickActions
        onOpenMeasurementsMedicalFile={openMedicalFilePicker}
        onOpenOperationsBooking={() => setBookingOpen(true)}
      />

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">
            لوحة تحكم المشرف
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          تحديث
        </Button>
      </div>

      {/* Metric tiles + completion bar */}
      {queueLoading || opsQuery.isLoading ? (
        <DashboardLoadingSkeleton />
      ) : (
        <div className="space-y-3">
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
                      isAccent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary text-primary-foreground/70'
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-lg leading-none tabular-nums tracking-tight sm:text-xl',
                        isAccent ? 'font-extrabold text-primary' : 'font-bold'
                      )}
                    >
                      {t.value}
                    </p>
                    <p
                      className={cn(
                        'mt-0.5 text-[11px]',
                        isAccent ? 'text-primary/70 font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {t.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Completion bar */}
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-2.5">
            <span className="text-xs text-muted-foreground shrink-0">
              نسبة الإنجاز
            </span>
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
                  completionRate >= 80
                    ? 'bg-success/100'
                    : completionRate >= 50
                      ? 'bg-primary'
                      : 'bg-secondary'
                )}
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums w-10 text-left">
              {completionRate}%
            </span>
          </div>
        </div>
      )}

      {/* Main grid: queue + side panels */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Queue */}
        <div className="lg:col-span-2 rounded-lg border border-border/50 bg-background shadow-sm">
          <SectionHeader title="مرضى اليوم و العمليات" />
          <div className="p-2 sm:p-3">
            <AppointmentsSection
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
            />
          </div>
        </div>

        {/* Side panels */}
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
