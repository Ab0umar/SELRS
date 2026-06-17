import { Suspense, lazy } from "react";
import { useLocation } from "wouter";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";

const StockroomDashboard = lazy(() => import("./StockroomDashboard"));
const StockroomCategory = lazy(() => import("./StockroomCategory"));
const StockroomReports = lazy(() => import("./StockroomReports"));

export default function StockroomShell() {
  const [location] = useLocation();

  const renderPage = () => {
    if (location === "/stockroom/reports") return <StockroomReports />;
    if (location.startsWith("/stockroom/")) return <StockroomCategory />;
    return <StockroomDashboard />;
  };

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-4 px-4 py-4 sm:px-6 pb-10 text-right"
      dir="rtl"
    >
      <Suspense fallback={<AppShellSkeleton />}>{renderPage()}</Suspense>
    </div>
  );
}
