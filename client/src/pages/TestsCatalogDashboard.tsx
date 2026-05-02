import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, FlaskConical, Pencil, Plus, Trash2, XCircle } from "lucide-react";

type TestType = "examination" | "lab" | "imaging" | "other";
type DashboardMode = "examinations" | "txhub";

const examinationsFilters = [
  { value: "all", label: "الكل" },
  { value: "lab", label: "تحاليل مخبرية" },
  { value: "imaging", label: "أشعة" },
  { value: "examination", label: "فحوصات بصرية" },
  { value: "other", label: "أخرى" },
];

const txhubFilters = [
  { value: "all", label: "الكل" },
  { value: "lab", label: "تحاليل مخبرية" },
  { value: "imaging", label: "أشعة" },
];

function categoryLabel(type: string | undefined | null): string {
  const m: Record<string, string> = {
    examination: "فحص",
    lab: "تحاليل",
    imaging: "أشعة",
    other: "أخرى",
  };
  return m[String(type ?? "")] ?? String(type ?? "—");
}

function rowActive(t: Record<string, unknown>): boolean {
  const v = t.isActive;
  if (typeof v === "boolean") return v;
  return v !== false;
}

function hasMedicalReference(row: Record<string, unknown>): boolean {
  return Boolean(String(row.normalRange ?? "").trim());
}

function parseEditableRange(raw: string): { min: string; max: string } | null {
  const nums = raw
    .replace(/[<>]/g, " ")
    .replace(/[–—]/g, "-")
    .match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  return { min: nums[0]!, max: nums[1]! };
}

function buildNormalRange(form: { refMin: string; refMax: string; normalRange: string }): string {
  const min = form.refMin.trim();
  const max = form.refMax.trim();
  if (min || max) return `${min || "—"} - ${max || "—"}`;
  return form.normalRange.trim();
}

function rangeDisplay(row: Record<string, unknown>): string {
  const nr = String(row.normalRange ?? "").trim();
  const u = String(row.unit ?? "").trim();
  if (!nr && !u) return "—";
  if (nr && u) return `${nr} ${u}`;
  return nr || u;
}

export default function TestsCatalogDashboard({ mode = "examinations" }: { mode?: DashboardMode }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "examination" as TestType,
    category: "",
    refMin: "",
    refMax: "",
    normalRange: "",
    unit: "",
    description: "",
    isActive: true,
  });

  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, { refetchOnWindowFocus: false });

  const createMutation = trpc.medical.createTest.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الفحص بنجاح");
      testsQuery.refetch();
      resetForm();
    },
    onError: (e: unknown) => toast.error(getTrpcErrorMessage(e, "فشل في إضافة الفحص")),
  });

  const updateMutation = trpc.medical.updateTest.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الفحص بنجاح");
      testsQuery.refetch();
      resetForm();
    },
    onError: (e: unknown) => toast.error(getTrpcErrorMessage(e, "فشل في تحديث الفحص")),
  });

  const deleteMutation = trpc.medical.deleteTest.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (e: unknown) => toast.error(getTrpcErrorMessage(e, "فشل في حذف الفحص")),
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const isTx = mode === "txhub";

  const baseRows = useMemo(() => {
    const all = ((testsQuery.data ?? []) as Record<string, unknown>[]).map((r) => r);
    if (isTx) return all.filter((r) => r.type === "lab" || r.type === "imaging");
    return all;
  }, [testsQuery.data, isTx]);

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let missingRef = 0;
    for (const r of baseRows) {
      if (rowActive(r)) active += 1;
      else inactive += 1;
      if (!hasMedicalReference(r)) missingRef += 1;
    }
    return { total: baseRows.length, active, inactive, missingRef };
  }, [baseRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseRows.filter((row) => {
      if (typeFilter !== "all" && String(row.type) !== typeFilter) return false;
      if (!q) return true;
      const name = String(row.name ?? "").toLowerCase();
      const cat = String(row.category ?? "").toLowerCase();
      const ref = String(row.normalRange ?? "").toLowerCase();
      return name.includes(q) || cat.includes(q) || ref.includes(q) || categoryLabel(String(row.type)).toLowerCase().includes(q);
    });
  }, [baseRows, search, typeFilter]);

  useEffect(() => {
    setTypeFilter("all");
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: isTx ? "lab" : "examination",
      category: "",
      refMin: "",
      refMax: "",
      normalRange: "",
      unit: "",
      description: "",
      isActive: true,
    });
  };

  const openEdit = (row: Record<string, unknown>) => {
    const rawRange = String(row.normalRange ?? "").trim();
    const parsedRange = parseEditableRange(rawRange);
    setEditingId(Number(row.id));
    setForm({
      name: String(row.name ?? ""),
      type: (String(row.type ?? (isTx ? "lab" : "examination")) as TestType) || (isTx ? "lab" : "examination"),
      category: String(row.category ?? ""),
      refMin: parsedRange?.min ?? "",
      refMax: parsedRange?.max ?? "",
      normalRange: parsedRange ? "" : rawRange,
      unit: String(row.unit ?? ""),
      description: String(row.description ?? ""),
      isActive: rowActive(row),
    });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("يرجى إدخال اسم الفحص");
      return;
    }

    const payloadCommon = {
      name: form.name.trim(),
      type: form.type,
      category: form.category.trim(),
      normalRange: buildNormalRange(form),
      unit: form.unit.trim(),
      description: form.description.trim(),
      priceEgp: undefined,
      durationMinutes: undefined,
      isActive: form.isActive,
    };

    if (editingId) {
      await updateMutation.mutateAsync({
        testId: editingId,
        updates: {
          ...payloadCommon,
          priceEgp: null,
          durationMinutes: null,
        },
      });
    } else {
      await createMutation.mutateAsync(payloadCommon);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف الفحص؟")) return;
    await deleteMutation.mutateAsync({ testId: id });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-[1400px] px-3 py-6 sm:px-4 sm:py-8" dir="rtl">
        <PageHeader
          title={isTx ? "TXhub" : "إدارة الفحوصات"}
          description={
            isTx
              ? "مرجع طبي شامل للتحاليل والأشعة: أضف الفحص وأرقام الطبيعي ليتم تعليم نتائج المرضى خارج المدى."
              : "إدارة جميع الفحوصات الطبية والمرجع الطبيعي لكل فحص."
          }
          icon={<FlaskConical className="h-5 w-5 text-primary" />}
          action={
            <Button type="button" variant="outline" className="gap-1 font-semibold" onClick={resetForm}>
              <Plus className="h-4 w-4" />
              إنشاء
            </Button>
          }
        />

        <div
          className={cn(
            STAT_CARDS_MOBILE_ROW,
            "mb-5 gap-2 sm:gap-4",
            isTx ? "sm:grid sm:grid-cols-2 lg:grid-cols-4" : "sm:grid sm:grid-cols-3",
          )}
        >
          <StatCard title={isTx ? "إجمالي التحاليل والأشعة" : "إجمالي الفحوصات"} value={stats.total} icon={FlaskConical} iconColor="bg-primary/10 text-primary" />
          <StatCard title="فعالة" value={stats.active} icon={CheckCircle2} iconColor="bg-emerald-500/10 text-emerald-600" />
          <StatCard title="معطلة" value={stats.inactive} icon={XCircle} iconColor="bg-red-500/10 text-red-600" />
          {isTx ? (
            <StatCard title="بلا مدى طبيعي" value={stats.missingRef} icon={AlertTriangle} iconColor="bg-amber-500/10 text-amber-700 dark:text-amber-400" />
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <FilterBar
                filters={isTx ? txhubFilters : examinationsFilters}
                selected={typeFilter}
                onSelect={setTypeFilter}
                className="md:order-2"
              />
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder={isTx ? "بحث بالاسم أو التصنيف أو المدى..." : "بحث عن فحص..."}
                className="md:order-1 md:max-w-md md:flex-1"
              />
            </div>

            {isTx ? (
              <div className="mb-4 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">طريقة الاستخدام: </span>
                أضف اسم الفحص مثل K1 أو IOP أو CCT، ثم ضع أقل وأعلى قيمة طبيعية والوحدة. أي نتيجة مريض أقل أو أعلى من هذا المدى يمكن تعليمها بالأحمر في شاشات النتائج.
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[820px] text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                    <th className="p-3 text-right">اسم الفحص</th>
                    <th className="p-3 text-right">التصنيف</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">المدى الطبيعي</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="w-24 p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {testsQuery.isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        جاري التحميل…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        لا توجد بيانات مطابقة.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const id = Number(row.id);
                      const active = rowActive(row);
                      const missingRef = !hasMedicalReference(row);
                      return (
                        <tr key={id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3">
                            <div className="font-semibold">{String(row.name ?? "")}</div>
                            {String(row.description ?? "").trim() ? (
                              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{String(row.description)}</div>
                            ) : null}
                          </td>
                          <td className="p-3 text-muted-foreground">{String(row.category ?? "").trim() || "—"}</td>
                          <td className="p-3">
                            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                              {categoryLabel(String(row.type))}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "p-3 text-xs whitespace-pre-wrap",
                              missingRef
                                ? "bg-amber-500/10 text-amber-900 dark:text-amber-100"
                                : "font-medium text-foreground",
                            )}
                          >
                            {rangeDisplay(row)}
                            {missingRef ? <span className="mt-1 block text-[10px] font-bold">ناقص مدى طبيعي</span> : null}
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                active
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/55 dark:text-emerald-200"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {active ? "فعال" : "غير فعال"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)} title="تعديل">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(id)} title="حذف">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="rounded-xl border bg-card p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
            <h2 className="mb-4 text-base font-bold">{editingId ? "تعديل فحص" : "إضافة فحص جديد"}</h2>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>اسم الفحص</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: K1 أو ضغط العين" />
              </div>

              <div className="space-y-1">
                <Label>نوع الفحص</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TestType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isTx ? (
                      <>
                        <SelectItem value="lab">تحاليل</SelectItem>
                        <SelectItem value="imaging">أشعة</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="examination">فحص</SelectItem>
                        <SelectItem value="lab">تحاليل</SelectItem>
                        <SelectItem value="imaging">أشعة</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>التصنيف</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: بنتاكام، جلوكوما، شبكية" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>أقل طبيعي</Label>
                  <Input dir="ltr" className="text-left" value={form.refMin} onChange={(e) => setForm({ ...form, refMin: e.target.value })} placeholder="500" />
                </div>
                <div className="space-y-1">
                  <Label>أعلى طبيعي</Label>
                  <Input dir="ltr" className="text-left" value={form.refMax} onChange={(e) => setForm({ ...form, refMax: e.target.value })} placeholder="600" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>الوحدة</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="D، µm، mmHg، mg/dL..." />
              </div>

              <div className="space-y-1">
                <Label>مدى نصي بديل</Label>
                <Input
                  value={form.normalRange}
                  onChange={(e) => setForm({ ...form, normalRange: e.target.value })}
                  placeholder="مثال: طبيعي بالسالب"
                  disabled={Boolean(form.refMin.trim() || form.refMax.trim())}
                />
                <p className="text-[11px] text-muted-foreground">استخدمه لو المرجع ليس رقماً من/إلى.</p>
              </div>

              <div className="space-y-1">
                <Label>الحالة</Label>
                <Select value={form.isActive ? "1" : "0"} onValueChange={(v) => setForm({ ...form, isActive: v === "1" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">فعال</SelectItem>
                    <SelectItem value="0">غير فعال</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>الوصف</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف مختصر للفحص..." className="min-h-[88px]" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" className="flex-1 gap-1 font-semibold" onClick={() => void save()} disabled={createMutation.isPending || updateMutation.isPending}>
                  حفظ
                </Button>
                {editingId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
