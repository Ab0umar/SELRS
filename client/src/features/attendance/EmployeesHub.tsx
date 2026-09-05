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
    themeCls: "bg-teal-50/60 border-teal-100 hover:border-teal-300 text-teal-900",
    activeCls: "ring-2 ring-teal-500 bg-teal-100/70 border-teal-300",
    iconCls: "bg-teal-500 text-white",
  },
  {
    key: "leaves",
    label: "طلبات الإجازة",
    subLabel: "Leaves",
    description: "متابعة أرصدة وطلبات إجازات الموظفين السنوية والمرضية",
    icon: FileSpreadsheet,
    themeCls: "bg-rose-50/60 border-rose-100 hover:border-rose-300 text-rose-900",
    activeCls: "ring-2 ring-rose-500 bg-rose-100/70 border-rose-300",
    iconCls: "bg-rose-500 text-white",
  },
  {
    key: "permissions",
    label: "طلبات الأذون",
    subLabel: "Permits",
    description: "مراجعة واعتماد طلبات أذونات الخروج والدخول المتأخر",
    icon: FileClock,
    themeCls: "bg-sky-50/60 border-sky-100 hover:border-sky-300 text-sky-900",
    activeCls: "ring-2 ring-sky-500 bg-sky-100/70 border-sky-300",
    iconCls: "bg-sky-500 text-white",
  },
  {
    key: "manual-punches",
    label: "تسجيل حضور يدوي",
    subLabel: "Manual Punches",
    description: "إضافة وتسجيل بصمات دخول وخروج يدويًا لموظف معيّن",
    icon: Fingerprint,
    themeCls: "bg-emerald-50/60 border-emerald-100 hover:border-emerald-300 text-emerald-900",
    activeCls: "ring-2 ring-emerald-500 bg-emerald-100/70 border-emerald-300",
    iconCls: "bg-emerald-500 text-white",
  },
  {
    key: "shifts",
    label: "توزيع الورديات",
    subLabel: "Shift Allocations",
    description: "ربط الموظفين والكوادر الطبية بالورديات ونوبات العمل",
    icon: CalendarClock,
    themeCls: "bg-indigo-50/60 border-indigo-100 hover:border-indigo-300 text-indigo-900",
    activeCls: "ring-2 ring-indigo-500 bg-indigo-100/70 border-indigo-300",
    iconCls: "bg-indigo-500 text-white",
  },
  {
    key: "schedule-swap",
    label: "تغيير وتبديل المواعيد",
    subLabel: "Schedule Swaps",
    description: "طلبات تغيير المواعيد المؤقتة أو التبادل بين زملاء النوبة",
    icon: Shuffle,
    themeCls: "bg-amber-50/60 border-amber-100 hover:border-[#FCD34D] text-amber-900",
    activeCls: "ring-2 ring-amber-500 bg-amber-100/70 border-amber-300",
    iconCls: "bg-amber-500 text-white",
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
          themeCls: "bg-slate-50 border-slate-200 hover:border-slate-350 text-slate-900",
          activeCls: "ring-2 ring-slate-600 bg-slate-200 border-slate-350",
          iconCls: "bg-slate-600 text-white",
        },
      ]
    : BASE_TABS;

  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ── 1. Bento Dashboard Navigation Grid ── */}
      <div className="flex w-full gap-1 overflow-x-auto border-b border-slate-200 pb-1">
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
              <div className={`p-2 rounded-xl shrink-0 w-fit ${isActive ? t.iconCls : "bg-white text-slate-600 border border-slate-100"}`}>
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
      <div className="border border-slate-200 rounded-3xl bg-white p-6 shadow-sm shadow-slate-100/50">

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
