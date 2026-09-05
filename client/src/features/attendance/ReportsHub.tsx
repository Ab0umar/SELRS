import { useState } from "react";
import DailyView from "./DailyView";
import Reports from "./Reports";
import PermissionReport from "./PermissionReport";
import LeaveBalanceReport from "./LeaveBalanceReport";
import RawLogs from "./RawLogs";
import MonthlyFingerprints from "./MonthlyFingerprints";
import {
  FileText,
  BarChart3,
  Clock,
  CalendarDays,
  Server,
  Fingerprint,
} from "lucide-react";
import { DateInput } from "@/components/ui/date-input";

const TABS = [
  {
    key: "daily",
    label: "تقرير اليومي",
    subLabel: "Daily Report",
    description: "مراجعة حضور وانصراف الموظفين ليوم محدد أو فترة قصيرة",
    icon: FileText,
    themeCls:
      "bg-teal-50/60 border-teal-100 hover:border-teal-300 text-teal-900",
    activeCls: "ring-2 ring-teal-500 bg-teal-100/70 border-teal-300",
    iconCls: "bg-teal-500 text-white",
  },
  {
    key: "monthly",
    label: "التحليل التفصيلي",
    subLabel: "Period Analytics",
    description:
      "تقارير الحضور حسب الفترة المختارة والتحليل الكامل لساعات التأخير",
    icon: BarChart3,
    themeCls:
      "bg-indigo-50/60 border-indigo-100 hover:border-indigo-300 text-indigo-900",
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
    themeCls:
      "bg-rose-50/60 border-rose-100 hover:border-rose-300 text-rose-900",
    activeCls: "ring-2 ring-rose-500 bg-rose-100/70 border-rose-300",
    iconCls: "bg-rose-500 text-white",
  },
  {
    key: "logs",
    label: "السجلات الخام",
    subLabel: "Raw Logs Console",
    description: "عرض حركات البصمة الفورية كما وصلت من الأجهزة مباشرة",
    icon: Server,
    themeCls:
      "bg-slate-50 border-slate-200 hover:border-slate-350 text-slate-900",
    activeCls: "ring-2 ring-slate-600 bg-slate-200 border-slate-350",
    iconCls: "bg-slate-600 text-white",
  },
  {
    key: "fingerprints",
    label: "البصمات الشهرية",
    subLabel: "Monthly Fingerprints",
    description: "جدول شهري لحركات البصمة مقسّم حسب رقم الموظف واليوم",
    icon: Fingerprint,
    themeCls:
      "bg-cyan-50/60 border-cyan-100 hover:border-cyan-300 text-cyan-900",
    activeCls: "ring-2 ring-cyan-500 bg-cyan-100/70 border-cyan-300",
    iconCls: "bg-cyan-600 text-white",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ReportsHub() {
  const [tab, setTab] = useState<TabKey>("daily");
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const today = new Date().toISOString().slice(0, 10);
  const [reportDates, setReportDates] = useState({ from: today, to: today });

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── 1. Bento Dashboard Navigation Grid ── */}
      <div className="grid w-full grid-cols-2 gap-2 border-b border-slate-200 pb-2 sm:grid-cols-3 xl:grid-cols-6">
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
              className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg border-b-2 px-3 py-2 text-right text-xs font-bold transition-colors ${
                isActive ? t.activeCls : t.themeCls
              }`}
            >
              {/* Icon Container */}
              <div
                className={`p-2 rounded-xl shrink-0 w-fit ${isActive ? t.iconCls : "bg-white text-slate-600 border border-slate-100"}`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Title & Desc */}
              <div className="space-y-0.5 mt-3">
                <span className="text-[11px] font-black block leading-none">
                  {t.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border border-slate-200 rounded-3xl bg-white p-6 shadow-sm shadow-slate-100/50">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <DateInput
            value={reportDates.from}
            max={reportDates.to}
            onChange={(event) =>
              setReportDates((current) => ({ ...current, from: event.target.value }))
            }
            aria-label="من تاريخ التقرير"
            className="h-10 w-40 rounded-lg border-slate-200 bg-white px-2 text-center text-sm"
          />
          <DateInput
            value={reportDates.to}
            min={reportDates.from}
            onChange={(event) =>
              setReportDates((current) => ({ ...current, to: event.target.value }))
            }
            aria-label="إلى تاريخ التقرير"
            className="h-10 w-40 rounded-lg border-slate-200 bg-white px-2 text-center text-sm"
          />
          <select
            value={department ?? ""}
            onChange={(event) => setDepartment(event.target.value || undefined)}
            aria-label="مكان العمل"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">الكل</option>
            <option value="center">المركز</option>
            <option value="clinic">العيادة</option>
          </select>
          <div
            id="attendance-report-toolbar"
            className="flex flex-wrap items-center gap-2"
          />
        </div>

        <div
          id={`attendance-reports-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`attendance-reports-tab-${tab}`}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {tab === "daily" && <DailyView {...reportDates} department={department} />}
          {tab === "monthly" && <Reports {...reportDates} department={department} />}
          {tab === "perms" && <PermissionReport {...reportDates} department={department} />}
          {tab === "balance" && <LeaveBalanceReport {...reportDates} department={department} />}
          {tab === "logs" && <RawLogs {...reportDates} department={department} />}
          {tab === "fingerprints" && (
            <MonthlyFingerprints {...reportDates} department={department} />
          )}
        </div>
      </div>
    </div>
  );
}
