import { Activity, Archive, Banknote, Clock, DollarSign, LayoutDashboard, LayoutGrid, Network, Settings, Syringe, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeNavPath, pathGrantedByRoots } from "@/lib/nav-permission-utils"

const staffTabs = [
  {
    key: "today",
    label: "اليوم",
    icon: Clock,
    paths: ["/today", "/today-patients", "/dashboard"],
  },
  {
    key: "patients",
    label: "مركز المريض",
    icon: Users,
    paths: ["/patient-hub", "/patients-hub", "/patients", "/new-cases", "/followups", "/visits"],
  },
  {
    key: "operations",
    label: "العمليات",
    icon: Syringe,
    paths: ["/operations"],
  },
  {
    key: "accounting",
    label: "الحسابات",
    icon: Banknote,
    paths: ["/accounting"],
  },
  {
    key: "more",
    label: "المزيد",
    icon: LayoutGrid,
    paths: [],
  },
] as const

const adminTabs = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    paths: ["/dashboard"],
  },
  {
    key: "patients",
    label: "مركز المريض",
    icon: Network,
    paths: ["/patient-hub", "/patients-hub", "/patients", "/new-cases", "/followups", "/visits"],
  },
  {
    key: "accounting",
    label: "الحسابات",
    icon: Banknote,
    paths: ["/accounting"],
  },
  {
    key: "salary",
    label: "المرتبات",
    icon: DollarSign,
    paths: ["/salary"],
  },
  {
    key: "attendance",
    label: "الحضور",
    icon: Activity,
    paths: ["/attendance"],
  },
  {
    key: "stockroom",
    label: "المخزن",
    icon: Archive,
    paths: ["/stockroom"],
  },
  {
    key: "admin",
    label: "الإدارة",
    icon: Settings,
    paths: ["/admin-hub"],
  },
] as const

type StaffTabKey = (typeof staffTabs)[number]["key"]
type AdminTabKey = (typeof adminTabs)[number]["key"]

function isTabActive(location: string, tab: (typeof staffTabs | typeof adminTabs)[number]): boolean {
  if ("more" in tab && tab.key === "more") return false
  const base = location.split("?")[0]
  return tab.paths.some((p) => base === p || base.startsWith(`${p}/`))
}

interface AppBottomNavProps {
  location: string
  onNavigate: (path: string) => void
  onOpenMore: () => void
  moreOpen?: boolean
  isAdmin?: boolean
  allowedRoots?: unknown
  permissionsLoaded?: boolean
}

export function AppBottomNav({ location, onNavigate, onOpenMore, moreOpen, isAdmin = false, allowedRoots, permissionsLoaded = true }: AppBottomNavProps) {
  const allTabs = isAdmin ? adminTabs : staffTabs

  const tabs = allTabs.filter((tab) => {
    if (tab.key === "more") return true
    if (isAdmin) return true
    if (!permissionsLoaded) return false
    const cleanPath = normalizeNavPath(tab.paths[0]?.split("?")[0] ?? "")
    return pathGrantedByRoots(cleanPath, allowedRoots as any)
  })

  return (
    <nav
      aria-label="التنقل الرئيسي"
      dir="rtl"
      className="md:hidden shrink-0 border-t border-border bg-background print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-14 items-stretch overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = tab.key === "more" ? moreOpen : isTabActive(location, tab)

          return (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors shrink-0",
                active ? "text-primary" : "text-muted-foreground/70 hover:text-muted-foreground",
              )}
              onClick={() => {
                if (tab.key === "more") {
                  onOpenMore();
                } else {
                  onNavigate(tab.paths[0]);
                }
              }}
            >
              {active && (
                <span
                  className="absolute inset-x-3 top-0 h-0.5 rounded-b-full bg-primary"
                  aria-hidden
                />
              )}
              <Icon className="size-5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
              <span className={cn("whitespace-nowrap text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
