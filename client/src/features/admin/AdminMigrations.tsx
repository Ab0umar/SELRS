import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Activity,
  Database,
  ListChecks,
  RefreshCcw,
  Shield,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
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
  const [confirmFixOrphans, setConfirmFixOrphans] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

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
        setActionFeedback(`تم تطبيق ${result.applied} ترحيل بنجاح.`);
      } else {
        toast.info("لا توجد ترحيلات معلقة للتطبيق");
        setActionFeedback("لا توجد ترحيلات معلقة للتطبيق.");
      }
      await utils.system.listMigrations.invalidate();
    },
    onError: (error: unknown) => {
      const message = getTrpcErrorMessage(error, "تعذر تطبيق الترحيلات");
      toast.error(message);
      setActionFeedback(message);
    },
  });

  const fixOrphanedExaminationsMutation =
    trpc.medical.fixOrphanedExaminations.useMutation({
      onSuccess: (result: {
        fixed: number;
        total: number;
        recreatedVisits: number;
        relinkedExaminations: number;
        skippedMissingPatients: number;
      }) => {
        toast.success(
          `تم إصلاح ${result.fixed} من أصل ${result.total}، واستعادة ${result.recreatedVisits} زيارة`,
        );
        setActionFeedback(
          `تم إصلاح ${result.fixed} من أصل ${result.total}، واستعادة ${result.recreatedVisits} زيارة.`,
        );
        if (result.skippedMissingPatients > 0) {
          toast.warning(
            `تعذر إصلاح ${result.skippedMissingPatients} سجل لعدم وجود المريض`,
          );
        }
      },
      onError: (error: unknown) => {
        const message = getTrpcErrorMessage(
          error,
          "تعذر إصلاح الفحوصات الأيتام",
        );
        toast.error(message);
        setActionFeedback(message);
      },
    });

  const pendingCount = useMemo(() => {
    return (migrationsQuery.data?.migrations ?? []).filter((m) => m.pending)
      .length;
  }, [migrationsQuery.data]);

  const handleRefresh = async () => {
    setActionFeedback("جاري تحديث قائمة الترحيلات…");
    const result = await migrationsQuery.refetch();
    if (result.error) {
      const message = getTrpcErrorMessage(
        result.error,
        "تعذر تحديث قائمة الترحيلات",
      );
      toast.error(message);
      setActionFeedback(message);
      return;
    }
    toast.success("تم تحديث قائمة الترحيلات");
    setActionFeedback("تم تحديث قائمة الترحيلات.");
  };

  const handleApply = async () => {
    setActionFeedback("جاري تطبيق الترحيلات المعلقة…");
    await applyMutation.mutateAsync({});
  };

  const handleConfirmFixOrphans = () => {
    setConfirmFixOrphans(false);
    fixOrphanedExaminationsMutation.mutate();
  };

  if (!isAuthenticated) return null;

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-4 px-2 py-6 sm:px-0">
        <Card className="border-destructive/30 bg-destructive/10" role="alert">
          <CardHeader>
            <CardTitle className="text-destructive">لا توجد صلاحيات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">
              أنت لا تملك صلاحية الوصول لهذه الصفحة.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rows = migrationsQuery.data?.migrations ?? [];
  const migrationTotal = rows.length;
  const migrationApplied = migrationTotal - pendingCount;
  const queryFailed = migrationsQuery.isError;
  /** Drizzle لا يعرض عدّ فشل تلقائي في الواجهة؛ نعرض مؤشراً عند فشل أي إجراء. */
  const failureSignal = Number(
    queryFailed ||
      applyMutation.isError ||
      fixOrphanedExaminationsMutation.isError,
  );

  const formatAt = (raw?: string | null) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString("ar");
  };

  return (
    <div
      className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 text-start"
      dir="rtl"
    >
      <PageHeader
        title="ترحيلات قاعدة البيانات"
        subtitle="تطبيق ترحيلات Drizzle (SQL) ومراجعة توافق مخطط قاعدة البيانات."
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
              <RefreshCcw
                className={cn(
                  "h-4 w-4 text-primary",
                  migrationsQuery.isFetching && "animate-spin",
                )}
              />
              تحديث القائمة
            </Button>
            <Button
              size="sm"
              onClick={() => void handleApply()}
              disabled={pendingCount === 0 || applyMutation.isPending}
              className="selrs-gradient-btn text-primary-foreground h-9 px-6 font-bold shadow-sm"
            >
              {applyMutation.isPending
                ? "جاري التطبيق…"
                : `تطبيق المعلّقة (${pendingCount})`}
            </Button>
          </div>
        }
      />

      {actionFeedback ? (
        <p
          role="status"
          aria-live="polite"
          className="-mt-3 text-xs font-semibold text-muted-foreground"
        >
          {actionFeedback}
        </p>
      ) : null}

      <div className="grid overflow-hidden rounded-lg border border-border bg-background sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "إجمالي الترحيلات", value: migrationTotal },
          { label: "المطبقة", value: migrationApplied },
          { label: "المعلقة", value: pendingCount },
          { label: "الأخطاء", value: failureSignal > 0 ? failureSignal : 0 },
        ].map((item) => (
          <div
            key={item.label}
            className="border-b border-border px-4 py-4 last:border-b-0 sm:border-e lg:border-b-0"
          >
            <p className="text-[13px] font-bold text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-black">{item.value}</p>
          </div>
        ))}
      </div>

      {!migrationsQuery.isLoading &&
        migrationsQuery.data?.source === "journal" && (
          <Card className="border-warning/50 bg-warning/10 shadow-sm border-dashed">
            <CardContent className="flex items-center gap-3 p-3 text-warning-text text-xs font-bold">
              <Shield className="h-4 w-4 text-warning-text/90" />
              تنبيه: تم عرض الترحيلات من سجل Drizzle المحلي لتعذر الاتصال
              المباشر.
              {migrationsQuery.data.dbError && (
                <span className="opacity-70 font-mono">
                  [{migrationsQuery.data.dbError}]
                </span>
              )}
            </CardContent>
          </Card>
        )}

      <Card className="overflow-hidden rounded-lg border-border/60 bg-card shadow-none">
        <CardHeader className="flex flex-col gap-2 border-b bg-muted/5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            سجل الترحيل والمزامنة
          </CardTitle>
          <Badge
            variant="outline"
            className="text-[13px] font-bold h-5 bg-background"
          >
            السجلات والمدة غير متاحان في Drizzle
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="جدول ترحيلات قاعدة البيانات"
            tabIndex={0}
          >
            <Table
              dir="rtl"
              className="min-w-[680px] text-start"
              aria-busy={
                migrationsQuery.isLoading || migrationsQuery.isFetching
              }
            >
              <caption className="sr-only">
                قائمة ترحيلات قاعدة البيانات وحالة تطبيق كل ترحيل
              </caption>
              <TableHeader className="sticky top-0 z-10 bg-primary/5 shadow-sm">
                <TableRow className="hover:bg-transparent border-b-primary/10 h-11">
                  <TableHead className="min-w-[200px] px-6 font-bold text-primary text-xs">
                    ملف الترحيل (SQL)
                  </TableHead>
                  <TableHead className="px-4 font-bold text-primary text-xs">
                    تاريخ التطبيق
                  </TableHead>
                  <TableHead className="text-center font-bold text-primary text-xs">
                    السجلات
                  </TableHead>
                  <TableHead className="text-center font-bold text-primary text-xs">
                    الحالة
                  </TableHead>
                  <TableHead className="text-center font-bold text-primary text-xs">
                    المدة
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {migrationsQuery.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-20 text-center text-muted-foreground"
                      role="status"
                      aria-live="polite"
                    >
                      جاري فحص حالة المخطط…
                    </TableCell>
                  </TableRow>
                )}
                {!migrationsQuery.isLoading && migrationsQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-destructive/5 py-10">
                      <div
                        className="flex flex-col items-center gap-3 text-center"
                        role="alert"
                      >
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <p className="font-semibold text-destructive">
                          تعذر تحميل قائمة الترحيلات.
                        </p>
                        <p className="max-w-xl text-xs text-muted-foreground">
                          {getTrpcErrorMessage(
                            migrationsQuery.error,
                            "تحقق من الاتصال ثم أعد المحاولة.",
                          )}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRefresh()}
                          disabled={migrationsQuery.isFetching}
                        >
                          إعادة المحاولة
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!migrationsQuery.isLoading &&
                  !migrationsQuery.isError &&
                  rows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-20 text-center text-muted-foreground bg-muted/20"
                      >
                        لا توجد ترحيلات مسجلة حالياً.
                      </TableCell>
                    </TableRow>
                  )}
                {rows.map((migration: MigrationRow, idx: number) => (
                  <TableRow
                    key={migration.name}
                    className={cn(
                      "group transition-colors hover:bg-primary/[0.03]",
                      idx % 2 === 0 ? "bg-background" : "bg-muted/10",
                    )}
                  >
                    <TableCell className="px-6 py-3 font-mono text-[13px] font-bold text-foreground/80 break-all">
                      {migration.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3 text-[13px] font-medium text-muted-foreground tabular-nums">
                      {formatAt(migration.appliedAt)}
                    </TableCell>
                    <TableCell className="py-3 text-center text-xs text-muted-foreground">
                      غير متاح
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <Badge
                        variant={
                          migration.pending ? "destructive" : "secondary"
                        }
                        className={cn(
                          "h-5 text-[13px] px-2 font-bold",
                          !migration.pending &&
                            "bg-success/10 text-success border-success/20",
                        )}
                      >
                        {migration.pending ? "معلّقة" : "مطبقة"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-center text-xs text-muted-foreground">
                      غير متاح
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/60 bg-muted/5 shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-inner">
              <Upload className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm text-foreground">
                استيراد البيانات الخارجية
              </p>
              <p className="max-w-md text-[13px] text-muted-foreground leading-relaxed">
                ترحيلات <strong>Drizzle</strong> تتم برمجياً عبر ملفات SQL.
                لاستيراد بيانات Excel/CSV، يرجى استخدام أدوات المزامنة المتخصصة
                في صفحة الإدارة.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-warning/60 bg-warning/10 shadow-sm border-dashed">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-warning-text/90" />
              <CardTitle className="text-sm font-bold text-warning-text">
                أدوات إصلاح المخطط
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[13px] text-warning-text leading-relaxed">
              استعادة الزيارات المحذوفة بمعرفاتها الأصلية، وربط الفحوصات التي لا
              تحمل معرف زيارة بأقرب زيارة زمنياً.
            </p>
            <AlertDialog
              open={confirmFixOrphans}
              onOpenChange={setConfirmFixOrphans}
            >
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={fixOrphanedExaminationsMutation.isPending}
                  className="w-full h-9 bg-warning text-warning-foreground font-bold text-xs hover:bg-warning/90 shadow-sm"
                >
                  {fixOrphanedExaminationsMutation.isPending
                    ? "جاري المعالجة…"
                    : "إصلاح الزيارات والفحوصات الأيتام"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    تأكيد إصلاح الزيارات والفحوصات
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    سيعيد هذا الإجراء إنشاء الزيارات المحذوفة وربط الفحوصات التي
                    لا تحمل معرف زيارة. قد يغيّر بيانات السجلات الحالية. هل تريد
                    المتابعة؟
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmFixOrphans}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    تأكيد الإصلاح
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
