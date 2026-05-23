import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Archive, Eye, Package, Syringe, FileText, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function StockroomDashboard() {
  const reportsQuery = trpc.stockroom.getReports.useQuery({});
  const inventory = reportsQuery.data?.inventory || [];

  const getStats = (category: string) => {
    const items = inventory.filter(item => item.category === category);
    return {
      total: items.length,
      low: items.filter(item => item.status === "كمية قليلة").length,
      out: items.filter(item => item.status === "نفذ المخزون").length,
    };
  };

  const stockCategories = [
    {
      href: "/stockroom/eye-drops",
      title: "قطرات العين",
      stats: getStats("قطرات العين"),
      icon: Eye,
    },
    {
      href: "/stockroom/op-room",
      title: "مستلزمات غرفة العمليات",
      stats: getStats("غرفة العمليات"),
      icon: Syringe,
    },
    {
      href: "/stockroom/surgical",
      title: "مستلزمات وأدوات جراحية",
      stats: getStats("مستلزمات وأدوات جراحية"),
      icon: Package,
    },
    {
      href: "/stockroom/office",
      title: "لوازم مكتبية",
      stats: getStats("لوازم مكتبية"),
      icon: Archive,
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="المخزن"
        subtitle="مركز رئيسي لإدارة جميع مخزون المركز"
        icon={<Archive className="h-5 w-5 text-primary" />}
        action={
          <div className="flex gap-2">
            <Button onClick={() => reportsQuery.refetch()} variant="outline" size="icon" disabled={reportsQuery.isFetching}>
                <RefreshCw className={cn("h-4 w-4", reportsQuery.isFetching && "animate-spin")} />
            </Button>
            <Link href="/stockroom/reports">
                <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/10">
                <FileText className="me-2 h-4 w-4" />
                التقارير الشاملة
                </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stockCategories.map((category) => {
          const Icon = category.icon;
          const { total, low, out } = category.stats;

          return (
            <Link key={category.href} href={category.href}>
              <Card className="group h-full transition-[border-color,box-shadow,transform] hover:border-primary/40 hover:shadow-md active:scale-[0.98] cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{category.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {reportsQuery.isPending ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                  ) : (
                    <>
                        <div className="text-2xl font-bold">{total} صنف</div>
                        <div className="mt-2 space-y-1 text-xs">
                            {low > 0 && (
                            <p className="text-warning-text">
                                {low} أصناف قليلة المخزون
                            </p>
                            )}
                            {out > 0 && (
                            <p className="text-destructive-text">
                                {out} أصناف نفذت من المخزون
                            </p>
                            )}
                            {low === 0 && out === 0 && total > 0 && (
                                <p className="text-success-text">جميع الأصناف متوفرة</p>
                            )}
                            {total === 0 && (
                                <p className="text-muted-foreground italic">لا توجد أصناف مسجلة بعد</p>
                            )}
                        </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
