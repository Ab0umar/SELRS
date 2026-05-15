import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Calendar,
  Heart,
  Stethoscope,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STAT_CARDS_MOBILE_ROW } from '@/components/shared/StatCard'
import { trpc } from '@/lib/trpc'
import { useTodayQueuePatientsMerged } from '@/hooks/useTodayQueuePatientsMerged'

const iconBgMap = {
  users: 'bg-primary/10 text-primary',
  calendar: 'bg-warning/15 text-warning',
  heart: 'bg-secondary/15 text-secondary',
  stethoscope: 'bg-primary/8 text-primary/80',
} as const

type IconKey = keyof typeof iconBgMap
type Kpi = {
  title: string
  value: string
  icon: IconKey
  iconComponent: React.ComponentType<{ className?: string }>
  description: string
  loading?: boolean
}

export function KpiCards({ selectedDate }: { selectedDate: string }) {
  const { merged, isLoading: todayQueueLoading } = useTodayQueuePatientsMerged(selectedDate)
  const operationsQuery = trpc.medical.getTodayOperationLists.useQuery(
    { date: selectedDate },
    { refetchOnWindowFocus: false },
  )

  const todayTotal = merged.length
  const treatedToday = merged.filter((p) => p.queueStatus === 'treated').length
  const inProgressToday = merged.filter((p) => p.queueStatus !== 'treated').length

  const opsCount = Array.isArray(operationsQuery.data)
    ? operationsQuery.data.reduce((acc: number, row: any) => acc + ((row?.items?.length ?? 0) as number), 0)
    : 0

  const kpis: Kpi[] = [
    {
      title: 'إجمالي المرضى',
      value: todayQueueLoading ? '—' : todayTotal.toLocaleString('ar-EG'),
      icon: 'users',
      iconComponent: Users,
      description: 'حسب تاريخ مرضى اليوم المحدد',
      loading: todayQueueLoading,
    },
    {
      title: 'مرضى اليوم',
      value: todayQueueLoading ? '—' : todayTotal.toLocaleString('ar-EG'),
      icon: 'calendar',
      iconComponent: Calendar,
      description: todayQueueLoading
        ? '...'
        : `تم علاج ${treatedToday.toLocaleString('ar-EG')}`,
      loading: todayQueueLoading,
    },
    {
      title: 'في الانتظار',
      value: todayQueueLoading
        ? '—'
        : inProgressToday.toLocaleString('ar-EG'),
      icon: 'heart',
      iconComponent: Heart,
      description: 'قيد الإجراء (غير معالج)',
      loading: todayQueueLoading,
    },
    {
      title: 'العمليات',
      value: operationsQuery.isLoading
        ? '—'
        : opsCount.toLocaleString('ar-EG'),
      icon: 'stethoscope',
      iconComponent: Stethoscope,
      description: 'عمليات نفس التاريخ المحدد',
      loading: operationsQuery.isLoading,
    },
  ]

  return (
    <div className={cn(STAT_CARDS_MOBILE_ROW, 'gap-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-4')}>
      {kpis.map((item) => {
        const Icon = item.iconComponent
        return (
          <Card key={item.title} className="relative min-w-[9rem] shrink-0 overflow-hidden border-border sm:min-w-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <div
                className={cn(
                  'flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-lg shrink-0',
                  iconBgMap[item.icon]
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </div>
            </CardHeader>
            <CardContent>
              {item.loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
                  {item.value}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-xs text-muted-foreground">
                  {item.description}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
