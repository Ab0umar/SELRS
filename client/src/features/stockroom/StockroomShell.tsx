import { Suspense, lazy, useState } from "react";
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
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const StockroomDashboard = lazy(() => import("./StockroomDashboard.redesigned"));
const StockroomCategory = lazy(() => import("./StockroomCategory"));
const StockroomReports = lazy(() => import("./StockroomReports.redesigned"));

// Navigation structure
const navigationSections = [
  {
    id: "main",
    label: "الرئيسية",
    items: [
      {
        href: "/stockroom",
        label: "لوحة التحكم",
        icon: LayoutDashboard,
        activeFor: ["/stockroom"],
      },
    ],
  },
  {
    id: "categories",
    label: "تصنيفات المخزون",
    items: [
      {
        href: "/stockroom/eye-drops",
        label: "قطرات العين",
        icon: Eye,
        activeFor: ["/stockroom/eye-drops"],
      },
      {
        href: "/stockroom/op-room",
        label: "مستلزمات العمليات",
        icon: Syringe,
        activeFor: ["/stockroom/op-room"],
      },
      {
        href: "/stockroom/surgical",
        label: "أدوات جراحية",
        icon: Package,
        activeFor: ["/stockroom/surgical"],
      },
      {
        href: "/stockroom/office",
        label: "لوازم مكتبية",
        icon: Archive,
        activeFor: ["/stockroom/office"],
      },
    ],
  },
  {
    id: "analytics",
    label: "التقارير",
    items: [
      {
        href: "/stockroom/reports",
        label: "التقارير الشاملة",
        icon: FileText,
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

  // Key metrics for the header
  const metrics = [
    {
      label: "إجمالي الأصناف",
      value: reportsQuery.isLoading ? "—" : totalItems,
      tone: "text-primary",
      accent: "bg-primary/10 border-primary/20",
    },
    {
      label: "قليل المخزون",
      value: reportsQuery.isLoading ? "—" : lowCount,
      tone: lowCount > 0 ? "text-warning font-black animate-pulse" : "text-foreground",
      accent: lowCount > 0 ? "bg-warning/10 border-warning/20" : "bg-muted border-border/60",
    },
    {
      label: "نفذ المخزون",
      value: reportsQuery.isLoading ? "—" : outCount,
      tone: outCount > 0 ? "text-destructive font-black animate-pulse" : "text-foreground",
      accent: outCount > 0 ? "bg-destructive/10 border-destructive/20" : "bg-muted border-border/60",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6" dir="rtl">
      
      {/* ── 1. Floating Bento Top Header Capsule ── */}
      <header className="max-w-[1600px] mx-auto mb-6 bg-card border border-border/60 rounded-3xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center font-mono font-black text-sm">
            ST
          </div>
          <div>
            <h1 className="text-sm font-black text-foreground leading-none">إدارة المخزن المركزي</h1>
            <span className="text-[10px] text-muted-foreground block mt-1 font-medium">متابعة مستلزمات العيادة، قطرات العين، مستهلكات العمليات، والتقارير الشاملة</span>
          </div>
        </div>

        {/* Top metrics grids */}
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-3 md:w-auto md:min-w-[500px]">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-2xl border p-2.5 px-3 flex flex-col justify-center ${metric.accent}`}
            >
              <span className="text-[9px] font-bold text-muted-foreground block leading-none">
                {metric.label}
              </span>
              <span className={`mt-1 text-xs font-black font-mono leading-none ${metric.tone}`}>
                {metric.value}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* ── 2. Floating Console Layout ── */}
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">
        {/* Horizontal Top Navigation Bar (all breakpoints) */}
        <nav className="w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 scrollbar-none print:hidden">
          {navigationSections.flatMap((section) =>
            section.items
              .filter((item) => canAccess(item.href))
              .map((item) => {
                const isActive = isItemActive(location, item.activeFor);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-primary dark:text-primary-foreground dark:shadow-primary/10"
                        : "bg-card border border-border/60 text-muted-foreground hover:bg-muted/50"
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
        <main className="flex-1 w-full min-w-0 bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
          <Suspense fallback={<AppShellSkeleton />}>{renderPage()}</Suspense>
        </main>

      </div>
    </div>
  );
}
