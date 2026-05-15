import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { ServicesHubNav } from "@/components/shared/ServicesHubNav";
import { SearchBar } from "@/components/shared/SearchBar";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatCard, STAT_CARDS_MOBILE_ROW } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTrpcErrorMessage } from "@/lib/utils";
import { CheckCircle2, Pencil, Pill, Plus, Trash2, XCircle } from "lucide-react";

type MedType = "tablet" | "drops" | "ointment" | "injection" | "suspension" | "other";
type InventoryStatus = "available" | "out_of_stock" | "reserved";

const medFilters = [
  { value: "all", label: "الكل" },
  { value: "available", label: "متوفرة" },
  { value: "out_of_stock", label: "نفذت" },
  { value: "reserved", label: "محجوزة" },
];

function formLabel(type: string | undefined | null): string {
  const m: Record<string, string> = {
    drops: "قطرات",
    tablet: "أقراص",
    ointment: "مرهم",
    injection: "حقن",
    suspension: "معلق",
    other: "أخرى",
  };
  return m[String(type ?? "")] ?? String(type ?? "—");
}

function resolveInventoryStatus(row: Record<string, unknown>): InventoryStatus {
  const explicit = row.inventoryStatus;
  if (explicit === "available" || explicit === "out_of_stock" || explicit === "reserved") return explicit;
  const stockRaw = row.stockPieces;
  if (stockRaw === null || stockRaw === undefined) return "available";
  return Number(stockRaw) > 0 ? "available" : "out_of_stock";
}

function statusBadgeClasses(s: InventoryStatus): string {
  if (s === "available") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  if (s === "reserved") return "bg-amber-100 text-amber-900 dark:bg-amber-950/55 dark:text-amber-200";
  return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300";
}

function statusLabel(s: InventoryStatus): string {
  if (s === "available") return "متوفرة";
  if (s === "reserved") return "محجوزة";
  return "نفذت";
}

export default function MedicationsCatalogPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "tablet" as MedType,
    dosage: "",
    stockPieces: 0 as number,
    inventoryStatus: "available" as InventoryStatus,
  });

  const medsQuery = trpc.medical.getAllMedications.useQuery(undefined, { refetchOnWindowFocus: false });

  const createMutation = trpc.medical.createMedication.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الدواء بنجاح");
      medsQuery.refetch();
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: unknown) => toast.error(getTrpcErrorMessage(e, "فشل في إضافة الدواء")),
  });

  const updateMutation = trpc.medical.updateMedication.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الدواء بنجاح");
      medsQuery.refetch();
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: unknown) => toast.error(getTrpcErrorMessage(e, "فشل في تحديث الدواء")),
  });

  const deleteMutation = trpc.medical.deleteMedication.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الدواء بنجاح");
      medsQuery.refetch();
    },
    onError: (e: unknown) => toast.error(getTrpcErrorMessage(e, "فشل في حذف الدواء")),
  });

  useEffect(() => {
    if (!isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const rows = useMemo(() => ((medsQuery.data ?? []) as Record<string, unknown>[]).map((r) => r), [medsQuery.data]);

  const stats = useMemo(() => {
    const total = rows.length;
    let available = 0;
    let out = 0;
    let reserved = 0;
    for (const row of rows) {
      const s = resolveInventoryStatus(row);
      if (s === "available") available += 1;
      else if (s === "out_of_stock") out += 1;
      else reserved += 1;
    }
    return { total, available, out, reserved };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const status = resolveInventoryStatus(row);
      if (filter === "available" && status !== "available") return false;
      if (filter === "out_of_stock" && status !== "out_of_stock") return false;
      if (filter === "reserved" && status !== "reserved") return false;
      if (!q) return true;
      const name = String(row.name ?? "").toLowerCase();
      const dosage = String(row.dosage ?? row.strength ?? "").toLowerCase();
      return name.includes(q) || dosage.includes(q);
    });
  }, [rows, search, filter]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: "tablet",
      dosage: "",
      stockPieces: 0,
      inventoryStatus: "available",
    });
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingId(Number(row.id));
    setForm({
      name: String(row.name ?? ""),
      type: (String(row.type ?? "tablet") as MedType) || "tablet",
      dosage: String(row.dosage ?? row.strength ?? ""),
      stockPieces: Math.max(0, Number(row.stockPieces ?? 0)),
      inventoryStatus:
        row.inventoryStatus === "reserved"
          ? "reserved"
          : row.inventoryStatus === "out_of_stock"
            ? "out_of_stock"
            : resolveInventoryStatus(row) === "out_of_stock"
              ? "out_of_stock"
              : "available",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("يرجى إدخال اسم الدواء");
      return;
    }
    const dosage = form.dosage.trim();
    if (editingId) {
      await updateMutation.mutateAsync({
        medicationId: editingId,
        updates: {
          name: form.name.trim(),
          type: form.type,
          dosage,
          strength: dosage,
          stockPieces: form.stockPieces,
          inventoryStatus: form.inventoryStatus,
        },
      });
    } else {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        type: form.type,
        dosage,
        strength: dosage,
        stockPieces: form.stockPieces,
        inventoryStatus: form.inventoryStatus,
      });
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف الدواء؟")) return;
    await deleteMutation.mutateAsync({ medicationId: id });
  };

  if (!isAuthenticated) return null;

  const doseLabel = (row: Record<string, unknown>) => String(row.dosage ?? "").trim() || String(row.strength ?? "").trim() || "—";
  const stockLabel = (row: Record<string, unknown>) => {
    const s = row.stockPieces;
    if (s === null || s === undefined) return "—";
    return `${Number(s)} قطعة`;
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-[1200px] px-3 sm:px-4 py-6 sm:py-8" dir="rtl">
        <PageHeader
          title="الأدوية"
          description="إدارة قاعدة بيانات الأدوية"
          icon={<Pill className="h-5 w-5 text-primary" />}
          action={
            <Button type="button" className="gap-1 font-semibold" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              إضافة دواء
            </Button>
          }
        />

        <ServicesHubNav active="medications" className="mb-4" />

        <div className={cn(STAT_CARDS_MOBILE_ROW, "mb-5 gap-2 sm:grid sm:grid-cols-3 sm:gap-4")}>
          <StatCard
            title="إجمالي الأدوية"
            value={stats.total}
            icon={Pill}
            iconColor="bg-primary/10 text-primary"
          />
          <StatCard
            title="متوفرة"
            value={stats.available}
            icon={CheckCircle2}
            iconColor="bg-emerald-500/10 text-emerald-600"
          />
          <StatCard title="نفذت" value={stats.out} icon={XCircle} iconColor="bg-red-500/10 text-red-600" />
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
          <FilterBar filters={medFilters} selected={filter} onSelect={setFilter} className="md:order-2" />
          <SearchBar value={search} onChange={setSearch} placeholder="بحث عن دواء..." className="md:flex-1 md:max-w-md md:order-1" />
        </div>

        <p className="text-[11px] text-muted-foreground mb-4">
          البيانات الكاملة (أمراض، أعراض، استيراد):{" "}
          <Link href="/medications/registry" className="text-primary underline underline-offset-2 font-semibold">
            صفحة السجل المتقدمة
          </Link>
        </p>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]" dir="rtl">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                  <th className="text-right p-3">اسم الدواء</th>
                  <th className="text-right p-3">الشكل الصيدلي</th>
                  <th className="text-right p-3">الجرعة</th>
                  <th className="text-right p-3">المخزون</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="w-24 p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {medsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      جاري التحميل…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      لا توجد أدواء مطابقة.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const id = Number(row.id);
                    const st = resolveInventoryStatus(row);
                    return (
                      <tr key={id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="p-3 font-semibold">{String(row.name ?? "")}</td>
                        <td className="p-3 text-muted-foreground">{formLabel(row.type as string)}</td>
                        <td className="p-3 tabular-nums">{doseLabel(row)}</td>
                        <td className="p-3 tabular-nums">{stockLabel(row)}</td>
                        <td className="p-3">
                          <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusBadgeClasses(st))}>
                            {statusLabel(st)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(row)} title="تعديل">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => remove(id)}
                              title="حذف"
                            >
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
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>{editingId ? "تعديل دواء" : "إضافة دواء"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>اسم الدواء</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الدواء" />
            </div>
            <div className="space-y-1">
              <Label>الشكل الصيدلي</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as MedType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablet">أقراص</SelectItem>
                  <SelectItem value="drops">قطرات</SelectItem>
                  <SelectItem value="ointment">مرهم</SelectItem>
                  <SelectItem value="injection">حقن</SelectItem>
                  <SelectItem value="suspension">معلق</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الجرعة</Label>
              <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="مثال: 25 مجم، 5 مل" />
            </div>
            <div className="space-y-1">
              <Label>المخزون (قطعة)</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                className="text-left"
                value={form.stockPieces}
                onChange={(e) => setForm({ ...form, stockPieces: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label>الحالة</Label>
              <Select value={form.inventoryStatus} onValueChange={(v) => setForm({ ...form, inventoryStatus: v as InventoryStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">متوفرة</SelectItem>
                  <SelectItem value="out_of_stock">نفذت</SelectItem>
                  <SelectItem value="reserved">محجوزة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" onClick={() => void save()} disabled={createMutation.isPending || updateMutation.isPending}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
