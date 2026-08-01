import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { localISODate } from "@/lib/utils";
import { DateInput } from "@/components/ui/date-input";

const today = localISODate();

interface BasicForm {
  empCd: string;
  section: "مركز" | "عيادة";
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

  // Shift staff fields
  shiftName: string;
  shiftType: "doctor" | "tech";
  ratePerShift: string;
  shiftActive: boolean;
  userId: string;
}

const BLANK: BasicForm = {
  empCd: "",
  section: "مركز",
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

  shiftName: "",
  shiftType: "doctor",
  ratePerShift: "",
  shiftActive: true,
  userId: "",
};

const FIELDS: { key: keyof BasicForm; label: string }[] = [
  { key: "basicAmount", label: "الراتب الأساسي" },
  { key: "socialAllowance", label: "إعانة اجتماعية" },
  { key: "costOfLivingAllowance", label: "بدل غلاء معيشة" },
  { key: "transportAllowance", label: "بدل انتقال" },
  { key: "workNatureAllowance", label: "طبيعة عمل" },
  { key: "receptionAllowance", label: "بدل استقبال" },
  { key: "yearlyRaise", label: "الزيادة السنوية" },
];

function num(v: string) {
  return parseFloat(v) || 0;
}
function fmtDate(v: any): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return String(v).split("T")[0];
  return localISODate(d);
}
function totalOf(f: BasicForm) {
  return FIELDS.reduce((s, { key }) => s + num((f as any)[key]), 0);
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

function fmt(n: number) {
  return Number(n).toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

// ── Salary Table Component ─────────────────────────────────
interface SalaryTableProps {
  title: string;
  data: any[];
  employees: any[];
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}

function SalaryTable({
  title,
  data,
  employees,
  onEdit,
  onDelete,
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
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      {/* Header */}
      <div className="border-b border-border bg-muted/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            إجمالي الرواتب
          </div>
          <div className="text-lg font-black text-primary tabular-nums">
            {fmt(totalAmount)}{" "}
            <span className="text-xs font-semibold text-muted-foreground">
              ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Table & Cards */}
      {data.length === 0 ? (
        <div className="px-6 py-10 text-center text-muted-foreground text-xs font-medium">
          لا توجد بيانات رواتب مسجلة مطابقة للبحث
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden lg:block" dir="rtl">
            <table dir="rtl" className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-primary/8 text-foreground font-bold">
                  <th className="px-4 py-3 text-right font-bold w-40">
                    الموظف
                  </th>
                  <th className="px-4 py-3 text-right font-bold">
                    الراتب الأساسي
                  </th>
                  <th className="px-4 py-3 text-right font-bold">
                    إعانة اجتماعية
                  </th>
                  <th className="px-4 py-3 text-right font-bold">
                    بدل غلاء معيشة
                  </th>
                  <th className="px-4 py-3 text-right font-bold">بدل انتقال</th>
                  <th className="px-4 py-3 text-right font-bold">طبيعة عمل</th>
                  <th className="px-4 py-3 text-right font-bold">
                    بدل استقبال
                  </th>
                  <th className="px-4 py-3 text-right font-bold">
                    الزيادة السنوية
                  </th>
                  <th className="px-4 py-3 text-right font-bold">الإجمالي</th>
                  <th className="px-4 py-3 text-center font-bold w-20">
                    الإجراءات
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/40 transition-colors hover:bg-primary/10 ${
                      idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
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
                          className="h-8 w-8 p-0 hover:bg-primary/10"
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
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
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
                            إعانة اجتماعية:
                          </span>
                          <span className="font-semibold tabular-nums">
                            {fmt(Number(item.socialAllowance ?? 0))} ج.م
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border/20 pb-1">
                          <span className="text-muted-foreground">
                            بدل غلاء معيشة:
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
      <div className="border-t border-border bg-muted/30 px-6 py-3">
        <div className="text-xs text-muted-foreground">
          عدد الموظفين:{" "}
          <span className="font-semibold text-foreground">{data.length}</span>
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
  onEdit: (item: any) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}

function ShiftsTable({
  title,
  data,
  employees,
  onEdit,
  onDelete,
  isPending,
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
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
      <div className="border-b border-border bg-muted/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            عدد كادر الشفتات: {data.length}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="px-6 py-10 text-center text-muted-foreground text-xs font-medium">
          لا توجد كفاءات شفتات مسجلة مطابقة للبحث
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden lg:block" dir="rtl">
            <table dir="rtl" className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-primary/8 text-foreground font-bold">
                  <th className="px-4 py-3 text-right font-bold w-40">الاسم</th>
                  <th className="px-4 py-3 text-right font-bold">النوع</th>
                  <th className="px-4 py-3 text-right font-bold">قيمة الشفت</th>
                  <th className="px-4 py-3 text-right font-bold">ربط الحضور</th>
                  <th className="px-4 py-3 text-right font-bold">الحالة</th>
                  <th className="px-4 py-3 text-center font-bold w-20">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-border/40 transition-colors hover:bg-primary/10 ${
                      idx % 2 === 0 ? "bg-card" : "bg-muted/10"
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
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(s)}
                          disabled={isPending}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`هل تريد حذف عضو الشفت ${s.name}؟`)) {
                              onDelete(s.id);
                            }
                          }}
                          disabled={isPending}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
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

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(s)}
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
                            if (confirm(`هل تريد حذف عضو الشفت ${s.name}؟`)) {
                              onDelete(s.id);
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
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SalaryBasics() {
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"salary" | "shift">("salary");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [form, setForm] = useState<BasicForm>(BLANK);
  const [searchQuery, setSearchQuery] = useState("");

  // Tabs status for Center
  const [centerTab, setCenterTab] = useState<"salaries" | "shifts">("salaries");

  const empsQ = (trpc as any).salary.listEmployees.useQuery();
  const basicsQ = (trpc as any).salary.listBasics.useQuery();
  const shiftStaffQ = (trpc as any).salary.listShiftStaff.useQuery();
  const usersQ = (trpc as any).salary.listUsersForShiftLink.useQuery();

  const basics: any[] = basicsQ.data ?? [];
  const employees: any[] = empsQ.data ?? [];
  const shiftStaff: any[] = shiftStaffQ.data ?? [];
  const usersList: any[] = usersQ.data ?? [];

  // Salary Mutations
  const setMut = (trpc as any).salary.setBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      setShowForm(false);
      setForm(BLANK);
      toast.success("تم الحفظ");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const updateMut = (trpc as any).salary.updateBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      setShowForm(false);
      setEditingId(null);
      setForm(BLANK);
      toast.success("تم التعديل");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const deleteMut = (trpc as any).salary.deleteBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // Shift Staff Mutations
  const addShiftMut = (trpc as any).salary.addShiftStaff.useMutation({
    onSuccess: () => {
      shiftStaffQ.refetch();
      setShowForm(false);
      setForm(BLANK);
      toast.success("تم إضافة عضو الشفت");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const updateShiftMut = (trpc as any).salary.updateShiftStaff.useMutation({
    onSuccess: () => {
      shiftStaffQ.refetch();
      setShowForm(false);
      setEditingShiftId(null);
      setForm(BLANK);
      toast.success("تم حفظ تعديل عضو الشفت");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });
  const deleteShiftMut = (trpc as any).salary.deleteShiftStaff.useMutation({
    onSuccess: () => {
      shiftStaffQ.refetch();
      toast.success("تم حذف عضو الشفت");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const getEmployeeName = (empCd: string) => {
    const emp = employees.find((e) => e.empCd === empCd);
    return emp?.fullName || empCd;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formType === "salary") {
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
        section: form.section,
      };
      if (editingId) {
        updateMut.mutate({ id: editingId, ...payload });
      } else {
        if (!form.empCd) {
          toast.error("اختر موظفاً");
          return;
        }
        setMut.mutate({ empCd: form.empCd, ...payload });
      }
    } else {
      const rate = parseFloat(form.ratePerShift);
      if (!form.shiftName.trim() || isNaN(rate)) {
        toast.error("يرجى إدخال اسم وقيمة شفت صحيحة");
        return;
      }
      const payload = {
        name: form.shiftName.trim(),
        type: form.shiftType,
        ratePerShift: rate,
        empCd: form.empCd || undefined,
        userId: form.userId ? parseInt(form.userId) : null,
      };
      if (editingShiftId) {
        updateShiftMut.mutate({
          id: editingShiftId,
          ...payload,
          active: form.shiftActive,
        });
      } else {
        addShiftMut.mutate(payload);
      }
    }
  };

  const handleEdit = (b: any) => {
    setFormType("salary");
    setEditingId(b.id);
    setEditingShiftId(null);
    setForm({
      ...BLANK,
      empCd: b.empCd,
      section: b.section ?? "مركز",
      basicAmount: String(Number(b.basicAmount)),
      socialAllowance: String(Number(b.socialAllowance ?? 0)),
      costOfLivingAllowance: String(Number(b.costOfLivingAllowance ?? 0)),
      transportAllowance: String(Number(b.transportAllowance ?? 0)),
      workNatureAllowance: String(Number(b.workNatureAllowance ?? 0)),
      receptionAllowance: String(Number(b.receptionAllowance ?? 0)),
      yearlyRaise: String(Number(b.yearlyRaise ?? 0)),
      effectiveFrom: fmtDate(b.effectiveFrom) || today,
      effectiveTo: fmtDate(b.effectiveTo),
      notes: b.notes ?? "",
    });
    setShowForm(true);
  };

  const handleEditShift = (s: any) => {
    setFormType("shift");
    setEditingId(null);
    setEditingShiftId(s.id);
    setForm({
      ...BLANK,
      shiftName: s.name,
      shiftType: s.type,
      ratePerShift: String(s.ratePerShift),
      shiftActive: s.active,
      empCd: s.empCd ?? "",
      userId: s.userId ? String(s.userId) : "",
    });
    setShowForm(true);
  };

  // Filter list of basics by search query
  const filteredBasics = basics.filter((b) => {
    const empName = getEmployeeName(b.empCd).toLowerCase();
    const empCd = String(b.empCd).toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return empName.includes(query) || empCd.includes(query);
  });

  // Filter list of shift staff by search query
  const filteredShifts = shiftStaff.filter((s) => {
    const empName = (s.name || "").toLowerCase();
    const linkedEmpName = s.empCd ? getEmployeeName(s.empCd).toLowerCase() : "";
    const empCd = String(s.empCd || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return (
      empName.includes(query) ||
      linkedEmpName.includes(query) ||
      empCd.includes(query)
    );
  });

  // Center basic salaries & shifts
  const centerSalaries = filteredBasics.filter((b) => {
    return b.section === "مركز";
  });

  const centerShifts = filteredShifts.filter((s) => {
    if (!s.empCd) return true; // Default manual shifts to Center
    const emp = employees.find((e) => e.empCd === s.empCd);
    const dept = emp?.department?.toLowerCase().trim();
    return dept === "مركز" || dept === "center" || dept === "المركز والعيادة";
  });

  // Clinic basic salaries & shifts
  const clinicSalaries = filteredBasics.filter((b) => {
    return b.section === "عيادة";
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            مسار التحضير
          </p>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl mt-0.5">
            بيانات الرواتب الأساسية
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الرواتب والبدلات والزيادات التي يعتمد عليها كشف الشهر
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Real-time search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-64 rounded-lg border border-border bg-background pr-10 pl-4 text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Button
            onClick={() => {
              setEditingId(null);
              setEditingShiftId(null);
              setFormType("salary");
              setForm(BLANK);
              setShowForm(true);
            }}
            className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10 px-4 rounded-lg shadow-sm font-semibold transition-all"
          >
            <Plus className="h-4 w-4" />
            إضافة راتب أساسي
          </Button>

          <Button
            onClick={() => {
              setEditingId(null);
              setEditingShiftId(null);
              setFormType("shift");
              setForm(BLANK);
              setShowForm(true);
            }}
            className="gap-2 bg-primary text-white hover:bg-primary/90 h-10 px-4 rounded-lg shadow-sm font-semibold transition-all"
          >
            <Plus className="h-4 w-4" />
            إضافة عضو شفت
          </Button>
        </div>
      </div>

      {/* Slide-Over Side Drawer Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop Overlay */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setEditingShiftId(null);
              }}
            />
            {/* Drawer Panel */}
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pl-10 sm:pl-16">
              <div className="pointer-events-auto w-screen max-w-md transform bg-card shadow-2xl transition-transform duration-300 ease-in-out border-r border-border flex flex-col">
                {/* Header */}
                <div className="border-b border-border bg-muted/50 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground">
                    {editingId || editingShiftId
                      ? editingId
                        ? `تعديل راتب: ${getEmployeeName(form.empCd)}`
                        : `تعديل عضو الشفت: ${form.shiftName}`
                      : formType === "salary"
                        ? "إضافة راتب أساسي جديد"
                        : "إضافة عضو شفت جديد"}
                  </h3>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setEditingShiftId(null);
                    }}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Form Body (Scrollable) */}
                <form
                  onSubmit={handleSubmit}
                  className="flex-1 overflow-y-auto p-6 space-y-5"
                >
                  {/* Form Type Selector (Only visible when creating new items) */}
                  {!editingId && !editingShiftId && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-foreground">
                        نوع البيانات
                      </label>
                      <div className="grid grid-cols-2 p-1 bg-muted/10 rounded-lg border border-border/60">
                        <button
                          type="button"
                          onClick={() => setFormType("salary")}
                          className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            formType === "salary"
                              ? "bg-background text-primary shadow-xs"
                              : "text-muted-foreground"
                          }`}
                        >
                          راتب أساسي لموظف
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormType("shift")}
                          className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            formType === "shift"
                              ? "bg-background text-primary shadow-xs"
                              : "text-muted-foreground"
                          }`}
                        >
                          عضو شفت طبيب/فني
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ──── Basic Salary Form ──── */}
                  {formType === "salary" ? (
                    <div className="space-y-5">
                      {!editingId ? (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-foreground">
                            الموظف
                          </label>
                          <select
                            value={form.empCd}
                            onChange={(e) =>
                              setForm({ ...form, empCd: e.target.value })
                            }
                            className={inputCls}
                            required
                          >
                            <option value="">
                              -- اختر موظفاً من القائمة --
                            </option>
                            {employees.map((emp: any) => (
                              <option key={emp.empCd} value={emp.empCd}>
                                {emp.fullName} ({emp.empCd})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-primary/8 border border-primary/15 p-3 space-y-1">
                          <div className="text-[10px] font-bold text-foreground uppercase">
                            اسم الموظف كود ({form.empCd})
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            {getEmployeeName(form.empCd)}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-foreground">
                          الفرع
                        </label>
                        <select
                          value={form.section}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              section: e.target.value as "مركز" | "عيادة",
                            })
                          }
                          className={inputCls}
                          required
                        >
                          <option value="مركز">المركز</option>
                          <option value="عيادة">العيادة</option>
                        </select>
                      </div>

                      {/* Salary Components Section */}
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          تفاصيل بنود الراتب
                        </p>
                        <div className="space-y-3.5">
                          {FIELDS.map(({ key, label }) => (
                            <div key={key} className="space-y-1.5">
                              <label className="block text-xs font-bold text-foreground">
                                {label}
                              </label>
                              <input
                                type="number"
                                value={(form as any)[key]}
                                min={0}
                                step="0.01"
                                onChange={(e) =>
                                  setForm({ ...form, [key]: e.target.value })
                                }
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Calculator Highlight */}
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/10 border border-primary/15 px-4 py-3">
                        <span className="text-xs font-bold text-foreground">
                          إجمالي مستحقات الراتب
                        </span>
                        <span className="text-lg font-black text-primary tabular-nums">
                          {totalOf(form).toLocaleString("en-EG")} ج.م
                        </span>
                      </div>

                      {/* Effective dates & notes */}
                      <div className="space-y-3.5 pt-2">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-foreground">
                            تاريخ السريان
                          </label>
                          <DateInput
                            value={form.effectiveFrom}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                effectiveFrom: e.target.value,
                              })
                            }
                            className={inputCls}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-foreground">
                            تاريخ الانتهاء (اختياري)
                          </label>
                          <DateInput
                            value={form.effectiveTo}
                            onChange={(e) =>
                              setForm({ ...form, effectiveTo: e.target.value })
                            }
                            className={inputCls}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-foreground">
                            ملاحظات
                          </label>
                          <input
                            type="text"
                            value={form.notes}
                            onChange={(e) =>
                              setForm({ ...form, notes: e.target.value })
                            }
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ──── Shift Staff Form ──── */
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-foreground">
                          الاسم الكامل لعضو الكادر
                        </label>
                        <input
                          type="text"
                          placeholder="أدخل الاسم الرباعي"
                          value={form.shiftName}
                          onChange={(e) =>
                            setForm({ ...form, shiftName: e.target.value })
                          }
                          className={inputCls}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-foreground">
                          النوع
                        </label>
                        <select
                          value={form.shiftType}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              shiftType: e.target.value as any,
                            })
                          }
                          className={inputCls}
                        >
                          <option value="doctor">طبيب شفت</option>
                          <option value="tech">فني شفت</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-foreground">
                          قيمة الشفت (ج.م)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={form.ratePerShift}
                          onChange={(e) =>
                            setForm({ ...form, ratePerShift: e.target.value })
                          }
                          className={inputCls}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-foreground">
                          ربط الحضور مع سجل الموظفين (اختياري)
                        </label>
                        <select
                          value={form.empCd}
                          onChange={(e) =>
                            setForm({ ...form, empCd: e.target.value })
                          }
                          className={inputCls}
                        >
                          <option value="">-- ربط غير مسجل (يدوي) --</option>
                          {employees.map((e: any) => (
                            <option key={e.empCd} value={e.empCd}>
                              {e.fullName} ({e.empCd})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-foreground">
                          ربط حساب مستخدم بالنظام (اختياري)
                        </label>
                        <select
                          value={form.userId}
                          onChange={(e) =>
                            setForm({ ...form, userId: e.target.value })
                          }
                          className={inputCls}
                        >
                          <option value="">-- بدون حساب مستخدم --</option>
                          {usersList.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.name ?? u.username} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      {editingShiftId && (
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-foreground">
                            حالة العضو
                          </label>
                          <select
                            value={form.shiftActive ? "1" : "0"}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                shiftActive: e.target.value === "1",
                              })
                            }
                            className={inputCls}
                          >
                            <option value="1">نشط ومتاح في الشفتات</option>
                            <option value="0">غير نشط (موقوف مؤقتاً)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons in Drawer */}
                  <div className="flex gap-3 pt-4 border-t border-border mt-6">
                    <Button
                      type="submit"
                      className="flex-1 h-11 bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold rounded-lg shadow-xs"
                      disabled={
                        setMut.isPending ||
                        updateMut.isPending ||
                        addShiftMut.isPending ||
                        updateShiftMut.isPending
                      }
                    >
                      {editingId || editingShiftId
                        ? "حفظ التعديلات"
                        : "إضافة إلى القائمة"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 border-border text-muted-foreground hover:text-foreground font-semibold rounded-lg"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setEditingShiftId(null);
                      }}
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Center Section (المركز) ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-2 gap-2">
          <h2 className="text-lg font-black text-foreground">المركز</h2>
          {/* Tabs header for Center */}
          <div className="flex bg-muted/10 rounded-lg p-0.5 border border-border/60">
            <button
              onClick={() => setCenterTab("shifts")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                centerTab === "shifts"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الشفتات
            </button>
            <button
              onClick={() => setCenterTab("salaries")}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                centerTab === "salaries"
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الرواتب
            </button>
          </div>
        </div>

        {/* Tab Content for Center */}
        {centerTab === "salaries" ? (
          <SalaryTable
            title="رواتب موظفي المركز"
            data={centerSalaries}
            employees={employees}
            onEdit={handleEdit}
            onDelete={(id) => deleteMut.mutate({ id })}
            isPending={deleteMut.isPending}
          />
        ) : (
          <ShiftsTable
            title="طاقم شفتات المركز"
            data={centerShifts}
            employees={employees}
            onEdit={handleEditShift}
            onDelete={(id) => deleteShiftMut.mutate({ id })}
            isPending={deleteShiftMut.isPending}
          />
        )}
      </div>

      {/* ── Clinic Section (العيادة) ── */}
      <div className="space-y-3 pt-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-lg font-black text-foreground">العيادة</h2>
        </div>

        <SalaryTable
          title="رواتب موظفي العيادة"
          data={clinicSalaries}
          employees={employees}
          onEdit={handleEdit}
          onDelete={(id) => deleteMut.mutate({ id })}
          isPending={deleteMut.isPending}
        />
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 sm:grid-cols-3 pt-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            إجمالي الموظفين والكادر
          </div>
          <div className="mt-2 text-2xl font-black text-foreground tabular-nums">
            {basics.length + shiftStaff.length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            إجمالي المركز
          </div>
          <div className="mt-2 text-2xl font-black text-primary tabular-nums">
            {centerSalaries.length + centerShifts.length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            إجمالي العيادة
          </div>
          <div className="mt-2 text-2xl font-black text-secondary tabular-nums">
            {clinicSalaries.length}
          </div>
        </div>
      </div>
    </div>
  );
}
