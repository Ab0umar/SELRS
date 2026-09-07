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
      "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "monthly",
    label: "التحليل التفصيلي",
    subLabel: "Period Analytics",
    description:
      "تقارير الحضور حسب الفترة المختارة والتحليل الكامل لساعات التأخير",
    icon: BarChart3,
    themeCls:
      "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "perms",
    label: "أذونات الموظفين",
    subLabel: "Permits",
    description: "رصد وتفصيل أذونات خروج ودخول الموظفين خلال النوبات",
    icon: Clock,
    themeCls: "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "balance",
    label: "أرصدة الإجازات",
    subLabel: "Leave Balances",
    description: "حساب استهلاك الإجازات السنوية والمرضية المعتمدة لكل موظف",
    icon: CalendarDays,
    themeCls:
      "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "logs",
    label: "السجلات الخام",
    subLabel: "Raw Logs Console",
    description: "عرض حركات البصمة الفورية كما وصلت من الأجهزة مباشرة",
    icon: Server,
    themeCls:
      "bg-muted/40 border-border/60 hover:border-border/60 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-border/60",
    iconCls: "bg-primary text-primary-foreground",
  },
  {
    key: "fingerprints",
    label: "البصمات الشهرية",
    subLabel: "Monthly Fingerprints",
    description: "جدول شهري لحركات البصمة مقسّم حسب رقم الموظف واليوم",
    icon: Fingerprint,
    themeCls:
      "bg-muted/40 border-border/60 hover:border-primary/40 text-foreground",
    activeCls: "ring-2 ring-primary bg-primary/10 border-primary/40",
    iconCls: "bg-primary text-primary-foreground",
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
      <div className="grid w-full grid-cols-2 gap-2 border-b border-border/60 pb-2 sm:grid-cols-3 xl:grid-cols-6">
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
                className={`p-2 rounded-xl shrink-0 w-fit ${isActive ? t.iconCls : "bg-card text-muted-foreground border border-border/60"}`}
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

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border/60 pb-4">
          <DateInput
            value={reportDates.from}
            max={reportDates.to}
            onChange={(event) =>
              setReportDates((current) => ({ ...current, from: event.target.value }))
            }
            aria-label="من تاريخ التقرير"
            className="h-10 w-40 rounded-lg border-border/60 bg-card px-2 text-center text-sm"
          />
          <DateInput
            value={reportDates.to}
            min={reportDates.from}
            onChange={(event) =>
              setReportDates((current) => ({ ...current, to: event.target.value }))
            }
            aria-label="إلى تاريخ التقرير"
            className="h-10 w-40 rounded-lg border-border/60 bg-card px-2 text-center text-sm"
          />
          <select
            value={department ?? ""}
            onChange={(event) => setDepartment(event.target.value || undefined)}
            aria-label="مكان العمل"
            className="h-10 rounded-lg border border-border/60 bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
