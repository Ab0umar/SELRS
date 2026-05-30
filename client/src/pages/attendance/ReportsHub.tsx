import { useState } from "react";
import DailyView from "./DailyView";
import Reports from "./Reports";
import PermissionReport from "./PermissionReport";
import LeaveBalanceReport from "./LeaveBalanceReport";
import RawLogs from "./RawLogs";

const TABS = [
  { key: "daily", label: "اليومي", description: "مراجعة يوم أو فترة قصيرة" },
  { key: "monthly", label: "التفصيلي", description: "تقرير شهري وتحليل كامل" },
  { key: "perms", label: "الأذونات", description: "تقرير أذونات الموظفين" },
  { key: "balance", label: "رصيد الإجازات", description: "الأرصدة والاستهلاك" },
  { key: "logs", label: "السجلات الخام", description: "بيانات الجهاز كما وصلت" },
];

export default function ReportsHub() {
  const [tab, setTab] = useState("daily");
  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">مسار التقارير</p>
        <h2 className="text-xl font-bold text-foreground">{currentTab.label}</h2>
        <p className="text-sm text-muted-foreground">{currentTab.description}</p>
      </div>

      <div
        role="tablist"
        aria-label="تقارير الحضور"
        className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 pt-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`attendance-reports-tab-${t.key}`}
            role="tab"
            onClick={() => setTab(t.key)}
            aria-selected={tab === t.key}
            aria-controls={`attendance-reports-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={`-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        id={`attendance-reports-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`attendance-reports-tab-${tab}`}
      >
        {tab === "daily" && <DailyView />}
        {tab === "monthly" && <Reports />}
        {tab === "perms" && <PermissionReport />}
        {tab === "balance" && <LeaveBalanceReport />}
        {tab === "logs" && <RawLogs />}
      </div>
    </div>
  );
}
