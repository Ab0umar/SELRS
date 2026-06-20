import { Suspense, lazy } from "react";
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
  ChevronLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const StockroomDashboard = lazy(() => import("./StockroomDashboard"));
const StockroomCategory = lazy(() => import("./StockroomCategory"));
const StockroomReports = lazy(() => import("./StockroomReports"));

// Navigation structure
const navigationSections = [
  {
    id: "main",
    label: "الرئيسية",
    items: [
      {
        href: "/stockroom",
        label: "لوحة التحكم للمخزن",
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

const mobileNavItems = [
  { href: "/stockroom", label: "الرئيسية", icon: LayoutDashboard, activeFor: ["/stockroom"] },
  { href: "/stockroom/eye-drops", label: "القطرات", icon: Eye, activeFor: ["/stockroom/eye-drops"] },
  { href: "/stockroom/op-room", label: "العمليات", icon: Syringe, activeFor: ["/stockroom/op-room"] },
  { href: "/stockroom/surgical", label: "الجراحية", icon: Package, activeFor: ["/stockroom/surgical"] },
  { href: "/stockroom/office", label: "مكتبي", icon: Archive, activeFor: ["/stockroom/office"] },
  { href: "/stockroom/reports", label: "التقارير", icon: FileText, activeFor: ["/stockroom/reports"] },
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

  return (
    <div
      className="page-layout min-h-screen bg-background text-foreground animate-in fade-in duration-300"
      dir="rtl"
    >
      {/* Header */}
      <div className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent backdrop-blur-sm">
        <div className="mx-auto w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            {/* Title section */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                    <Archive className="h-3.5 w-3.5 animate-pulse" />
                    المخزن المركزي
                  </div>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  نظام إدارة المخزون
                </h1>
                <p className="max-w-xl text-xs text-muted-foreground">
                  متابعة مستلزمات العيادة، قطرات العين، مستهلكات العمليات، والتقارير الشاملة
                </p>
              </div>

              {/* Compact Metrics Pill Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] sm:text-xs font-semibold text-muted-foreground/80 bg-muted/40 px-3.5 py-2 rounded-xl border border-border/40 w-fit self-start sm:self-center shadow-xs">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary shrink-0" /> 
                  إجمالي الأصناف: <strong className="text-foreground">{reportsQuery.isLoading ? "—" : totalItems}</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-warning shrink-0" /> 
                  قليل المخزون: <strong className={cn("font-bold", lowCount > 0 ? "text-warning" : "text-foreground")}>{reportsQuery.isLoading ? "—" : lowCount}</strong>
                </span>
                <span className="h-3 w-px bg-border/60 hidden sm:inline" />
                <span className="flex items-center gap-1.5">
                  <Archive className="h-3.5 w-3.5 text-destructive shrink-0" /> 
                  نفذ المخزون: <strong className={cn("font-bold", outCount > 0 ? "text-destructive" : "text-foreground")}>{reportsQuery.isLoading ? "—" : outCount}</strong>
                </span>
              </div>
            </div>

            {/* Mobile Horizontal Pill Navigation Bar (Inline top navigation) */}
            <div className="lg:hidden mt-2 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none whitespace-nowrap border-t border-border/40 pt-3">
              {mobileNavItems.filter((item) => canAccess(item.href)).map((item) => {
                const Icon = item.icon;
                const itemActive = isItemActive(location, item.activeFor);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                      itemActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row mx-auto w-full max-w-[1600px]">
        {/* Sidebar Navigation (Desktop only) */}
        <aside className="hidden lg:block w-full border-b border-border/60 bg-card/20 lg:w-64 lg:border-b-0 lg:border-r border-border/60 min-h-[calc(100vh-115px)]">
          <nav className="space-y-4 p-4 sticky top-4">
            {navigationSections.map((section) => {
              const visibleItems = section.items.filter((item) => canAccess(item.href));
              if (!visibleItems.length) return null;
              return (
              <div key={section.id} className="space-y-1">
                {/* Section header */}
                <div className="px-3 py-1">
                  <h3 className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                    {section.label}
                  </h3>
                </div>

                {/* Section items */}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const itemActive = isItemActive(location, item.activeFor);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                          itemActive
                            ? "bg-primary/10 text-primary font-medium shadow-sm border border-primary/10"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${itemActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                        <span className="flex-1 min-w-0 truncate">{item.label}</span>
                        <ChevronLeft
                          className={`h-3.5 w-3.5 shrink-0 transition-all opacity-0 ${
                            itemActive
                              ? "opacity-100 text-primary translate-x-0"
                              : "group-hover:opacity-100 group-hover:-translate-x-0.5"
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            );})}
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
