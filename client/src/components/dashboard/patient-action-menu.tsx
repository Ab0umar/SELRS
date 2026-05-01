
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  FileHeart,
  FolderOpen,
  ClipboardList,
  FileSpreadsheet,
  CircleDot,
  Eye,
  Pill,
  FlaskConical,
  FileText,
} from 'lucide-react'
import { useLocation } from 'wouter'
import { routeMap, serviceTypeLabels, type PageKey } from '@/lib/dashboard-data'
import { patientNavPathForPageKey, patientSheetPathByServiceType } from '@/lib/patientNavPaths'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════
   Menu items definition
   ═══════════════════════════════════════════ */
interface MenuItemDef {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  /** If set, this item opens the medical file panel instead of navigating */
  medicalFile?: true
  /** If set, this item dynamically routes based on serviceType */
  dynamicSheet?: true
  /** Static navigation page key */
  page?: PageKey
}

const menuItems: MenuItemDef[] = [
  {
    label: 'الملف الطبي',
    icon: FileHeart,
    color: 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-800/50',
    medicalFile: true,
  },
  {
    label: 'الملف المجمع',
    icon: FolderOpen,
    color: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-blue-200 dark:border-blue-800/50',
    page: 'patient-details',
  },
  {
    label: 'الشيت',
    icon: ClipboardList,
    color: 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-800/50',
    dynamicSheet: true,
  },
  {
    label: 'الملف الشامل',
    icon: FileSpreadsheet,
    color: 'text-secondary dark:text-secondary hover:bg-secondary/10 dark:hover:bg-secondary/20 border-secondary/30 dark:border-secondary/40',
    page: 'patient-summary',
  },
  {
    label: 'بنتاكام',
    icon: CircleDot,
    color: 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 border-violet-200 dark:border-violet-800/50',
    page: 'pentacam-sheet',
  },
  {
    label: 'قياس و فحص',
    icon: Eye,
    color: 'text-primary hover:bg-primary/5 border-primary/20 dark:hover:bg-primary/10 dark:border-primary/30',
    page: 'patient-details',
  },
  {
    label: 'الروشته',
    icon: Pill,
    color: 'text-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/15 border-primary/25 dark:border-primary/35',
    page: 'write-prescription',
  },
  {
    label: 'تحاليل و اشعه',
    icon: FlaskConical,
    color: 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 border-orange-200 dark:border-orange-800/50',
    page: 'request-tests',
  },
  {
    label: 'تشخيص/تقرير',
    icon: FileText,
    color: 'text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40 border-pink-200 dark:border-pink-800/50',
    page: 'medical-reports',
  },
]

/* ═══════════════════════════════════════════
   Props
   ═══════════════════════════════════════════ */
export interface PatientActionMenuProps {
  open: boolean
  onClose: () => void
  patient: {
    id: number
    patientName: string
    serviceType: string
    doctorName?: string
  } | null
  /** Called when "الملف الطبي" is clicked */
  onOpenMedicalFile?: () => void
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export function PatientActionMenu({ open, onClose, patient, onOpenMedicalFile }: PatientActionMenuProps) {
  const [, setLocation] = useLocation()

  if (!patient) return null

  const handleAction = (item: MenuItemDef) => {
    // Close menu first
    onClose()

    if (item.medicalFile) {
      onOpenMedicalFile?.()
      return
    }

    if (item.dynamicSheet) {
      setLocation(patientSheetPathByServiceType(patient.serviceType, patient.id))
      return
    }

    if (item.page) {
      const scoped = patientNavPathForPageKey(item.page, patient.id)
      if (scoped) {
        setLocation(scoped)
        return
      }
      setLocation(routeMap[item.page as keyof typeof routeMap])
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-[480px] p-0 gap-0 overflow-hidden rounded-xl"
        dir="rtl"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">
            ملفات المريض
            {patient.patientName && (
              <span className="text-muted-foreground font-normal"> — {patient.patientName}</span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            اختر نوع الملف لفتحه للمريض {patient.patientName}
          </DialogDescription>
          {/* Patient info chips */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium">
              {serviceTypeLabels[patient.serviceType] || patient.serviceType}
            </span>
            {patient.doctorName && (
              <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {patient.doctorName}
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Menu Grid */}
        <div className="px-4 pb-5">
          <div className="grid grid-cols-2 gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.label}
                  type="button"
                  variant="outline"
                  className={cn(
                    'h-auto py-3 px-3 gap-2.5 justify-start text-xs font-medium transition-colors border',
                    item.color
                  )}
                  onClick={() => handleAction(item)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


