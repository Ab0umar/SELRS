import { useState } from "react";
import EmployeesList from "./EmployeesList";
import LeaveManagement from "./LeaveManagement";
import Permissions from "./Permissions";
import ShiftAssignments from "./ShiftAssignments";

const TABS = [
  { key: "employees", label: "الموظفون" },
  { key: "leaves", label: "الإجازات" },
  { key: "permissions", label: "الأذونات" },
  { key: "shifts", label: "تعيين الورديات" },
];

export default function EmployeesHub() {
  const [tab, setTab] = useState("employees");

  return (
    <div dir="rtl">
      <div
        role="tablist"
        aria-label="أقسام الموظفين"
        className="sticky top-0 z-10 flex gap-0 overflow-x-auto border-b bg-background px-4 pt-3"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`attendance-employees-tab-${t.key}`}
            role="tab"
            onClick={() => setTab(t.key)}
            aria-selected={tab === t.key}
            aria-controls={`attendance-employees-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={`-mb-px whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
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
        id={`attendance-employees-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`attendance-employees-tab-${tab}`}
      >
        {tab === "employees" && <EmployeesList />}
        {tab === "leaves" && <LeaveManagement />}
        {tab === "permissions" && <Permissions />}
        {tab === "shifts" && <ShiftAssignments />}
      </div>
    </div>
  );
}
