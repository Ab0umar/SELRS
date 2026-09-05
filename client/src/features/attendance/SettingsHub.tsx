import { useState } from "react";
import ShiftManagement from "./ShiftManagement";
import Holidays from "./Holidays";
import Settings from "./Settings";
import AdminDashboard from "./admin/AdminDashboard";
import DeviceSettings from "./admin/DeviceSettings";
import { Cpu, Clock, Calendar, Sliders, Shield } from "lucide-react";

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
  const [tab, setTab] = useState<TabKey>("device");
  return (
    <div className="space-y-6" dir="rtl">
      <div role="tablist" aria-label="إعدادات الحضور" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              id={`attendance-settings-tab-${t.key}`}
              role="tab"
              onClick={() => setTab(t.key)}
              aria-selected={isActive}
              aria-controls={`attendance-settings-panel-${t.key}`}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`attendance-settings-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`attendance-settings-tab-${tab}`}
        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
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
