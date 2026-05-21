import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart3,
  Calendar,
  CalendarCheck,
  Clock,
  FileText,
  LayoutDashboard,
  Settings,
  Smartphone,
  Timer,
  UserCog,
  Users,
  Wrench,
  RefreshCw,
  Star,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const navCards = [
  {
    icon: Activity,
    label: "اللوحة المباشرة",
    desc: "مشاهدة الحضور الآن",
    path: "/attendance/live",
  },
  {
    icon: Users,
    label: "الموظفون",
    desc: "إدارة الموظفين والإجازات والأذونات",
    path: "/attendance/employees",
  },
  {
    icon: BarChart3,
    label: "التقارير",
    desc: "الملخص اليومي والتقارير التفصيلية",
    path: "/attendance/reports",
  },
  {
    icon: Settings,
    label: "الإعدادات",
    desc: "الورديات والعطل والجهاز والمزامنة",
    path: "/attendance/settings",
  },
];

export default function AttendanceHome() {
  const dashboardQuery = (trpc as any).attendance.dashboardSummary.useQuery(
    undefined,
    {
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
    },
  );

  const data = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;

  const statCards = [
    {
      label: "حاضر اليوم",
      value: data?.presentToday ?? 0,
      color: "text-success",
    },
    {
      label: "غائب اليوم",
      value: data?.absentToday ?? 0,
      color: "text-destructive",
    },
    {
      label: "متأخر اليوم",
      value: data?.lateToday ?? 0,
      color: "text-warning",
    },
    { label: "داخل الآن", value: data?.insideNow ?? 0, color: "text-primary" },
    {
      label: "لم يسجل الخروج",
      value: data?.missingCheckoutYesterday ?? 0,
      color: "text-secondary",
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold">الحضور والانصراف</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dashboardQuery.refetch()}
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4 ml-2" />
          تحديث
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {isLoading ? (
                <Skeleton className="h-8 w-10" />
              ) : (
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Last sync status */}
      {!isLoading && data?.lastSync && (
        <div className="mb-6 text-sm text-muted-foreground text-right">
          آخر مزامنة:{" "}
          <span className="font-medium">
            {data.lastSync.status === "never"
              ? "لم تتم"
              : data.lastSync.status === "ok"
                ? "ناجحة"
                : data.lastSync.status === "failed"
                  ? "فشلت"
                  : data.lastSync.status}
          </span>
          {data.lastSync.finishedAt && (
            <span className="mr-2 text-xs">
              — {new Date(data.lastSync.finishedAt).toLocaleString("ar-EG")}
            </span>
          )}
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {navCards.map(({ icon: Icon, label, desc, path }) => (
          <Link key={path} href={path}>
            <a className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <Card className="h-full border-border transition-colors hover:border-primary/40 hover:shadow-none">
                <CardContent className="flex flex-col items-end gap-2 p-4">
                  <Icon className="w-7 h-7 text-primary" />
                  <div className="text-right">
                    <div className="font-semibold text-sm text-foreground">
                      {label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-5">
                      {desc}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}
