import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Activity, Clock, Database, ListChecks, RefreshCcw, Shield, Upload, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { toast } from "sonner";
import { cn, getTrpcErrorMessage } from "@/lib/utils";

type MigrationRow = {
  name: string;
  appliedAt?: string | null;
  pending: boolean;
};

export default function AdminMigrations() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const migrationsQuery = trpc.system.listMigrations.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const applyMutation = trpc.system.applyMigrations.useMutation({
    onSuccess: async (result: { applied: number }) => {
      if (result.applied > 0) {
        toast.success(`تم تطبيق ${result.applied} ترحيل`);
      } else {
        toast.info("لا توجد ترحيلات معلقة للتطبيق");
      }
      await utils.system.listMigrations.invalidate();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "تعذر تطبيق الترحيلات"));
    },
  });

  const fixOrphanedExaminationsMutation = trpc.medical.fixOrphanedExaminations.useMutation({
    onSuccess: (result: { fixed: number; total: number }) => {
      toast.success(`تم إصلاح ${result.fixed} فحص من أصل ${result.total}`);
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "تعذر إصلاح الفحوصات الأيتام"));
    },
  });

  const pendingCount = useMemo(() => {
    return (migrationsQuery.data?.migrations ?? []).filter((m) => m.pending).length;
  }, [migrationsQuery.data]);

  const handleRefresh = async () => {
    const result = await migrationsQuery.refetch();
    if (result.error) {
      toast.error(getTrpcErrorMessage(result.error, "تعذر تحديث قائمة الترحيلات"));
      return;
    }
    toast.success("تم تحديث قائمة الترحيلات");
  };

  const handleApply = async () => {
    await applyMutation.mutateAsync({});
  };

  if (!isAuthenticated) return null;

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-4 px-2 py-6 sm:px-0">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">لا توجد صلاحيات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">أنت لا تملك صلاحية الوصول لهذه الصفحة.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = migrationsQuery.data?.migrations ?? [];
  const migrationTotal = rows.length;
  const migrationApplied = migrationTotal - pendingCount;
  const appliedPct =
    migrationTotal > 0 ? Math.min(100, Math.round((migrationApplied / migrationTotal) * 100)) : null;
  const queryFailed = migrationsQuery.isError;
  /** Drizzle لا يعرض عدّ فشل تلقائي في الواجهة؛ نعرض تنبيهاً عند خطأ الجلب أو فشل آخر تطبيق. */
  const failureSignal = queryFailed || applyMutation.isError ? 1 : 0;

  const formatAt = (raw?: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString("ar");
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 text-right" dir="rtl">
      <PageHeader
        title="ترحيل البيانات"
        subtitle="تطبيق ترحيلات Drizzle (SQL) ومراجعة حالة توافق المخطط."
        icon={<Database className="h-5 w-5 text-primary" />}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-4 border-border/60 hover:bg-background shadow-sm font-bold gap-2"
              onClick={() => void handleRefresh()} 
              disabled={migrationsQuery.isFetching}
            >
              <RefreshCcw className={cn("h-4 w-4 text-primary", migrationsQuery.isFetching && "animate-spin")} />
              تحديث القائمة
            </Button>
            <Button
              size="sm"
              onClick={() => void handleApply()}
              disabled={pendingCount === 0 || applyMutation.isPending}
              className="selrs-gradient-btn text-white h-9 px-6 font-bold shadow-sm"
            >
              {applyMutation.isPending ? "جاري التطبيق…" : `تطبيق المعلّقة (${pendingCount})`}
            </Button>
          </div>
        }
      />

      <div className={cn(STAT_CARDS_MOBILE_ROW, "gap-2 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4")}>
        <StatCard
          title="إجمالي الترحيلات"
          value={migrationTotal}
          icon={ListChecks}
          iconColor="bg-sky-50 text-sky-600 shadow-sm shadow-sky-100"
          description="ملفات SQL المسجلة"
        />
        <StatCard
          title="الترحيلات المطبقة"
          value={migrationApplied}
          icon={Shield}
          iconColor="bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100"
          description={appliedPct != null ? `اكتمال: ${appliedPct}%` : undefined}
        />
        <StatCard
          title="ترحيلات معلقة"
          value={pendingCount}
          icon={Clock}
          iconColor={pendingCount > 0 ? "bg-amber-50 text-amber-700 shadow-sm shadow-amber-100" : "bg-muted text-muted-foreground"}
        />
        <StatCard
          title="الأخطاء والتنبيهات"
          value={failureSignal > 0 ? failureSignal : 0}
          icon={XCircle}
          iconColor={failureSignal > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}
          description={failureSignal > 0 ? "يوجد خطأ في التوافق" : "المخطط سليم"}
        />
      </div>

      {!migrationsQuery.isLoading && migrationsQuery.data?.source === "journal" && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm border-dashed">
          <CardContent className="flex items-center gap-3 p-3 text-amber-900 text-xs font-bold">
            <Shield className="h-4 w-4 text-amber-700" />
            تنبيه: تم عرض الترحيلات من سجل Drizzle المحلي لتعذر الاتصال المباشر.
            {migrationsQuery.data.dbError && <span className="opacity-70 font-mono">[{migrationsQuery.data.dbError}]</span>}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-card shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col gap-2 border-b bg-muted/5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-sky-600" />
            سجل الترحيل والمزامنة
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-bold h-5 bg-background">
            أعمدة Dur/Rows غير مدعومة من Drizzle
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table dir="rtl" className="text-right">
            <TableHeader className="sticky top-0 z-10 bg-sky-50/90 backdrop-blur-sm shadow-sm">
              <TableRow className="hover:bg-transparent border-b-primary/10 h-11">
                <TableHead className="min-w-[200px] px-6 font-bold text-sky-900 text-xs">ملف الترحيل (SQL)</TableHead>
                <TableHead className="px-4 font-bold text-sky-900 text-xs">تاريخ التطبيق</TableHead>
                <TableHead className="text-center font-bold text-sky-900 text-xs">السجلات</TableHead>
                <TableHead className="text-center font-bold text-sky-900 text-xs">الحالة</TableHead>
                <TableHead className="text-center font-bold text-sky-900 text-xs">المدة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {migrationsQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center text-muted-foreground animate-pulse">
                    جاري فحص حالة المخطط…
                  </TableCell>
                </TableRow>
              )}
              {!migrationsQuery.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center text-muted-foreground bg-muted/20">
                    لا توجد ترحيلات مسجلة.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((migration: MigrationRow, idx: number) => (
                <TableRow key={migration.name} className={cn(
                  "group transition-colors hover:bg-primary/[0.03]",
                  idx % 2 === 0 ? "bg-white" : "bg-muted/10"
                )}>
                  <TableCell className="px-6 py-3 font-mono text-[11px] font-bold text-foreground/80 break-all">{migration.name}</TableCell>
                  <TableCell className="whitespace-nowrap py-3 text-[11px] font-medium text-muted-foreground tabular-nums">{formatAt(migration.appliedAt)}</TableCell>
                  <TableCell className="text-center text-muted-foreground py-3 opacity-30">—</TableCell>
                  <TableCell className="text-center py-3">
                    <Badge variant={migration.pending ? "destructive" : "secondary"} className={cn("h-5 text-[9px] px-2 font-bold", !migration.pending && "bg-emerald-50 text-emerald-700 border-emerald-100")}>
                      {migration.pending ? "معلّقة" : "مطبقة"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground py-3 opacity-30">—</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/60 bg-muted/5 shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
              <Upload className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm text-foreground">استيراد البيانات الخارجية</p>
              <p className="max-w-md text-[11px] text-muted-foreground leading-relaxed">
                ترحيلات <strong>Drizzle</strong> تتم برمجياً عبر ملفات SQL. 
                لاستيراد بيانات Excel/CSV، يرجى استخدام أدوات المزامنة المتخصصة في صفحة الإدارة.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/60 bg-amber-50/40 shadow-sm border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-700" />
              <CardTitle className="text-sm font-bold text-amber-900">أدوات إصلاح المخطط</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[11px] text-amber-800 leading-relaxed">
              تحديث الفحوصات التي تفتقر لمعرف زيارة صحيح (visitId=0) وربطها بالسجلات التاريخية.
            </p>
            <Button
              size="sm"
              onClick={() => {
                if (window.confirm("سيتم إصلاح الفحوصات الأيتام. هل أنت متأكد؟")) {
                  fixOrphanedExaminationsMutation.mutate();
                }
              }}
              disabled={fixOrphanedExaminationsMutation.isPending}
              className="w-full h-9 bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-sm"
            >
              {fixOrphanedExaminationsMutation.isPending ? "جاري المعالجة…" : "إصلاح الفحوصات الأيتام"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
