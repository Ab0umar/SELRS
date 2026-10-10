import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ServicesHubNav } from "@/components/shared/ServicesHubNav";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  emptyTestReferenceRange,
  formatTestReferenceRange,
  getTestReferenceRanges,
  referenceIsDisabled,
  testReferenceRangesSchema,
  type TestReferenceRange,
} from "@shared/test-reference-ranges";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OfflinePageState } from "@/components/OfflinePageState";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";

type TestType = "examination" | "lab" | "imaging" | "other";
type DashboardMode = "examinations" | "txhub";

const examinationsFilters = [
  { value: "lab", label: "تحاليل" },
  { value: "imaging", label: "أشعة" },
  { value: "examination", label: "فحوصات" },
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
  return referenceIsDisabled(row) || getTestReferenceRanges(row).length > 0;
}

function rangeDisplay(row: Record<string, unknown>): string {
  if (referenceIsDisabled(row)) return "لا ينطبق عليه مدى طبيعي";
  return (
    getTestReferenceRanges(row).map(formatTestReferenceRange).join("\n") || "—"
  );
}

export default function TestsCatalogDashboard({
  mode = "examinations",
  embeddedInHub = false,
}: {
  mode?: DashboardMode;
  embeddedInHub?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(
    mode === "txhub" ? "all" : "lab",
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "examination" as TestType,
    category: "",
    referenceRanges: [emptyTestReferenceRange()],
    noNormalRange: false,
    description: "",
    isActive: true,
  });

  const testsQuery = trpc.medical.getAllTests.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const createMutation = trpc.medical.createTest.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الفحص بنجاح");
      testsQuery.refetch();
      resetForm();
    },
    onError: (e: unknown) =>
      toast.error(getTrpcErrorMessage(e, "فشل في إضافة الفحص")),
  });

  const updateMutation = trpc.medical.updateTest.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الفحص بنجاح");
      testsQuery.refetch();
      resetForm();
    },
    onError: (e: unknown) =>
      toast.error(getTrpcErrorMessage(e, "فشل في تحديث الفحص")),
  });

  const deleteMutation = trpc.medical.deleteTest.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الفحص بنجاح");
      testsQuery.refetch();
    },
    onError: (e: unknown) =>
      toast.error(getTrpcErrorMessage(e, "فشل في حذف الفحص")),
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const isTx = mode === "txhub";

  const baseRows = useMemo(() => {
    const all = ((testsQuery.data ?? []) as Record<string, unknown>[]).map(
      (r) => r,
    );
    if (isTx)
      return all.filter((r) => r.type === "lab" || r.type === "imaging");
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
      const ref = rangeDisplay(row).toLowerCase();
      return (
        name.includes(q) ||
        cat.includes(q) ||
        ref.includes(q) ||
        categoryLabel(String(row.type)).toLowerCase().includes(q)
      );
    });
  }, [baseRows, search, typeFilter]);

  useEffect(() => {
    setTypeFilter(mode === "txhub" ? "all" : "lab");
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: isTx
        ? "lab"
        : ((typeFilter === "all" ? "lab" : typeFilter) as TestType),
      category: "",
      referenceRanges: [emptyTestReferenceRange()],
      noNormalRange: false,
      description: "",
      isActive: true,
    });
  };

  const openEdit = (row: Record<string, unknown>) => {
    const ranges = getTestReferenceRanges(row);
    setEditingId(Number(row.id));
    setForm({
      name: String(row.name ?? ""),
      type:
        (String(row.type ?? (isTx ? "lab" : "examination")) as TestType) ||
        (isTx ? "lab" : "examination"),
      category: String(row.category ?? ""),
      referenceRanges: ranges.length ? ranges : [emptyTestReferenceRange()],
      noNormalRange: referenceIsDisabled(row),
      description: String(row.description ?? ""),
      isActive: rowActive(row),
    });
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("يرجى إدخال اسم الفحص");
      return;
    }

    const ranges = testReferenceRangesSchema.safeParse(
      form.noNormalRange
        ? []
        : form.referenceRanges.filter((range) =>
            Object.values(range).some((value) => value.trim()),
          ),
    );
    if (!ranges.success) {
      toast.error(ranges.error.issues[0]?.message ?? "راجع المديات الطبيعية");
      return;
    }
    const payloadCommon = {
      name: form.name.trim(),
      type: form.type,
      category: form.category.trim(),
      referenceRanges: ranges.data,
      noNormalRange: form.noNormalRange,
      description: form.description.trim(),
      priceEgp: undefined,
      durationMinutes: undefined,
      isActive: form.isActive,
    };

    if (editingId) {
      updateMutation.mutate({
        testId: editingId,
        updates: {
          ...payloadCommon,
        },
      });
    } else {
      createMutation.mutate(payloadCommon);
    }
  };

  const remove = (id: number) => {
    deleteMutation.mutate({ testId: id });
  };

  const updateRange = (
    index: number,
    key: keyof TestReferenceRange,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      referenceRanges: current.referenceRanges.map((range, i) =>
        i === index ? { ...range, [key]: value } : range,
      ),
    }));
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <div
        className="container mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-6"
        dir="rtl"
      >
        {!embeddedInHub && (
          <ServicesHubNav
            active={isTx ? "txhub" : "catalog"}
            className="mb-4"
          />
        )}

        <div
          className={cn(
            STAT_CARDS_MOBILE_ROW,
            "mb-5 gap-2 sm:gap-4",
            isTx
              ? "sm:grid sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid sm:grid-cols-3",
          )}
        >
          <StatCard
            title={isTx ? "المرجع الخارجي" : "إجمالي الفحوصات"}
            value={stats.total}
            icon={FlaskConical}
            iconColor="bg-primary text-primary-foreground"
          />
          <StatCard
            title={isTx ? "مفعلة" : "فعالة"}
            value={stats.active}
            icon={CheckCircle2}
            iconColor="bg-success/100/10 text-success"
          />
          <StatCard
            title={isTx ? "غير مرتبطة" : "معطلة"}
            value={stats.inactive}
            icon={XCircle}
            iconColor="bg-destructive text-destructive-foreground"
          />
          {isTx ? (
            <StatCard
              title="بلا مدى طبيعي"
              value={stats.missingRef}
              icon={AlertTriangle}
              iconColor="bg-warning/100/10 text-warning-text/90"
            />
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-xl border bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 min-w-[240px] items-center gap-2">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder={isTx ? "بحث في المرجع الخارجي…" : "بحث عن فحص…"}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1 text-xs font-semibold shrink-0"
                  onClick={resetForm}
                >
                  <Plus className="h-4 w-4" />
                  {isTx ? "إضافة مرجع" : "إنشاء"}
                </Button>
              </div>
              {isTx ? (
                <FilterBar
                  filters={txhubFilters}
                  selected={typeFilter}
                  onSelect={setTypeFilter}
                />
              ) : (
                <Tabs
                  value={typeFilter}
                  onValueChange={setTypeFilter}
                  dir="rtl"
                  className="w-full"
                >
                  <TabsList className="grid h-auto w-full grid-cols-4">
                    {examinationsFilters.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="min-h-11"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}
            </div>

            {isTx ? (
              <div className="mb-4 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">
                  طريقة الاستخدام:{" "}
                </span>
                هذا القسم لنتائج الأنظمة الخارجية فقط، أضف اسم المرجع مثل K1 أو
                IOP أو CCT، ثم ضع أقل وأعلى قيمة طبيعية والوحدة. أي نتيجة مريض
                أقل أو أعلى من هذا المدى يمكن تعليمها بالأحمر في شاشات النتائج.
              </div>
            ) : null}

            <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[820px] text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-muted/40 text-[13px] font-semibold text-muted-foreground">
                    <th className="p-3 text-start">
                      {isTx ? "اسم المرجع" : "اسم الفحص"}
                    </th>
                    <th className="p-3 text-start">
                      {isTx ? "الوصف / التصنيف" : "التصنيف"}
                    </th>
                    <th className="p-3 text-start">
                      {isTx ? "النوع الخارجي" : "النوع"}
                    </th>
                    <th className="p-3 text-start">المدى الطبيعي</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="w-24 p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {testsQuery.isLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        جاري التحميل…
                      </td>
                    </tr>
                  ) : testsQuery.isError ? (
                    <tr>
                      <td colSpan={6} className="p-4">
                        <OfflinePageState
                          title="تعذر تحميل كتالوج الفحوصات"
                          body="تحقق من الاتصال ثم أعد المحاولة."
                          retryLabel="إعادة المحاولة"
                          onRetry={() => void testsQuery.refetch()}
                        />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        لا توجد بيانات مطابقة.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const id = Number(row.id);
                      const active = rowActive(row);
                      const missingRef = !hasMedicalReference(row);
                      return (
                        <tr
                          key={id}
                          className="border-b last:border-0 hover:bg-muted/20"
                        >
                          <td className="p-3">
                            <div className="font-semibold">
                              {String(row.name ?? "")}
                            </div>
                            {String(row.description ?? "").trim() ? (
                              <div className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
                                {String(row.description)}
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {String(row.category ?? "").trim() || "—"}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex rounded-full bg-primary text-primary-foreground">
                              {categoryLabel(String(row.type))}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "p-3 text-xs whitespace-pre-wrap",
                              missingRef
                                ? "bg-warning/100/10 text-warning-text"
                                : "font-medium text-foreground",
                            )}
                          >
                            {rangeDisplay(row)}
                            {missingRef ? (
                              <span className="mt-1 block text-[13px] font-bold">
                                ناقص مدى طبيعي
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
                                active
                                  ? "bg-success/15 text-success"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {active ? "فعال" : "غير فعال"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11"
                                onClick={() => openEdit(row)}
                                title="تعديل"
                                aria-label="تعديل الفحص"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {delConfirm === id ? (
                                <div className="flex items-center gap-1">
                                  <Button variant="bare"
                                    type="button"
                                    aria-label="تأكيد الحذف"
                                    className="rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                                    onClick={() => {
                                      void remove(id);
                                      setDelConfirm(null);
                                    }}
                                  >
                                    تأكيد
                                  </Button>
                                  <Button variant="bare"
                                    type="button"
                                    aria-label="إلغاء الحذف"
                                    className="rounded bg-muted text-muted-foreground hover:bg-border"
                                    onClick={() => setDelConfirm(null)}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <Button variant="bare"
                                  type="button"
                                  aria-label="حذف الفحص"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                  onClick={() => setDelConfirm(id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
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
            <h2 className="mb-4 text-base font-bold">
              {editingId
                ? isTx
                  ? "تعديل مرجع"
                  : "تعديل فحص"
                : isTx
                  ? "إضافة مرجع جديد"
                  : "إضافة فحص جديد"}
            </h2>
            <fieldset
              className="grid gap-3"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <div className="space-y-1">
                <Label>{isTx ? "اسم المرجع" : "اسم الفحص"}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={
                    isTx ? "مثال: K1 أو ضغط العين" : "مثال: K1 أو ضغط العين"
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>{isTx ? "نوع المرجع" : "نوع الفحص"}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as TestType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isTx ? (
                      <>
                        <SelectItem value="lab">تحاليل خارجية</SelectItem>
                        <SelectItem value="imaging">أشعة خارجية</SelectItem>
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
                <Label>{isTx ? "المصدر / التصنيف" : "التصنيف"}</Label>
                <Input aria-label="مثال: بنتاكام، جلوكوما، شبكية"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="مثال: بنتاكام، جلوكوما، شبكية"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="no-normal-range"
                  checked={form.noNormalRange}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      noNormalRange: checked === true,
                    }))
                  }
                />
                <Label htmlFor="no-normal-range">لا ينطبق عليه مدى طبيعي</Label>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label>المديات الطبيعية</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="إضافة مدى طبيعي"
                  title="إضافة مدى طبيعي"
                  disabled={
                    form.noNormalRange || form.referenceRanges.length >= 100
                  }
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      referenceRanges: [
                        ...current.referenceRanges,
                        emptyTestReferenceRange(),
                      ],
                    }))
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {form.referenceRanges.map((range, index) => (
                <fieldset
                  key={index}
                  disabled={form.noNormalRange}
                  className="grid gap-2 rounded-lg border p-3 disabled:opacity-50"
                >
                  <legend className="px-1 text-xs">مدى {index + 1}</legend>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`range-${index}-name`}>
                        اسم القياس / الفئة
                      </Label>
                      <Input
                        id={`range-${index}-name`}
                        value={range.name}
                        onChange={(e) =>
                          updateRange(index, "name", e.target.value)
                        }
                        placeholder="مثال: K1، رجال، سيدات"
                      />
                    </div>
                    {form.referenceRanges.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`حذف مدى ${index + 1}`}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            referenceRanges: current.referenceRanges.filter(
                              (_, i) => i !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor={`range-${index}-min`}>أقل طبيعي</Label>
                      <Input
                        id={`range-${index}-min`}
                        dir="ltr"
                        inputMode="decimal"
                        value={range.min}
                        disabled={Boolean(range.text.trim())}
                        onChange={(e) =>
                          updateRange(index, "min", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`range-${index}-max`}>أعلى طبيعي</Label>
                      <Input
                        id={`range-${index}-max`}
                        dir="ltr"
                        inputMode="decimal"
                        value={range.max}
                        disabled={Boolean(range.text.trim())}
                        onChange={(e) =>
                          updateRange(index, "max", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`range-${index}-unit`}>الوحدة</Label>
                    <Input
                      id={`range-${index}-unit`}
                      value={range.unit}
                      onChange={(e) =>
                        updateRange(index, "unit", e.target.value)
                      }
                      placeholder="D، µm، mmHg، mg/dL…"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`range-${index}-text`}>مرجع نصي بديل</Label>
                    <Input
                      id={`range-${index}-text`}
                      value={range.text}
                      disabled={Boolean(range.min.trim() || range.max.trim())}
                      onChange={(e) =>
                        updateRange(index, "text", e.target.value)
                      }
                      placeholder="مثال: Negative أو أقل من 5"
                    />
                  </div>
                </fieldset>
              ))}
              <p className="text-[13px] text-muted-foreground">
                لكل قياس اسم ومدى ووحدة مستقلة. اترك اسم الفئة فارغًا فقط للمدى
                العام؛ مديات العمر والجنس لا تُطبّق تلقائيًا على كل المرضى.
              </p>

              <div className="space-y-1">
                <Label>الحالة</Label>
                <Select
                  value={form.isActive ? "1" : "0"}
                  onValueChange={(v) =>
                    setForm({ ...form, isActive: v === "1" })
                  }
                >
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
                <Label>{isTx ? "ملاحظات الربط" : "الوصف"}</Label>
                <Textarea aria-label={isTx ? "ملاحظات الربط أو المصدر" : "وصف الفحص"}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder={
                    isTx
                      ? "ملاحظات الربط أو المصدر الخارجي…"
                      : "وصف مختصر للفحص…"
                  }
                  className="min-h-[88px]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  className="flex-1 gap-1 font-semibold"
                  onClick={() => void save()}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  حفظ
                </Button>
                {editingId ? (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء
                  </Button>
                ) : null}
              </div>
            </fieldset>
          </aside>
        </div>
      </div>
    </div>
  );
}
