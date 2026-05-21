import { useState } from "react";
import DailyView from "./DailyView";
import Reports from "./Reports";
import PermissionReport from "./PermissionReport";
import LeaveBalanceReport from "./LeaveBalanceReport";
import RawLogs from "./RawLogs";

const TABS = [
  { key: "daily", label: "يومي", tone: "primary" },
  { key: "monthly", label: "شهري وتفصيلي", tone: "info" },
  { key: "perms", label: "تقرير الأذونات", tone: "secondary" },
  { key: "balance", label: "رصيد الإجازات", tone: "success" },
  { key: "logs", label: "السجلات الخام", tone: "warning" },
];

export default function ReportsHub() {
  const [tab, setTab] = useState("daily");

  const toneClasses: Record<string, string> = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    info: "border-info/20 bg-info/10 text-info",
    secondary: "border-secondary/20 bg-secondary/10 text-secondary",
    success: "border-success/20 bg-success/10 text-success",
    warning: "border-warning/30 bg-warning/10 text-warning",
  };

  return (
    <div dir="rtl">
      <div className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 pt-3 backdrop-blur-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px inline-flex min-h-11 items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.key
                ? `${toneClasses[t.tone]}`
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                tab === t.key ? "bg-current" : "bg-muted-foreground/40"
              }`}
              aria-hidden
            />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "daily"   && <DailyView />}
        {tab === "monthly" && <Reports />}
        {tab === "perms"   && <PermissionReport />}
        {tab === "balance" && <LeaveBalanceReport />}
        {tab === "logs"    && <RawLogs />}
      </div>
    </div>
  );
}
