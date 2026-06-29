import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  LayoutDashboard,
  Users,
  ChevronLeft,
  Activity,
  Clock,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

interface AttendanceLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

const navigationSections = [
  {
    id: "monitoring",
    label: "المراقبة اليومية",
    items: [
      {
        href: "/attendance",
        label: "لوحة التحكم",
        icon: LayoutDashboard,
        activeFor: ["/attendance"],
      },
      {
        href: "/attendance/live",
        label: "الحضور الآن",
        icon: Activity,
        activeFor: ["/attendance/live"],
      },
    ],
  },
  {
    id: "employees",
    label: "الموظفون والطلبات",
    items: [
      {
        href: "/attendance/employees",
        label: "قائمة الموظفين",
        icon: Users,
        activeFor: ["/attendance/employees"],
      },
      {
        href: "/attendance/shift-schedule",
        label: "الروستر الشهري",
        icon: Clock,
        activeFor: ["/attendance/shift-schedule"],
      },
    ],
  },
  {
    id: "reports",
    label: "التقارير",
    items: [
      {
        href: "/attendance/reports",
        label: "التقارير",
        icon: BarChart3,
        activeFor: ["/attendance/reports"],
      },
    ],
  },
  {
    id: "settings",
    label: "الإعدادات والمزامنة",
    items: [
      {
        href: "/attendance/settings",
        label: "الإعدادات",
        icon: Settings,
        activeFor: ["/attendance/settings"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/attendance"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function AttendanceLayout({ children, fullWidth }: AttendanceLayoutProps) {
  const [location] = useLocation();

  const deviceQuery = (trpc as any).attendance.deviceStatus.useQuery(
    undefined,
    {
      refetchInterval: 20_000,
      refetchIntervalInBackground: false,
    },
  );

  const device = deviceQuery.data as any;
  const isDeviceOnline = device?.status === "online" || device?.connected === true;
  const isDeviceConnecting = device?.status === "connecting";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6" dir="rtl">
      
      {/* ── 1. Floating Bento Top Header Capsule ── */}
      <header className="max-w-[1600px] mx-auto mb-6 bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-mono font-black text-sm">
            HR
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 leading-none">إدارة عمليات الموارد البشرية</h1>
            <span className="text-[10px] text-slate-400 block mt-1 font-medium">سجل وبصمات الحضور والانصراف الطبي</span>
          </div>
        </div>

        {/* Dynamic connection indicator badge inside header */}
        <div className="flex items-center gap-3 self-start md:self-center">
          {deviceQuery.isLoading ? (
            <Skeleton className="h-6 w-24 rounded-full animate-pulse" />
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm ${
                isDeviceOnline
                  ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                  : isDeviceConnecting
                    ? "bg-amber-50 text-amber-750 border-amber-150"
                    : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isDeviceOnline
                    ? "bg-emerald-500 animate-ping"
                    : isDeviceConnecting
                      ? "bg-amber-500 animate-pulse"
                      : "bg-slate-400"
                }`}
              />
              {isDeviceOnline ? "جهاز البصمة: متصل" : isDeviceConnecting ? "جهاز البصمة: جارٍ الاتصال" : "جهاز البصمة: غير متصل"}
            </span>
          )}
        </div>
      </header>

      {/* ── 2. Floating Console Layout ── */}
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        {/* Horizontal Top Navigation Bar (all breakpoints) */}
        <nav className="w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none print:hidden">
          {navigationSections.flatMap((section) =>
            section.items.map((item) => {
              const isActive = isItemActive(location, item.activeFor);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            }),
          )}
        </nav>

        {/* Main Content Floating Bento Container */}
        <main className="flex-1 w-full min-w-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          {children}
        </main>

      </div>
    </div>
  );
}
