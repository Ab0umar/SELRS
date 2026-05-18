import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, FlaskConical, ClipboardList, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";

export default function TestsManagement() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  type TestType = "examination" | "lab" | "imaging" | "other";
  const [editingId, setEditingId] = useState<number | null>(null);
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [newTest, setNewTest] = useState<{
    name: string;
    type: TestType;
    category: string;
    normalRange: string;
    unit: string;
    description: string;
  }>({
    name: "",
    type: "examination",
    category: "",
    normalRange: "",
    unit: "",
    description: "",
  });

  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const createTestMutation = trpc.medical.createTest.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في إضافة الفحص"));
    },
  });

  const updateTestMutation = trpc.medical.updateTest.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في تحديث الفحص"));
    },
  });

  const deleteTestMutation = trpc.medical.deleteTest.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => {
      toast.error(getTrpcErrorMessage(error, "فشل في حذف الفحص"));
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  const tests = (testsQuery.data ?? []) as any[];

  const resetForm = () => {
    setNewTest({
      name: "",
      type: "examination",
      category: "",
      normalRange: "",
      unit: "",
      description: "",
    });
  };

  const handleAddTest = async () => {
    if (!newTest.name) {
      toast.error("يرجى إدخال اسم الفحص");
      return;
    }

    if (editingId) {
      await updateTestMutation.mutateAsync({
        testId: editingId,
        updates: { ...newTest },
      });
      setEditingId(null);
    } else {
      await createTestMutation.mutateAsync({ ...newTest });
    }

    resetForm();
  };

  const handleEditTest = (test: any) => {
    setNewTest({
      name: test.name ?? "",
      type: test.type ?? "examination",
      category: test.category ?? "",
      normalRange: test.normalRange ?? "",
      unit: test.unit ?? "",
      description: test.description ?? "",
    });
    setEditingId(test.id);
  };

  const handleDeleteTest = async (id: number) => {
    await deleteTestMutation.mutateAsync({ testId: id });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-2" dir="rtl">
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
              <FlaskConical className="h-3.5 w-3.5" />
              كتالوج الفحوصات
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">إدارة الفحوصات</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              إدارة شاملة لفحوصات المختبر والأشعة والفحوصات البصرية.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5" />
                إجمالي الفحوصات
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{tests.length}</div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground">الوضع</div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {editingId ? "تعديل فحص" : "إضافة جديدة"}
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                الحالة
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {testsQuery.isLoading ? "جاري التحميل" : "جاهز"}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/80 shadow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle>{editingId ? "تعديل الفحص" : "إضافة فحص جديد"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={newTest.name}
              onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
              placeholder="اسم الفحص"
            />
            <Select
              value={newTest.type}
              onValueChange={(value) => setNewTest({ ...newTest, type: value as TestType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="examination">فحص</SelectItem>
                <SelectItem value="lab">تحاليل</SelectItem>
                <SelectItem value="imaging">أشعات</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={newTest.category}
              onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
              placeholder="الفئة"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={newTest.normalRange}
                onChange={(e) => setNewTest({ ...newTest, normalRange: e.target.value })}
                placeholder="المدى الطبيعي"
              />
              <Input
                value={newTest.unit}
                onChange={(e) => setNewTest({ ...newTest, unit: e.target.value })}
                placeholder="الوحدة"
              />
            </div>
            <Textarea
              value={newTest.description}
              onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
              placeholder="وصف الفحص"
              className="min-h-24"
            />
            <Button className="w-full" onClick={handleAddTest}>
              <Plus className="h-4 w-4 ml-2" />
              {editingId ? "حفظ التعديلات" : "إضافة الفحص"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>قائمة الفحوصات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">{test.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {test.category || ""} {test.type ? ` ${test.type}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={() => handleEditTest(test)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {delConfirm === test.id ? (
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="تأكيد الحذف"
                          className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-destructive/80"
                          onClick={() => { void handleDeleteTest(test.id); setDelConfirm(null); }}>
                          تأكيد
                        </button>
                        <button type="button" aria-label="إلغاء الحذف"
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-border"
                          onClick={() => setDelConfirm(null)}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button type="button" aria-label="حذف الفحص"
                        className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 transition-colors"
                        onClick={() => setDelConfirm(test.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {tests.length === 0 && (
                <p className="text-center text-muted-foreground">لا توجد فحوصات بعد</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
