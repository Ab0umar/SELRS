import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

type PermType = "in" | "out";

interface NewPerm {
  empCd: string;
  date: string;
  type: PermType;
  durationMinutes: number;
  note: string;
}

const today = new Date().toISOString().split("T")[0];

export default function Permissions() {
  const [filter, setFilter] = useState({ empCd: "", from: today, to: today });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewPerm>({
    empCd: "",
    date: today,
    type: "out",
    durationMinutes: 60,
    note: "",
  });

  const permsQuery = trpc.attendance.listPermissions.useQuery({
    empCd: filter.empCd || undefined,
    from: filter.from || undefined,
    to: filter.to || undefined,
  });

  const empsQuery = trpc.attendance.employeesList.useQuery();

  const createMut = trpc.attendance.createPermission.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm({
        empCd: "",
        date: today,
        type: "out",
        durationMinutes: 60,
        note: "",
      });
      permsQuery.refetch();
      toast.success("تم إضافة الإذن");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const deleteMut = trpc.attendance.deletePermission.useMutation({
    onSuccess: () => {
      permsQuery.refetch();
      toast.success("تم الحذف");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const employees: { empCd: string; fullName: string }[] = (empsQuery.data
    ?.employees ?? []) as any;

  const typeLabel = (t: string) => (t === "in" ? "دخول متأخر" : "خروج مبكر");

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">الأذونات</h1>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-4 md:items-end">
            <div>
              <label
                htmlFor="attendance-perm-from"
                className="mb-1 block text-sm font-medium"
              >
                من
              </label>
              <input
                id="attendance-perm-from"
                type="date"
                value={filter.from}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="attendance-perm-to"
                className="mb-1 block text-sm font-medium"
              >
                إلى
              </label>
              <input
                id="attendance-perm-to"
                type="date"
                value={filter.to}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="attendance-perm-employee"
                className="mb-1 block text-sm font-medium"
              >
                الموظف
              </label>
              <select
                id="attendance-perm-employee"
                value={filter.empCd}
                onChange={(e) =>
                  setFilter({ ...filter, empCd: e.target.value })
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">الكل</option>
                {employees.map((emp) => (
                  <option key={emp.empCd} value={emp.empCd}>
                    {emp.fullName} ({emp.empCd})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 md:justify-end">
              <Button
                onClick={() => permsQuery.refetch()}
                variant="outline"
                className="min-h-11 px-4"
              >
                بحث
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                className="min-h-11 gap-2 px-4"
              >
                <Plus size={16} /> إضافة إذن
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>إضافة إذن جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="attendance-perm-form-employee"
                  className="block text-sm font-medium mb-1"
                >
                  الموظف
                </label>
                <select
                  id="attendance-perm-form-employee"
                  value={form.empCd}
                  onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.empCd} value={emp.empCd}>
                      {emp.fullName} ({emp.empCd})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="attendance-perm-form-date"
                  className="block text-sm font-medium mb-1"
                >
                  التاريخ
                </label>
                <input
                  id="attendance-perm-form-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="attendance-perm-form-type"
                  className="block text-sm font-medium mb-1"
                >
                  النوع
                </label>
                <select
                  id="attendance-perm-form-type"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as PermType })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="out">خروج مبكر</option>
                  <option value="in">دخول متأخر</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="attendance-perm-form-duration"
                  className="block text-sm font-medium mb-1"
                >
                  المدة (دقيقة)
                </label>
                <input
                  id="attendance-perm-form-duration"
                  type="number"
                  min={1}
                  max={480}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationMinutes: parseInt(e.target.value) || 60,
                    })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="attendance-perm-form-note"
                  className="block text-sm font-medium mb-1"
                >
                  ملاحظة
                </label>
                <input
                  id="attendance-perm-form-note"
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => createMut.mutate(form)}
                disabled={!form.empCd || createMut.isPending}
              >
                {createMut.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            سجل الأذونات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permsQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !permsQuery.data?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              لا توجد أذونات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[46rem] w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right py-3 px-4">الموظف</th>
                    <th className="text-right py-3 px-4">التاريخ</th>
                    <th className="text-right py-3 px-4">النوع</th>
                    <th className="text-right py-3 px-4">المدة</th>
                    <th className="text-right py-3 px-4">ملاحظة</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {(permsQuery.data as any[]).map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 px-4 font-mono">{p.empCd}</td>
                      <td className="py-2 px-4">
                        {String(p.date).split("T")[0]}
                      </td>
                      <td
                        className={`py-2 px-4 font-medium ${p.type === "in" ? "text-primary" : "text-secondary"}`}
                      >
                        {typeLabel(p.type)}
                      </td>
                      <td className="py-2 px-4">{p.durationMinutes} د</td>
                      <td className="py-2 px-4 text-muted-foreground">
                        {p.note ?? "—"}
                      </td>
                      <td className="py-2 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMut.mutate({ id: p.id })}
                          disabled={deleteMut.isPending}
                          className="h-10 w-10 p-0"
                          aria-label={`حذف إذن ${p.empCd} بتاريخ ${String(p.date).split("T")[0]}`}
                        >
                          <Trash2 size={15} className="text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
