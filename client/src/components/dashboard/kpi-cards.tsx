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
  users: 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary',
  calendar: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  heart: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  stethoscope: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
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
    <div className={cn(STAT_CARDS_MOBILE_ROW, 'gap-2 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4')}>
      {kpis.map((item) => {
        const Icon = item.iconComponent
        return (
          <Card key={item.title} className="relative min-w-[9rem] shrink-0 overflow-hidden border-border sm:min-w-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg',
                  iconBgMap[item.icon]
                )}
              >
                <Icon className="h-4 w-4" />
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
                <span className="text-[11px] sm:text-xs text-muted-foreground">
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
