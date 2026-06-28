import { useState } from "react";
import ShiftManagement from "./ShiftManagement";
import Holidays from "./Holidays";
import Settings from "./Settings";
import AdminDashboard from "./admin/AdminDashboard";
import DeviceSettings from "./admin/DeviceSettings";
import { Cpu, Clock, Calendar, Sliders, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const TABS = [
  {
    key: "device",
    label: "الأجهزة والمزامنة",
    subLabel: "Devices & Integration",
    description: "إعداد أجهزة البصمة والربط والتحكم بسحب البصمات والأسماء",
    icon: Cpu,
    themeCls: "bg-teal-50/60 border-teal-100 hover:border-teal-300 text-teal-900",
    activeCls: "ring-2 ring-teal-500 bg-teal-100/70 border-teal-300",
    iconCls: "bg-teal-500 text-white",
  },
  {
    key: "shifts",
    label: "تعريف الورديات",
    subLabel: "Shift Schedules",
    description: "تحديد ساعات العمل والورديات المختلفة وتوزيعها",
    icon: Clock,
    themeCls: "bg-indigo-50/60 border-indigo-100 hover:border-indigo-300 text-indigo-900",
    activeCls: "ring-2 ring-indigo-500 bg-indigo-100/70 border-indigo-300",
    iconCls: "bg-indigo-500 text-white",
  },
  {
    key: "holidays",
    label: "العطلات الرسمية",
    subLabel: "Public Holidays",
    description: "إضافة أيام العطلات والإجازات السنوية المدفوعة",
    icon: Calendar,
    themeCls: "bg-rose-50/60 border-rose-100 hover:border-rose-300 text-rose-900",
    activeCls: "ring-2 ring-rose-500 bg-rose-100/70 border-rose-300",
    iconCls: "bg-rose-500 text-white",
  },
  {
    key: "settings",
    label: "قواعد الحضور",
    subLabel: "Attendance Rules",
    description: "حساب ساعات التأخير والانصراف والخصومات التلقائية",
    icon: Sliders,
    themeCls: "bg-amber-50/60 border-amber-100 hover:border-amber-300 text-amber-900",
    activeCls: "ring-2 ring-amber-500 bg-amber-100/70 border-amber-300",
    iconCls: "bg-amber-500 text-white",
  },
  {
    key: "admin",
    label: "لوحة الإدارة",
    subLabel: "Admin Control Hub",
    description: "أدوات الإشراف والتحكم المتقدمة لوحدة الحضور",
    icon: Shield,
    themeCls: "bg-slate-50/80 border-slate-200 hover:border-slate-350 text-slate-900",
    activeCls: "ring-2 ring-slate-600 bg-slate-200 border-slate-350",
    iconCls: "bg-slate-600 text-white",
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsHub() {
  const [tab, setTab] = useState<TabKey>("device");
  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300" dir="rtl">
      
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900">إعدادات نظام الحضور والانصراف</h1>
        <p className="text-xs text-slate-400 mt-1">لوحة تحكم تفاعلية مقسمة كبينتو لتخصيص خطط عمل الموظفين والربط المباشر مع الأجهزة</p>
      </div>

      {/* ── 1. Bento Dashboard Navigation Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              className={`p-5 border rounded-2xl text-right flex flex-col justify-between h-36 transition-all duration-200 hover:scale-[1.02] ${
                isActive ? t.activeCls : t.themeCls
              }`}
            >
              {/* Icon Container */}
              <div className={`p-2 rounded-xl shrink-0 w-fit ${isActive ? t.iconCls : "bg-white/80 text-slate-600 border border-slate-100"}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>

              {/* Title & Desc */}
              <div className="space-y-1 mt-4">
                <span className="text-xs font-black block leading-none">{t.label}</span>
                <span className="text-[8px] opacity-60 font-mono block leading-none">{t.subLabel}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 2. Bento Panel Console Container ── */}
      <div className="border border-slate-200 rounded-3xl bg-white p-6 shadow-sm shadow-slate-100/50">
        <div className="pb-4 border-b border-slate-100 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-4 bg-slate-900 rounded-full"></div>
            <h2 className="text-sm font-bold text-slate-800">{currentTab.label} ({currentTab.subLabel})</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{currentTab.description}</span>
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

    </div>
  );
}
