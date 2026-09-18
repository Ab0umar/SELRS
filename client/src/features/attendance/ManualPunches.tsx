import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Fingerprint, LogIn, LogOut, Trash2, PenLine, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { useIsMobile } from "@/hooks/useMobile";

type Direction = "in" | "out" | "unknown";

interface PunchForm {
  id: string;
  empCd: string;
  date: string;
  time: string;
  direction: Direction;
  note: string;
}

const toLocalIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const today = toLocalIsoDate(new Date());
const PAGE_SIZE = 200;
const emptyForm = (): PunchForm => ({
  id: Math.random().toString(36).slice(2),
  empCd: "",
  date: today,
  time: "08:00",
  direction: "in",
  note: "",
});

type TabKey = "record" | "report";

export default function ManualPunches() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<TabKey>("record");
  const [filter, setFilter] = useState({ empCd: "", from: today, to: today });
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<PunchForm[]>([emptyForm()]);
  const [submitting, setSubmitting] = useState(false);

  const punchesQuery = trpc.attendance.rawPunches.useQuery({
    empCd: filter.empCd || undefined,
    fromDate: filter.from || undefined,
    toDate: filter.to || undefined,
    source: "manual",
    limit: PAGE_SIZE,
    offset,
  });

  const empsQuery = trpc.attendance.employeesList.useQuery();
  const employees: { empCd: string; fullName: string }[] =
    (empsQuery.data?.employees ?? []) as any;

  const onDone = () => {
    setRows([emptyForm()]);
    punchesQuery.refetch();
  };

  const updateRow = (id: string, patch: Partial<PunchForm>) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  const removeRow = (id: string) =>
    setRows((current) =>
      current.length === 1 ? current : current.filter((row) => row.id !== id),
    );

  const updateFilter = (next: Partial<typeof filter>) => {
    setOffset(0);
    setFilter((current) => ({ ...current, ...next }));
  };

  const addMut = (trpc as any).attendance.addManualPunch.useMutation();

  const deleteMut = (trpc as any).attendance.deleteManualPunch.useMutation({
    onSuccess: () => {
      punchesQuery.refetch();
      toast.success("تم حذف البصمة");
    },
    onError: (e: any) => toast.error("خطأ: " + e.message),
  });

  const handleSubmit = async () => {
    const valid = rows.filter((row) => row.empCd && row.date && row.time);
    if (valid.length === 0) return;
    setSubmitting(true);
    try {
      let successCount = 0;
      const successfulRowIds = new Set<string>();
      for (const row of valid) {
        try {
          await addMut.mutateAsync({
            empCd: row.empCd,
            date: row.date,
            time: row.time,
            direction: row.direction,
            note: row.note || undefined,
          });
          successCount += 1;
          successfulRowIds.add(row.id);
        } catch (e: any) {
          toast.error(`${empName(row.empCd)}: ${e.message}`);
        }
      }
      if (successCount > 0) {
        setRows((current) => {
          const remaining = current.filter(
            (row) => !successfulRowIds.has(row.id),
          );
          return remaining.length > 0 ? remaining : [emptyForm()];
        });
        punchesQuery.refetch();
        toast.success(
          successCount < valid.length
            ? `تم تسجيل ${successCount} من ${valid.length} بصمة — راجع الصفوف المتبقية`
            : valid.length > 1
              ? `تم تسجيل ${successCount} بصمة`
            : "تم تسجيل البصمة اليدوية",
        );
      }
    } finally {
      setSubmitting(false);
    }
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
  const validRowCount = rows.filter(
    (row) => row.empCd && row.date && row.time,
  ).length;

  return (
    <div className="space-y-4" dir="rtl">
      <div role="tablist" aria-label="البصمات اليدوية" className="flex gap-1 overflow-x-auto border-b border-border">
        {(
          [
            { key: "record" as const, label: "تسجيل بصمات", icon: PenLine },
            { key: "report" as const, label: "سجل البصمات", icon: ClipboardList },
          ]
        ).map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              id={`manual-punches-tab-${t.key}`}
              role="tab"
              onClick={() => setTab(t.key)}
              aria-selected={isActive}
              aria-controls={`manual-punches-panel-${t.key}`}
              className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "record" && (
        <Card
          id="manual-punches-panel-record"
          role="tabpanel"
          aria-labelledby="manual-punches-tab-record"
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>تسجيل بصمات يدوية</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((current) => [...current, emptyForm()])}
              >
                <Plus size={14} className="ml-1" /> إضافة صف
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="flex w-fit max-w-full flex-wrap items-end gap-2" dir="rtl"
              >
                <div>
                  <label htmlFor={`manual-punch-emp-${row.id}`} className="block text-xs font-medium text-muted-foreground mb-1">الموظف</label>
                  <select id={`manual-punch-emp-${row.id}`} value={row.empCd} onChange={(e) => updateRow(row.id, { empCd: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" required>
                    <option value="">اختر الموظف</option>
                    {employees.map((emp) => (
                      <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">التاريخ</label>
                  <DateInput value={row.date} onChange={(e) => updateRow(row.id, { date: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm h-11 w-[11rem] shrink-0" />
                </div>
                <div>
                  <label htmlFor={`manual-punch-time-${row.id}`} className="block text-xs font-medium text-muted-foreground mb-1">الوقت</label>
                  <input id={`manual-punch-time-${row.id}`} type="time" value={row.time} onChange={(e) => updateRow(row.id, { time: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">الاتجاه</label>
                  <div className="flex overflow-hidden rounded-md border border-border">
                    {(["in", "out"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateRow(row.id, { direction: d })}
                        aria-pressed={row.direction === d}
                        className={`flex-1 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97] ${
                          row.direction === d
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
                  <label htmlFor={`manual-punch-note-${row.id}`} className="block text-xs font-medium text-muted-foreground mb-1">ملاحظة</label>
                  <input id={`manual-punch-note-${row.id}`} type="text" value={row.note} onChange={(e) => updateRow(row.id, { note: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="اختياري" />
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10 disabled:opacity-30"
                    aria-label={`حذف الصف ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={handleSubmit} disabled={validRowCount === 0 || submitting}>
                {submitting ? "جاري الحفظ…" : validRowCount > 1 ? `حفظ ${validRowCount} بصمات` : "حفظ"}
              </Button>
              <Button variant="outline" onClick={onDone}>إلغاء</Button>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary">
              <p className="mb-2 font-bold">طريقة الاستخدام</p>
              <div className="space-y-1.5">
                <p>• <strong>بصمة ناقصة:</strong> الموظف نسي تسجيل الدخول أو الخروج</p>
                <p>• <strong>تصحيح الوقت:</strong> النظام سجّل وقتاً خاطئاً</p>
                <p>• <strong>عدة صفوف:</strong> اضغط &quot;إضافة صف&quot; لتسجيل أكثر من بصمة في نفس المرة</p>
              </div>
              <p className="mt-3 text-xs text-primary/80">
                كل بصمة يتم تسجيلها في سجل التتبع مع اسم المستخدم والوقت.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "report" && (
      <>
      <Card>
        <CardContent className="pt-4">
          <div className="flex w-fit max-w-full flex-wrap items-end gap-2" dir="rtl">
            <div>
              <label htmlFor="manual-punch-from" className="mb-1 block text-sm font-medium">من</label>
              <DateInput id="manual-punch-from" value={filter.from} onChange={(e) => updateFilter({ from: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm h-11 w-[11rem] shrink-0" />
            </div>
            <div>
              <label htmlFor="manual-punch-to" className="mb-1 block text-sm font-medium">إلى</label>
              <DateInput id="manual-punch-to" value={filter.to} onChange={(e) => updateFilter({ to: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm h-11 w-[11rem] shrink-0" />
            </div>
            <div>
              <label htmlFor="manual-punch-employee" className="mb-1 block text-sm font-medium">الموظف</label>
              <select id="manual-punch-employee" value={filter.empCd} onChange={(e) => updateFilter({ empCd: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">الكل</option>
                {employees.map((emp) => (
                  <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 md:justify-end">
              <Button onClick={() => { setOffset(0); punchesQuery.refetch(); }} variant="outline" className="min-h-11 px-4">بحث</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        id="manual-punches-panel-report"
        role="tabpanel"
        aria-labelledby="manual-punches-tab-report"
      >
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
                <div key={p.id} className="rounded-2xl border border-border bg-background p-3 shadow-xs">
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
          {punchesQuery.data && punchesQuery.data.total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0 || punchesQuery.isFetching} onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}>السابق</Button>
              <span className="text-xs text-muted-foreground">صفحة {Math.floor(offset / PAGE_SIZE) + 1}</span>
              <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= punchesQuery.data.total || punchesQuery.isFetching} onClick={() => setOffset((current) => current + PAGE_SIZE)}>التالي</Button>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
