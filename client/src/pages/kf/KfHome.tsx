import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  ClipboardList,
  CalendarRange,
  ChevronLeft,
  Activity,
  Plus
} from "lucide-react";

export default function KfHome() {
  // Queries
  const { data: patientsData, isLoading: loadingPatients } = trpc.kf.listPatients.useQuery({
    page: 1,
    pageSize: 5
  });

  const { data: operationsData, isLoading: loadingOperations } = trpc.kf.listOperations.useQuery({});
  const { data: followupsData, isLoading: loadingFollowups } = trpc.kf.listFollowups.useQuery({});

  const totalPatients = patientsData?.total ?? 0;
  const recentPatients = patientsData?.patients ?? [];
  const totalOperations = operationsData?.length ?? 0;
  const totalFollowups = followupsData?.length ?? 0;

  // Filter upcoming operations (e.g., scheduled ones)
  const activeOperations = operationsData?.filter((op: any) => op.status === "scheduled") ?? [];
  // Filter scheduled followups
  const activeFollowups = followupsData?.filter((f: any) => f.status === "scheduled") ?? [];

  return (
    <section dir="rtl" className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="relative z-10 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
            مرحباً بك في وحدة KF الطبية
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
            نظام إدارة المرضى، الفحوصات والعمليات الجراحية المخصص والمستقل لوحدة KF.
          </p>
        </div>
        <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-10">
          <Activity className="h-24 w-24 text-primary" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المرضى المسجلين</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingPatients ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalPatients}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">ملفات نشطة في سجلات وحدة KF</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">العمليات المقررة</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingOperations ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalOperations}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {activeOperations.length} عمليات قادمة بانتظار الإجراء
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">متابعات المرضى</CardTitle>
            <CalendarRange className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingFollowups ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{totalFollowups}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {activeFollowups.length} متابعات قادمة مجدولة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Hub */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">إجراءات سريعة</CardTitle>
          <CardDescription>الوصول المباشر لأهم وظائف النظام</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Button asChild size="lg" className="w-full flex justify-between group">
            <Link href="/kf/patients/new">
              <span className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <span>تسجيل مريض جديد</span>
              </span>
              <Plus className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          </Button>

          <Button variant="secondary" asChild size="lg" className="w-full flex justify-between group">
            <Link href="/kf/patients">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>دليل المرضى</span>
              </span>
              <ChevronLeft className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          </Button>

          <Button variant="secondary" asChild size="lg" className="w-full flex justify-between group">
            <Link href="/kf/operations">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                <span>جدول العمليات</span>
              </span>
              <ChevronLeft className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          </Button>

          <Button variant="secondary" asChild size="lg" className="w-full flex justify-between group">
            <Link href="/kf/followups">
              <span className="flex items-center gap-2">
                <CalendarRange className="h-5 w-5" />
                <span>سجل المتابعات</span>
              </span>
              <ChevronLeft className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Main Grid: Recent Entries */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Patients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">المرضى المضافون مؤخراً</CardTitle>
              <CardDescription>آخر 5 مرضى تم تسجيل ملفاتهم</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/kf/patients">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPatients ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))
            ) : recentPatients.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">لا يوجد مرضى مسجلين حتى الآن.</div>
            ) : (
              recentPatients.map((patient: any) => (
                <div key={patient.kfId} className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:bg-muted/30 px-2 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-semibold text-sm">{patient.fullName}</h4>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span>كود: {patient.kfCode}</span>
                      <span>•</span>
                      <span>هاتف: {patient.phone || "غير مسجل"}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/kf/patients/${patient.kfId}`}>الملف</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming Operations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">العمليات القادمة</CardTitle>
              <CardDescription>قائمة العمليات المجدولة قريباً</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/kf/operations">عرض الكل</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingOperations ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
              ))
            ) : activeOperations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">لا توجد عمليات مقررة قريباً.</div>
            ) : (
              activeOperations.slice(0, 5).map((op: any) => (
                <div key={op.kfOpId} className="flex justify-between items-center py-2 border-b border-border last:border-0 hover:bg-muted/30 px-2 rounded-lg transition-colors">
                  <div>
                    <h4 className="font-semibold text-sm">
                      {op.opType} ({op.eye === "both" ? "العينين" : op.eye === "right" ? "العين اليمنى" : "العين اليسرى"})
                    </h4>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                      <span>المريض: {op.patientName || `معرف ${op.kfPatientId}`}</span>
                      <span>•</span>
                      <span>التاريخ: {new Date(op.opDate).toLocaleDateString("ar-EG")}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/kf/patients/${op.kfPatientId}`}>عرض</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
