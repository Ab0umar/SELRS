/**
 * Salary Module Dashboard
 * Landing page with quick actions and key information
 */

import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalaryDashboard() {
  const now = new Date();
  const summaryQ = (trpc as any).salary.monthSummary.useQuery(
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    { refetchInterval: 60_000, refetchIntervalInBackground: false }
  );

  const summary = summaryQ.data as any;
  const isLoading = summaryQ.isLoading;

  function fmt(n: number) {
    return Number(n).toLocaleString("en-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Quick action cards
  const quickActions = [
    {
      icon: Users,
      title: "تحضير الرواتب",
      description: "إدخال الرواتب الأساسية والبدلات",
      href: "/salary",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: TrendingUp,
      title: "العمولات الشهرية",
      description: "تسجيل عمولات الكشف والبنتاكام",
      href: "/salary/pools",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: AlertCircle,
      title: "الخصومات والسلف",
      description: "إدخال الجزاءات والسلف والتأمينات",
      href: "/salary/penalties",
      color: "bg-red-50 text-red-600",
    },
    {
      icon: FileText,
      title: "كشف الشهر",
      description: "توليد واعتماد كشف الرواتب",
      href: "/salary/payroll",
      color: "bg-purple-50 text-purple-600",
    },
  ];

  // Recent activities
  const recentActivities = [
    {
      title: "تم تحديث الرواتب الأساسية",
      time: "منذ ساعتين",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      title: "جاري احتساب العمولات",
      time: "منذ 30 دقيقة",
      icon: Clock,
      color: "text-blue-600",
    },
    {
      title: "تم مراجعة الخصومات",
      time: "منذ يوم واحد",
      icon: CheckCircle,
      color: "text-green-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="rounded-lg border border-border bg-gradient-to-r from-primary/5 to-transparent p-6">
        <h2 className="text-lg font-semibold text-foreground">
          مرحباً بك في نظام الرواتب
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة شاملة لرواتب الموظفين والعمولات والشفتات
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
                className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
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
        {/* Current month status */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            حالة الشهر الحالي
          </h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                إجمالي الرواتب
              </span>
              <span className="text-lg font-bold text-primary">
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  fmt(summary?.totalPay ?? 0)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                عدد الموظفين
              </span>
              <span className="text-lg font-bold text-foreground">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  summary?.staffCount ?? 0
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الجزاءات</span>
              <span className="text-lg font-bold text-destructive">
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  fmt(summary?.totalPenalties ?? 0)
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">العمولات</span>
              <span className="text-lg font-bold text-success">
                {isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  fmt(summary?.totalCommissions ?? 0)
                )}
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
