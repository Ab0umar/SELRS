import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Fingerprint, LogIn, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { useIsMobile } from "@/hooks/useMobile";

type Direction = "in" | "out" | "unknown";

interface PunchForm {
  empCd: string;
  date: string;
  time: string;
  direction: Direction;
  note: string;
}

const toLocalIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const today = toLocalIsoDate(new Date());
const emptyForm = (): PunchForm => ({
  empCd: "",
  date: today,
  time: "08:00",
  direction: "in",
  note: "",
});

export default function ManualPunches() {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState({ empCd: "", from: today, to: today });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PunchForm>(emptyForm());

  const punchesQuery = trpc.attendance.rawPunches.useQuery({
    empCd: filter.empCd || undefined,
    fromDate: filter.from || undefined,
    toDate: filter.to || undefined,
    source: "manual",
    limit: 200,
  });

  const empsQuery = trpc.attendance.employeesList.useQuery();
  const employees: { empCd: string; fullName: string }[] =
    (empsQuery.data?.employees ?? []) as any;

  const onDone = () => {
    setShowForm(false);
    setForm(emptyForm());
    punchesQuery.refetch();
  };

  const addMut = (trpc as any).attendance.addManualPunch.useMutation({
    onSuccess: () => {
      onDone();
      toast.success("تم تسجيل البصمة اليدوية");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const deleteMut = (trpc as any).attendance.deleteManualPunch.useMutation({
    onSuccess: () => {
      punchesQuery.refetch();
      toast.success("تم حذف البصمة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const handleSubmit = () => {
    addMut.mutate({
      empCd: form.empCd,
      date: form.date,
      time: form.time,
      direction: form.direction,
      note: form.note || undefined,
    });
  };

  const directionLabel = (d: string) =>
    d === "in" ? "دخول" : d === "out" ? "خروج" : "غير محدد";
  const directionBadgeClass = (d: string) =>
    d === "in"
      ? "border-success/20 bg-success/10 text-success"
      : d === "out"
        ? "border-info/20 bg-info/10 text-info"
        : "border-border bg-muted text-muted-foreground";

  const empName = (empCd: string) =>
    employees.find((e) => e.empCd === empCd)?.fullName ?? empCd;

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("ar-EG");

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-4 md:items-end">
            <div>
              <label htmlFor="manual-punch-from" className="mb-1 block text-sm font-medium">من</label>
              <DateInput id="manual-punch-from" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="manual-punch-to" className="mb-1 block text-sm font-medium">إلى</label>
              <DateInput id="manual-punch-to" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="manual-punch-employee" className="mb-1 block text-sm font-medium">الموظف</label>
              <select id="manual-punch-employee" value={filter.empCd} onChange={(e) => setFilter({ ...filter, empCd: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">الكل</option>
                {employees.map((emp) => (
                  <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 md:justify-end">
              <Button onClick={() => punchesQuery.refetch()} variant="outline" className="min-h-11 px-4">بحث</Button>
              <Button onClick={() => { setForm(emptyForm()); setShowForm(true); }} className="min-h-11 gap-2 px-4">
                <Plus size={16} /> تسجيل بصمة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>تسجيل بصمة يدوية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="manual-punch-form-employee" className="block text-sm font-medium mb-1">الموظف</label>
                <select id="manual-punch-form-employee" value={form.empCd} onChange={(e) => setForm({ ...form, empCd: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" required>
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="manual-punch-form-direction" className="block text-sm font-medium mb-1">الاتجاه</label>
                <div className="flex overflow-hidden rounded-md border border-border">
                  {(["in", "out"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, direction: d })}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        form.direction === d
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {d === "in" ? "دخول" : "خروج"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="manual-punch-form-date" className="block text-sm font-medium mb-1">التاريخ</label>
                <DateInput id="manual-punch-form-date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="manual-punch-form-time" className="block text-sm font-medium mb-1">الوقت</label>
                <input id="manual-punch-form-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="manual-punch-form-note" className="block text-sm font-medium mb-1">ملاحظة</label>
                <input id="manual-punch-form-note" type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="اختياري" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSubmit} disabled={!form.empCd || addMut.isPending}>
                {addMut.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={onDone}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Fingerprint className="w-5 h-5" />سجل البصمات اليدوية</CardTitle>
        </CardHeader>
        <CardContent>
          {punchesQuery.isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : punchesQuery.isError ? (
            <div className="py-8 text-center text-destructive text-sm">خطأ: {(punchesQuery.error as any)?.message ?? "تعذر تحميل البصمات"}</div>
          ) : !punchesQuery.data?.punches?.length ? (
            <div className="py-8 text-center text-muted-foreground">لا توجد بصمات يدوية في هذه الفترة</div>
          ) : isMobile ? (
            <div className="space-y-2" dir="rtl">
              {(punchesQuery.data.punches as any[]).map((p: any) => (
                <div key={p.id} className="rounded-2xl border border-border bg-background p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{empName(p.empCd)}</div>
                      <div className="font-mono text-xs text-muted-foreground">{p.empCd}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${directionBadgeClass(p.direction)}`}>
                      {p.direction === "in" ? <LogIn size={14} /> : p.direction === "out" ? <LogOut size={14} /> : null}
                      {directionLabel(p.direction)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 text-center text-xs">
                    <div>
                      <div className="text-muted-foreground">التاريخ</div>
                      <div className="font-medium text-foreground">{fmtDate(p.punchAt)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">الوقت</div>
                      <div className="font-medium text-foreground">{fmtTime(p.punchAt)}</div>
                    </div>
                  </div>
                  {p.note ? <div className="mt-2 text-xs text-muted-foreground">{p.note}</div> : null}
                  <div className="mt-3 flex justify-end border-t border-border/60 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMut.mutate({ id: p.id })}
                      disabled={deleteMut.isPending}
                      className="h-10 w-10 p-0"
                      aria-label={`حذف بصمة ${p.empCd}`}
                    >
                      <Trash2 size={15} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto" dir="rtl">
              <table dir="rtl" className="min-w-[40rem] w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right py-3 px-4">الموظف</th>
                    <th className="text-right py-3 px-4">التاريخ</th>
                    <th className="text-right py-3 px-4">الوقت</th>
                    <th className="text-right py-3 px-4">الاتجاه</th>
                    <th className="text-right py-3 px-4">ملاحظة</th>
                    <th className="text-right py-3 px-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(punchesQuery.data.punches as any[]).map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 px-4">{empName(p.empCd)} <span className="font-mono text-xs text-muted-foreground">({p.empCd})</span></td>
                      <td className="py-2 px-4 tabular-nums" dir="ltr">{fmtDate(p.punchAt)}</td>
                      <td className="py-2 px-4 tabular-nums" dir="ltr">{fmtTime(p.punchAt)}</td>
                      <td className="py-2 px-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${directionBadgeClass(p.direction)}`}>
                          {directionLabel(p.direction)}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground text-xs">{p.note ?? "—"}</td>
                      <td className="py-2 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMut.mutate({ id: p.id })}
                          disabled={deleteMut.isPending}
                          className="h-10 w-10 p-0"
                          aria-label={`حذف بصمة ${p.empCd}`}
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
