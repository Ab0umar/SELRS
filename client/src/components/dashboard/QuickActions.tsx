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
    color: 'bg-primary/10 text-primary hover:bg-primary/20',
    path: '/patients',
  },
  {
    arabic: 'حجز موعد',
    icon: CalendarPlus,
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400',
    path: '/today-patients',
  },
  {
    arabic: 'قياس و فحص',
    icon: Eye,
    color: 'bg-primary/10 text-primary hover:bg-primary/15 dark:text-primary',
    path: '/examination-form',
  },
  {
    arabic: 'روشتة',
    icon: Pill,
    color: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400',
    path: '/write-prescription',
  },
  {
    arabic: 'الملف الطبي',
    icon: FileHeart,
    color: 'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 dark:text-pink-400',
    path: '/patients',
  },
  {
    arabic: 'الملف المجمع',
    icon: FolderOpen,
    color: 'bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400',
    path: '/patients',
  },
  {
    arabic: 'الشيت',
    icon: ClipboardList,
    color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
    path: '/consultant-sheet',
  },
  {
    arabic: 'الملف الشامل',
    icon: FileSpreadsheet,
    color: 'bg-secondary/10 text-secondary hover:bg-secondary/20 dark:text-secondary',
    path: '/medical-reports',
  },
  {
    arabic: 'تحاليل و اشعه',
    icon: FlaskConical,
    color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 dark:text-orange-400',
    path: '/request-tests',
  },
  {
    arabic: 'تشخيص/تقرير',
    icon: FileText,
    color: 'bg-primary/10 text-primary hover:bg-primary/20 dark:text-primary',
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
              'flex flex-col items-center justify-center sm:gap-2 rounded-xl py-2.5 sm:py-3 px-1 transition-all active:scale-95',
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
            <span className="hidden sm:block text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-tight text-center truncate w-full">
              {action.arabic}
            </span>
          </button>
        )
      })}
    </div>
  )
}
