import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { Archive, Eye, Package, Syringe, FileText } from "lucide-react";
import { Link } from "wouter";

// Mock data for the stock categories
const stockCategories = [
  {
    href: "/stockroom/eye-drops",
    title: "قطرات العين",
    itemCount: 25,
    lowStockCount: 3,
    outOfStockCount: 1,
    icon: Eye,
  },
  {
    href: "/stockroom/op-room",
    title: "مستلزمات غرفة العمليات",
    itemCount: 42,
    lowStockCount: 5,
    outOfStockCount: 0,
    icon: Syringe,
  },
  {
    href: "/stockroom/surgical",
    title: "مستلزمات وأدوات جراحية",
    itemCount: 110,
    lowStockCount: 8,
    outOfStockCount: 2,
    icon: Package,
  },
  {
    href: "/stockroom/office",
    title: "لوازم مكتبية",
    itemCount: 88,
    lowStockCount: 12,
    outOfStockCount: 4,
    icon: Archive,
  },
];

export default function StockroomDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="المخزن"
        subtitle="مركز رئيسي لإدارة جميع مخزون المركز"
        icon={<Archive className="h-5 w-5 text-primary" />}
        action={
          <Link href="/stockroom/reports">
            <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/10">
              <FileText className="me-2 h-4 w-4" />
              التقارير الشاملة
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stockCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Link key={category.href} href={category.href}>
              <Card className="group h-full transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{category.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{category.itemCount} صنف</div>
                  <div className="mt-2 space-y-1 text-xs">
                    {category.lowStockCount > 0 && (
                      <p className="text-warning">
                        {category.lowStockCount} أصناف قليلة المخزون
                      </p>
                    )}
                    {category.outOfStockCount > 0 && (
                      <p className="text-destructive">
                        {category.outOfStockCount} أصناف نفذت من المخزون
                      </p>
                    )}
                     {category.lowStockCount === 0 && category.outOfStockCount === 0 && (
                        <p className="text-success">جميع الأصناف متوفرة</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
