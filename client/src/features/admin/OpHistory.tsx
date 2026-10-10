import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { ListChecks, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import PatientPicker from "@/components/PatientPicker";
import { trpc } from "@/lib/trpc";
import { OP_TYPE_OPTIONS, operationTypeLabelAr } from "@shared/opTypes";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const SOURCE_LABEL: Record<string, string> = {
  sheet: "شيت",
  surgery: "جراحة",
  followup: "متابعة",
  service_code: "كود خدمة",
  operation_list: "قائمة العمليات",
  manual: "يدوي",
};

function formatDate(value: unknown): string {
  if (!value) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export default function OpHistory() {
  const { user } = useAuth();
  const isAdmin = String(user?.role ?? "").toLowerCase() === "admin";
  const [, setLocation] = useLocation();

  const [activeType, setActiveType] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<
    "all" | "center" | "external"
  >("all");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [addOpen, setAddOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);

  const utils = trpc.useUtils();

  const countsQuery = trpc.opHistory.getTypeCounts.useQuery();

  const counts = countsQuery.data ?? [];

  useEffect(() => {
    if (!activeType && counts.length > 0) {
      setActiveType(counts[0].operationType);
    }
  }, [activeType, counts]);

  const listQuery = trpc.opHistory.listByType.useQuery(
    {
      operationType: activeType ?? "",
      page,
      pageSize,
      query: query || undefined,
      locationType: locationType === "all" ? undefined : locationType,
    },
    { enabled: Boolean(activeType) },
  );

  const rows = listQuery.data?.rows ?? [];
  const hasMore = rows.length === pageSize;

  const syncMutation = trpc.opHistory.sync.useMutation({
    onSuccess: (data) => {
      const total =
        data.sheets.upserted +
        data.surgeries.upserted +
        data.followups.upserted +
        data.serviceCodes.upserted +
        data.operationLists.upserted;
      const operationListsSkipped = data.operationLists.skipped;
      toast.success(
        `تمت المزامنة: ${total} سجل (قوائم العمليات ${data.operationLists.upserted}، MSSQL والمصادر الأخرى ${total - data.operationLists.upserted}${operationListsSkipped ? `، بدون مريض مطابق ${operationListsSkipped}` : ""})`,
      );
      utils.opHistory.getTypeCounts.invalidate();
      utils.opHistory.listByType.invalidate();
    },
    onError: (error) => {
      toast.error("فشلت المزامنة: " + (error.message || "خطأ غير معروف"));
    },
  });

  const handleTypeClick = (type: string) => {
    setActiveType(type);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setPage(1);
  };

  const handleLocationTypeChange = (value: string) => {
    setLocationType(value as "all" | "center" | "external");
    setPage(1);
  };

  return (
    <div className="w-full space-y-6 pb-4 text-start" dir="rtl">
      <Card className="rounded-lg border-border shadow-none">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap flex-1 items-center gap-2 min-w-[280px]">
              <form
                onSubmit={handleSearchSubmit}
                className="flex min-w-0 flex-1 items-center gap-1.5 sm:min-w-[220px]"
              >
                <div className="relative flex-1">
                  <label htmlFor="op-history-search" className="sr-only">
                    البحث في سجل العمليات
                  </label>
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="op-history-search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="بحث بالاسم أو كود المريض…"
                    className="h-9 ps-9 text-xs sm:text-sm"
                  />
                </div>
                <Button variant="bare"
                  type="submit"
                  className="inline-flex min-h-11 items-center gap-1 rounded-md border bg-background px-3 text-xs font-semibold hover:bg-accent"
                >
                  بحث
                </Button>
              </form>

              <Select
                value={locationType}
                onValueChange={handleLocationTypeChange}
              >
                <SelectTrigger
                  aria-label="تصفية حسب مكان العملية"
                  className="h-9 w-28 text-xs sm:w-32"
                >
                  <SelectValue placeholder="المكان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل (مركز وخارجي)</SelectItem>
                  <SelectItem value="center">مركز</SelectItem>
                  <SelectItem value="external">خارجي</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={String(pageSize)}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger
                  aria-label="عدد العمليات في الصفحة"
                  className="h-9 w-24 text-xs sm:w-28"
                >
                  <SelectValue placeholder="عدد النتائج" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / صفحة
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="min-h-11 text-xs gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>
                    {syncMutation.isPending
                      ? "...جاري المزامنة"
                      : "مزامنة الآن"}
                  </span>
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setMappingOpen(true)}
                  className="min-h-11 text-xs gap-1"
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>ربط أكواد الخدمات</span>
                </Button>
              )}
              <Button
                size="sm"
                type="button"
                onClick={() => setAddOpen(true)}
                className="min-h-11 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة عملية</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
            {countsQuery.isLoading ? (
              <span
                className="py-1 text-xs text-muted-foreground"
                role="status"
              >
                جاري تحميل أنواع العمليات…
              </span>
            ) : countsQuery.error ? (
              <div className="flex flex-wrap items-center gap-2" role="alert">
                <span className="py-1 text-xs text-destructive">
                  تعذر تحميل أنواع العمليات: {countsQuery.error.message}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => countsQuery.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : counts.length === 0 ? (
              <span className="text-xs text-muted-foreground py-1">
                لا توجد سجلات عمليات متاحة
              </span>
            ) : (
              counts.map((c: { operationType: string; count: number }) => (
                <Button variant="bare"
                  key={c.operationType}
                  type="button"
                  aria-pressed={activeType === c.operationType}
                  onClick={() => handleTypeClick(c.operationType)}
                  className={`min-h-11 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    activeType === c.operationType
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 hover:bg-accent border-border/80 text-foreground"
                  }`}
                >
                  {operationTypeLabelAr(c.operationType)}{" "}
                  <span className="opacity-75 tabular-nums">({c.count})</span>
                </Button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {activeType && (
        <Card className="rounded-lg border-border shadow-none overflow-hidden">
          <CardContent className="p-0">
            {listQuery.isLoading ? (
              <div
                className="p-6 text-center text-sm text-muted-foreground"
                role="status"
              >
                جارٍ تحميل السجلات…
              </div>
            ) : listQuery.error ? (
              <div
                className="flex flex-col items-center gap-3 p-6 text-center text-sm text-destructive"
                role="alert"
              >
                <span>
                  تعذر تحميل سجلات نوع العملية: {listQuery.error.message}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => listQuery.refetch()}
                >
                  إعادة المحاولة
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {query || locationType !== "all"
                  ? "لا توجد سجلات مطابقة للمرشحات"
                  : "لا توجد سجلات لهذا النوع من العمليات"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[900px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[9%]">كود المريض</TableHead>
                      <TableHead className="w-[16%]">الاسم</TableHead>
                      <TableHead className="w-[14%]">اسم العملية</TableHead>
                      <TableHead className="w-[10%]">تاريخ العملية</TableHead>
                      <TableHead className="w-[7%]">العين</TableHead>
                      <TableHead className="w-[12%]">الطبيب</TableHead>
                      <TableHead className="w-[9%]">المصدر</TableHead>
                      <TableHead className="w-[13%]">ملاحظات</TableHead>
                      <TableHead className="w-[10%]">الإجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row: any) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono truncate">
                          {row.patientCode}
                        </TableCell>
                        <TableCell className="truncate">
                          {row.patientFullName}
                        </TableCell>
                        <TableCell className="truncate">
                          {operationTypeLabelAr(row.operationType)}
                        </TableCell>
                        <TableCell className="truncate">
                          {formatDate(row.operationDate)}
                        </TableCell>
                        <TableCell className="truncate">
                          {row.eye || "—"}
                        </TableCell>
                        <TableCell className="truncate">
                          {row.doctorName || row.doctorCode || "—"}
                        </TableCell>
                        <TableCell className="truncate">
                          <Badge variant="secondary">
                            {SOURCE_LABEL[row.source] ?? row.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="truncate">
                          {row.notes || "—"}
                        </TableCell>
                        <TableCell className="truncate">
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() =>
                              setLocation(`/patient-file/${row.patientId}`)
                            }
                          >
                            ملف المريض
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <CardContent className="flex items-center justify-between gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-11"
            >
              السابق
            </Button>
            <span
              className="text-center text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {listQuery.isFetching ? "جاري تحديث النتائج…" : `صفحة ${page}`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasMore || listQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="min-h-11"
            >
              التالي
            </Button>
          </CardContent>
        </Card>
      )}

      <AddOperationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          utils.opHistory.getTypeCounts.invalidate();
          utils.opHistory.listByType.invalidate();
        }}
      />
      <ServiceCodeMappingDialog
        open={mappingOpen}
        onOpenChange={setMappingOpen}
      />
    </div>
  );
}

// Keyword rules against the SRVCMF Arabic service name, given by the
// clinic: "سطحي" -> PRK, "تصحيح" -> Lasik, "ميتال هيد" -> Lasik (mechanical
// microkeratome, not femto). "فيمتو" alone is genuinely ambiguous between
// F.S and F.L (both are femto-based) — flagged for a human to pick rather
// than guessed, per OP_TYPE_ALIASES' own FL="فيمتو ليزك"/FS="فيمتو سمايل"
// split. cataract/IOL/ICL have no service codes yet, so no rule for them.
function suggestOperationTypeFromServiceName(
  serviceName: string,
): { type: "PRK" | "Lasik"; reason: string } | { type: "femto" } | null {
  const name = serviceName.trim();
  if (!name) return null;
  if (name.includes("سطحي")) return { type: "PRK", reason: "سطحي" };
  if (name.includes("ميتال")) return { type: "Lasik", reason: "ميتال هيد" };
  if (name.includes("تصحيح")) return { type: "Lasik", reason: "تصحيح" };
  if (name.includes("فيمتو")) return { type: "femto" };
  return null;
}

function ServiceCodeMappingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [customCode, setCustomCode] = useState("");
  const [targetType, setTargetType] = useState("");

  const mappingsQuery = trpc.opHistory.getServiceCodeMappings.useQuery(
    undefined,
    {
      enabled: open,
    },
  );
  const unmappedQuery = trpc.opHistory.listUnmappedServiceCodes.useQuery(
    undefined,
    {
      enabled: open,
    },
  );

  const assignMutation = trpc.opHistory.upsertServiceCodeMapping.useMutation({
    onSuccess: (data) => {
      toast.success(`تم ربط ${data.count} كود بنجاح`);
      setSelectedCodes(new Set());
      setCustomCode("");
      setTargetType("");
      utils.opHistory.getServiceCodeMappings.invalidate();
      utils.opHistory.listUnmappedServiceCodes.invalidate();
      utils.opHistory.getTypeCounts.invalidate();
    },
    onError: (error) => {
      toast.error("فشل الربط: " + (error.message || "خطأ غير معروف"));
    },
  });

  const syncMutation = trpc.opHistory.sync.useMutation({
    onSuccess: () => {
      utils.opHistory.getTypeCounts.invalidate();
      utils.opHistory.listByType.invalidate();
    },
  });

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const unmapped: { serviceCode: string; serviceName: string }[] =
    unmappedQuery.data ?? [];
  const mappings = mappingsQuery.data ?? [];
  const mappingIsLoading = mappingsQuery.isLoading || unmappedQuery.isLoading;
  const mappingError = mappingsQuery.error ?? unmappedQuery.error;

  const suggestions = unmapped
    .map((u) => ({
      ...u,
      suggestion: suggestOperationTypeFromServiceName(u.serviceName),
    }))
    .filter(
      (
        u,
      ): u is typeof u & {
        suggestion: { type: "PRK" | "Lasik"; reason: string };
      } => u.suggestion != null && u.suggestion.type !== "femto",
    );
  const femtoAmbiguous = unmapped.filter(
    (u) => suggestOperationTypeFromServiceName(u.serviceName)?.type === "femto",
  );

  const applySuggestionsMutation =
    trpc.opHistory.upsertServiceCodeMapping.useMutation({
      onSuccess: (data) => {
        toast.success(`تم ربط ${data.count} كود تلقائيًا حسب القواعد`);
        utils.opHistory.getServiceCodeMappings.invalidate();
        utils.opHistory.listUnmappedServiceCodes.invalidate();
        utils.opHistory.getTypeCounts.invalidate();
      },
      onError: (error) => {
        toast.error(
          "فشل التطبيق التلقائي: " + (error.message || "خطأ غير معروف"),
        );
      },
    });

  const applyAllSuggestions = () => {
    if (suggestions.length === 0) return;
    const operationTypes: Record<string, string> = {};
    const labels: Record<string, string> = {};
    for (const s of suggestions) {
      operationTypes[s.serviceCode] = s.suggestion.type;
      if (s.serviceName) labels[s.serviceCode] = s.serviceName;
    }
    applySuggestionsMutation.mutate(
      {
        serviceCodes: suggestions.map((s) => s.serviceCode),
        // Required by the schema but overridden per-code by operationTypes below.
        operationType: suggestions[0].suggestion.type,
        operationTypes,
        labels,
      },
      {
        onSuccess: () => syncMutation.mutate(),
      },
    );
  };

  const handleAssign = () => {
    const codes = new Set(selectedCodes);
    const custom = customCode.trim();
    if (custom) codes.add(custom);
    if (codes.size === 0 || !targetType) {
      toast.error("يرجى اختيار كود واحد على الأقل ونوع العملية");
      return;
    }
    // Each code keeps its own real operation name (resolved from MSSQL)
    // instead of every code in a multi-select batch sharing one label.
    const labels: Record<string, string> = {};
    for (const code of codes) {
      const name = unmapped.find((u) => u.serviceCode === code)?.serviceName;
      if (name) labels[code] = name;
    }
    assignMutation.mutate(
      {
        serviceCodes: Array.from(codes),
        operationType: targetType,
        labels,
      },
      {
        onSuccess: () => {
          // Pull in any patientServiceEntries rows already using these codes.
          syncMutation.mutate();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ربط أكواد الخدمات بنوع العملية</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mappingIsLoading ? (
            <div
              className="p-4 text-center text-sm text-muted-foreground"
              role="status"
            >
              جارٍ تحميل أكواد الخدمات…
            </div>
          ) : mappingError ? (
            <div
              className="flex flex-col items-center gap-3 p-4 text-center text-sm text-destructive"
              role="alert"
            >
              تعذر تحميل أكواد الخدمات.
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void mappingsQuery.refetch();
                  void unmappedQuery.refetch();
                }}
              >
                إعادة المحاولة
              </Button>
            </div>
          ) : (
            <>
              {suggestions.length > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
                  <span>
                    فيه {suggestions.length} كود ينطبق عليهم قواعد تلقائية (سطحي
                    ← PRK، تصحيح/ميتال هيد ← Lasik)
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyAllSuggestions}
                    disabled={applySuggestionsMutation.isPending}
                  >
                    {applySuggestionsMutation.isPending
                      ? "...جاري التطبيق"
                      : "طبّق كل الاقتراحات"}
                  </Button>
                </div>
              )}
              {femtoAmbiguous.length > 0 && (
                <div className="rounded-md border border-amber-400/40 bg-amber-50 p-2 text-sm text-amber-800">
                  فيه {femtoAmbiguous.length} كود فيمتو محتاج اختيار يدوي بين
                  F.S و F.L (مش واضح من الاسم أي نوع بالظبط):{" "}
                  {femtoAmbiguous.map((u) => u.serviceCode).join("، ")}
                </div>
              )}
              <div>
                <label
                  id="unmapped-service-codes-label"
                  className="text-sm font-medium"
                >
                  أكواد غير مربوطة (اختر واحد أو أكثر)
                </label>
                <div
                  aria-labelledby="unmapped-service-codes-label"
                  className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2 space-y-1"
                >
                  {unmapped.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      لا توجد أكواد غير مربوطة
                    </span>
                  ) : (
                    unmapped.map(({ serviceCode, serviceName }) => {
                      const suggestion =
                        suggestOperationTypeFromServiceName(serviceName);
                      return (
                        <label
                          key={serviceCode}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedCodes.has(serviceCode)}
                            onCheckedChange={() => toggleCode(serviceCode)}
                          />
                          <span className="font-medium">{serviceCode}</span>
                          {serviceName ? (
                            <span className="text-muted-foreground">
                              — {serviceName}
                            </span>
                          ) : null}
                          {suggestion && suggestion.type !== "femto" ? (
                            <Badge variant="outline" className="text-[13px]">
                              {suggestion.type}
                            </Badge>
                          ) : suggestion?.type === "femto" ? (
                            <Badge
                              variant="outline"
                              className="border-amber-400 text-[13px] text-amber-700"
                            >
                              فيمتو؟
                            </Badge>
                          ) : null}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="custom-service-code"
                  className="text-sm font-medium"
                >
                  أو اكتب كود يدويًا
                </label>
                <Input
                  id="custom-service-code"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="كود الخدمة"
                  className="mt-2"
                />
              </div>
              <div>
                <label
                  htmlFor="mapping-operation-type"
                  className="text-sm font-medium"
                >
                  نوع العملية
                </label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger id="mapping-operation-type" className="mt-2">
                    <SelectValue placeholder="اختر نوع العملية" />
                  </SelectTrigger>
                  <SelectContent>
                    {OP_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                onClick={handleAssign}
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending
                  ? "...جاري الربط"
                  : "ربط الأكواد المحددة"}
              </Button>

              {mappings.length > 0 && (
                <div>
                  <label className="text-sm font-medium">
                    الأكواد المربوطة حاليًا
                  </label>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                    {mappings.map(
                      (m: {
                        id: number;
                        serviceCode: string;
                        operationType: string;
                        label?: string | null;
                      }) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {m.serviceCode}
                            {m.label ? (
                              <span className="text-muted-foreground">
                                {" "}
                                — {m.label}
                              </span>
                            ) : null}
                          </span>
                          <Badge variant="secondary">{m.operationType}</Badge>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddOperationDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [patientId, setPatientId] = useState<number | null>(null);
  const [opType, setOpType] = useState<string>("");
  const [customType, setCustomType] = useState("");
  const [opDate, setOpDate] = useState("");
  const [notes, setNotes] = useState("");

  const addMutation = trpc.opHistory.addManual.useMutation({
    onSuccess: () => {
      toast.success("تمت الإضافة");
      onAdded();
      onOpenChange(false);
      setPatientId(null);
      setOpType("");
      setCustomType("");
      setOpDate("");
      setNotes("");
    },
    onError: (error) => {
      toast.error("فشلت الإضافة: " + (error.message || "خطأ غير معروف"));
    },
  });

  const resolvedType = opType === "Others" ? customType.trim() : opType;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !resolvedType) {
      toast.error("يرجى اختيار المريض ونوع العملية");
      return;
    }
    addMutation.mutate({
      patientId,
      operationType: resolvedType,
      operationDate: opDate || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة عملية</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PatientPicker
            label="المريض"
            onSelect={(patient) => setPatientId(patient.id)}
          />
          <div className="space-y-2">
            <label htmlFor="add-operation-type" className="text-sm font-medium">
              نوع العملية
            </label>
            <Select value={opType} onValueChange={setOpType}>
              <SelectTrigger id="add-operation-type">
                <SelectValue placeholder="اختر نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                {OP_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {opType === "Others" && (
              <div>
                <label htmlFor="custom-operation-type" className="sr-only">
                  نوع العملية المخصص
                </label>
                <Input
                  id="custom-operation-type"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="اكتب نوع العملية"
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="operation-date" className="text-sm font-medium">
              تاريخ العملية
            </label>
            <DateInput
              id="operation-date"
              value={opDate}
              onChange={(e) => setOpDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="operation-notes" className="text-sm font-medium">
              ملاحظات
            </label>
            <Textarea
              id="operation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "...جاري الحفظ" : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
