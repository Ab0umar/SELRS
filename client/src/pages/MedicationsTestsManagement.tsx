import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Link2, Plus, Trash2, Edit2, Upload, Star, Save } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ServicesHubNav } from "@/components/shared/ServicesHubNav";
import { SearchBar } from "@/components/shared/SearchBar";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getTrpcErrorMessage } from "@/lib/utils";
import { loadXlsx } from "@/lib/xlsx";

type MedicationType = "tablet" | "drops" | "ointment" | "injection" | "suspension" | "other";
type TestType = "examination" | "lab" | "imaging" | "other";

function medicationTypeLabel(type: string | undefined | null): string {
  const m: Record<string, string> = {
    drops: "قطرة",
    tablet: "أقراص",
    ointment: "مرهم",
    injection: "حقن",
    suspension: "معلق",
    other: "أخرى",
  };
  return m[String(type ?? "")] ?? String(type ?? "—");
}

function testTypeLabel(type: string | undefined | null): string {
  const m: Record<string, string> = {
    examination: "فحص",
    lab: "تحاليل",
    imaging: "أشعة",
    other: "أخرى",
  };
  return m[String(type ?? "")] ?? String(type ?? "—");
}

export default function MedicationsTestsManagement() {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  const medsFileRef = useRef<HTMLInputElement>(null);
  const testsFileRef = useRef<HTMLInputElement>(null);
  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [medListSearch, setMedListSearch] = useState("");
  const [testListSearch, setTestListSearch] = useState("");
  const [newMedication, setNewMedication] = useState<{
    name: string;
    type: MedicationType;
    strength: string;
  }>({
    name: "",
    type: "drops",
    strength: "",
  });

  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [delConfirmMed, setDelConfirmMed] = useState<number | null>(null);
  const [delConfirmTest, setDelConfirmTest] = useState<number | null>(null);
  const [newTest, setNewTest] = useState<{
    name: string;
    type: TestType;
    category: string;
  }>({
    name: "",
    type: "examination",
    category: "",
  });

  const medsQuery = trpc.medical.getAllMedications.useQuery(undefined, { refetchOnWindowFocus: false });
  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, { refetchOnWindowFocus: false });
  const favoritesQuery = trpc.medical.getMyTestFavorites.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false,
    enabled: ["doctor", "manager", "admin"].includes(user?.role || ""),
  });
  const favoritesErrorShownRef = useRef(false);

  const createMedicationMutation = trpc.medical.createMedication.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الدواء بنجاح");
      medsQuery.refetch();
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل في إضافة الدواء")),
  });
  const updateMedicationMutation = trpc.medical.updateMedication.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدواء بنجاح");
      medsQuery.refetch();
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل في تحديث الدواء")),
  });
  const deleteMedicationMutation = trpc.medical.deleteMedication.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الدواء بنجاح");
      medsQuery.refetch();
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل في حذف الدواء")),
  });

  const createTestMutation = trpc.medical.createTest.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل في إضافة الفحص")),
  });
  const updateTestMutation = trpc.medical.updateTest.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل في تحديث الفحص")),
  });
  const deleteTestMutation = trpc.medical.deleteTest.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (error: unknown) => toast.error(getTrpcErrorMessage(error, "فشل في حذف الفحص")),
  });
  const toggleFavoriteMutation = trpc.medical.toggleTestFavorite.useMutation({
    onSuccess: () => {
      favoritesQuery.refetch();
    },
    onError: () => {
      toast.error("تعذر تحديث المفضلة.");
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!favoritesQuery.error) return;
    if (favoritesErrorShownRef.current) return;
    favoritesErrorShownRef.current = true;
    toast.error("المفضلة متاحة لطبيب / مدير / مسؤول فقط.");
  }, [favoritesQuery.error]);

  const medications = (medsQuery.data ?? []) as any[];
  const tests = (testsQuery.data ?? []) as any[];
  const canFavorite = ["doctor", "manager", "admin"].includes(user?.role || "");
  const favoriteIds = new Set((favoritesQuery.data ?? []).map((f: any) => f.testId));
  const favoriteTests = tests.filter((t) => favoriteIds.has(t.id));

  const filteredMedications = useMemo(() => {
    const q = medListSearch.trim().toLowerCase();
    if (!q) return medications;
    return medications.filter((med) =>
      `${med.name ?? ""} ${med.strength ?? ""} ${med.type ?? ""}`.toLowerCase().includes(q),
    );
  }, [medications, medListSearch]);

  const filteredTests = useMemo(() => {
    const q = testListSearch.trim().toLowerCase();
    if (!q) return tests;
    return tests.filter((test) =>
      `${test.name ?? ""} ${test.category ?? ""} ${test.type ?? ""}`.toLowerCase().includes(q),
    );
  }, [tests, testListSearch]);

  if (!isAuthenticated) return null;

  const resetMedForm = () => {
    setNewMedication({
      name: "",
      type: "drops",
      strength: "",
    });
  };

  const resetTestForm = () => {
    setNewTest({
      name: "",
      type: "examination",
      category: "",
    });
  };

  const handleSaveMedication = async () => {
    if (!newMedication.name) {
      toast.error("يرجى إدخال اسم الدواء");
      return;
    }

    if (editingMedId) {
      await updateMedicationMutation.mutateAsync({ medicationId: editingMedId, updates: { ...newMedication } });
      setEditingMedId(null);
    } else {
      await createMedicationMutation.mutateAsync({ ...newMedication });
    }
    resetMedForm();
  };

  const handleEditMedication = (med: any) => {
    setNewMedication({
      name: med.name ?? "",
      type: med.type ?? "drops",
      strength: med.strength ?? "",
    });
    setEditingMedId(med.id);
  };

  const handleDeleteMedication = async (id: number) => {
    await deleteMedicationMutation.mutateAsync({ medicationId: id });
  };

  const handleImportMedications = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result as ArrayBuffer;
        const XLSX = await loadXlsx();
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        for (const row of jsonData as any[]) {
          await createMedicationMutation.mutateAsync({
            name: row["اسم الدواء"] || row["name"] || "",
            type: row["النوع"] || row["type"] || "drops",
            strength: row["التركيز"] || row["strength"] || "",
          });
        }
        toast.success("تم استيراد الأدوية بنجاح");
        if (medsFileRef.current) medsFileRef.current.value = "";
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error("خطأ في استيراد الملف");
    }
  };

  const handleImportTests = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const normalizeTestType = (raw: any): TestType => {
        const value = String(raw ?? "").trim().toLowerCase();
        if (["lab", "تحاليل", "تحليل"].includes(value)) return "lab";
        if (["imaging", "اشعة", "أشعة", "radiology", "xray"].includes(value)) return "imaging";
        if (["exam", "examination", "فحص", "فحوصات"].includes(value)) return "examination";
        return "examination";
      };
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result as ArrayBuffer;
        const XLSX = await loadXlsx();
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const firstNonEmpty = rawRows.find((row) => row && row.some((cell) => String(cell ?? "").trim() !== ""));
        if (!firstNonEmpty) {
          toast.error("ملف فارغ: لا توجد بيانات.");
          if (testsFileRef.current) testsFileRef.current.value = "";
          return;
        }
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        let created = 0;
        let skipped = 0;
        for (const row of jsonData as any[]) {
          const name = row["اسم الفحص"] || row["name"] || "";
          if (!String(name).trim()) {
            skipped += 1;
            continue;
          }
          const category =
            row["تصنيف"] ||
            row["الفئة"] ||
            row["category"] ||
            row["Category"] ||
            "";
          await createTestMutation.mutateAsync({
            name: String(name).trim(),
            type: normalizeTestType(row["النوع"] || row["type"]),
            category: String(category ?? "").trim(),
          });
          created += 1;
        }
        toast.success(`تم استيراد ${created} فحص (تخطي ${skipped})`);
        if (testsFileRef.current) testsFileRef.current.value = "";
      };
      reader.readAsArrayBuffer(file);
    } catch {
      toast.error("خطأ في استيراد الملف");
    }
  };

  const handleSaveTest = async () => {
    if (!newTest.name) {
      toast.error("يرجى إدخال اسم الفحص");
      return;
    }
    if (editingTestId) {
      await updateTestMutation.mutateAsync({ testId: editingTestId, updates: { ...newTest } });
      setEditingTestId(null);
    } else {
      await createTestMutation.mutateAsync({ ...newTest });
    }
    resetTestForm();
  };

  const handleEditTest = (test: any) => {
    setNewTest({
      name: test.name ?? "",
      type: test.type ?? "examination",
      category: test.category ?? "",
    });
    setEditingTestId(test.id);
  };

  const handleDeleteTest = async (id: number) => {
    await deleteTestMutation.mutateAsync({ testId: id });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-4" dir="rtl">
      <PageHeader
        title="إدارة الأدوية والفحوصات"
        subtitle="إضافة وتعديل وحذف الأدوية والفحوصات الطبية"
        icon={<FlaskConical className="h-5 w-5" />}
      />

      <ServicesHubNav active="registry" className="mb-4" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {/* صف الإدخال: يمين = أدوية، يسار = فحوصات (RTL) */}
        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 border-b border-border/80 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Link2 className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg">{editingMedId ? "تعديل دواء" : "الأدوية"}</CardTitle>
            </div>
            <CardDescription>أضف أو حدّث بيانات الدواء قبل الحفظ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold">اسم الدواء</label>
              <Input
                value={newMedication.name}
                onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                placeholder="مثال: توباماكس"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">نوع الدواء</label>
              <Select
                value={newMedication.type}
                onValueChange={(value) => setNewMedication({ ...newMedication, type: value as MedicationType })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drops">قطرة</SelectItem>
                  <SelectItem value="ointment">مرهم</SelectItem>
                  <SelectItem value="tablet">أقراص</SelectItem>
                  <SelectItem value="injection">حقن</SelectItem>
                  <SelectItem value="suspension">معلق</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">التركيز / القوة</label>
              <Input
                value={newMedication.strength}
                onChange={(e) => setNewMedication({ ...newMedication, strength: e.target.value })}
                placeholder="مثال: 0.25%"
                className="text-right"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSaveMedication()}
                className="min-w-[8rem] flex-1 selrs-gradient-btn gap-2 text-white sm:flex-none"
              >
                <Save className="h-4 w-4" />
                حفظ
              </Button>
              <input ref={medsFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportMedications} className="hidden" />
              <Button type="button" variant="outline" className="gap-2 border-dashed" onClick={() => medsFileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                رفع Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="space-y-1 border-b border-border/80 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FlaskConical className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg">{editingTestId ? "تعديل فحص" : "الفحوصات"}</CardTitle>
            </div>
            <CardDescription>أضف أو حدّث الفحص والتصنيف</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold">اسم الفحص</label>
              <Input
                value={newTest.name}
                onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                placeholder="مثال: فحص النظر"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">نوع الفحص</label>
              <Select value={newTest.type} onValueChange={(value) => setNewTest({ ...newTest, type: value as TestType })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="اختر النوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="examination">فحص</SelectItem>
                  <SelectItem value="lab">تحاليل</SelectItem>
                  <SelectItem value="imaging">أشعة</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">التصنيف</label>
              <Input
                value={newTest.category}
                onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                placeholder="مثال: بصريات"
                className="text-right"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSaveTest()}
                className="min-w-[8rem] flex-1 selrs-gradient-btn gap-2 text-white sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                حفظ
              </Button>
              <input ref={testsFileRef} type="file" accept=".xlsx,.xls" onChange={handleImportTests} className="hidden" />
              <Button type="button" variant="outline" className="gap-2 border-dashed" onClick={() => testsFileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                رفع Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* قائمة الأدوية */}
        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/80 py-4">
            <CardTitle className="text-base">قائمة الأدوية</CardTitle>
            <CardDescription>{medications.length} دواء مسجّل</CardDescription>
            <SearchBar value={medListSearch} onChange={setMedListSearch} placeholder="بحث في الأدوية..." className="mt-3" />
          </CardHeader>
          <CardContent className="max-h-[420px] space-y-2 overflow-y-auto pt-4">
            {medsQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">جاري التحميل…</p>
            ) : filteredMedications.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</p>
            ) : (
              filteredMedications.map((med) => {
                const sub = [medicationTypeLabel(med.type), String(med.strength ?? "").trim()].filter(Boolean).join(" ");
                return (
                  <div
                    key={med.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1 text-right">
                      <div className="font-semibold leading-snug">{med.name}</div>
                      {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="icon" variant="outline" className="h-9 w-9" title="تعديل" onClick={() => handleEditMedication(med)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {delConfirmMed === med.id ? (
                        <div className="flex items-center gap-1">
                          <button type="button" aria-label="تأكيد الحذف"
                            className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-destructive/80"
                            onClick={() => { void handleDeleteMedication(med.id); setDelConfirmMed(null); }}>
                            تأكيد
                          </button>
                          <button type="button" aria-label="إلغاء الحذف"
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-border"
                            onClick={() => setDelConfirmMed(null)}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button type="button" aria-label="حذف الدواء"
                          className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 transition-colors"
                          onClick={() => setDelConfirmMed(med.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* قائمة الفحوصات + مفضلة */}
        <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <CardHeader className="space-y-3 border-b border-border/80 py-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span className="text-sm font-black">المفضلة</span>
            </div>
            {!canFavorite ? (
              <p className="text-xs text-muted-foreground">المفضلة متاحة لطبيب / مدير / مسؤول فقط.</p>
            ) : favoriteTests.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد عناصر مفضلة — اضغط النجمة بجانب أي فحص لإضافته.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {favoriteTests.map((test) => (
                  <button
                    key={test.id}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold transition hover:bg-primary/[0.08]"
                    title="اضغط لإزالة من المفضلة"
                    onClick={() => toggleFavoriteMutation.mutate({ testId: test.id })}
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    {test.name}
                  </button>
                ))}
              </div>
            )}
            <CardTitle className="pt-2 text-base">كل الفحوصات</CardTitle>
            <CardDescription>{tests.length} فحص مسجّل</CardDescription>
            <SearchBar value={testListSearch} onChange={setTestListSearch} placeholder="بحث في الفحوصات..." />
          </CardHeader>
          <CardContent className="max-h-[340px] space-y-2 overflow-y-auto pt-4">
            {testsQuery.isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">جاري التحميل…</p>
            ) : filteredTests.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج.</p>
            ) : (
              filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/80 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1 text-right">
                    <div className="font-semibold leading-snug">{test.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {[test.category, testTypeLabel(test.type)].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant={favoriteIds.has(test.id) ? "secondary" : "outline"}
                      className="h-9 w-9"
                      title={favoriteIds.has(test.id) ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                      onClick={() => {
                        if (!canFavorite) {
                          toast.error("المفضلة متاحة لطبيب / مدير / مسؤول فقط.");
                          return;
                        }
                        toggleFavoriteMutation.mutate({ testId: test.id });
                      }}
                    >
                      <Star
                        className={`h-4 w-4 ${favoriteIds.has(test.id) ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button type="button" size="icon" variant="outline" className="h-9 w-9" title="تعديل" onClick={() => handleEditTest(test)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {delConfirmTest === test.id ? (
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="تأكيد الحذف"
                          className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-destructive/80"
                          onClick={() => { void handleDeleteTest(test.id); setDelConfirmTest(null); }}>
                          تأكيد
                        </button>
                        <button type="button" aria-label="إلغاء الحذف"
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground hover:bg-border"
                          onClick={() => setDelConfirmTest(null)}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button type="button" aria-label="حذف الفحص"
                        className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive opacity-40 hover:opacity-100 hover:bg-destructive/10 transition-colors"
                        onClick={() => setDelConfirmTest(test.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
