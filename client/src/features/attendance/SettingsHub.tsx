import { useState } from "react";
import ShiftManagement from "./ShiftManagement";
import Holidays from "./Holidays";
import Settings from "./Settings";
import AdminDashboard from "./admin/AdminDashboard";
import DeviceSettings from "./admin/DeviceSettings";
import { Cpu, Clock, Calendar, Sliders, Shield } from "lucide-react";
import { handleTabListKeys } from "@/lib/tabKeys";
import { Button } from "@/components/ui/button";

const TABS = [
  {
    key: "device",
    label: "الأجهزة والمزامنة",
    icon: Cpu,
  },
  {
    key: "shifts",
    label: "تعريف الورديات",
    icon: Clock,
  },
  {
    key: "holidays",
    label: "العطلات الرسمية",
    icon: Calendar,
  },
  {
    key: "settings",
    label: "قواعد الحضور",
    icon: Sliders,
  },
  {
    key: "admin",
    label: "لوحة الإدارة",
    icon: Shield,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsHub() {
  const [tab, setTab] = useState<TabKey>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    return TABS.find((entry) => entry.key === requestedTab)?.key ?? "device";
  });
  return (
    <div className="min-w-0 space-y-5" dir="rtl">
      <h1 className="border-b border-border pb-4 text-2xl font-semibold text-foreground">إعدادات الحضور</h1>
      <div
        role="tablist"
        aria-label="إعدادات الحضور"
        onKeyDown={(event) =>
          handleTabListKeys(
            event,
            TABS.map((entry) => entry.key),
            tab,
            setTab,
            (key) => `attendance-settings-tab-${key}`,
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
              id={`attendance-settings-tab-${t.key}`}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              onClick={() => setTab(t.key)}
              aria-selected={isActive}
              aria-controls={`attendance-settings-panel-${t.key}`}
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

      <div
        id={`attendance-settings-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`attendance-settings-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "device" && <DeviceSettings />}
        {tab === "shifts" && <ShiftManagement />}
        {tab === "holidays" && <Holidays />}
        {tab === "settings" && <Settings />}
        {tab === "admin" && <AdminDashboard />}
      </div>
    </div>
  );
}
