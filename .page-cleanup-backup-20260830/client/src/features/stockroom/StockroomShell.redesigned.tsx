import { lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import {
  Archive,
  Eye,
  Syringe,
  Package,
  FileText,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const StockroomDashboard = lazy(() => import("./StockroomDashboard.redesigned"));
const StockroomCategory = lazy(() => import("./StockroomCategory"));
const StockroomReports = lazy(() => import("./StockroomReports.redesigned"));

interface StockroomShellProps {
  children?: React.ReactNode;
}

const navigationSections = [
  {
    id: "main",
    label: "الرئيسية",
    description: "لوحة التحكم وإحصائيات المخزن",
    icon: LayoutDashboard,
    items: [
      {
        href: "/stockroom",
        label: "لوحة التحكم",
        description: "متابعة حالة المخزون العامة",
        activeFor: ["/stockroom"],
      },
    ],
  },
  {
    id: "categories",
    label: "تصنيفات المخزون",
    description: "إدارة الأصناف حسب القسم",
    icon: Package,
    items: [
      {
        href: "/stockroom/eye-drops",
        label: "قطرات العين",
        description: "القطرات والمحاليل الطبية المعقمة",
        activeFor: ["/stockroom/eye-drops"],
      },
      {
        href: "/stockroom/op-room",
        label: "مستلزمات العمليات",
        description: "أدوات وغيارات غرف العمليات والليزك",
        activeFor: ["/stockroom/op-room"],
      },
      {
        href: "/stockroom/surgical",
        label: "أدوات جراحية",
        description: "مشرط، ملاقط ومستهلكات جراحية",
        activeFor: ["/stockroom/surgical"],
      },
      {
        href: "/stockroom/office",
        label: "لوازم مكتبية",
        description: "أوراق، أقلام وأدوات إدارية",
        activeFor: ["/stockroom/office"],
      },
    ],
  },
  {
    id: "analytics",
    label: "التقارير",
    description: "تصدير وجرد حركات المخزن",
    icon: FileText,
    items: [
      {
        href: "/stockroom/reports",
        label: "التقارير الشاملة",
        description: "حركات الإستلام والمنصرف والجرد الكلي",
        activeFor: ["/stockroom/reports"],
      },
    ],
  },
];

function isItemActive(pathname: string, activeFor: string[]) {
  return activeFor.some((path) =>
    path === "/stockroom"
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function StockroomShell() {
  const [location] = useLocation();
  const { canAccess } = usePermissions();

  const reportsQuery = trpc.stockroom.getReports.useQuery(
    {},
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const inventory = reportsQuery.data?.inventory || [];
  const totalItems = inventory.length;
  const lowCount = inventory.filter((item: any) => item.status === "كمية قليلة").length;
  const outCount = inventory.filter((item: any) => item.status === "نفذ المخزون").length;

  const renderPage = () => {
    if (location === "/stockroom/reports") return <StockroomReports />;
    if (location.startsWith("/stockroom/")) return <StockroomCategory />;
    return <StockroomDashboard />;
  };

  const metrics = [
    {
      label: "إجمالي الأصناف",
      value: reportsQuery.isLoading ? "—" : totalItems,
      tone: "text-slate-800",
      accent: "bg-slate-50 border-slate-200",
    },
    {
      label: "قليل المخزون",
      value: reportsQuery.isLoading ? "—" : lowCount,
      tone: lowCount > 0 ? "text-amber-700 font-black animate-pulse" : "text-slate-700",
      accent: lowCount > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200",
    },
    {
      label: "نفذ المخزون",
      value: reportsQuery.isLoading ? "—" : outCount,
      tone: outCount > 0 ? "text-rose-700 font-black animate-pulse" : "text-slate-750",
      accent: outCount > 0 ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200",
    },
  ];

  return (
    <div
      className="page-layout min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Header with metrics */}
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto w-full px-3 py-4 sm:px-4 lg:px-5">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Title section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                  <Archive className="h-3.5 w-3.5" />
                  المخزن المركزي
                </div>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                نظام إدارة المخزون
              </h1>
              <p className="max-w-2xl text-[11px] font-semibold text-slate-400 mt-1 leading-snug">
                متابعة مستلزمات العيادة، قطرات العين، مستهلكات العمليات، والتقارير الشاملة.
              </p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-2xl border p-3.5 shadow-sm bg-white flex flex-col justify-between`}
                >
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {metric.label}
                  </div>
                  <div className={`mt-2 text-xl font-black font-mono leading-none tracking-tight ${metric.tone}`}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full border-b border-slate-200 bg-white/50 lg:w-64 lg:border-b-0 lg:border-r">
          <nav className="space-y-1 p-3 sm:p-4 sticky top-4">
            {navigationSections.map((section) => {
              const visibleItems = section.items.filter((item) => canAccess(item.href));
              if (!visibleItems.length) return null;
              return (
                <div key={section.id} className="space-y-1">
                  {/* Section header */}
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4 text-slate-450 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-wider leading-none">
                          {section.label}
                        </h3>
                        <p className="text-[10px] text-slate-455 font-semibold mt-1 leading-normal">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section items */}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const itemActive = isItemActive(location, item.activeFor);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30 ${
                            itemActive
                              ? "bg-slate-900 text-white font-bold shadow-sm"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <ChevronRight className={cn("h-3.5 w-3.5 mt-0.5 shrink-0 rotate-180 transition-transform group-hover:-translate-x-0.5", itemActive ? "text-white" : "text-slate-450 group-hover:text-slate-900")} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold">{item.label}</div>
                            <div className={`text-[10px] mt-0.5 ${itemActive ? "text-slate-200" : "text-slate-400 group-hover:text-slate-500"} font-semibold`}>
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {section.id !== "analytics" && (
                    <div className="my-2 border-t border-slate-100" />
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 min-w-0">
          <Suspense fallback={<AppShellSkeleton />}>{renderPage()}</Suspense>
        </main>
      </div>
    </div>
  );
}
