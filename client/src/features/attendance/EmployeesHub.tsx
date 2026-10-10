import { useState } from "react";
import { handleTabListKeys } from "@/lib/tabKeys";
import { useAuth } from "@/hooks/useAuth";
import EmployeesList from "./EmployeesList";
import LeaveManagement from "./LeaveManagement";
import Permissions from "./Permissions";
import ManualPunches from "./ManualPunches";
import ShiftAssignments from "./ShiftAssignments";
import UserMappings from "./UserMappings";
import ScheduleSwap from "./ScheduleSwap";
import {
  Users,
  FileSpreadsheet,
  FileClock,
  Fingerprint,
  CalendarClock,
  Shuffle,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE_TABS = [
  {
    key: "employees",
    label: "قائمة الموظفين",
    icon: Users,
  },
  {
    key: "leaves",
    label: "طلبات الإجازة",
    icon: FileSpreadsheet,
  },
  {
    key: "permissions",
    label: "طلبات الأذون",
    icon: FileClock,
  },
  {
    key: "manual-punches",
    label: "تسجيل حضور يدوي",
    icon: Fingerprint,
  },
  {
    key: "shifts",
    label: "توزيع الورديات",
    icon: CalendarClock,
  },
  {
    key: "schedule-swap",
    label: "تغيير وتبديل المواعيد",
    icon: Shuffle,
  },
] as const;

type TabKey = (typeof BASE_TABS)[number]["key"] | "mappings";

export default function EmployeesHub() {
  const [tab, setTab] = useState<TabKey>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    return (
      BASE_TABS.find((entry) => entry.key === requestedTab)?.key ?? "employees"
    );
  });
  const { user } = useAuth();
  const isAdmin = String((user as any)?.role ?? "").toLowerCase() === "admin";

  const TABS = isAdmin
    ? [
        ...BASE_TABS,
        {
          key: "mappings" as const,
          label: "ربط المستخدمين",
          icon: Link2,
        },
      ]
    : BASE_TABS;

  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <h1 className="border-b border-border pb-4 text-2xl font-semibold text-foreground">
        الموظفون والطلبات
      </h1>
      <div
        role="tablist"
        aria-label="أقسام الموظفين والطلبات"
        onKeyDown={(event) =>
          handleTabListKeys(
            event,
            TABS.map((t) => t.key),
            tab,
            setTab,
            (key) => `attendance-employees-tab-${key}`,
          )
        }
        className="attendance-tabs"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <Button variant="bare"
              key={t.key}
              id={`attendance-employees-tab-${t.key}`}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              onClick={() => setTab(t.key)}
              aria-selected={isActive}
              aria-controls={`attendance-employees-panel-${t.key}`}
              className={
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="min-w-0">
        <div
          id={`attendance-employees-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`attendance-employees-tab-${tab}`}
          tabIndex={0}
        >
          {tab === "employees" && <EmployeesList />}
          {tab === "leaves" && <LeaveManagement />}
          {tab === "permissions" && <Permissions />}
          {tab === "manual-punches" && <ManualPunches />}
          {tab === "shifts" && <ShiftAssignments />}
          {tab === "schedule-swap" && <ScheduleSwap />}
          {tab === "mappings" && <UserMappings />}
        </div>
      </div>
    </div>
  );
}
