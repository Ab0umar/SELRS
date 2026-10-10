import { useEffect, useState } from "react";
import { handleTabListKeys } from "@/lib/tabKeys";
import { useLocalToday } from "@/hooks/useLocalToday";
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
    label: "التقرير اليومي",
    icon: FileText,
  },
  {
    key: "monthly",
    label: "التحليل التفصيلي",
    icon: BarChart3,
  },
  {
    key: "perms",
    label: "أذونات الموظفين",
    icon: Clock,
  },
  {
    key: "balance",
    label: "أرصدة الإجازات",
    icon: CalendarDays,
  },
  {
    key: "logs",
    label: "السجلات الخام",
    icon: Server,
  },
  {
    key: "fingerprints",
    label: "البصمات الشهرية",
    icon: Fingerprint,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ReportsHub() {
  const [tab, setTab] = useState<TabKey>("daily");
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const today = useLocalToday();
  const [reportDates, setReportDates] = useState(() => ({
    from: today,
    to: today,
  }));
  useEffect(() => {
    setReportDates((current) =>
      current.from === current.to && current.to !== today
        ? { from: today, to: today }
        : current,
    );
  }, [today]);

  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <h1 className="border-b border-border pb-4 text-2xl font-semibold text-foreground">تقارير الحضور</h1>
      <div
        role="tablist"
        aria-label="أنواع التقارير"
        onKeyDown={(event) =>
          handleTabListKeys(
            event,
            TABS.map((t) => t.key),
            tab,
            setTab,
            (key) => `attendance-reports-tab-${key}`,
          )
        }
        className="attendance-tabs"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              id={`attendance-reports-tab-${t.key}`}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              onClick={() => setTab(t.key)}
              aria-selected={isActive}
              aria-controls={`attendance-reports-panel-${t.key}`}
              className={
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-border pb-4">
          <label className="w-full space-y-1 text-sm text-muted-foreground sm:w-auto">
            <span className="block">من تاريخ</span>
            <DateInput
              value={reportDates.from}
              max={reportDates.to}
              onChange={(event) =>
                setReportDates((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
              aria-label="من تاريخ التقرير"
              className="h-11 w-full shrink-0 rounded-md border-input bg-card px-2 text-center text-sm sm:w-[11rem]"
            />
          </label>
          <label className="w-full space-y-1 text-sm text-muted-foreground sm:w-auto">
            <span className="block">إلى تاريخ</span>
            <DateInput
              value={reportDates.to}
              min={reportDates.from}
              onChange={(event) =>
                setReportDates((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
              aria-label="إلى تاريخ التقرير"
              className="h-11 w-full shrink-0 rounded-md border-input bg-card px-2 text-center text-sm sm:w-[11rem]"
            />
          </label>
          <label className="space-y-1 text-sm text-muted-foreground">
            <span className="block">مكان العمل</span>
            <select
              value={department ?? ""}
              onChange={(event) =>
                setDepartment(event.target.value || undefined)
              }
              aria-label="مكان العمل"
              className="h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground"
            >
              <option value="">الكل</option>
              <option value="مركز">المركز</option>
              <option value="عيادة">العيادة</option>
            </select>
          </label>
          <div
            id="attendance-report-toolbar"
            className="flex w-full flex-wrap items-center gap-2 sm:w-auto [&_button]:flex-auto sm:[&_button]:flex-none"
          />
        </div>

        <div
          id={`attendance-reports-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`attendance-reports-tab-${tab}`}
          tabIndex={0}
        >
          {tab === "daily" && (
            <DailyView {...reportDates} department={department} />
          )}
          {tab === "monthly" && (
            <Reports {...reportDates} department={department} />
          )}
          {tab === "perms" && (
            <PermissionReport {...reportDates} department={department} />
          )}
          {tab === "balance" && (
            <LeaveBalanceReport {...reportDates} department={department} />
          )}
          {tab === "logs" && (
            <RawLogs {...reportDates} department={department} />
          )}
          {tab === "fingerprints" && (
            <MonthlyFingerprints {...reportDates} department={department} />
          )}
        </div>
      </div>
    </div>
  );
}
