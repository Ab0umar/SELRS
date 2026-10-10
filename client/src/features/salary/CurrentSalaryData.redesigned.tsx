/**
 * Current Salary Data Component
 * Displays salary information in two organized tables:
 * 1. Center (المركز) - Employees working at the center
 * 2. Clinic (العيادة) - Employees working at the clinic
 */

import { askConfirm } from "../attendance/askConfirm";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { localISODate } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";

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

function dateKeyOf(value: any): string {
  if (!value) return "";
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  return String(value).slice(0, 10);
}

function num(v: string) {
  return parseFloat(v) || 0;
}

function fmt(n: number) {
  return Number(n).toLocaleString("ar-EG", {
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
  isError: boolean;
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
  isError,
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
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="text-start">
            <div className="text-xs text-muted-foreground">الإجمالي</div>
            <div className="text-2xl font-bold text-primary">
              {fmt(totalAmount)}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div
          role="status"
          className="px-6 py-8 text-center text-muted-foreground"
        >
          جاري التحميل...
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="space-y-3 px-6 py-8 text-center text-destructive"
        >
          <p>تعذر تحميل بيانات الرواتب الحالية.</p>
          <p className="text-sm text-muted-foreground">
            أعد المحاولة من زر تحديث البيانات.
          </p>
        </div>
      ) : data.length === 0 ? (
        <div className="px-6 py-8 text-center text-muted-foreground">
          لا توجد بيانات رواتب مسجلة
        </div>
      ) : (
        <>
          <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto hidden xl:block" dir="rtl">
            <table
              aria-label="الرواتب الحالية"
              dir="rtl"
              className="w-full text-sm"
            >
              {/* Table Header */}
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    الموظف
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    الراتب الأساسي
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    اعانة اجتماعية
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    علاوة معيشة
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    بدل انتقال
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    طبيعة عمل
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    بدل استقبال
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    الزيادة السنوية (غير شهرية)
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-semibold text-foreground"
                  >
                    الإجمالي
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center font-semibold text-foreground"
                  >
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
                    <td className="px-4 py-3 text-start tabular-nums">
                      {fmt(Number(item.basicAmount))}
                    </td>
                    <td className="px-4 py-3 text-start tabular-nums">
                      {fmt(Number(item.socialAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-start tabular-nums">
                      {fmt(Number(item.costOfLivingAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-start tabular-nums">
                      {fmt(Number(item.transportAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-start tabular-nums">
                      {fmt(Number(item.workNatureAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-start tabular-nums">
                      {fmt(Number(item.receptionAllowance ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-start tabular-nums">
                      {fmt(Number(item.yearlyRaise ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-start font-bold text-primary tabular-nums">
                      {fmt(rowTotal(item))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                          aria-label={`تعديل راتب ${getEmployeeName(item.empCd)}`}
                          disabled={isPending}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (
                              await askConfirm(
                                `هل تريد حذف راتب ${getEmployeeName(item.empCd)}؟`,
                              )
                            ) {
                              onDelete(item.id);
                            }
                          }}
                          disabled={isPending}
                          aria-label={`حذف راتب ${getEmployeeName(item.empCd)}`}
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

          <div className="block xl:hidden divide-y divide-border/60">
            {data.map((item) => {
              const isExpanded = !!expandedRows[item.id];
              return (
                <div
                  key={item.id}
                  className="p-4 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-controls={`current-salary-details-${item.id}`}
                    aria-label={`${getEmployeeName(item.empCd)}، تفاصيل الراتب`}
                    className="flex min-h-11 items-center justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    onClick={() => toggleRow(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleRow(item.id);
                      }
                    }}
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
                      <div className="text-end">
                        <div className="text-xs font-bold text-muted-foreground ">
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
                    <div
                      id={`current-salary-details-${item.id}`}
                      className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs"
                    >
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
                            علاوة معيشة:
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
                            الزيادة السنوية (غير شهرية):
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
                          onClick={async () => {
                            if (
                              await askConfirm(
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

      <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          عدد الموظفين:{" "}
          <span className="font-semibold text-foreground">{data.length}</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            طباعة / حفظ PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

// Shifts Table Component
interface ShiftsTableProps {
  title: string;
  data: any[];
  employees: any[];
  isLoading: boolean;
  isError: boolean;
}

function ShiftsTable({
  title,
  data,
  employees,
  isLoading,
  isError,
}: ShiftsTableProps) {
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
      <div className="border-b border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <div className="text-start">
          <span className="text-xs text-muted-foreground">
            عدد كادر الشفتات: {data.length}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div
          role="status"
          className="px-6 py-10 text-center text-muted-foreground text-xs font-medium"
        >
          جاري التحميل...
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="px-6 py-10 text-center text-destructive text-xs font-medium"
        >
          تعذر تحميل بيانات الشفتات الحالية. أعد المحاولة من زر تحديث البيانات.
        </div>
      ) : data.length === 0 ? (
        <div className="px-6 py-10 text-center text-muted-foreground text-xs font-medium">
          لا توجد كفاءات شفتات مسجلة
        </div>
      ) : (
        <>
          <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto hidden xl:block" dir="rtl">
            <table
              aria-label="شفتات الفترة"
              dir="rtl"
              className="w-full text-xs"
            >
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th
                    scope="col"
                    className="px-4 py-3 text-start font-bold w-40"
                  >
                    الاسم
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">
                    النوع
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">
                    قيمة الشفت
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">
                    ربط الحضور
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-bold">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-border/40 transition-colors hover:bg-muted/30 ${
                      idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABEL[s.type]}
                    </td>
                    <td className="px-4 py-3 text-start font-semibold tabular-nums">
                      {fmt(Number(s.ratePerShift))} ج.م
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.empCd ? (
                        getEmployeeName(s.empCd)
                      ) : (
                        <span className="text-xs italic text-muted-foreground">
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

          <div className="block xl:hidden divide-y divide-border/60">
            {data.map((s) => {
              const isExpanded = !!expandedRows[s.id];
              return (
                <div
                  key={s.id}
                  className="p-4 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-controls={`current-shift-details-${s.id}`}
                    aria-label={`${s.name}، تفاصيل الشفت`}
                    className="flex min-h-11 items-center justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    onClick={() => toggleRow(s.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleRow(s.id);
                      }
                    }}
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
                      <div className="text-end">
                        <div className="text-xs font-bold text-muted-foreground ">
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
                    <div
                      id={`current-shift-details-${s.id}`}
                      className="mt-4 pt-4 border-t border-border/40 space-y-3 text-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            ربط الحضور:
                          </span>
                          <span className="font-semibold">
                            {s.empCd ? (
                              getEmployeeName(s.empCd)
                            ) : (
                              <span className="text-xs italic text-muted-foreground">
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
  const refreshData = () => {
    void basicsQ.refetch();
    void empsQ.refetch();
    void shiftStaffQ.refetch();
  };

  const deleteMut = (trpc as any).salary.deleteBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("تعذر حذف الراتب الأساسي: " + e.message),
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
      effectiveFrom: dateKeyOf(item.effectiveFrom) || today,
      effectiveTo: dateKeyOf(item.effectiveTo),
      notes: item.notes ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(BLANK);
  };
  const setMut = (trpc as any).salary.setBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      closeForm();
      toast.success("تم الحفظ");
    },
    onError: (e: any) => toast.error("تعذر حفظ الراتب الأساسي: " + e.message),
  });
  const updateMut = (trpc as any).salary.updateBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      closeForm();
      toast.success("تم التعديل");
    },
    onError: (e: any) => toast.error("تعذر تعديل الراتب الأساسي: " + e.message),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      basicAmount: num(form.basicAmount),
      socialAllowance: num(form.socialAllowance),
      costOfLivingAllowance: num(form.costOfLivingAllowance),
      transportAllowance: num(form.transportAllowance),
      workNatureAllowance: num(form.workNatureAllowance),
      receptionAllowance: num(form.receptionAllowance),
      yearlyRaise: num(form.yearlyRaise),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      notes: form.notes,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, ...payload });
      return;
    }
    if (!form.empCd) {
      toast.error("اختر موظفاً");
      return;
    }
    const emp = employees.find((e) => e.empCd === form.empCd);
    // "المركز والعيادة" defaults to the center, like the payroll compute.
    const department = String(emp?.department ?? "");
    const section =
      department.includes("عياد") && !department.includes("مركز")
        ? "عيادة"
        : "مركز";
    setMut.mutate({ empCd: form.empCd, section, ...payload });
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
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            بيانات الرواتب الحالية
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            الرواتب والبدلات والشفتات المسجلة حالياً مقسمة حسب موقع العمل
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={refreshData}>
            <RefreshCw className="h-4 w-4" />
            تحديث البيانات
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
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="current-salary-employee"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  الموظف
                </label>
                <select
                  id="current-salary-employee"
                  value={form.empCd}
                  disabled={!!editingId}
                  onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">اختر موظفاً</option>
                  {employees.map((emp) => (
                    <option key={emp.empCd} value={emp.empCd}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="current-salary-basic"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  الراتب الأساسي
                </label>
                <Input bare
                  id="current-salary-basic"
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={form.basicAmount}
                  onChange={(e) =>
                    setForm({ ...form, basicAmount: e.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="current-salary-effective-from"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  ساري من
                </label>
                <DateInput
                  id="current-salary-effective-from"
                  value={form.effectiveFrom}
                  onChange={(e) =>
                    setForm({ ...form, effectiveFrom: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="gap-2"
                disabled={setMut.isPending || updateMut.isPending}
              >
                <Plus className="h-4 w-4" />
                حفظ
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
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
            <div className="flex bg-muted rounded-xl p-1 w-fit border border-border/60">
              <Button variant="bare"
                type="button"
                role="tab"
                aria-selected={centerTab === "shifts"}
                aria-controls="current-salary-center-panel"
                onClick={() => setCenterTab("shifts")}
                className={`min-h-11 px-4 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  centerTab === "shifts"
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الشفتات
              </Button>
              <Button variant="bare"
                type="button"
                role="tab"
                aria-selected={centerTab === "salaries"}
                aria-controls="current-salary-center-panel"
                onClick={() => setCenterTab("salaries")}
                className={`min-h-11 px-4 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  centerTab === "salaries"
                    ? "bg-background text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                الرواتب
              </Button>
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
              isError={basicsQ.isError || empsQ.isError}
              isPending={deleteMut.isPending}
            />
          ) : (
            <ShiftsTable
              title="طاقم شفتات المركز"
              data={centerShifts}
              employees={employees}
              isLoading={shiftStaffQ.isLoading}
              isError={shiftStaffQ.isError || empsQ.isError}
            />
          )}
        </div>

        {/* Clinic Section */}
        <div className="space-y-3 pt-4">
          <div className="border-b border-border/40 pb-2">
            <h2 className="text-sm font-black text-foreground">العيادة</h2>
          </div>

          <SalaryTable
            title="رواتب موظفي العيادة"
            subtitle="الرواتب والبدلات لموظفي العيادة"
            data={clinicSalaries}
            employees={employees}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={basicsQ.isLoading}
            isError={basicsQ.isError || empsQ.isError}
            isPending={deleteMut.isPending}
          />
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">موظفو المركز</div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {centerSalaries.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">موظفو العيادة</div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {clinicSalaries.length}
          </div>
        </div>
      </div>
    </div>
  );
}
