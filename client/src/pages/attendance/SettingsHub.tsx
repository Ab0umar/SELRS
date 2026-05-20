import { useState } from "react";
import ShiftManagement from "./ShiftManagement";
import Holidays from "./Holidays";
import Settings from "./Settings";
import AdminDashboard from "./admin/AdminDashboard";
import DeviceSettings from "./admin/DeviceSettings";

const TABS = [
  { key: "shifts",   label: "الورديات" },
  { key: "holidays", label: "الإجازات الرسمية" },
  { key: "settings", label: "الإعدادات" },
  { key: "admin",    label: "الإدارة والمزامنة" },
  { key: "device",   label: "الجهاز" },
];

export default function SettingsHub() {
  const [tab, setTab] = useState("shifts");

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
        {tab === "shifts"   && <ShiftManagement />}
        {tab === "holidays" && <Holidays />}
        {tab === "settings" && <Settings />}
        {tab === "admin"    && <AdminDashboard />}
        {tab === "device"   && <DeviceSettings />}
      </div>
    </div>
  );
}
