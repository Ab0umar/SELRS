import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Clock, CheckCircle, Pencil, LogIn } from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { useIsMobile } from "@/hooks/useMobile";

type PermType = "in" | "out" | "mission";

interface PermForm {
  empCd: string;
  date: string;
  type: PermType;
  durationMinutes: number;
  notAffectSalary: boolean;
  note: string;
}

const toLocalIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const normalizeDate = (value: unknown) => {
  if (!value) return "";
  if (value instanceof Date) return toLocalIsoDate(value);
  const text = String(value);
  const isoMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : toLocalIsoDate(parsed);
};

const displayDate = (value: unknown) => {
  const iso = normalizeDate(value);
  if (!iso) return "-";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

const today = toLocalIsoDate(new Date());
const emptyForm = (): PermForm => ({
  empCd: "", date: today, type: "out", durationMinutes: 60, notAffectSalary: false, note: "",
});

export default function Permissions() {
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState({ empCd: "", from: today, to: today });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<PermForm>(emptyForm());

  const permsQuery = trpc.attendance.listPermissions.useQuery({
    empCd: filter.empCd || undefined,
    from: filter.from || undefined,
    to: filter.to || undefined,
  });

  const empsQuery = trpc.attendance.employeesList.useQuery();
  const entryPermissionSettingQuery =
    trpc.attendance.getEntryPermissionRequestsEnabled.useQuery();
  const setEntryPermissionSetting =
    trpc.attendance.setEntryPermissionRequestsEnabled.useMutation({
      onSuccess: (result) => {
        entryPermissionSettingQuery.refetch();
        toast.success(
          result.enabled
            ? "تم تفعيل طلب إذن الدخول للمستخدمين"
            : "تم إلغاء طلب إذن الدخول للمستخدمين",
        );
      },
      onError: (e) => toast.error("خطأ: " + e.message),
    });

  const onDone = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
    permsQuery.refetch();
  };

  const createMut = trpc.attendance.createPermission.useMutation({
    onSuccess: () => { onDone(); toast.success("تم إضافة الإذن"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const updateMut = trpc.attendance.updatePermission.useMutation({
    onSuccess: () => { onDone(); toast.success("تم تعديل الإذن"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const deleteMut = trpc.attendance.deletePermission.useMutation({
    onSuccess: () => { permsQuery.refetch(); toast.success("تم الحذف"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const approveMut = trpc.attendance.approvePermission.useMutation({
    onSuccess: () => { permsQuery.refetch(); toast.success("تم الاعتماد بنجاح"); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      empCd: p.empCd,
      date: normalizeDate(p.date),
      type: p.type,
      durationMinutes: p.durationMinutes,
      notAffectSalary: p.notAffectSalary ?? false,
      note: p.note ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editId !== null) {
      updateMut.mutate({ id: editId, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  const employees: { empCd: string; fullName: string }[] = (empsQuery.data?.employees ?? []) as any;
  const typeLabel = (t: string) =>
    t === "mission" ? "مأمورية" : t === "in" ? "دخول متأخر" : "خروج مبكر";
  const typeColorClass = (t: string) =>
    t === "mission"
      ? "border-info/20 bg-info/10 text-info"
      : t === "in"
        ? "border-primary/20 bg-primary/10 text-primary"
        : "border-secondary/20 bg-secondary/10 text-secondary";
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">الأذونات</h1>

      <Card className="mb-4">
        <CardContent className="flex items-center justify-between gap-4 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogIn className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="font-semibold">طلب إذن الدخول للمستخدمين</div>
              <div className="text-xs text-muted-foreground">
                يتحكم في ظهور وإرسال طلب الدخول المتأخر من الملف الشخصي للحضور.
              </div>
            </div>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2">
            <span className="text-sm font-medium">
              {entryPermissionSettingQuery.data?.enabled !== false
                ? "مفعّل"
                : "ملغي"}
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={entryPermissionSettingQuery.data?.enabled !== false}
              disabled={
                entryPermissionSettingQuery.isLoading ||
                setEntryPermissionSetting.isPending
              }
              onChange={(event) =>
                setEntryPermissionSetting.mutate({ enabled: event.target.checked })
              }
            />
          </label>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-4 md:items-end">
            <div>
              <label htmlFor="attendance-perm-from" className="mb-1 block text-sm font-medium">من</label>
              <DateInput id="attendance-perm-from" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="attendance-perm-to" className="mb-1 block text-sm font-medium">إلى</label>
              <DateInput id="attendance-perm-to" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label htmlFor="attendance-perm-employee" className="mb-1 block text-sm font-medium">الموظف</label>
              <select id="attendance-perm-employee" value={filter.empCd} onChange={(e) => setFilter({ ...filter, empCd: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">الكل</option>
                {employees.map((emp) => (
                  <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 md:justify-end">
              <Button onClick={() => permsQuery.refetch()} variant="outline" className="min-h-11 px-4">بحث</Button>
              <Button onClick={() => { setEditId(null); setForm(emptyForm()); setShowForm(true); }} className="min-h-11 gap-2 px-4">
                <Plus size={16} /> إضافة إذن
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{editId !== null ? "تعديل الإذن" : "إضافة إذن جديد"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="attendance-perm-form-employee" className="block text-sm font-medium mb-1">الموظف</label>
                <select id="attendance-perm-form-employee" value={form.empCd} onChange={(e) => setForm({ ...form, empCd: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" required disabled={editId !== null}>
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.empCd} value={emp.empCd}>{emp.fullName} ({emp.empCd})</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="attendance-perm-form-date" className="block text-sm font-medium mb-1">التاريخ</label>
                <DateInput id="attendance-perm-form-date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="attendance-perm-form-type" className="block text-sm font-medium mb-1">النوع</label>
                <select
                  id="attendance-perm-form-type"
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value as PermType;
                    setForm({
                      ...form,
                      type,
                      durationMinutes: type === "mission" ? 480 : form.durationMinutes,
                    });
                  }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="out">خروج مبكر</option>
                  <option value="in">دخول متأخر</option>
                  <option value="mission">مأمورية</option>
                </select>
              </div>
              {form.type === "mission" ? null : (
                <div>
                  <label htmlFor="attendance-perm-form-duration" className="block text-sm font-medium mb-1">المدة (دقيقة)</label>
                  <input id="attendance-perm-form-duration" type="number" min={1} max={480} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none pt-6">
                  <input type="checkbox" checked={form.notAffectSalary} onChange={(e) => setForm({ ...form, notAffectSalary: e.target.checked })} className="h-4 w-4 rounded border-border accent-secondary" />
                  <span className="text-sm font-medium">لا يؤثر على الراتب</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="attendance-perm-form-note" className="block text-sm font-medium mb-1">ملاحظة</label>
                <input id="attendance-perm-form-note" type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="اختياري" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSubmit} disabled={!form.empCd || isPending}>
                {isPending ? "جاري الحفظ..." : editId !== null ? "حفظ التعديل" : "حفظ"}
              </Button>
              <Button variant="outline" onClick={onDone}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />سجل الأذونات</CardTitle>
        </CardHeader>
        <CardContent>
          {permsQuery.isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : permsQuery.isError ? (
            <div className="py-8 text-center text-destructive text-sm">خطأ: {(permsQuery.error as any)?.message ?? "تعذر تحميل الأذونات"}</div>
          ) : !permsQuery.data?.length ? (
            <div className="py-8 text-center text-muted-foreground">لا توجد أذونات في هذه الفترة</div>
          ) : isMobile ? (
            <div className="space-y-2" dir="rtl">
              {(permsQuery.data as any[]).map((p: any) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-background p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {p.empCd}
                      </div>
                      <div
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${typeColorClass(p.type)}`}
                      >
                        {typeLabel(p.type)}
                      </div>
                    </div>
                    {p.approved ? (
                      <span className="flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                        <CheckCircle size={12} />
                        معتمد
                      </span>
                    ) : (
                      <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
                        انتظار الموافقة
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-muted/40 p-2 text-center text-xs">
                    <div>
                      <div className="text-muted-foreground">التاريخ</div>
                      <div className="font-medium text-foreground">
                        {displayDate(p.date)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">المدة</div>
                      <div className="font-medium text-foreground">
                        {p.durationMinutes} د
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">يؤثر على الراتب</div>
                      <div className="font-medium">
                        {p.notAffectSalary ? (
                          <span className="text-muted-foreground">لا</span>
                        ) : (
                          <span className="text-destructive">نعم</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {p.note ? (
                    <div className="mt-2 text-xs text-muted-foreground">{p.note}</div>
                  ) : null}

                  <div className="mt-3 flex justify-end gap-1 border-t border-border/60 pt-2">
                    {!p.approved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => approveMut.mutate({ id: p.id })}
                        disabled={approveMut.isPending}
                        className="min-h-10 px-3 text-success border-success/30"
                      >
                        اعتماد
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="h-10 w-10 p-0"
                      aria-label="تعديل"
                    >
                      <Pencil size={14} className="text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMut.mutate({ id: p.id })}
                      disabled={deleteMut.isPending}
                      className="h-10 w-10 p-0"
                      aria-label={`حذف إذن ${p.empCd}`}
                    >
                      <Trash2 size={15} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto" dir="rtl">
              <table dir="rtl" className="min-w-[50rem] w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-right py-3 px-4">الموظف</th>
                    <th className="text-right py-3 px-4">التاريخ</th>
                    <th className="text-right py-3 px-4">النوع</th>
                    <th className="text-right py-3 px-4">المدة</th>
                    <th className="text-right py-3 px-4">الحالة</th>
                    <th className="text-right py-3 px-4">يؤثر على الراتب</th>
                    <th className="text-right py-3 px-4">ملاحظة</th>
                    <th className="text-right py-3 px-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {(permsQuery.data as any[]).map((p: any) => (
                    <tr key={p.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 px-4 font-mono">{p.empCd}</td>
                      <td className="py-2 px-4 tabular-nums" dir="ltr">{displayDate(p.date)}</td>
                      <td className="py-2 px-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${typeColorClass(p.type)}`}>
                          {typeLabel(p.type)}
                        </span>
                      </td>
                      <td className="py-2 px-4">{p.durationMinutes} د</td>
                      <td className="py-2 px-4">
                        {p.approved ? (
                          <span className="flex items-center gap-1 font-medium text-success"><CheckCircle size={14} />معتمد</span>
                        ) : (
                          <span className="font-medium text-warning">انتظار الموافقة</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-sm">
                        {p.notAffectSalary ? <span className="text-muted-foreground">لا</span> : <span className="text-destructive font-medium">نعم</span>}
                      </td>
                      <td className="py-2 px-4 text-muted-foreground text-xs">{p.note ?? "—"}</td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          {!p.approved && (
                            <Button variant="outline" size="sm" onClick={() => approveMut.mutate({ id: p.id })} disabled={approveMut.isPending} className="min-h-10 px-3 text-success border-success/30">اعتماد</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="h-10 w-10 p-0" aria-label="تعديل">
                            <Pencil size={14} className="text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate({ id: p.id })} disabled={deleteMut.isPending} className="h-10 w-10 p-0" aria-label={`حذف إذن ${p.empCd}`}>
                            <Trash2 size={15} className="text-destructive" />
                          </Button>
                        </div>
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
