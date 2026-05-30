import { useState } from "react";
import ShiftManagement from "./ShiftManagement";
import Holidays from "./Holidays";
import Settings from "./Settings";
import AdminDashboard from "./admin/AdminDashboard";
import DeviceSettings from "./admin/DeviceSettings";
import SyncStatus from "./admin/SyncStatus";
import EmpSync from "./admin/EmpSync";

const TABS = [
  { key: "device", label: "الجهاز", description: "اتصال جهاز البصمة ومسارات البيانات" },
  { key: "sync", label: "المزامنة", description: "حالة تزامن البصمات وآخر تشغيل" },
  { key: "empsync", label: "موظفو الجهاز", description: "مطابقة موظفي الجهاز مع النظام" },
  { key: "shifts", label: "تعريف الورديات", description: "إنشاء الورديات وقواعدها" },
  { key: "holidays", label: "العطلات الرسمية", description: "أيام العطل المدفوعة وغير المدفوعة" },
  { key: "settings", label: "قواعد الحضور", description: "حدود التأخير والانصراف والحساب" },
  { key: "admin", label: "لوحة الإدارة", description: "ملخصات وأدوات إدارة وحدة الحضور" },
];

export default function SettingsHub() {
  const [tab, setTab] = useState("device");
  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          مسار الإعدادات والمزامنة
        </p>
        <h2 className="text-xl font-bold text-foreground">{currentTab.label}</h2>
        <p className="text-sm text-muted-foreground">
          {currentTab.description}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="إعدادات الحضور والمزامنة"
        className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 pt-1"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`attendance-settings-tab-${t.key}`}
            role="tab"
            onClick={() => setTab(t.key)}
            aria-selected={tab === t.key}
            aria-controls={`attendance-settings-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
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

      <div
        id={`attendance-settings-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`attendance-settings-tab-${tab}`}
        className="space-y-6"
      >
        {tab === "shifts" && <ShiftManagement />}
        {tab === "holidays" && <Holidays />}
        {tab === "settings" && <Settings />}
        {tab === "admin" && <AdminDashboard />}
        {tab === "device" && <DeviceSettings />}
        {tab === "sync" && <SyncStatus />}
        {tab === "empsync" && <EmpSync />}
      </div>
    </div>
  );
}
