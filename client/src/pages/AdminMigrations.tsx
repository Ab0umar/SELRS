import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Clock, Database, ListChecks, RefreshCcw, Shield, Upload, XCircle } from "lucide-react";
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
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-right" dir="rtl">
      <PageHeader
        title="ترحيل البيانات"
        subtitle="تطبيق ترحيلات مخطط قاعدة البيانات (Drizzle) ومراجعة الحالة — الاستيراد/التصدير عبر ملفات SQL في المشروع وليس عبر رفع جداول من هنا"
        icon={<Database className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={() => void handleRefresh()} disabled={migrationsQuery.isFetching}>
              <RefreshCcw className={`ml-2 h-4 w-4 ${migrationsQuery.isFetching ? "animate-spin" : ""}`} />
              تحديث القائمة
            </Button>
            <Button
              onClick={() => void handleApply()}
              disabled={pendingCount === 0 || applyMutation.isPending}
              className="selrs-gradient-btn text-white hover:opacity-95"
            >
              {applyMutation.isPending ? "جاري التطبيق…" : `تطبيق المعلّقة (${pendingCount})`}
            </Button>
          </div>
        }
      />

      <div className={cn(STAT_CARDS_MOBILE_ROW, "gap-2 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4")}>
        <StatCard
          title="إجمالي السجلات"
          value={migrationTotal}
          icon={ListChecks}
          iconColor="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
          description="عدد ملفات الترحيل المعروضة"
        />
        <StatCard
          title="تم ترحيلها"
          value={migrationApplied}
          icon={Shield}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
          description={appliedPct != null ? `${appliedPct}%` : undefined}
        />
        <StatCard
          title="معلّقة"
          value={pendingCount}
          icon={Clock}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
        />
        <StatCard
          title="فشل / تنبيه"
          value={failureSignal > 0 ? failureSignal : 0}
          icon={XCircle}
          iconColor={
            failureSignal > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
          }
          description={failureSignal > 0 ? "خطأ في الجلب أو آخر تطبيق" : "لا يوجد خطأ ظاهر"}
        />
      </div>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-1 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">سجل الترحيل</CardTitle>
          <span className="text-xs text-muted-foreground">أعمدة «المدة» و«عدد السجلات» غير متوفرة من خادم Drizzle</span>
        </CardHeader>
        <CardContent className="pt-4">
          {migrationsQuery.isLoading && <p className="text-sm text-muted-foreground">جاري تحميل الترحيلات…</p>}
          {!migrationsQuery.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد ترحيلات.</p>
          )}
          {!migrationsQuery.isLoading && migrationsQuery.data?.source === "journal" && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              تم استخدام سجل Drizzle المحلي لعرض الترحيلات لأن الاتصال بقاعدة البيانات فشل.
              {migrationsQuery.data.dbError ? ` (${migrationsQuery.data.dbError})` : ""}
            </div>
          )}
          {rows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border/70">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[200px] text-right font-bold">الملف</TableHead>
                    <TableHead className="text-right font-bold">التاريخ</TableHead>
                    <TableHead className="text-center font-bold">عدد السجلات</TableHead>
                    <TableHead className="text-center font-bold">الحالة</TableHead>
                    <TableHead className="text-center font-bold">المدة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((migration: MigrationRow) => (
                    <TableRow key={migration.name}>
                      <TableCell className="max-w-[320px] font-mono text-xs break-all">{migration.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatAt(migration.appliedAt)}</TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={migration.pending ? "destructive" : "secondary"}>
                          {migration.pending ? "معلّقة" : "نجاح"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-2 border-dashed border-border/80 bg-muted/20 shadow-none">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-foreground">رفع ملفات Excel/CSV</p>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground leading-relaxed">
              مسار SELRS الحالي يعتمد على ترحيلات <strong>Drizzle</strong> (SQL) من مجلد المشروع، وليس على رفع جداول من
              المتصفّح. استخدم زر «تطبيق المعلّقة» بعد نشر ملفات الترحيل على الخادم، أو أوامر CLI الرسمية للنشر.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            الحدّ الأقصى للرفع غير مفعّل — الترحيل من الواجهة فقط لتطبيق SQL المسجّل
          </Badge>
        </CardContent>
      </Card>

      <Card className="border-amber-200/80 bg-amber-50/95 shadow-sm">
        <CardHeader>
          <CardTitle className="text-amber-900">إصلاح الفحوصات الأيتام</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-amber-800">
            هذه الأداة تحدث الفحوصات التي ليس لديها معرف زيارة صحيح (visitId=0) وتربطها بزيارات صحيحة.
          </p>
          <Button
            onClick={() => {
              if (window.confirm("سيتم إصلاح جميع الفحوصات الأيتام. هل أنت متأكد؟")) {
                fixOrphanedExaminationsMutation.mutate();
              }
            }}
            disabled={fixOrphanedExaminationsMutation.isPending}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {fixOrphanedExaminationsMutation.isPending ? "جاري الإصلاح…" : "إصلاح الفحوصات الأيتام"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" onClick={() => setLocation("/dashboard?tab=admin")}>
          العودة إلى لوحة التحكم
        </Button>
      </div>
    </div>
  );
}
