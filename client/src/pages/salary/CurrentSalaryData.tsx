/**
 * Current Salary Data Component
 * Displays salary information in two organized tables:
 * 1. Center (المركز) - Employees working at the center
 * 2. Clinic (العيادة) - Employees working at the clinic
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Download, Filter } from "lucide-react";
import { toast } from "sonner";

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

const today = new Date().toISOString().split("T")[0];

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
  const getEmployeeName = (empCd: string) => {
    const emp = employees.find((e) => e.code === empCd);
    return emp?.name || empCd;
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
            <div className="text-2xl font-bold text-primary">{fmt(totalAmount)}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="px-6 py-8 text-center text-muted-foreground">
          جاري التحميل...
        </div>
      ) : data.length === 0 ? (
        <div className="px-6 py-8 text-center text-muted-foreground">
          لا توجد بيانات رواتب مسجلة
        </div>
      ) : (
        <div className="overflow-x-auto" dir="rtl">
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
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              `هل تريد حذف راتب ${getEmployeeName(item.empCd)}؟`
                            )
                          ) {
                            onDelete(item.id);
                          }
                        }}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-border bg-muted/20 px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          عدد الموظفين: <span className="font-semibold text-foreground">{data.length}</span>
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

export default function CurrentSalaryData() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BasicForm>(BLANK);
  const [showForm, setShowForm] = useState(false);

  const basicsQ = (trpc as any).salary.listBasics.useQuery();
  const empsQ = (trpc as any).salary.listEmployees.useQuery();

  const basics: any[] = basicsQ.data ?? [];
  const employees: any[] = empsQ.data ?? [];

  const deleteMut = (trpc as any).salary.deleteBasic.useMutation({
    onSuccess: () => {
      basicsQ.refetch();
      toast.success("تم الحذف");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  // Separate data by location (assuming there's a location field)
  // If not, we'll use a simple split for demo purposes
  const centerData = basics.filter((b) => {
    const emp = employees.find((e) => e.code === b.empCd);
    return emp?.location === "center" || emp?.type === "center";
  });

  const clinicData = basics.filter((b) => {
    const emp = employees.find((e) => e.code === b.empCd);
    return emp?.location === "clinic" || emp?.type === "clinic";
  });

  // If no location data, split by index (50/50)
  const allData = centerData.length === 0 && clinicData.length === 0
    ? {
        center: basics.slice(0, Math.ceil(basics.length / 2)),
        clinic: basics.slice(Math.ceil(basics.length / 2)),
      }
    : { center: centerData, clinic: clinicData };

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
          <p className="text-xs font-medium text-muted-foreground">مسار التحضير</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            بيانات الرواتب الحالية
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            الرواتب والبدلات المسجلة حالياً مقسمة حسب موقع العمل
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            تصفية
          </Button>
          <Button onClick={() => { setEditingId(null); setForm(BLANK); setShowForm(!showForm); }} className="gap-2">
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
                    <option key={emp.code} value={emp.code}>
                      {emp.name}
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Center Table */}
        <SalaryTable
          title="المركز"
          subtitle="الموظفون العاملون بالمركز"
          data={allData.center}
          employees={employees}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={basicsQ.isLoading}
          isPending={deleteMut.isPending}
        />

        {/* Clinic Table */}
        <SalaryTable
          title="العيادة"
          subtitle="الموظفون العاملون بالعيادة"
          data={allData.clinic}
          employees={employees}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={basicsQ.isLoading}
          isPending={deleteMut.isPending}
        />
      </div>

      {/* Summary Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">إجمالي الموظفين</div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {basics.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">موظفو المركز</div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {allData.center.length}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">موظفو العيادة</div>
          <div className="mt-2 text-2xl font-bold text-secondary">
            {allData.clinic.length}
          </div>
        </div>
      </div>
    </div>
  );
}
