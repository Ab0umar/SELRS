/**
 * Current Salary Data Component
 * Displays salary information in two organized tables:
 * 1. Center (المركز) - Employees working at the center
 * 2. Clinic (العيادة) - Employees working at the clinic
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { localISODate } from "@/lib/utils";

interface BasicForm {
  empCd: string;
  basicAmount: string;
  socialAllowance: string;
  costOfLivingAllowance: string;
  transportAllowance: string;
  workNatureAllowance: string;
  receptionAllowance: string;
  yearlyRaise: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
}

const today = localISODate();

const BLANK: BasicForm = {
  empCd: "",
  basicAmount: "",
  socialAllowance: "0",
  costOfLivingAllowance: "0",
  transportAllowance: "0",
  workNatureAllowance: "0",
  receptionAllowance: "0",
  yearlyRaise: "0",
  effectiveFrom: today,
  effectiveTo: "",
  notes: "",
};

function num(v: string) {
  return parseFloat(v) || 0;
}

function fmt(n: number) {
  return Number(n).toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function rowTotal(b: any) {
  return (
    Number(b.basicAmount) +
    Number(b.socialAllowance ?? 0) +
    Number(b.costOfLivingAllowance ?? 0) +
    Number(b.transportAllowance ?? 0) +
    Number(b.workNatureAllowance ?? 0) +
    Number(b.receptionAllowance ?? 0) +
    Number(b.yearlyRaise ?? 0)
  );
}

interface SalaryTableProps {
  title: string;
  subtitle: string;
  data: any[];
  employees: any[];
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
  isPending: boolean;
}

function SalaryTable({
  title,
  subtitle,
  data,
  employees,
  onEdit,
  onDelete,
  isLoading,
  isPending,
}: SalaryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getEmployeeName = (empCd: string) => {
    const emp = employees.find((e) => e.empCd === empCd);
    return emp?.fullName || empCd;
  };

  const totalAmount = data.reduce((sum, item) => sum + rowTotal(item), 0);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">الإجمالي</div>
            <div className="text-2xl font-bold text-primary">
              {fmt(totalAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Table & Cards */}
      {isLoading ? (
        <div className="px-6 py-8 text-center text-muted-foreground">
          جاري التحميل...
        </div>
      ) : data.length === 0 ? (
        <div className="px-6 py-8 text-center text-muted-foreground">
          لا توجد بيانات رواتب مسجلة
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden lg:block" dir="rtl">
            <table dir="rtl" className="w-full text-sm">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    الموظف
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    الراتب الأساسي
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    اعانة اجتماعية
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    علاء معيشة
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    بدل انتقال
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    طبيعة عمل
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    بدل استقبال
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    الزيادة السنوية
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">
                    الإجمالي
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {data.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                      idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {getEmployeeName(item.empCd)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(Number(item.basicAmount))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(Number(item.socialAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(Number(item.costOfLivingAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(Number(item.transportAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(Number(item.workNatureAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(Number(item.receptionAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmt(Number(item.yearlyRaise ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">
                      {fmt(rowTotal(item))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                          disabled={isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `هل تريد حذف راتب ${getEmployeeName(item.empCd)}؟`,
                              )
                            ) {
                              onDelete(item.id);
                            }
                          }}
                          disabled={isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Cards View */}
          <div className="block lg:hidden divide-y divide-border/60">
            {data.map((item) => {
              const isExpanded = !!expandedRows[item.id];
              return (
                <div
                  key={item.id}
                  className="p-4 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRow(item.id)}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground">
                        {getEmployeeName(item.empCd)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        الأساسي: {fmt(Number(item.basicAmount))} ج.م
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">
                          الإجمالي
                        </div>
                        <div className="text-sm font-black text-primary tabular-nums">
                          {fmt(rowTotal(item))} ج.م
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            الأساسي:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.basicAmount))} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            اعانة اجتماعية:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.socialAllowance ?? 0))} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            علاء معيشة:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.costOfLivingAllowance ?? 0))} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            بدل انتقال:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.transportAllowance ?? 0))} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            طبيعة عمل:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.workNatureAllowance ?? 0))} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            بدل استقبال:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.receptionAllowance ?? 0))} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1 col-span-2">
                          <span className="text-muted-foreground">
                            الزيادة السنوية:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.yearlyRaise ?? 0))} ج.م
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(item)}
                          disabled={isPending}
                          className="h-9 px-3 border-border hover:bg-primary/10 text-primary gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>تعديل</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `هل تريد حذف راتب ${getEmployeeName(item.empCd)}؟`,
                              )
                            ) {
                              onDelete(item.id);
                            }
                          }}
                          disabled={isPending}
                          className="h-9 px-3 border-border hover:bg-destructive/10 text-destructive gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          عدد الموظفين:{" "}
          <span className="font-semibold text-foreground">{data.length}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            تحميل
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Shifts Table Component ──────────────────────────────────
interface ShiftsTableProps {
  title: string;
  data: any[];
  employees: any[];
  isLoading: boolean;
}

function ShiftsTable({ title, data, employees, isLoading }: ShiftsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getEmployeeName = (empCd: string) => {
    const emp = employees.find((e) => e.empCd === empCd);
    return emp?.fullName || empCd;
  };

  const TYPE_LABEL: Record<string, string> = { doctor: "طبيب", tech: "فني" };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            عدد كادر الشفتات: {data.length}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 py-10 text-center text-muted-foreground text-xs font-medium">
          جاري التحميل...
        </div>
      ) : data.length === 0 ? (
        <div className="px-6 py-10 text-center text-muted-foreground text-xs font-medium">
          لا توجد كفاءات شفتات مسجلة
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden lg:block" dir="rtl">
            <table dir="rtl" className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-right font-bold w-40">الاسم</th>
                  <th className="px-4 py-3 text-right font-bold">النوع</th>
                  <th className="px-4 py-3 text-right font-bold">قيمة الشفت</th>
                  <th className="px-4 py-3 text-right font-bold">ربط الحضور</th>
                  <th className="px-4 py-3 text-right font-bold">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-border/40 transition-colors hover:bg-muted/30 ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABEL[s.type]}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {fmt(Number(s.ratePerShift))} ج.م
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.empCd ? (
                        getEmployeeName(s.empCd)
                      ) : (
                        <span className="text-[10px] italic text-muted-foreground/50">
                          يدوي
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${s.active ? "bg-success/10 text-success ring-1 ring-success/20" : "bg-muted/40 text-muted-foreground ring-1 ring-border/40"}`}
                      >
                        {s.active ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Cards View */}
          <div className="block lg:hidden divide-y divide-border/60">
            {data.map((s) => {
              const isExpanded = !!expandedRows[s.id];
              return (
                <div
                  key={s.id}
                  className="p-4 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleRow(s.id)}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground">
                        {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        النوع: {TYPE_LABEL[s.type]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase">
                          قيمة الشفت
                        </div>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {fmt(Number(s.ratePerShift))} ج.م
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs">
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            ربط الحضور:
                          </span>
                          <span className="font-semibold">
                            {s.empCd ? (
                              getEmployeeName(s.empCd)
                            ) : (
                              <span className="text-[10px] italic text-muted-foreground/50">
                                يدوي
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">الحالة:</span>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${s.active ? "bg-success/10 text-success ring-1 ring-success/20" : "bg-muted/40 text-muted-foreground ring-1 ring-border/40"}`}
                          >
                            {s.active ? "نشط" : "غير نشط"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function CurrentSalaryData() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BasicForm>(BLANK);
  const [showForm, setShowForm] = useState(false);
  const [centerTab, setCenterTab] = useState<"salaries" | "shifts">("shifts"); // default shifts on right

  const basicsQ = (trpc as any).salary.listBasics.useQuery();
  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const shiftStaffQ = (trpc as any).salary.listShiftStaff.useQuery();

  const basics: any[] = basicsQ.data ?? [];
  const employees: any[] = empsQ.data ?? [];
  const shiftStaff: any[] = shiftStaffQ.data ?? [];

  const deleteMut = (trpc as any).salary.deleteBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // Separate data by location
  const centerSalaries = basics.filter((b) => {
    return b.section === "مركز";
  });

  const clinicSalaries = basics.filter((b) => {
    return b.section === "عيادة";
  });

  // Filter shifts belonging to center (shifts only belong to Center)
  const centerShifts = shiftStaff.filter((s) => {
    if (!s.empCd) return true;
    const emp = employees.find((e) => e.empCd === s.empCd);
    const dept = emp?.department?.toLowerCase().trim();
    return (
      !emp || dept === "مركز" || dept === "center" || dept === "المركز والعيادة"
    );
  });

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({
      empCd: item.empCd,
      basicAmount: String(Number(item.basicAmount)),
      socialAllowance: String(Number(item.socialAllowance ?? 0)),
      costOfLivingAllowance: String(Number(item.costOfLivingAllowance ?? 0)),
      transportAllowance: String(Number(item.transportAllowance ?? 0)),
      workNatureAllowance: String(Number(item.workNatureAllowance ?? 0)),
      receptionAllowance: String(Number(item.receptionAllowance ?? 0)),
      yearlyRaise: String(Number(item.yearlyRaise ?? 0)),
      effectiveFrom: item.effectiveFrom?.split("T")[0] || today,
      effectiveTo: item.effectiveTo?.split("T")[0] || "",
      notes: item.notes ?? "",
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    deleteMut.mutate({ id });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            مسار التحضير
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            بيانات الرواتب الحالية
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            الرواتب والبدلات والشفتات المسجلة حالياً مقسمة حسب موقع العمل
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            تصفية
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              setForm(BLANK);
              setShowForm(!showForm);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة راتب
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingId ? "تعديل الراتب" : "إضافة راتب جديد"}
          </h3>
          <form className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  الموظف
                </label>
                <select className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option>اختر موظفاً</option>
                  {employees.map((emp) => (
                    <option key={emp.empCd} value={emp.empCd}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  الراتب الأساسي
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="gap-2">
                <Plus className="h-4 w-4" />
                حفظ
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tables Container */}
      <div className="space-y-6">
        {/* Center Section */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2 gap-2">
            <h2 className="text-lg font-bold text-foreground">المركز</h2>
            {/* Center Tabs Header - Shifts on the right, Salaries on the left */}
            <div className="flex bg-muted/10 rounded-lg p-0.5 border border-border/60">
              <button
                onClick={() => setCenterTab("shifts")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  centerTab === "shifts"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الشفتات
              </button>
              <button
                onClick={() => setCenterTab("salaries")}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  centerTab === "salaries"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الرواتب
              </button>
            </div>
          </div>

          {centerTab === "salaries" ? (
            <SalaryTable
              title="رواتب موظفي المركز"
              subtitle="الرواتب والبدلات لموظفي المركز"
              data={centerSalaries}
              employees={employees}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={basicsQ.isLoading}
              isPending={deleteMut.isPending}
            />
          ) : (
            <ShiftsTable
              title="طاقم شفتات المركز"
              data={centerShifts}
              employees={employees}
              isLoading={shiftStaffQ.isLoading}
            />
          )}
        </div>

        {/* Clinic Section */}
        <div className="space-y-3 pt-4">
          <div className="border-b border-border pb-2">
            <h2 className="text-lg font-bold text-foreground">العيادة</h2>
          </div>

          <SalaryTable
            title="رواتب موظفي العيادة"
            subtitle="الرواتب والبدلات لموظفي العيادة"
            data={clinicSalaries}
            employees={employees}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={basicsQ.isLoading}
            isPending={deleteMut.isPending}
          />
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">
            إجمالي موظفي الرواتب
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {basics.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">
            إجمالي كادر الشفتات
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {shiftStaff.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">موظفو المركز</div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {centerSalaries.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">موظفو العيادة</div>
          <div className="mt-2 text-2xl font-bold text-secondary">
            {clinicSalaries.length}
          </div>
        </div>
      </div>
    </div>
  );
}
