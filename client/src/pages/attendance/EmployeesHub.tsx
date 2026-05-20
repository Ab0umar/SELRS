import { useState } from "react";
import EmployeesList from "./EmployeesList";
import LeaveManagement from "./LeaveManagement";
import Permissions from "./Permissions";
import ShiftAssignments from "./ShiftAssignments";

const TABS = [
  { key: "employees",    label: "الموظفون" },
  { key: "leaves",       label: "الإجازات" },
  { key: "permissions",  label: "الأذونات" },
  { key: "shifts",       label: "تعيين الورديات" },
];

export default function EmployeesHub() {
  const [tab, setTab] = useState("employees");

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
        {tab === "employees"   && <EmployeesList />}
        {tab === "leaves"      && <LeaveManagement />}
        {tab === "permissions" && <Permissions />}
        {tab === "shifts"      && <ShiftAssignments />}
      </div>
    </div>
  );
}
