import { cn } from '@/lib/utils'
import {
  UserPlus,
  CalendarPlus,
  Eye,
  Pill,
  FileHeart,
  FolderOpen,
  ClipboardList,
  FileSpreadsheet,
  FlaskConical,
  FileText,
} from 'lucide-react'
import { useLocation } from 'wouter'

const quickActions = [
  {
    arabic: 'تسجيل مريض',
    icon: UserPlus,
    color: 'bg-primary text-primary-foreground hover:bg-primary/90',
    path: '/patients',
  },
  {
    arabic: 'حجز موعد',
    icon: CalendarPlus,
    color: 'bg-primary text-primary-foreground hover:bg-primary/90',
    path: '/today-patients',
  },
  {
    arabic: 'قياس و فحص',
    icon: Eye,
    color: 'bg-primary text-primary-foreground hover:bg-primary/90',
    path: '/examination-form',
  },
  {
    arabic: 'روشتة',
    icon: Pill,
    color: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
    path: '/write-prescription',
  },
  {
    arabic: 'الملف الطبي',
    icon: FileHeart,
    color: 'bg-destructive/10 text-destructive hover:bg-destructive/15',
    path: '/patients',
  },
  {
    arabic: 'الملف المجمع',
    icon: FolderOpen,
    color: 'bg-secondary/10 text-secondary hover:bg-secondary/15',
    path: '/patients',
  },
  {
    arabic: 'الشيت',
    icon: ClipboardList,
    color: 'bg-warning/15 text-warning hover:bg-warning/20',
    path: '/consultant-sheet',
  },
  {
    arabic: 'الملف الشامل',
    icon: FileSpreadsheet,
    color: 'bg-secondary text-secondary-foreground hover:bg-secondary/20',
    path: '/medical-reports',
  },
  {
    arabic: 'تحاليل و اشعه',
    icon: FlaskConical,
    color: 'bg-secondary/10 text-secondary hover:bg-secondary/20',
    path: '/request-tests',
  },
  {
    arabic: 'تشخيص/تقرير',
    icon: FileText,
    color: 'bg-primary text-primary-foreground hover:bg-primary/20',
    path: '/medical-reports',
  },
]

export function QuickActions() {
  const [, navigate] = useLocation()

  return (
    <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-1.5 sm:gap-2">
      {quickActions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.path + action.arabic}
            type="button"
            onClick={() => navigate(action.path)}
            className={cn(
              'flex flex-col items-center justify-center sm:gap-2 rounded-xl py-2.5 sm:py-3 px-1 transition-[background-color,border-color,transform] active:scale-95',
              'bg-muted/50 hover:bg-muted border border-transparent hover:border-border',
              'group cursor-pointer'
            )}
          >
            <div className={cn(
              'flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-colors shrink-0',
              action.color
            )}>
              <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </div>
            <span className="hidden w-full truncate text-center text-sm font-semibold leading-tight text-muted-foreground transition-colors group-hover:text-foreground sm:block">
              {action.arabic}
            </span>
          </button>
        )
      })}
    </div>
  )
}
