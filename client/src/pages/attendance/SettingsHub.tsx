import { useState } from "react";
import ShiftManagement from "./ShiftManagement";
import Holidays from "./Holidays";
import Settings from "./Settings";
import AdminDashboard from "./admin/AdminDashboard";
import DeviceSettings from "./admin/DeviceSettings";

const TABS = [
  { key: "shifts", label: "الورديات" },
  { key: "holidays", label: "الإجازات الرسمية" },
  { key: "settings", label: "الإعدادات" },
  { key: "admin", label: "الإدارة والمزامنة" },
  { key: "device", label: "الجهاز" },
];

export default function SettingsHub() {
  const [tab, setTab] = useState("shifts");

  return (
    <div className="space-y-5 p-6" dir="rtl">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Attendance settings / إعدادات الحضور
        </p>
        <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
      </div>

      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 pt-1 backdrop-blur-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors -mb-px ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {tab === "shifts" && <ShiftManagement />}
        {tab === "holidays" && <Holidays />}
        {tab === "settings" && <Settings />}
        {tab === "admin" && <AdminDashboard />}
        {tab === "device" && <DeviceSettings />}
      </div>
    </div>
  );
}
