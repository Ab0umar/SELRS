import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, CheckCircle2, Loader2, Zap, Activity, Info } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

export default function AdminDiagnostics() {
  const { user } = useAuth();
  const autoFixAllMutation = trpc.medical.autoFixAllDataIssues.useMutation();

  const handleAutoFixAll = async () => {
    if (confirm("⚠️ هذا سيصلح جميع مشاكل البيانات تلقائياً. هل تريد المتابعة؟")) {
      await autoFixAllMutation.mutateAsync();
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 p-6" dir="rtl">
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive font-bold">
            صلاحيات غير كافية. فقط المسؤولون يمكنهم الوصول إلى هذه الصفحة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-12 text-right" dir="rtl">
      <PageHeader
        title="التشخيص والإصلاح"
        subtitle="أدوات ذكية لفحص ومعالجة مشاكل سلامة البيانات وتكامل السجلات تلقائياً."
        icon={<Activity className="h-5 w-5 text-primary" />}
      />

      {/* AUTO-FIX ALL */}
      <Card className="overflow-hidden border-success/30/60 bg-success/10/20 shadow-sm">
        <CardHeader className="border-b border-success/20 bg-success/10/40 py-5 px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-foreground font-black">
                <Zap className="h-5 w-5 text-success" />
                إصلاح شامل فوري
              </CardTitle>
              <CardDescription className="text-success/80 font-medium">
                معالجة ذكية لجميع التناقضات المعروفة في قاعدة البيانات بضغطة زر واحدة.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-success/30 bg-success/15/50 text-success font-bold">
              موصى به دورياً
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Button
            onClick={handleAutoFixAll}
            disabled={autoFixAllMutation.isPending}
            size="lg"
            className="w-full h-14 text-lg font-black bg-success hover:bg-success/80 shadow-lg shadow-success/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {autoFixAllMutation.isPending ? (
              <Loader2 className="ml-3 h-6 w-6 animate-spin" />
            ) : (
              "✨ بدء الإصلاح التلقائي الآن"
            )}
          </Button>

          {autoFixAllMutation.data && (
            <div className="space-y-4 rounded-2xl bg-background/60 p-5 border border-success/20 shadow-inner">
              <div className="flex items-center gap-3 text-success">
                <CheckCircle2 className="h-6 w-6" />
                <span className="text-base font-black">اكتملت عملية الإصلاح الشامل بنجاح!</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "سجلات visitId = 0", value: autoFixAllMutation.data.fixExamsWithVisitId0.fixed, color: "text-success" },
                  { label: "الفحوصات اليتيمة", value: autoFixAllMutation.data.fixOrphanedExaminations.fixed, color: "text-primary" },
                  { label: "زيارات بلا موعد", value: autoFixAllMutation.data.fixVisitsWithoutAppointmentId.fixed, color: "text-secondary" }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-border/50 bg-background p-4 shadow-sm">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className={cn("text-3xl font-black tabular-nums", stat.color)}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-success p-4 text-success-foreground flex items-center justify-between">
                <span className="font-bold">إجمالي السجلات التي تم تصحيحها:</span>
                <span className="text-3xl font-black tabular-nums">{autoFixAllMutation.data.totalFixed}</span>
              </div>
            </div>
          )}

          {autoFixAllMutation.error && (
            <Alert variant="destructive" className="rounded-xl border-destructive/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-bold">
                فشلت العملية: {autoFixAllMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* INFO CARD */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardHeader className="border-b bg-muted/5 py-4 px-6">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            نطاق عمل أدوات الإصلاح
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-success">
                <div className="h-2 w-2 rounded-full bg-success/100" />
                تكامل الزيارات
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                إعادة بناء الروابط المفقودة بين الفحوصات الطبية والزيارات المسجلة، وحل مشكلة المعرفات الصفرية الناتجة عن أخطاء المزامنة.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-primary">
                <div className="h-2 w-2 rounded-full bg-primary/50" />
                ربط الفحوصات
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                البحث عن "الفحوصات الأيتام" (التي لا تنتمي لمريض محدد) ومطابقتها مع سجلات المرضى الصحيحة بناءً على التوقيت والرموز.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-secondary">
                <div className="h-2 w-2 rounded-full bg-secondary/[0.07]0" />
                توافق المواعيد
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                التأكد من أن كل زيارة فعلية مرتبطة بموعد مسبق في النظام لضمان دقة التقارير الإحصائية والمالية.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
