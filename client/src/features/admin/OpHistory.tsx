import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { History, ListChecks, Plus, RefreshCw } from "lucide-react";
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
import { OP_TYPE_OPTIONS } from "@shared/opTypes";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const SOURCE_LABEL: Record<string, string> = {
  sheet: "شيت",
  surgery: "جراحة",
  followup: "متابعة",
  service_code: "كود خدمة",
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
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
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
    },
    { enabled: Boolean(activeType) },
  );

  const rows = listQuery.data?.rows ?? [];
  const hasMore = rows.length === pageSize;

  const syncMutation = trpc.opHistory.sync.useMutation({
    onSuccess: (data) => {
      const total =
        data.sheets.upserted + data.surgeries.upserted + data.followups.upserted;
      toast.success(
        `تمت المزامنة: ${total} سجل (شيتات ${data.sheets.upserted}، جراحات ${data.surgeries.upserted}، متابعات ${data.followups.upserted})`,
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

  return (
    <div className="w-full space-y-6 pb-4 text-right" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">سجل العمليات</h1>
              <p className="text-sm text-muted-foreground">
                ملخص المرضى حسب نوع العملية — قد تظهر سجلات متكررة من أكثر من مصدر
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 ms-1" />
                {syncMutation.isPending ? "...جاري المزامنة" : "مزامنة الآن"}
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setMappingOpen(true)}
              >
                <ListChecks className="h-4 w-4 ms-1" />
                ربط أكواد الخدمات
              </Button>
            )}
            <Button size="sm" type="button" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 ms-1" />
              إضافة عملية
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {counts.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              لا توجد بيانات — جرّب زر المزامنة
            </span>
          ) : (
            counts.map((c: { operationType: string; count: number }) => (
              <button
                key={c.operationType}
                type="button"
                onClick={() => handleTypeClick(c.operationType)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  activeType === c.operationType
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent"
                }`}
              >
                {c.operationType} <span className="opacity-70">({c.count})</span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {activeType && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-1 min-w-[240px] items-center gap-2"
            >
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="بحث بالاسم أو كود المريض..."
                className="flex-1"
              />
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1 rounded-md border bg-background px-3 text-sm hover:bg-accent"
              >
                بحث
              </button>
            </form>
            <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-40">
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
          </CardContent>

          <CardContent className="p-0">
            {listQuery.isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                ...جاري التحميل
              </div>
            ) : rows.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                لا توجد نتائج
              </div>
            ) : (
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[10%]">كود المريض</TableHead>
                    <TableHead className="w-[20%]">الاسم</TableHead>
                    <TableHead className="w-[12%]">تاريخ العملية</TableHead>
                    <TableHead className="w-[8%]">العين</TableHead>
                    <TableHead className="w-[14%]">الطبيب</TableHead>
                    <TableHead className="w-[10%]">المصدر</TableHead>
                    <TableHead className="w-[16%]">ملاحظات</TableHead>
                    <TableHead className="w-[10%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono truncate">{row.patientCode}</TableCell>
                      <TableCell className="truncate">{row.patientFullName}</TableCell>
                      <TableCell className="truncate">{formatDate(row.operationDate)}</TableCell>
                      <TableCell className="truncate">{row.eye || "—"}</TableCell>
                      <TableCell className="truncate">{row.doctorName || row.doctorCode || "—"}</TableCell>
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
                          onClick={() => setLocation(`/patient-file/${row.patientId}`)}
                        >
                          ملف المريض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>

          <CardContent className="flex items-center justify-between border-t pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              السابق
            </button>
            <span className="text-sm text-muted-foreground">صفحة {page}</span>
            <button
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
            >
              التالي
            </button>
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
      <ServiceCodeMappingDialog open={mappingOpen} onOpenChange={setMappingOpen} />
    </div>
  );
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

  const mappingsQuery = trpc.opHistory.getServiceCodeMappings.useQuery(undefined, {
    enabled: open,
  });
  const unmappedQuery = trpc.opHistory.listUnmappedServiceCodes.useQuery(undefined, {
    enabled: open,
  });

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

  const handleAssign = () => {
    const codes = new Set(selectedCodes);
    const custom = customCode.trim();
    if (custom) codes.add(custom);
    if (codes.size === 0 || !targetType) {
      toast.error("يرجى اختيار كود واحد على الأقل ونوع العملية");
      return;
    }
    assignMutation.mutate(
      { serviceCodes: Array.from(codes), operationType: targetType },
      {
        onSuccess: () => {
          // Pull in any patientServiceEntries rows already using these codes.
          syncMutation.mutate();
        },
      },
    );
  };

  const unmapped = unmappedQuery.data ?? [];
  const mappings = mappingsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ربط أكواد الخدمات بنوع العملية</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">أكواد غير مربوطة (اختر واحد أو أكثر)</label>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
              {unmapped.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  لا توجد أكواد غير مربوطة
                </span>
              ) : (
                unmapped.map((code: string) => (
                  <label key={code} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedCodes.has(code)}
                      onCheckedChange={() => toggleCode(code)}
                    />
                    {code}
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">أو اكتب كود يدويًا</label>
            <Input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="كود الخدمة"
              className="mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">نوع العملية</label>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger className="mt-2">
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
            {assignMutation.isPending ? "...جاري الربط" : "ربط الأكواد المحددة"}
          </Button>

          {mappings.length > 0 && (
            <div>
              <label className="text-sm font-medium">الأكواد المربوطة حاليًا</label>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                {mappings.map((m: { id: number; serviceCode: string; operationType: string }) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span>{m.serviceCode}</span>
                    <Badge variant="secondary">{m.operationType}</Badge>
                  </div>
                ))}
              </div>
            </div>
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
            <label className="text-sm font-medium">نوع العملية</label>
            <Select value={opType} onValueChange={setOpType}>
              <SelectTrigger>
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
              <Input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="اكتب نوع العملية"
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">تاريخ العملية</label>
            <DateInput value={opDate} onChange={(e) => setOpDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ملاحظات</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
