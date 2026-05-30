/**
 * Attendance Module Dashboard
 * Landing page with quick actions and key information
 */

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Activity,
  Users,
  Calendar,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AttendanceDashboard() {
  const dashboardQuery = (trpc as any).attendance.dashboardSummary.useQuery(
    undefined,
    { refetchInterval: 30_000, refetchIntervalInBackground: false }
  );

  const deviceQuery = (trpc as any).attendance.deviceStatus.useQuery(
    undefined,
    {
      refetchInterval: 20_000,
      refetchIntervalInBackground: false,
    }
  );

  const summary = dashboardQuery.data as any;
  const device = deviceQuery.data as any;
  const isLoading = dashboardQuery.isLoading;

  // Quick action cards
  const quickActions = [
    {
      icon: Activity,
      title: "الحضور الآن",
      description: "مراقبة فورية لحركة الدخول والخروج",
      href: "/attendance/live",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Users,
      title: "الموظفون",
      description: "إدارة بيانات الموظفين والإجازات",
      href: "/attendance/employees",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: Calendar,
      title: "الروستر الشهري",
      description: "جدول الورديات والحضور",
      href: "/attendance/shift-schedule",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: AlertCircle,
      title: "التقارير",
      description: "تقارير الحضور والإجازات",
      href: "/attendance/reports",
      color: "bg-orange-50 text-orange-600",
    },
  ];

  // Recent activities
  const recentActivities = [
    {
      title: "تم تسجيل حضور 45 موظف",
      time: "منذ ساعة",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "5 موظفين متأخرين",
      time: "منذ 30 دقيقة",
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      title: "جهاز البصمة متصل",
      time: "منذ يوم واحد",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

  const deviceState =
    device?.status === "online" || device?.connected === true
      ? "متصل"
      : device?.status === "connecting"
        ? "جارٍ الاتصال"
        : "غير متصل";

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="rounded-lg border border-border bg-gradient-to-r from-secondary/5 to-transparent p-6">
        <h2 className="text-lg font-semibold text-foreground">
          مرحباً بك في نظام الحضور والانصراف
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          مراقبة شاملة لحضور الموظفين والإجازات والأذونات
        </p>
      </div>

      {/* Quick actions grid */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">
          الإجراءات السريعة
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-secondary/30 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg ${action.color} p-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <h4 className="mt-3 font-medium text-foreground">
                  {action.title}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Statistics section */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Today's status */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            حالة اليوم
          </h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">حاضر اليوم</span>
              <span className="text-lg font-bold text-success">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  summary?.presentToday ?? 0
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">متأخر اليوم</span>
              <span className="text-lg font-bold text-warning">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  summary?.lateToday ?? 0
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">داخل الآن</span>
              <span className="text-lg font-bold text-info">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  summary?.insideNow ?? 0
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الجهاز</span>
              <span
                className={`text-lg font-bold ${
                  deviceState === "متصل"
                    ? "text-success"
                    : deviceState === "جارٍ الاتصال"
                      ? "text-warning"
                      : "text-destructive"
                }`}
              >
                {deviceState}
              </span>
            </div>
          </div>
        </div>

        {/* Recent activities */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            الأنشطة الأخيرة
          </h3>
          <div className="mt-4 space-y-3">
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-start gap-3">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${activity.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Device status section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-medium text-foreground">حالة الجهاز</h3>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">جهاز البصمة</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {deviceState}
            </p>
          </div>
          <div
            className={`h-3 w-3 rounded-full ${
              deviceState === "متصل"
                ? "bg-success"
                : deviceState === "جارٍ الاتصال"
                  ? "bg-warning"
                  : "bg-destructive"
            }`}
          />
        </div>
        {deviceState !== "متصل" && (
          <Button variant="outline" size="sm" className="mt-4">
            <Settings className="h-4 w-4 mr-2" />
            إعدادات الجهاز
          </Button>
        )}
      </div>

      {/* Help section */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-6">
        <h3 className="font-medium text-foreground">هل تحتاج إلى مساعدة؟</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          يمكنك الاطلاع على دليل الاستخدام أو التواصل مع فريق الدعم للحصول على مساعدة.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm">
            دليل الاستخدام
          </Button>
          <Button variant="outline" size="sm">
            التواصل مع الدعم
          </Button>
        </div>
      </div>
    </div>
  );
}
