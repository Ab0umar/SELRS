import { lazy, Suspense, useState } from 'react'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { useMedicalFileLauncher } from '@/hooks/useMedicalFileLauncher'
import { useAuth } from '@/hooks/useAuth'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { AppointmentsSection } from '@/components/dashboard/appointments-activity'
import { CollapsibleSection } from '@/components/shared/CollapsibleSection'
import { CardContent } from '@/components/ui/card'
import { Calendar, Clock, Activity, Eye, Stethoscope, FileText, TrendingUp, BarChart3, PieChart, CircleDot, Glasses, Users, Syringe } from 'lucide-react'
import { serviceTypeLabels } from '@/lib/dashboard-data'
import { trpc } from '@/lib/trpc'
import { useTodayQueuePatientsMerged } from '@/hooks/useTodayQueuePatientsMerged'
import { STAT_CARDS_MOBILE_ROW } from '@/components/shared/StatCard'
import { cn } from '@/lib/utils'
import { OperationsBookingQuickDialog } from '@/components/operations/OperationsBookingQuickDialog'
import { B4Loader } from '@/components/loaders/OrganicLoaders'
import { getLocalDateIso } from '@/hooks/operations/operationsShared'

const ChartLoading = () => <div className="h-[240px] bg-muted/30 animate-pulse rounded-lg" />
const PatientTrendChart = lazy(() => import('@/components/dashboard/charts').then(m => ({ default: m.PatientTrendChart })))
const AppointmentDistributionChart = lazy(() => import('@/components/dashboard/charts').then(m => ({ default: m.AppointmentDistributionChart })))
const DepartmentWorkloadChart = lazy(() => import('@/components/dashboard/charts').then(m => ({ default: m.DepartmentWorkloadChart })))

const IconWrap = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <div className={`h-6 w-6 rounded-md flex items-center justify-center ${color}`}>{children}</div>
);

function TodayActivitySummary({ selectedDate }: { selectedDate: string }) {
  const { merged, isLoading } = useTodayQueuePatientsMerged(selectedDate)
  const total = merged.length
  const treated = merged.filter((p) => p.queueStatus === 'treated').length
  const waiting = total - treated
  const completionRate = total > 0 ? Math.round((treated / total) * 100) : 0

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex justify-center">
          <B4Loader label="جاري التحميل..." size={96} />
        </div>
        <div className={cn(STAT_CARDS_MOBILE_ROW, 'gap-2 sm:grid sm:grid-cols-3 sm:gap-3')}>
          {['a', 'b', 'c'].map((k) => (
            <div key={k} className="h-14 min-w-[28%] shrink-0 animate-pulse rounded-lg bg-muted/40 sm:min-w-0" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'إجمالي المرضى', value: total, icon: Calendar, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
    { label: 'تم معالجتهم', value: treated, icon: Activity, color: 'text-secondary dark:text-secondary', bg: 'bg-secondary/15 dark:bg-secondary/20' },
    { label: 'في الانتظار', value: waiting, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950' },
  ]

  return (
    <div className="space-y-4">
      <div className={cn(STAT_CARDS_MOBILE_ROW, 'gap-2 sm:grid sm:grid-cols-3 sm:gap-3')}>
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-[28%] shrink-0 text-center sm:min-w-0">
            <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-1.5`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">نسبة الإنجاز</span>
          <span className="font-medium">{completionRate}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-primary to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function ServiceTypeBreakdown({ selectedDate }: { selectedDate: string }) {
  const { merged, isLoading } = useTodayQueuePatientsMerged(selectedDate)

  if (isLoading) {
    return (
      <div className="py-2">
        <B4Loader label="جاري التحميل..." size={96} />
      </div>
    )
  }

  const serviceCounts = merged.reduce<Record<string, number>>((acc, p) => {
    const k = String(p.serviceType ?? 'unknown')
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const serviceColors: Record<string, string> = {
    consultant: 'bg-primary',
    specialist: 'bg-blue-500',
    lasik: 'bg-amber-500',
    surgery: 'bg-rose-500',
    external: 'bg-slate-400',
  }

  const total = merged.length

  const items = Object.entries(serviceCounts).map(([key, count]) => ({
    label: serviceTypeLabels[key as keyof typeof serviceTypeLabels] || key,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    color: serviceColors[key] || 'bg-slate-400',
  }))

  if (items.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">لا يوجد مرضى اليوم</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <span className="font-medium">{item.label}</span>
            </div>
            <span className="text-muted-foreground">
              {item.count} مريض — {item.percentage}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${item.color} rounded-full transition-all duration-500`}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function MedicalStats() {
  const totalsQuery = trpc.medical.getMedicalTotals.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })

  const fmt = (n: number | undefined, loading: boolean) =>
    loading ? '—' : (n ?? 0).toLocaleString('ar-EG')

  const totals = totalsQuery.data

  const stats = [
    { label: 'إجمالي المرضى', value: fmt(totals?.patients, totalsQuery.isLoading), icon: Users, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-800' },
    { label: 'إجمالي Autoref', value: fmt(totals?.autoref, totalsQuery.isLoading), icon: Eye, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'إجمالي Refraction', value: fmt(totals?.refraction, totalsQuery.isLoading), icon: Glasses, color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-950' },
    { label: 'إجمالي البنتاكام', value: fmt(totals?.pentacam, totalsQuery.isLoading), icon: CircleDot, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-950' },
    { label: 'إجمالي العمليات', value: fmt(totals?.operations, totalsQuery.isLoading), icon: Syringe, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950' },
  ]

  return (
    <div className={cn(STAT_CARDS_MOBILE_ROW, 'gap-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-5')}>
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-[46%] shrink-0 items-center gap-2 rounded-lg bg-muted/30 p-2 sm:min-w-0 sm:gap-3 sm:p-2.5">
          <div className={`h-9 w-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-base sm:text-lg font-bold leading-tight tabular-nums">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { medicalFilePortal, openMedicalFilePicker, openMedicalFileForPatient } = useMedicalFileLauncher()
  const { user } = useAuth()
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedTodayDate, setSelectedTodayDate] = useState(getLocalDateIso)
  const showAdminKpis = String(user?.role ?? '').toLowerCase() === 'admin'
  const utils = trpc.useUtils()

  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-3 sm:space-y-4">
      {medicalFilePortal}
      <OperationsBookingQuickDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        onSaved={() => {
          void utils.medical.getTodayOperationLists.invalidate()
        }}
      />
      <QuickActions
        onOpenMeasurementsMedicalFile={openMedicalFilePicker}
        onOpenOperationsBooking={() => setBookingOpen(true)}
      />

      {showAdminKpis ? (
      <CollapsibleSection
        title="المؤشرات الرئيسية"
        icon={<IconWrap color="bg-primary/10 text-primary"><TrendingUp className="h-3.5 w-3.5" /></IconWrap>}
        defaultOpen={false}
      >
        <CardContent className="space-y-8 p-3 sm:p-4">
          <KpiCards key={`kpi-${selectedTodayDate}`} selectedDate={selectedTodayDate} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <IconWrap color="bg-primary/10 text-primary">
                  <TrendingUp className="h-3.5 w-3.5" />
                </IconWrap>
                <h3 className="text-sm font-semibold">اتجاه المرضى</h3>
              </div>
              <Suspense fallback={<ChartLoading />}>
                <PatientTrendChart />
              </Suspense>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <IconWrap color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                  <PieChart className="h-3.5 w-3.5" />
                </IconWrap>
                <h3 className="text-sm font-semibold">توزيع المواعيد</h3>
              </div>
              <Suspense fallback={<ChartLoading />}>
                <AppointmentDistributionChart />
              </Suspense>
            </div>
          </section>

          <section className="space-y-3">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <IconWrap color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <BarChart3 className="h-3.5 w-3.5" />
                  </IconWrap>
                  <h3 className="text-sm font-semibold">أقسام المركز</h3>
                </div>
                <Suspense fallback={<ChartLoading />}>
                  <DepartmentWorkloadChart />
                </Suspense>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <IconWrap color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Activity className="h-3.5 w-3.5" />
                  </IconWrap>
                  <h3 className="text-sm font-semibold">نشاط اليوم</h3>
                </div>
                <TodayActivitySummary key={`today-activity-${selectedTodayDate}`} selectedDate={selectedTodayDate} />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <IconWrap color="bg-primary/10 text-primary">
                  <Stethoscope className="h-3.5 w-3.5" />
                </IconWrap>
                <h3 className="text-sm font-semibold">توزيع الخدمات</h3>
              </div>
              <ServiceTypeBreakdown key={`service-breakdown-${selectedTodayDate}`} selectedDate={selectedTodayDate} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <IconWrap color="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <FileText className="h-3.5 w-3.5" />
                </IconWrap>
                <h3 className="text-sm font-semibold">إحصائيات طبية</h3>
              </div>
              <MedicalStats />
            </div>
          </section>
        </CardContent>
      </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        title="مرضى اليوم و العمليات"
        icon={<IconWrap color="bg-secondary/15 text-secondary dark:bg-secondary/25 dark:text-secondary"><Eye className="h-3.5 w-3.5" /></IconWrap>}
        defaultOpen={true}
      >
        <div className="px-1.5 sm:px-2 md:px-3 pb-1.5 sm:pb-2 md:pb-3">
          <AppointmentsSection
            selectedDate={selectedTodayDate}
            onSelectedDateChange={setSelectedTodayDate}
            onOpenMeasurementsMedicalFile={openMedicalFileForPatient}
          />
        </div>
      </CollapsibleSection>
    </div>
  )
}
