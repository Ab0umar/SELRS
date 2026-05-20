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
      setForm({ empCd: "", date: today, type: "out", durationMinutes: 60, note: "" });
      permsQuery.refetch();
      toast.success("تم إضافة الإذن");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const deleteMut = trpc.attendance.deletePermission.useMutation({
    onSuccess: () => { permsQuery.refetch(); toast.success("تم الحذف"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const employees: { empCd: string; fullName: string }[] =
    (empsQuery.data?.employees ?? []) as any;

  const typeLabel = (t: string) => (t === "in" ? "دخول متأخر" : "خروج مبكر");
  const typeColor = (t: string) => (t === "in" ? "text-blue-600" : "text-orange-600");

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">الأذونات</h1>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">من</label>
              <input type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} className="px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى</label>
              <input type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} className="px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الموظف</label>
              <select value={filter.empCd} onChange={(e) => setFilter({ ...filter, empCd: e.target.value })} className="px-3 py-2 border rounded-md">
                <option value="">الكل</option>
                {employees.map((emp) => (
                  <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                ))}
              </select>
            </div>
            <Button onClick={() => permsQuery.refetch()} variant="outline">بحث</Button>
            <Button onClick={() => setShowForm(true)} className="gap-2 mr-auto">
              <Plus size={16} /> إضافة إذن
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add form */}
      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>إضافة إذن جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الموظف</label>
                <select value={form.empCd} onChange={(e) => setForm({ ...form, empCd: e.target.value })} className="w-full px-3 py-2 border rounded-md" required>
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">التاريخ</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">النوع</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PermType })} className="w-full px-3 py-2 border rounded-md">
                  <option value="out">خروج مبكر</option>
                  <option value="in">دخول متأخر</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">المدة (دقيقة)</label>
                <input type="number" min={1} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">ملاحظة</label>
                <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="اختياري" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => createMut.mutate(form)} disabled={!form.empCd || createMut.isPending}>
                {createMut.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            سجل الأذونات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {permsQuery.isLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !permsQuery.data?.length ? (
            <div className="text-center py-8 text-gray-500">لا توجد أذونات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-gray-50">
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
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-mono">{p.empCd}</td>
                      <td className="py-2 px-4">{String(p.date).split("T")[0]}</td>
                      <td className={`py-2 px-4 font-medium ${typeColor(p.type)}`}>{typeLabel(p.type)}</td>
                      <td className="py-2 px-4">{p.durationMinutes} د</td>
                      <td className="py-2 px-4 text-gray-600">{p.note ?? "—"}</td>
                      <td className="py-2 px-4">
                        <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate({ id: p.id })} disabled={deleteMut.isPending}>
                          <Trash2 size={15} className="text-red-500" />
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
