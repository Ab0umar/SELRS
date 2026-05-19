
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
  semantic: 'success' | 'info' | 'warning' | 'error'
  group: 'records' | 'exams' | 'treatment' | 'reports'
  /** If set, this item opens the medical file panel instead of navigating */
  medicalFile?: true
  /** If set, this item dynamically routes based on serviceType */
  dynamicSheet?: true
  /** Static navigation page key */
  page?: PageKey
}

const menuItems: MenuItemDef[] = [
  // Group 1: Medical Records
  {
    label: 'الملف الطبي',
    icon: FileHeart,
    semantic: 'success',
    group: 'records',
    medicalFile: true,
  },
  {
    label: 'الملف المجمع',
    icon: FolderOpen,
    semantic: 'info',
    group: 'records',
    page: 'patient-details',
  },
  {
    label: 'الملف الشامل',
    icon: FileSpreadsheet,
    semantic: 'info',
    group: 'records',
    page: 'patient-summary',
  },
  // Group 2: Exams & Measurements
  {
    label: 'قياس و فحص',
    icon: Eye,
    semantic: 'warning',
    group: 'exams',
    page: 'patient-details',
  },
  {
    label: 'الشيت',
    icon: ClipboardList,
    semantic: 'warning',
    group: 'exams',
    dynamicSheet: true,
  },
  {
    label: 'بنتاكام',
    icon: CircleDot,
    semantic: 'warning',
    group: 'exams',
    page: 'pentacam-sheet',
  },
  // Group 3: Treatment & Tests
  {
    label: 'الروشته',
    icon: Pill,
    semantic: 'error',
    group: 'treatment',
    page: 'write-prescription',
  },
  {
    label: 'تحاليل و اشعه',
    icon: FlaskConical,
    semantic: 'error',
    group: 'treatment',
    page: 'request-tests',
  },
  // Group 4: Reports
  {
    label: 'تشخيص/تقرير',
    icon: FileText,
    semantic: 'info',
    group: 'reports',
    page: 'medical-reports',
  },
]

const semanticColors = {
  success: {
    text: 'text-card-foreground',
    bg: 'hover:bg-success/10',
    border: 'border-success/20',
  },
  info: {
    text: 'text-info',
    bg: 'hover:bg-info/10',
    border: 'border-info/20',
  },
  warning: {
    text: 'text-card-foreground',
    bg: 'hover:bg-warning/10',
    border: 'border-warning/20',
  },
  error: {
    text: 'text-error',
    bg: 'hover:bg-error/10',
    border: 'border-error/20',
  },
}

const groupLabels = {
  records: 'الملفات الطبية',
  exams: 'الفحوصات والقياسات',
  treatment: 'العلاج والتحاليل',
  reports: 'التقارير',
}

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

        {/* Menu Groups */}
        <div className="px-4 pb-5 space-y-4">
          {(Object.keys(groupLabels) as Array<keyof typeof groupLabels>).map((groupKey) => {
            const groupItems = menuItems.filter((item) => item.group === groupKey)
            if (groupItems.length === 0) return null

            return (
              <div key={groupKey}>
                {/* Group Header */}
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {groupLabels[groupKey]}
                </h3>
                {/* Group Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {groupItems.map((item) => {
                    const Icon = item.icon
                    const colors = semanticColors[item.semantic]
                    return (
                      <Button
                        key={item.label}
                        type="button"
                        variant="outline"
                        className={cn(
                          'h-auto py-3 px-3 gap-2.5 justify-start text-xs font-medium transition-colors border',
                          colors.text,
                          colors.bg,
                          colors.border
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
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}


