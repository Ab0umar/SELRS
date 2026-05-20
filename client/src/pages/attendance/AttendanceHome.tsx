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
  { icon: Activity,       label: "اللوحة المباشرة",    desc: "مشاهدة الحضور الآن",            path: "/attendance/live" },
  { icon: Calendar,       label: "الحضور اليومي",       desc: "تقرير الحضور بالتاريخ",          path: "/attendance/daily" },
  { icon: Users,          label: "الموظفون",            desc: "قائمة الموظفين وبياناتهم",       path: "/attendance/employees" },
  { icon: FileText,       label: "السجلات الخام",       desc: "بصمات الدخول والخروج",           path: "/attendance/logs" },
  { icon: BarChart3,      label: "التقارير",            desc: "تقارير التأخير والغياب والإضافي", path: "/attendance/reports" },
  { icon: CalendarCheck,  label: "الإجازات",            desc: "إدارة إجازات الموظفين",          path: "/attendance/leaves" },
  { icon: Timer,          label: "الورديات",            desc: "إعداد أوقات الدوام",              path: "/attendance/admin/shifts" },
  { icon: UserCog,        label: "تعيين الورديات",      desc: "ربط الموظفين بالورديات",          path: "/attendance/admin/assignments" },
  { icon: Clock,          label: "الأذونات",            desc: "أذونات الدخول والخروج",            path: "/attendance/permissions" },
  { icon: Star,           label: "الإجازات الرسمية",    desc: "العطل والإجازات الرسمية",         path: "/attendance/holidays" },
  { icon: Wrench,         label: "لوحة الإدارة",        desc: "إدارة عامة للوحدة",              path: "/attendance/admin" },
  { icon: LayoutDashboard,label: "حالة المزامنة",       desc: "آخر تشغيل وسجل الأخطاء",         path: "/attendance/admin/sync" },
  { icon: Smartphone,     label: "الجهاز",              desc: "إعدادات جهاز البصمة",            path: "/attendance/admin/device" },
  { icon: Settings,       label: "الإعدادات",           desc: "إعدادات الوحدة",                  path: "/attendance/settings" },
];

export default function AttendanceHome() {
  const dashboardQuery = (trpc as any).attendance.dashboardSummary.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const data = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;

  const statCards = [
    { label: "حاضر اليوم",        value: data?.presentToday ?? 0,            color: "text-green-600" },
    { label: "غائب اليوم",         value: data?.absentToday ?? 0,             color: "text-red-600" },
    { label: "متأخر اليوم",        value: data?.lateToday ?? 0,               color: "text-yellow-600" },
    { label: "داخل الآن",          value: data?.insideNow ?? 0,               color: "text-blue-600" },
    { label: "لم يسجل الخروج",    value: data?.missingCheckoutYesterday ?? 0, color: "text-orange-600" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
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
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
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
            {data.lastSync.status === "never" ? "لم تتم" :
             data.lastSync.status === "ok" ? "ناجحة" :
             data.lastSync.status === "failed" ? "فشلت" : data.lastSync.status}
          </span>
          {data.lastSync.finishedAt && (
            <span className="mr-2 text-xs">
              — {new Date(data.lastSync.finishedAt).toLocaleString("ar-EG")}
            </span>
          )}
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {navCards.map(({ icon: Icon, label, desc, path }) => (
          <Link key={path} href={path}>
            <a className="block h-full">
              <Card className="h-full hover:shadow-md hover:border-blue-400 transition-all cursor-pointer">
                <CardContent className="flex flex-col items-end gap-2 p-4">
                  <Icon className="w-7 h-7 text-blue-600" />
                  <div className="text-right">
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
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
