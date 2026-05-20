import { useState } from "react";
import DailyView from "./DailyView";
import Reports from "./Reports";
import PermissionReport from "./PermissionReport";
import LeaveBalanceReport from "./LeaveBalanceReport";
import RawLogs from "./RawLogs";

const TABS = [
  { key: "daily",   label: "يومي" },
  { key: "monthly", label: "شهري وتفصيلي" },
  { key: "perms",   label: "تقرير الأذونات" },
  { key: "balance", label: "رصيد الإجازات" },
  { key: "logs",    label: "السجلات الخام" },
];

export default function ReportsHub() {
  const [tab, setTab] = useState("daily");

  return (
    <div dir="rtl">
      <div className="border-b bg-white flex gap-0 px-4 pt-3 overflow-x-auto sticky top-0 z-10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
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
