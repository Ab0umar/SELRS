import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

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
      <div className="space-y-6 p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            صلاحيات غير كافية. فقط المسؤولون يمكنهم الوصول إلى هذه الصفحة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">🔧 أدوات التشخيص والإصلاح</h1>
        <p className="text-slate-600">
          إصلاح شامل لجميع مشاكل البيانات بضغطة زر واحدة
        </p>
      </div>

      {/* AUTO-FIX ALL */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            ⚡ إصلاح شامل فوري
          </CardTitle>
          <CardDescription className="text-green-800">
            إصلاح جميع مشاكل البيانات في لحظة واحدة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleAutoFixAll}
            disabled={autoFixAllMutation.isPending}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {autoFixAllMutation.isPending && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            ✨ إصلاح كل شيء الآن
          </Button>

          {autoFixAllMutation.data && (
            <div className="space-y-3 rounded-lg bg-white p-4">
              <Alert className="border-green-300 bg-green-100">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <AlertDescription className="text-green-900 font-semibold">
                  ✅ اكتمل الإصلاح الشامل!
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">visitId = 0</p>
                  <p className="text-2xl font-bold text-green-600">
                    {autoFixAllMutation.data.fixExamsWithVisitId0.fixed}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">اليتيمة</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {autoFixAllMutation.data.fixOrphanedExaminations.fixed}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-600">بدون موعد</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {autoFixAllMutation.data.fixVisitsWithoutAppointmentId.fixed}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-sm font-semibold text-green-900">
                  إجمالي المُصلح: <span className="text-2xl">{autoFixAllMutation.data.totalFixed}</span>
                </p>
              </div>
            </div>
          )}

          {autoFixAllMutation.error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                ❌ خطأ: {autoFixAllMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* INFO CARD */}
      <Card>
        <CardHeader>
          <CardTitle>ماذا يفعل هذا الإصلاح؟</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="font-bold text-green-600">✓</span>
              <span>يحل مشكلة حذف جميع الزيارات من نفس التاريخ</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">✓</span>
              <span>يربط الفحوصات اليتيمة بالزيارات الصحيحة</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-600">✓</span>
              <span>يربط الزيارات بالمواعيد المطابقة</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
