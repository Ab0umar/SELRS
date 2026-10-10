import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Edit2,
  FlaskConical,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";

export default function TestsManagement() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  type TestType = "examination" | "lab" | "imaging" | "other";
  type ManagedTest = {
    id: number;
    name: string;
    type: TestType;
    category?: string | null;
    normalRange?: string | null;
    unit?: string | null;
    description?: string | null;
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedTest | null>(null);
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

  const tests = (testsQuery.data ?? []) as ManagedTest[];
  const isSaving = createTestMutation.isPending || updateTestMutation.isPending;
  const isDeleting = deleteTestMutation.isPending;

  const testTypeLabel = (type: TestType) => {
    if (type === "lab") return "تحاليل";
    if (type === "imaging") return "أشعات";
    if (type === "other") return "أخرى";
    return "فحص";
  };

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

  const handleAddTest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newTest.name.trim();
    if (!name) {
      toast.error("يرجى إدخال اسم الفحص");
      return;
    }

    try {
      const payload = { ...newTest, name };
      if (editingId !== null) {
        await updateTestMutation.mutateAsync({
          testId: editingId,
          updates: payload,
        });
        setEditingId(null);
      } else {
        await createTestMutation.mutateAsync(payload);
      }

      resetForm();
    } catch {
      // The mutation callbacks provide the user-facing error message.
    }
  };

  const handleEditTest = (test: ManagedTest) => {
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

  const handleDeleteTest = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTestMutation.mutateAsync({ testId: deleteTarget.id });
      setDeleteTarget(null);
    } catch {
      // The mutation callback provides the user-facing error message.
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-2" dir="rtl">
      <section className="border-b border-border pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-black text-primary">
              <FlaskConical className="size-4" />
              كتالوج الفحوصات
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              إدارة الفحوصات
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              فحوصات المختبر والأشعة والفحوصات البصرية.
            </p>
          </div>
          <div
            className="flex flex-wrap gap-x-5 gap-y-1 text-xs"
            aria-live="polite"
          >
            <span className="text-muted-foreground">
              الإجمالي{" "}
              <strong className="ms-1 text-foreground">{tests.length}</strong>
            </span>
            <span className="text-muted-foreground">
              الوضع{" "}
              <strong className="ms-1 text-foreground">
                {editingId !== null ? "تعديل" : "إضافة"}
              </strong>
            </span>
            <span className="text-muted-foreground">
              الحالة{" "}
              <strong className="ms-1 text-foreground">
                {testsQuery.isLoading
                  ? "جاري تحميل الفحوصات"
                  : testsQuery.isError
                    ? "تعذر تحميل الفحوصات"
                    : testsQuery.isFetching
                      ? "جاري التحديث"
                      : "جاهز"}
              </strong>
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-border/80 shadow-none lg:col-span-1">
          <CardHeader>
            <CardTitle>
              {editingId !== null ? "تعديل الفحص" : "إضافة فحص جديد"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={handleAddTest}
              aria-busy={isSaving}
            >
              <div className="space-y-1.5">
                <Label htmlFor="test-name">اسم الفحص</Label>
                <Input
                  id="test-name"
                  value={newTest.name}
                  onChange={(e) =>
                    setNewTest({ ...newTest, name: e.target.value })
                  }
                  placeholder="أدخل اسم الفحص"
                  required
                  aria-required="true"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="test-type">نوع الفحص</Label>
                <Select
                  value={newTest.type}
                  onValueChange={(value) =>
                    setNewTest({ ...newTest, type: value as TestType })
                  }
                >
                  <SelectTrigger id="test-type" aria-label="نوع الفحص">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="examination">فحص</SelectItem>
                    <SelectItem value="lab">تحاليل</SelectItem>
                    <SelectItem value="imaging">أشعات</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="test-category">الفئة</Label>
                <Input
                  id="test-category"
                  value={newTest.category}
                  onChange={(e) =>
                    setNewTest({ ...newTest, category: e.target.value })
                  }
                  placeholder="مثال: تحاليل الدم"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="test-normal-range">المدى الطبيعي</Label>
                  <Input
                    id="test-normal-range"
                    value={newTest.normalRange}
                    onChange={(e) =>
                      setNewTest({ ...newTest, normalRange: e.target.value })
                    }
                    placeholder="مثال: 70–110"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="test-unit">الوحدة</Label>
                  <Input
                    id="test-unit"
                    value={newTest.unit}
                    onChange={(e) =>
                      setNewTest({ ...newTest, unit: e.target.value })
                    }
                    placeholder="مثال: mg/dL"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="test-description">وصف الفحص</Label>
                <Textarea
                  id="test-description"
                  value={newTest.description}
                  onChange={(e) =>
                    setNewTest({ ...newTest, description: e.target.value })
                  }
                  placeholder="أضف وصفاً مختصراً (اختياري)"
                  className="min-h-24"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="w-full" type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                  {isSaving
                    ? "جاري الحفظ…"
                    : editingId !== null
                      ? "حفظ التعديلات"
                      : "إضافة الفحص"}
                </Button>
                {editingId !== null ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setEditingId(null);
                      resetForm();
                    }}
                    disabled={isSaving}
                  >
                    إلغاء التعديل
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle>قائمة الفحوصات</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="divide-y divide-border rounded-md border border-border"
              aria-busy={testsQuery.isLoading || testsQuery.isFetching}
            >
              {testsQuery.isLoading ? (
                <p
                  className="p-8 text-center text-muted-foreground"
                  role="status"
                >
                  جاري تحميل قائمة الفحوصات…
                </p>
              ) : testsQuery.isError ? (
                <div
                  className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"
                  role="alert"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      تعذر تحميل قائمة الفحوصات
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      تعذر جلب البيانات. تحقق من الاتصال ثم أعد المحاولة.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void testsQuery.refetch()}
                    disabled={testsQuery.isFetching}
                  >
                    <RefreshCw
                      className={
                        testsQuery.isFetching ? "size-4 animate-spin" : "size-4"
                      }
                      aria-hidden="true"
                    />
                    {testsQuery.isFetching
                      ? "جاري إعادة المحاولة…"
                      : "إعادة المحاولة"}
                  </Button>
                </div>
              ) : tests.length === 0 ? (
                <div className="space-y-2 p-8 text-center">
                  <p className="font-semibold text-foreground">
                    لا توجد فحوصات بعد
                  </p>
                  <p className="text-sm text-muted-foreground">
                    استخدم نموذج الإضافة لإدخال أول فحص.
                  </p>
                </div>
              ) : (
                tests.map((test) => (
                  <div
                    key={test.id}
                    className="flex min-w-0 flex-col gap-3 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold" title={test.name}>
                        {test.name}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        {test.category ? <span>{test.category}</span> : null}
                        <span>{testTypeLabel(test.type)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={`تعديل الفحص: ${test.name}`}
                        onClick={() => handleEditTest(test)}
                        disabled={isSaving || isDeleting}
                      >
                        <Edit2 className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`حذف الفحص: ${test.name}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTarget(test)}
                        disabled={isSaving || isDeleting}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <AlertDialog
              open={deleteTarget !== null}
              onOpenChange={(open) => {
                if (!open && !isDeleting) setDeleteTarget(null);
              }}
            >
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف الفحص؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف «{deleteTarget?.name ?? "هذا الفحص"}» من الكتالوج.
                    لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    إلغاء
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDeleteTest();
                    }}
                  >
                    {isDeleting ? "جاري الحذف…" : "حذف الفحص"}
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
