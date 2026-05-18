import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { statusStyles, statusLabels } from '@/lib/status-styles'
import { useState } from 'react'

interface AppointmentsActivityProps {
  patients: Array<{
    id: number
    fullName: string
    doctorName: string
    serviceType: string
    queueStatus: string
    checkedInTime?: string
  }>
  className?: string
}

const queueBorderColors: Record<string, string> = {
  checkedin: 'border-r-primary',
  next: 'border-r-amber-500',
  clinic: 'border-r-orange-500',
  treated: 'border-r-green-500',
}

const serviceTypeLabels: Record<string, string> = {
  consultant: 'استشاري',
  specialist: 'أخصائي',
  lasik: 'ليزك',
  external: 'خارجي',
}

const serviceTypeStyles: Record<string, string> = {
  consultant: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  specialist: 'bg-secondary/15 text-secondary dark:bg-secondary/25 dark:text-secondary',
  lasik: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
  external: 'bg-muted text-muted-foreground dark:bg-gray-800/60 dark:text-gray-400',
}

export function AppointmentsActivity({ patients, className }: AppointmentsActivityProps) {
  const [treated, setTreated] = useState<Set<number>>(new Set())

  const handleTreat = (patientId: number) => {
    const newTreated = new Set(treated)
    newTreated.add(patientId)
    setTreated(newTreated)
  }

  return (
    <div className={cn('space-y-2', className)}>
      {patients.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-8">
          لا يوجد مرضى
        </div>
      ) : (
        patients.map((patient) => {
          const isTreated = treated.has(patient.id)
          return (
            <div
              key={patient.id}
              dir="rtl"
              className={cn(
                'rounded-xl border bg-card p-3 sm:p-4 shadow-sm border-r-4 hover:shadow-md transition-all',
                queueBorderColors[patient.queueStatus] || 'border-r-gray-500'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0 border-0',
                      statusStyles[patient.queueStatus] ?? 'bg-muted text-muted-foreground'
                    )}
                  >
                    {statusLabels[patient.queueStatus] ?? patient.queueStatus}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs sm:text-sm font-semibold truncate">{patient.fullName}</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{patient.doctorName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-medium px-2 py-0 border-0',
                      serviceTypeStyles[patient.serviceType]
                    )}
                  >
                    {serviceTypeLabels[patient.serviceType]}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {!isTreated && patient.queueStatus !== 'treated' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0 border-secondary/30 bg-secondary/10 text-secondary hover:border-secondary/50 hover:bg-secondary/15 dark:border-secondary/40 dark:bg-secondary/20 dark:text-secondary dark:hover:border-secondary/60 dark:hover:bg-secondary/25"
                      title="معالج"
                      onClick={() => handleTreat(patient.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {patient.checkedInTime && (
                    <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{patient.checkedInTime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
