import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import EmployeesList from "./EmployeesList";
import LeaveManagement from "./LeaveManagement";
import Permissions from "./Permissions";
import ShiftAssignments from "./ShiftAssignments";
import UserMappings from "./UserMappings";

const BASE_TABS = [
  { key: "employees", label: "قائمة الموظفين", description: "بيانات الموظفين وحالة الربط" },
  { key: "leaves", label: "طلبات الإجازة", description: "رصيد وطلبات الإجازات" },
  { key: "permissions", label: "طلبات الأذون", description: "أذونات الحضور والانصراف" },
  { key: "shifts", label: "توزيع الورديات", description: "ربط الموظفين بالورديات" },
];

export default function EmployeesHub() {
  const [tab, setTab] = useState("employees");
  const { user } = useAuth();
  const isAdmin = String((user as any)?.role ?? "").toLowerCase() === "admin";
  const TABS = isAdmin
    ? [
        ...BASE_TABS,
        {
          key: "mappings",
          label: "ربط المستخدمين",
          description: "ربط حسابات النظام بموظفي الحضور",
        },
      ]
    : BASE_TABS;
  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            مسار الموظفين والطلبات
          </p>
          <h2 className="text-xl font-bold text-foreground">
            {currentTab.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentTab.description}
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="أقسام الموظفين"
        className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 pt-1"
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
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
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
        {tab === "mappings" && <UserMappings />}
      </div>
    </div>
  );
}
