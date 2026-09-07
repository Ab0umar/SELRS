import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import EmployeesList from "./EmployeesList";
import LeaveManagement from "./LeaveManagement";
import Permissions from "./Permissions";
import ManualPunches from "./ManualPunches";
import ShiftAssignments from "./ShiftAssignments";
import UserMappings from "./UserMappings";
import ScheduleSwap from "./ScheduleSwap";
import { Users, FileSpreadsheet, FileClock, Fingerprint, CalendarClock, Shuffle, Link2 } from "lucide-react";

const BASE_TABS = [
  {
    key: "employees",
    label: "قائمة الموظفين",
    subLabel: "Staff List",
    description: "بيانات الموظفين وحالة الربط وساعات العمل الرسمية",
    icon: Users,
    themeCls: "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "leaves",
    label: "طلبات الإجازة",
    subLabel: "Leaves",
    description: "متابعة أرصدة وطلبات إجازات الموظفين السنوية والمرضية",
    icon: FileSpreadsheet,
    themeCls: "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "permissions",
    label: "طلبات الأذون",
    subLabel: "Permits",
    description: "مراجعة واعتماد طلبات أذونات الخروج والدخول المتأخر",
    icon: FileClock,
    themeCls: "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "manual-punches",
    label: "تسجيل حضور يدوي",
    subLabel: "Manual Punches",
    description: "إضافة وتسجيل بصمات دخول وخروج يدويًا لموظف معيّن",
    icon: Fingerprint,
    themeCls: "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "shifts",
    label: "توزيع الورديات",
    subLabel: "Shift Allocations",
    description: "ربط الموظفين والكوادر الطبية بالورديات ونوبات العمل",
    icon: CalendarClock,
    themeCls: "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "schedule-swap",
    label: "تغيير وتبديل المواعيد",
    subLabel: "Schedule Swaps",
    description: "طلبات تغيير المواعيد المؤقتة أو التبادل بين زملاء النوبة",
    icon: Shuffle,
    themeCls: "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
] as const;

type TabKey = (typeof BASE_TABS)[number]["key"] | "mappings";

export default function EmployeesHub() {
  const [tab, setTab] = useState<TabKey>("employees");
  const { user } = useAuth();
  const isAdmin = String((user as any)?.role ?? "").toLowerCase() === "admin";

  const TABS = isAdmin
    ? [
        ...BASE_TABS,
        {
          key: "mappings" as const,
          label: "ربط المستخدمين",
          subLabel: "User Mappings",
          description: "ربط حسابات النظام الطبية والإدارية بموظفي الحضور",
          icon: Link2,
          themeCls: "bg-muted/40 border-border/60 hover:border-border/60 text-foreground",
          activeCls: "ring-2 ring-primary bg-primary/10 border-border/60",
          iconCls: "bg-primary text-primary-foreground",
        },
      ]
    : BASE_TABS;

  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── 1. Bento Dashboard Navigation Grid ── */}
      <div className="flex w-full gap-1 overflow-x-auto border-b border-border/60 pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              id={`attendance-employees-tab-${t.key}`}
              role="tab"
              onClick={() => setTab(t.key)}
              aria-selected={isActive}
              aria-controls={`attendance-employees-panel-${t.key}`}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg border-b-2 px-4 py-2 text-right text-xs font-bold transition-colors ${
                isActive ? t.activeCls : t.themeCls
              }`}
            >
              {/* Icon Container */}
              <div className={`p-2 rounded-xl shrink-0 w-fit ${isActive ? t.iconCls : "bg-card text-muted-foreground border border-border/60"}`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Title & Desc */}
              <div className="space-y-0.5 mt-3">
                <span className="text-[11px] font-black block leading-none">{t.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 2. Bento Panel Console Container ── */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">

        <div
          id={`attendance-employees-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`attendance-employees-tab-${tab}`}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {tab === "employees" && <EmployeesList />}
          {tab === "leaves" && <LeaveManagement />}
          {tab === "permissions" && <Permissions />}
          {tab === "manual-punches" && <ManualPunches />}
          {tab === "shifts" && <ShiftAssignments />}
          {tab === "schedule-swap" && <ScheduleSwap />}
          {tab === "mappings" && <UserMappings />}
        </div>
      </div>

    </div>
  );
}
