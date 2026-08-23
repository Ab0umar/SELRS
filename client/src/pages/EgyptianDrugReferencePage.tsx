import { useEffect, useMemo, useState } from "react";
import { BookOpen, Link2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ServicesHubNav } from "@/components/shared/ServicesHubNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

type ReferenceMatchRow = {
  medicationId: number;
  currentName: string;
  confidence: string;
  reference: {
    commercialNameEn: string;
    strength: string;
    dosageForm: string;
  };
};

type StockReferenceMatchRow = {
  itemId: number;
  currentName: string;
  currentSupplier: string;
  currentPrice: string | null;
  confidence: string;
  reference: {
    commercialNameEn: string;
    manufacturer: string;
    priceEgp: number | null;
  };
};

export default function EgyptianDrugReferencePage() {
  const [query, setQuery] = useState("");
  const [dosageForm, setDosageForm] = useState("all");
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [showExistingMatches, setShowExistingMatches] = useState(false);
  const [showStockMatches, setShowStockMatches] = useState(false);
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<
    Set<number>
  >(new Set());
  const [selectedStockItemIds, setSelectedStockItemIds] = useState<Set<number>>(
    new Set(),
  );
  const normalizedQuery = query.trim();
  const utils = trpc.useUtils();
  const searchQuery = trpc.medical.searchEgyptianDrugReference.useQuery(
    {
      query: normalizedQuery,
      limit: 40,
      dosageForm: dosageForm === "all" ? undefined : (dosageForm as any),
    },
    {
      enabled: normalizedQuery.length >= 2 || dosageForm !== "all",
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000,
    },
  );
  const addMutation =
    trpc.medical.addEgyptianDrugToPrescriptionCatalog.useMutation({
      onSuccess: async (result) => {
        await utils.medical.getAllMedications.invalidate();
        toast.success(
          result.created
            ? "تمت إضافة الدواء إلى كتالوج الروشتة"
            : "الدواء موجود بالفعل في كتالوج الروشتة",
        );
      },
      onError: (error) => toast.error(error.message),
    });
  const bulkAddMutation =
    trpc.medical.addEgyptianDrugsToPrescriptionCatalog.useMutation({
      onSuccess: async (result) => {
        await utils.medical.getAllMedications.invalidate();
        setSelectedNames(new Set());
        toast.success(
          `تمت إضافة ${result.created} دواء${result.skipped ? `، وتخطي ${result.skipped} موجود مسبقًا` : ""}`,
        );
      },
      onError: (error) => toast.error(error.message),
    });
  const existingMatchesQuery =
    trpc.medical.matchExistingMedicationsWithEgyptianReference.useQuery(
      undefined,
      { enabled: showExistingMatches, refetchOnWindowFocus: false },
    );
  const syncExistingMutation =
    trpc.medical.syncExistingMedicationsWithEgyptianReference.useMutation({
      onSuccess: async (result) => {
        await Promise.all([
          utils.medical.getAllMedications.invalidate(),
          existingMatchesQuery.refetch(),
        ]);
        setSelectedMedicationIds(new Set());
        toast.success(`تم تحديث ${result.updated} دواء من المرجع`);
      },
      onError: (error) => toast.error(error.message),
    });
  const stockMatchesQuery =
    trpc.stockroom.matchEyeDropsWithEgyptianReference.useQuery(undefined, {
      enabled: showStockMatches,
      refetchOnWindowFocus: false,
    });
  const syncStockMutation =
    trpc.stockroom.syncEyeDropsWithEgyptianReference.useMutation({
      onSuccess: async (result) => {
        await Promise.all([
          utils.stockroom.getItems.invalidate(),
          stockMatchesQuery.refetch(),
        ]);
        setSelectedStockItemIds(new Set());
        toast.success(`تم تحديث ${result.updated} صنف في المخزن`);
      },
      onError: (error) => toast.error(error.message),
    });
  const resultItems = searchQuery.data?.items ?? [];
  const allSelected =
    resultItems.length > 0 &&
    resultItems.every((drug) => selectedNames.has(drug.commercialNameEn));
  const selectedCount = useMemo(
    () =>
      resultItems.filter((drug) => selectedNames.has(drug.commercialNameEn))
        .length,
    [resultItems, selectedNames],
  );

  useEffect(() => {
    setSelectedNames(new Set());
  }, [normalizedQuery, dosageForm]);

  const toggleSelectAll = () => {
    setSelectedNames(
      allSelected
        ? new Set()
        : new Set(resultItems.map((drug) => drug.commercialNameEn)),
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      <ServicesHubNav active="drug-reference" />

      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">مرجع الأدوية المصرية</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            بحث مرجعي مستقل. لا يُضاف الدواء إلى كتالوج الروشتة إلا عند الضغط
            على إضافة.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          المصدر محدث: يونيو 2026
        </span>
      </header>

      <div className="grid max-w-4xl gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <Select value={dosageForm} onValueChange={setDosageForm}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue placeholder="اختر النوع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            <SelectItem value="drops">قطرات</SelectItem>
            <SelectItem value="ointment">مرهم</SelectItem>
            <SelectItem value="tablets">أقراص</SelectItem>
            <SelectItem value="capsules">كبسولات</SelectItem>
            <SelectItem value="ampoules">أمبولات وحقن</SelectItem>
            <SelectItem value="solution">محلول</SelectItem>
            <SelectItem value="suspension">معلق</SelectItem>
            <SelectItem value="syrup">شراب</SelectItem>
            <SelectItem value="cream">كريم</SelectItem>
            <SelectItem value="gel">جل</SelectItem>
            <SelectItem value="spray">بخاخ</SelectItem>
            <SelectItem value="suppository">لبوس</SelectItem>
            <SelectItem value="powder">بودرة وأكياس</SelectItem>
            <SelectItem value="inhaler">جهاز استنشاق</SelectItem>
            <SelectItem value="other">أخرى</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو المادة الفعالة أو الشركة..."
            className="h-12 pr-10 text-base"
            autoFocus
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={showExistingMatches ? "default" : "outline"}
          onClick={() => {
            setShowExistingMatches((current) => !current);
            setShowStockMatches(false);
          }}
        >
          <Link2 className="ml-2 h-4 w-4" />
          مطابقة الأدوية الحالية مع المرجع
        </Button>
        <Button
          type="button"
          variant={showStockMatches ? "default" : "outline"}
          onClick={() => {
            setShowStockMatches((current) => !current);
            setShowExistingMatches(false);
          }}
        >
          <Link2 className="ml-2 h-4 w-4" />
          مطابقة قطرات المخزن
        </Button>
      </div>

      {showExistingMatches ? (
        <section className="space-y-3 border-y border-border py-4">
          {existingMatchesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              جاري مطابقة الأدوية الحالية...
            </p>
          ) : existingMatchesQuery.isError ? (
            <p className="text-sm text-destructive">
              {existingMatchesQuery.error.message}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  تم العثور على {existingMatchesQuery.data?.items.length ?? 0}{" "}
                  من أصل {existingMatchesQuery.data?.totalExisting ?? 0} دواء
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const items = existingMatchesQuery.data?.items ?? [];
                      setSelectedMedicationIds(
                        selectedMedicationIds.size === items.length
                          ? new Set()
                          : new Set(
                              items.map(
                                (item: ReferenceMatchRow) => item.medicationId,
                              ),
                            ),
                      );
                    }}
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      !selectedMedicationIds.size ||
                      syncExistingMutation.isPending
                    }
                    onClick={() =>
                      syncExistingMutation.mutate({
                        medicationIds: [...selectedMedicationIds],
                      })
                    }
                  >
                    تحديث المحدد ({selectedMedicationIds.size})
                  </Button>
                </div>
              </div>
              <div className="max-h-[55vh] divide-y divide-border overflow-y-auto border-y border-border">
                {(existingMatchesQuery.data?.items ?? []).map(
                  (item: ReferenceMatchRow) => (
                    <label
                      key={item.medicationId}
                      className="flex cursor-pointer items-start gap-3 py-3"
                    >
                      <Checkbox
                        checked={selectedMedicationIds.has(item.medicationId)}
                        onCheckedChange={(checked) =>
                          setSelectedMedicationIds((current) => {
                            const next = new Set(current);
                            if (checked) next.add(item.medicationId);
                            else next.delete(item.medicationId);
                            return next;
                          })
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold" dir="ltr">
                          {item.currentName}
                        </span>
                        <span className="block text-sm text-primary" dir="ltr">
                          {item.reference.commercialNameEn}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.reference.strength || "تركيز غير محدد"} ·{" "}
                          {DOSAGE_FORM_LABELS[item.reference.dosageForm] ||
                            "أخرى"}{" "}
                          ·{" "}
                          {item.confidence === "exact"
                            ? "مطابقة تامة"
                            : item.confidence === "normalized"
                              ? "مطابقة بعد توحيد الاسم"
                              : item.confidence === "ingredient"
                                ? "مطابقة بالمادة الفعالة"
                                : item.confidence === "suggested"
                                  ? "اقتراح بالاسم - راجعه قبل التحديث"
                                  : "مشتبه فيه - لا تحدده إلا بعد المراجعة"}
                        </span>
                      </span>
                    </label>
                  ),
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      {showStockMatches ? (
        <section className="space-y-3 border-y border-border py-4">
          {stockMatchesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              جاري مطابقة قطرات المخزن...
            </p>
          ) : stockMatchesQuery.isError ? (
            <p className="text-sm text-destructive">
              {stockMatchesQuery.error.message}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  تم العثور على {stockMatchesQuery.data?.items.length ?? 0} من
                  أصل {stockMatchesQuery.data?.totalExisting ?? 0} صنف
                </p>
                <Button
                  type="button"
                  disabled={
                    !selectedStockItemIds.size || syncStockMutation.isPending
                  }
                  onClick={() =>
                    syncStockMutation.mutate({
                      itemIds: [...selectedStockItemIds],
                    })
                  }
                >
                  تحديث المحدد ({selectedStockItemIds.size})
                </Button>
              </div>
              <div className="max-h-[55vh] divide-y divide-border overflow-y-auto border-y border-border">
                {(stockMatchesQuery.data?.items ?? []).map(
                  (item: StockReferenceMatchRow) => (
                    <label
                      key={item.itemId}
                      className="flex cursor-pointer items-start gap-3 py-3"
                    >
                      <Checkbox
                        checked={selectedStockItemIds.has(item.itemId)}
                        onCheckedChange={(checked) =>
                          setSelectedStockItemIds((current) => {
                            const next = new Set(current);
                            if (checked) next.add(item.itemId);
                            else next.delete(item.itemId);
                            return next;
                          })
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold" dir="ltr">
                          {item.currentName}
                        </span>
                        <span className="block text-sm text-primary" dir="ltr">
                          {item.reference.commercialNameEn}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          المورد: {item.currentSupplier || "غير مسجل"} ←{" "}
                          {item.reference.manufacturer || "غير متاح"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          السعر: {item.currentPrice ?? "غير مسجل"} ←{" "}
                          {item.reference.priceEgp ?? "غير متاح"} ج.م ·{" "}
                          {item.confidence === "suspected"
                            ? "مشتبه فيه - راجعه جيدًا"
                            : "راجع البيانات قبل التحديث"}
                        </span>
                      </span>
                    </label>
                  ),
                )}
              </div>
            </>
          )}
        </section>
      ) : null}

      {!showExistingMatches &&
      !showStockMatches &&
      normalizedQuery.length < 2 &&
      dosageForm === "all" ? (
        <div className="border-y border-border py-10 text-center text-sm text-muted-foreground">
          اكتب حرفين على الأقل لبدء البحث.
        </div>
      ) : !showExistingMatches && !showStockMatches && searchQuery.isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          جاري تحميل المرجع والبحث...
        </div>
      ) : !showExistingMatches && !showStockMatches && searchQuery.isError ? (
        <div className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          تعذر تحميل مرجع الأدوية: {searchQuery.error.message}
        </div>
      ) : !showExistingMatches && !showStockMatches ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-muted-foreground">
              {searchQuery.data?.total ?? 0} نتيجة، مع عرض أول{" "}
              {resultItems.length}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={toggleSelectAll}>
                <Checkbox
                  checked={allSelected}
                  className="ml-2"
                  tabIndex={-1}
                />
                {allSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </Button>
              <Button
                type="button"
                disabled={!selectedCount || bulkAddMutation.isPending}
                onClick={() =>
                  bulkAddMutation.mutate({
                    query: normalizedQuery,
                    dosageForm:
                      dosageForm === "all" ? undefined : (dosageForm as any),
                    selectedNames: [...selectedNames],
                  })
                }
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة المحدد للروشتات ({selectedCount})
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {resultItems.map((drug, index) => (
              <article
                key={`${drug.commercialNameEn}-${drug.manufacturer}-${index}`}
                className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Checkbox
                    checked={selectedNames.has(drug.commercialNameEn)}
                    onCheckedChange={(checked) => {
                      setSelectedNames((current) => {
                        const next = new Set(current);
                        if (checked) next.add(drug.commercialNameEn);
                        else next.delete(drug.commercialNameEn);
                        return next;
                      });
                    }}
                    aria-label={`تحديد ${drug.commercialNameEn}`}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="text-base font-bold" dir="ltr">
                        {drug.commercialNameEn}
                      </h2>
                      {drug.commercialNameAr ? (
                        <span className="text-sm text-primary">
                          {drug.commercialNameAr}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-medium" dir="ltr">
                      {drug.scientificName || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-bold text-foreground" dir="ltr">
                        {drug.strength || "تركيز غير محدد"}
                      </span>
                      <span>{drug.manufacturer || "شركة غير محددة"}</span>
                      <span>{drug.drugClass || "تصنيف غير محدد"}</span>
                      <span className="font-semibold text-primary">
                        {DOSAGE_FORM_LABELS[drug.dosageForm] || "أخرى"}
                      </span>
                      <span>{drug.route || "طريقة استخدام غير محددة"}</span>
                      <span>
                        {drug.priceEgp == null
                          ? "السعر غير متاح"
                          : `${drug.priceEgp} ج.م`}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 lg:w-44"
                  disabled={addMutation.isPending}
                  onClick={() => addMutation.mutate(drug)}
                >
                  <Plus className="h-4 w-4" />
                  إضافة للروشتات
                </Button>
              </article>
            ))}
          </div>
        </>
      ) : null}

      <p className="text-xs leading-6 text-muted-foreground">
        المرجع للمساعدة في البحث فقط. الأسماء العربية aliases للبحث والأسعار
        تحتاج تحققًا قبل الاستخدام.
      </p>
    </div>
  );
}

const DOSAGE_FORM_LABELS: Record<string, string> = {
  drops: "قطرات",
  ointment: "مرهم",
  tablets: "أقراص",
  capsules: "كبسولات",
  ampoules: "أمبولات وحقن",
  solution: "محلول",
  suspension: "معلق",
  syrup: "شراب",
  cream: "كريم",
  gel: "جل",
  spray: "بخاخ",
  suppository: "لبوس",
  powder: "بودرة وأكياس",
  inhaler: "جهاز استنشاق",
  other: "أخرى",
};
