import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useMemo, useId } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useTodayQueuePatientsMerged } from '@/hooks/useTodayQueuePatientsMerged'
import { serviceTypeLabels } from '@/lib/dashboard-data'

function EmptyChart({ message = 'لا توجد بيانات بعد' }: { message?: string }) {
  return (
    <div className="flex h-[200px] sm:h-[240px] w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <Inbox className="h-6 w-6 opacity-60" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

const trendChartConfig: ChartConfig = {
  count: {
    label: 'تسجيلات',
    color: 'hsl(217, 70%, 50%)',
  },
}

function monthKeyUtc(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Buckets `createdAt` from latest patient page (حد 500 صفحة) على 12 شهرًا؛ عيّنة وليس إجمالي النظام. */
export function PatientTrendChart() {
  const trendGradId = `fillPatientTrend-${useId().replace(/:/g, '')}`
  const patientsQuery = trpc.medical.getAllPatients.useQuery({ limit: 500 })
  const rows = patientsQuery.data?.rows ?? []

  const chartData = useMemo(() => {
    const now = new Date()
    const keys: string[] = []
    for (let i = 11; i >= 0; i--) {
      const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      keys.push(monthKeyUtc(anchor))
    }
    const counts = new Map<string, number>()
    for (const k of keys) counts.set(k, 0)
    for (const row of rows) {
      const raw = (row as { createdAt?: string | Date | null }).createdAt
      if (raw == null) continue
      const dt = new Date(raw as string)
      if (Number.isNaN(dt.getTime())) continue
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return keys.map((key) => {
      const [y, m] = key.split('-').map(Number)
      const label = new Date(Date.UTC(y, (m ?? 1) - 1, 1)).toLocaleDateString('ar-EG', {
        month: 'short',
        year: 'numeric',
      })
      return { key, label, count: counts.get(key) ?? 0 }
    })
  }, [rows])

  const totalMonthsWithData = chartData.filter((d) => d.count > 0).length

  if (patientsQuery.isLoading) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          وفقًا لأحدث 500 سجل — توزيع شهري تقريبي
        </p>
        <Skeleton className="h-[180px] sm:h-[220px] w-full" />
      </div>
    )
  }

  if (totalMonthsWithData === 0 || rows.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          وفقًا لأحدث 500 سجل — توزيع شهري تقريبي
        </p>
        <EmptyChart message="لا تاريخ تسجيل في العيّنة الحالية" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        وفقًا لأحدث 500 سجل — توزيع شهري تقريبي ({rows.length.toLocaleString('ar-EG')} صفوف)
      </p>
      <ChartContainer config={trendChartConfig} className="h-[180px] w-full sm:h-[220px]">
        <AreaChart accessibilityLayer data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} interval={0} tick={{ fontSize: 12 }} />
          <YAxis hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" labelKey="label" />}
          />
          <defs>
            <linearGradient id={trendGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            dataKey="count"
            type="natural"
            fill={`url(#${trendGradId})`}
            stroke="var(--color-count)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

// Appointment Distribution — wired to today's queue counts
const queueConfig: ChartConfig = {
  checkedIn: { label: 'في الانتظار', color: 'hsl(38, 92%, 50%)' },
  next: { label: 'التالي', color: 'hsl(215, 80%, 55%)' },
  clinic: { label: 'في العيادة', color: 'hsl(190, 70%, 45%)' },
  treated: { label: 'تم العلاج', color: 'hsl(160, 60%, 45%)' },
}

const QUEUE_COLORS: Record<string, string> = {
  checkedIn: 'hsl(38, 92%, 50%)',
  next: 'hsl(215, 80%, 55%)',
  clinic: 'hsl(190, 70%, 45%)',
  treated: 'hsl(160, 60%, 45%)',
}

const QUEUE_LABELS_AR: Record<string, string> = {
  checkedIn: 'في الانتظار',
  next: 'التالي',
  clinic: 'في العيادة',
  treated: 'تم العلاج',
}

export function AppointmentDistributionChart() {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], [])
  const checkedIn = trpc.medical.getTodayPatientsByQueueStatus.useQuery({ date: todayIso, queueStatus: 'checkedIn' })
  const next = trpc.medical.getTodayPatientsByQueueStatus.useQuery({ date: todayIso, queueStatus: 'next' })
  const clinic = trpc.medical.getTodayPatientsByQueueStatus.useQuery({ date: todayIso, queueStatus: 'clinic' })
  const treated = trpc.medical.getTodayPatientsByQueueStatus.useQuery({ date: todayIso, queueStatus: 'treated' })

  const isLoading = checkedIn.isLoading || next.isLoading || clinic.isLoading || treated.isLoading

  const data = [
    { key: 'checkedIn', name: QUEUE_LABELS_AR.checkedIn, value: checkedIn.data?.length ?? 0 },
    { key: 'next', name: QUEUE_LABELS_AR.next, value: next.data?.length ?? 0 },
    { key: 'clinic', name: QUEUE_LABELS_AR.clinic, value: clinic.data?.length ?? 0 },
    { key: 'treated', name: QUEUE_LABELS_AR.treated, value: treated.data?.length ?? 0 },
  ].filter((d) => d.value > 0)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (isLoading) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">حالة الطابور الحالي</p>
        <Skeleton className="h-[180px] sm:h-[200px] w-full" />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">حالة الطابور الحالي</p>
        <EmptyChart message="لا يوجد مرضى في الطابور اليوم" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">حالة الطابور الحالي</p>
      <ChartContainer config={queueConfig} className="mx-auto h-[180px] sm:h-[200px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            strokeWidth={2}
            stroke="var(--color-background)"
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.key}`} fill={QUEUE_COLORS[entry.key]} />
            ))}
          </Pie>
          <ChartLegend
            content={<ChartLegendContent nameKey="name" />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
          />
        </PieChart>
      </ChartContainer>
    </div>
  )
}

const workloadChartConfig: ChartConfig = {
  count: {
    label: 'عدد المراجعين',
    color: 'hsl(199, 70%, 45%)',
  },
}

/** توزيع نوع الخدمة لمراجعي اليوم (من الطابور الممزوج live). */
export function DepartmentWorkloadChart() {
  const { merged, isLoading } = useTodayQueuePatientsMerged()

  const data = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of merged) {
      const k = String(p.serviceType ?? 'unknown')
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()]
      .map(([serviceType, value]) => ({
        key: serviceType,
        name: serviceTypeLabels[serviceType as keyof typeof serviceTypeLabels] ?? serviceType,
        count: value,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [merged])

  if (isLoading) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">مرضى اليوم حسب نوع الخدمة</p>
        <Skeleton className="h-[160px] w-full sm:h-[180px]" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">مرضى اليوم حسب نوع الخدمة</p>
        <EmptyChart message="لا يوجد مرضى في الطابور اليوم" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        مرضى اليوم حسب نوع الخدمة ({merged.length.toLocaleString('ar-EG')} في الطابور)
      </p>
      <ChartContainer config={workloadChartConfig} className="h-[160px] w-full sm:h-[180px]">
        <BarChart accessibilityLayer layout="vertical" data={data} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} name="count" />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

// Re-export Progress + cn so any pre-existing imports keep working
export { Progress, cn }
