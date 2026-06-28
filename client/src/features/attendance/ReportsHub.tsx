import { useState } from "react";
import DailyView from "./DailyView";
import Reports from "./Reports";
import PermissionReport from "./PermissionReport";
import LeaveBalanceReport from "./LeaveBalanceReport";
import RawLogs from "./RawLogs";
import { FileText, BarChart3, Clock, CalendarDays, Server } from "lucide-react";

const TABS = [
  {
    key: "daily",
    label: "تقرير اليومي",
    subLabel: "Daily Report",
    description: "مراجعة حضور وانصراف الموظفين ليوم محدد أو فترة قصيرة",
    icon: FileText,
    themeCls: "bg-teal-50/60 border-teal-100 hover:border-teal-300 text-teal-900",
    activeCls: "ring-2 ring-teal-500 bg-teal-100/70 border-teal-300",
    iconCls: "bg-teal-500 text-white",
  },
  {
    key: "monthly",
    label: "التحليل التفصيلي",
    subLabel: "Monthly Analytics",
    description: "تقارير الحضور الشهرية والتحليل الكامل لساعات التأخير",
    icon: BarChart3,
    themeCls: "bg-indigo-50/60 border-indigo-100 hover:border-indigo-300 text-indigo-900",
    activeCls: "ring-2 ring-indigo-500 bg-indigo-100/70 border-indigo-300",
    iconCls: "bg-indigo-500 text-white",
  },
  {
    key: "perms",
    label: "أذونات الموظفين",
    subLabel: "Permits",
    description: "رصد وتفصيل أذونات خروج ودخول الموظفين خلال النوبات",
    icon: Clock,
    themeCls: "bg-sky-50/60 border-sky-100 hover:border-sky-300 text-sky-900",
    activeCls: "ring-2 ring-sky-500 bg-sky-100/70 border-sky-300",
    iconCls: "bg-sky-500 text-white",
  },
  {
    key: "balance",
    label: "أرصدة الإجازات",
    subLabel: "Leave Balances",
    description: "حساب استهلاك الإجازات السنوية والمرضية المعتمدة لكل موظف",
    icon: CalendarDays,
    themeCls: "bg-rose-50/60 border-rose-100 hover:border-rose-300 text-rose-900",
    activeCls: "ring-2 ring-rose-500 bg-rose-100/70 border-rose-300",
    iconCls: "bg-rose-500 text-white",
  },
  {
    key: "logs",
    label: "السجلات الخام",
    subLabel: "Raw Logs Console",
    description: "عرض حركات البصمة الفورية كما وصلت من الأجهزة مباشرة",
    icon: Server,
    themeCls: "bg-slate-50 border-slate-200 hover:border-slate-350 text-slate-900",
    activeCls: "ring-2 ring-slate-600 bg-slate-200 border-slate-350",
    iconCls: "bg-slate-600 text-white",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ReportsHub() {
  const [tab, setTab] = useState<TabKey>("daily");
  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ── 1. Bento Dashboard Navigation Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              id={`attendance-reports-tab-${t.key}`}
              role="tab"
              onClick={() => setTab(t.key)}
              aria-selected={isActive}
              aria-controls={`attendance-reports-panel-${t.key}`}
              className={`p-4 border rounded-2xl text-right flex flex-col justify-between h-32 transition-all duration-200 hover:scale-[1.02] ${
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
                <span className="text-[8px] opacity-60 font-mono block leading-none">{t.subLabel}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 2. Bento Panel Console Container ── */}
      <div className="border border-slate-200 rounded-3xl bg-white p-6 shadow-sm shadow-slate-100/50">
        <div className="pb-4 border-b border-slate-100 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-slate-900 rounded-full"></div>
            <h2 className="text-sm font-bold text-slate-800">{currentTab.label} ({currentTab.subLabel})</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{currentTab.description}</span>
        </div>

        <div
          id={`attendance-reports-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`attendance-reports-tab-${tab}`}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {tab === "daily" && <DailyView />}
          {tab === "monthly" && <Reports />}
          {tab === "perms" && <PermissionReport />}
          {tab === "balance" && <LeaveBalanceReport />}
          {tab === "logs" && <RawLogs />}
        </div>
      </div>

    </div>
  );
}
