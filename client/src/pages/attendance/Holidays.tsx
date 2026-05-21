import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CalendarDays, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const EGYPT_HOLIDAYS_2026 = [
  { date: "2026-01-07", label: "عيد الميلاد المجيد (أقباط)" },
  { date: "2026-01-25", label: "عيد ثورة 25 يناير" },
  { date: "2026-03-21", label: "عيد الأم" },
  { date: "2026-03-20", label: "عيد الفطر المبارك (يوم 1)" },
  { date: "2026-03-21", label: "عيد الفطر المبارك (يوم 2)" },
  { date: "2026-03-22", label: "عيد الفطر المبارك (يوم 3)" },
  { date: "2026-04-13", label: "عيد شم النسيم" },
  { date: "2026-04-25", label: "عيد تحرير سيناء" },
  { date: "2026-05-27", label: "عيد الأضحى المبارك (يوم 1)" },
  { date: "2026-05-28", label: "عيد الأضحى المبارك (يوم 2)" },
  { date: "2026-05-29", label: "عيد الأضحى المبارك (يوم 3)" },
  { date: "2026-06-17", label: "رأس السنة الهجرية" },
  { date: "2026-06-30", label: "عيد ثورة 30 يونيو" },
  { date: "2026-07-23", label: "عيد ثورة 23 يوليو" },
  { date: "2026-08-26", label: "عيد المولد النبوي الشريف" },
  { date: "2026-10-06", label: "عيد القوات المسلحة" },
];

export default function Holidays() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: "", label: "", paid: true });
  const [seeding, setSeeding] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editRow, setEditRow] = useState({ label: "", paid: true });

  const holidaysQuery = trpc.attendance.listHolidays.useQuery({ year });
  const addMut = trpc.attendance.addHoliday.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setEditingDate(null);
      setForm({ date: "", label: "", paid: true });
      holidaysQuery.refetch();
      toast.success(editingDate ? "تم التعديل" : "تم إضافة العطلة");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteMut = trpc.attendance.deleteHoliday.useMutation({
    onSuccess: () => { holidaysQuery.refetch(); toast.success("تم الحذف"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const seedEgyptHolidays = async () => {
    setSeeding(true);
    try {
      for (const h of EGYPT_HOLIDAYS_2026) {
        await addMut.mutateAsync({ date: h.date, label: h.label, paid: true });
      }
      toast.success("تم إضافة الإجازات الرسمية المصرية لعام 2026");
    } catch (e: any) {
      toast.error("خطأ أثناء الإضافة: " + e.message);
    } finally {
      setSeeding(false);
      holidaysQuery.refetch();
    }
  };

  const holidays: any[] = (holidaysQuery.data as any[]) ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">الإجازات الرسمية</h1>

      {/* Controls */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">السنة</label>
              <input type="number" min={2020} max={2099} value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-28 px-3 py-2 border rounded-md" />
            </div>
            <Button onClick={() => holidaysQuery.refetch()} variant="outline">تحديث</Button>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus size={16} /> إضافة عطلة
            </Button>
            <Button onClick={seedEgyptHolidays} variant="secondary" disabled={seeding} className="mr-auto">
              {seeding ? "جاري الإضافة..." : "إضافة إجازات مصر 2026"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add form */}
      {showForm && (
        <Card className="mb-4">
          <CardHeader><CardTitle>إضافة عطلة رسمية</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">التاريخ</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">الاسم</label>
                <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="مثل: عيد الفطر" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="paid" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
                <label htmlFor="paid" className="text-sm font-medium">مدفوعة</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMut.mutate(form)} disabled={!form.date || !form.label || addMut.isPending}>
                {addMut.isPending ? "جاري الحفظ..." : "حفظ"}
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
            <CalendarDays className="w-5 h-5" />
            إجازات {year} ({holidays.length} يوم)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {holidaysQuery.isLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !holidays.length ? (
            <div className="text-center py-8 text-gray-500">لا توجد إجازات لهذا العام</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right py-3 px-4">التاريخ</th>
                    <th className="text-right py-3 px-4">اسم العطلة</th>
                    <th className="text-right py-3 px-4">مدفوعة</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map((h: any) => {
                    const isEditing = editingDate === h.date;
                    return (
                      <tr key={h.date} className={`border-b ${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-2 px-4 font-mono">{h.date}</td>
                        {isEditing ? (
                          <>
                            <td className="py-2 px-2">
                              <input value={editRow.label} onChange={(e) => setEditRow({ ...editRow, label: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-sm" />
                            </td>
                            <td className="py-2 px-2">
                              <select value={editRow.paid ? '1' : '0'} onChange={(e) => setEditRow({ ...editRow, paid: e.target.value === '1' })}
                                className="px-2 py-1 border rounded text-sm">
                                <option value="1">نعم</option>
                                <option value="0">لا</option>
                              </select>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" disabled={addMut.isPending}
                                  onClick={() => addMut.mutate({ date: h.date, label: editRow.label, paid: editRow.paid })}>
                                  <Check size={15} className="text-green-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setEditingDate(null)}>
                                  <X size={15} className="text-gray-500" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-4 font-medium">{h.label}</td>
                            <td className="py-2 px-4">{h.paid ? <span className="text-green-600">نعم</span> : <span className="text-gray-400">لا</span>}</td>
                            <td className="py-2 px-4">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditingDate(h.date); setEditRow({ label: h.label, paid: h.paid }); }}>
                                  <Pencil size={15} className="text-blue-500" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate({ date: h.date })} disabled={deleteMut.isPending}>
                                  <Trash2 size={15} className="text-red-500" />
                                </Button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
