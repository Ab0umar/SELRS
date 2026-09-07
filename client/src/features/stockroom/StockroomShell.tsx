import { Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { usePermissions } from "@/hooks/usePermissions";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";
import {
  Archive,
  Eye,
  Syringe,
  Package,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import OperationalModuleShell from "@/components/layout/OperationalModuleShell";

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
      icon: Package,
    },
    {
      label: "قليل المخزون",
      value: reportsQuery.isLoading ? "—" : lowCount,
      icon: Archive,
    },
    {
      label: "نفذ المخزون",
      value: reportsQuery.isLoading ? "—" : outCount,
      icon: FileText,
    },
  ];

  return (
    <OperationalModuleShell
      moduleName="stockroom"
      title="إدارة المخزن المركزي"
      description="متابعة مستلزمات العيادة، قطرات العين، مستهلكات العمليات، والتقارير الشاملة"
      mark="ST"
      metrics={metrics}
      navigation={navigationSections.flatMap((section) =>
        section.items.filter((item) => canAccess(item.href)),
      )}
    >
      <Suspense fallback={<AppShellSkeleton />}>{renderPage()}</Suspense>
    </OperationalModuleShell>
  );
}
