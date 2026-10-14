import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CheckCircle, CalendarCheck, Pencil } from "lucide-react";
import { toast } from "sonner";
import { DateInput } from "@/components/ui/date-input";
import { useIsCompact } from "@/hooks/useMobile";
import { useLocalToday } from "@/hooks/useLocalToday";

import { askConfirm } from "./askConfirm";
import { Input } from "@/components/ui/input";
type LeaveType = "annual" | "sick" | "salary" | "unpaid" | "other";

const TYPE_LABELS: Record<LeaveType, string> = {
  annual: "سنوية",
  sick: "مرضية",
  salary: "من الراتب",
  unpaid: "من الراتب",
  other: "أخرى",
};

interface NewLeave {
  empCd: string;
  dateFrom: string;
  dateTo: string;
  type: LeaveType;
  note: string;
  notAffectCommission: boolean;
}

export default function LeaveManagement() {
  const today = useLocalToday();
  const firstOfYear = `${today.slice(0, 4)}-01-01`;
  const isMobile = useIsCompact();
  const [filter, setFilter] = useState({
    empCd: "",
    from: firstOfYear,
    to: today,
  });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<NewLeave>({
    empCd: "",
    dateFrom: today,
    dateTo: today,
    type: "annual",
    note: "",
    notAffectCommission: false,
  });

  const leavesQuery = trpc.attendance.listLeaves.useQuery({
    empCd: filter.empCd || undefined,
    from: filter.from || undefined,
    to: filter.to || undefined,
  });

  const empsQuery = trpc.attendance.employeesList.useQuery();
  const employees: any[] = (empsQuery.data?.employees ?? []) as any;

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({
      empCd: "",
      dateFrom: today,
      dateTo: today,
      type: "annual",
      note: "",
      notAffectCommission: false,
    });
  };

  const openEdit = (l: any) => {
    setEditId(l.id);
    setForm({
      empCd: l.empCd,
      dateFrom: l.dateFrom,
      dateTo: l.dateTo,
      type: l.type,
      note: l.note ?? "",
      notAffectCommission: l.notAffectCommission ?? false,
    });
    setShowForm(true);
  };

  const createMut = trpc.attendance.createLeave.useMutation({
    onSuccess: () => {
      resetForm();
      leavesQuery.refetch();
      toast.success("تمت إضافة الإجازة");
    },
    onError: (e) => toast.error("تعذر إضافة الإجازة: " + e.message),
  });

  const updateMut = trpc.attendance.updateLeave.useMutation({
    onSuccess: () => {
      resetForm();
      leavesQuery.refetch();
      toast.success("تم تعديل الإجازة");
    },
    onError: (e) => toast.error("تعذر تعديل الإجازة: " + e.message),
  });

  const approveMut = trpc.attendance.approveLeave.useMutation({
    onSuccess: () => {
      leavesQuery.refetch();
      toast.success("تم الاعتماد");
    },
    onError: (e) => toast.error("تعذر اعتماد الإجازة: " + e.message),
  });

  const deleteMut = trpc.attendance.deleteLeave.useMutation({
    onSuccess: () => {
      leavesQuery.refetch();
      toast.success("تم الحذف");
    },
    onError: (e) => toast.error("تعذر حذف الإجازة: " + e.message),
  });

  const leaves: any[] = (leavesQuery.data ?? []) as any;

  const dayCount = (from: string, to: string) => {
    const d =
      Math.round(
        (new Date(to).getTime() - new Date(from).getTime()) / 86400000,
      ) + 1;
    return d > 0 ? d : 1;
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="attendance-section mb-4">
        <CardContent className="pt-4">
          <div
            className="flex w-fit max-w-full flex-wrap items-end gap-2"
            dir="rtl"
          >
            <div>
              <label
                htmlFor="attendance-leave-from"
                className="mb-1 block text-sm font-medium"
              >
                من
              </label>
              <DateInput
                id="attendance-leave-from"
                value={filter.from}
                onChange={(e) => setFilter({ ...filter, from: e.target.value })}
                className="w-full bg-background text-sm h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-border px-3 py-2"
              />
            </div>
            <div>
              <label
                htmlFor="attendance-leave-to"
                className="mb-1 block text-sm font-medium"
              >
                إلى
              </label>
              <DateInput
                id="attendance-leave-to"
                value={filter.to}
                onChange={(e) => setFilter({ ...filter, to: e.target.value })}
                className="w-full bg-background text-sm h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-border px-3 py-2"
              />
            </div>
            <div>
              <label
                htmlFor="attendance-leave-employee"
                className="mb-1 block text-sm font-medium"
              >
                الموظف
              </label>
              <select
                id="attendance-leave-employee"
                value={filter.empCd}
                onChange={(e) =>
                  setFilter({ ...filter, empCd: e.target.value })
                }
                className="w-full bg-background text-sm rounded-md border border-border px-3 py-2"
              >
                <option value="">الكل</option>
                {employees.map((e) => (
                  <option key={e.empCd} value={e.empCd}>
                    {e.fullName} ({e.empCd})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 md:justify-end">
              <Button
                onClick={() => leavesQuery.refetch()}
                variant="outline"
                className="min-h-11 px-4"
              >
                بحث
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                className="min-h-11 gap-2 px-4"
              >
                <Plus size={16} /> إضافة إجازة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>
              {editId !== null ? "تعديل الإجازة" : "إضافة إجازة جديدة"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="attendance-leave-form-employee"
                  className="block text-sm font-medium mb-1"
                >
                  الموظف
                </label>
                <select
                  id="attendance-leave-form-employee"
                  value={form.empCd}
                  onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                  className="w-full bg-background text-sm rounded-md border border-border px-3 py-2"
                  required
                  disabled={editId !== null}
                >
                  <option value="">اختر الموظف</option>
                  {employees.map((e) => (
                    <option key={e.empCd} value={e.empCd}>
                      {e.fullName} ({e.empCd})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="attendance-leave-form-type"
                  className="block text-sm font-medium mb-1"
                >
                  نوع الإجازة
                </label>
                <select
                  id="attendance-leave-form-type"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as LeaveType })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(TYPE_LABELS)
                    .filter(([key]) => key !== "unpaid" || editId !== null)
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="attendance-leave-form-from"
                  className="block text-sm font-medium mb-1"
                >
                  من تاريخ
                </label>
                <DateInput
                  id="attendance-leave-form-from"
                  value={form.dateFrom}
                  onChange={(e) =>
                    setForm({ ...form, dateFrom: e.target.value })
                  }
                  className="w-full bg-background text-sm h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-border px-3 py-2"
                />
              </div>
              <div>
                <label
                  htmlFor="attendance-leave-form-to"
                  className="block text-sm font-medium mb-1"
                >
                  إلى تاريخ
                </label>
                <DateInput
                  id="attendance-leave-form-to"
                  value={form.dateTo}
                  onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
                  className="w-full bg-background text-sm h-11 w-full sm:w-[11rem] shrink-0 rounded-md border border-border px-3 py-2"
                />
              </div>
              {form.type === "other" && (
                <p className="md:col-span-2 text-sm text-muted-foreground">
                  تُخصم أيام «أخرى» من رصيد الإجازات المتاح أولًا، وتُخصم الأيام
                  الزائدة من الراتب.
                </p>
              )}
              <div className="md:col-span-2">
                <label
                  htmlFor="attendance-leave-form-note"
                  className="block text-sm font-medium mb-1"
                >
                  ملاحظة
                </label>
                <Input
                  bare
                  id="attendance-leave-form-note"
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full bg-background text-sm rounded-md border border-border px-3 py-2"
                  placeholder="اختياري"
                />
              </div>
              {form.dateFrom && form.dateTo && (
                <div className="md:col-span-2 text-sm font-medium text-primary">
                  عدد الأيام: {dayCount(form.dateFrom, form.dateTo)} يوم
                </div>
              )}
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  id="attendance-leave-form-not-affect-commission"
                  type="checkbox"
                  checked={form.notAffectCommission}
                  onChange={(e) =>
                    setForm({ ...form, notAffectCommission: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <label
                  htmlFor="attendance-leave-form-not-affect-commission"
                  className="text-sm font-medium"
                >
                  لا تؤثر على النسب (مهما كان عدد أيامها)
                </label>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (editId !== null) {
                    updateMut.mutate({
                      leaveId: editId,
                      dateFrom: form.dateFrom,
                      dateTo: form.dateTo,
                      type: form.type,
                      note: form.note || undefined,
                      notAffectCommission: form.notAffectCommission,
                    });
                  } else {
                    createMut.mutate(form);
                  }
                }}
                disabled={
                  !form.empCd || createMut.isPending || updateMut.isPending
                }
              >
                {createMut.isPending || updateMut.isPending
                  ? "جاري الحفظ"
                  : "حفظ"}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="attendance-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            سجل الإجازات ({leaves.length} سجل)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leavesQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !leaves.length ? (
            <div className="py-8 text-center text-muted-foreground">
              لا توجد إجازات
            </div>
          ) : isMobile ? (
            <div className="attendance-compact-register" dir="rtl">
              {leaves.map((l: any) => (
                <div key={l.id} className="attendance-compact-entry">
                  <div className="attendance-compact-date">
                    <span>من</span>
                    <bdi>{l.dateFrom}</bdi>
                  </div>
                  <div className="attendance-compact-body">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-foreground">
                          {l.empName ?? "-"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {l.empCd}
                        </div>
                      </div>
                      {l.approved ? (
                        <span className="flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                          <CheckCircle size={12} />
                          معتمدة
                        </span>
                      ) : (
                        <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning-text">
                          انتظار
                        </span>
                      )}
                    </div>

                    <div className="attendance-compact-facts">
                      <div>
                        <div className="text-muted-foreground">إلى</div>
                        <div className="font-medium text-foreground">
                          {l.dateTo}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">أيام</div>
                        <div className="font-medium text-foreground">
                          {dayCount(l.dateFrom, l.dateTo)}
                        </div>
                      </div>
                    </div>

                    <div className="attendance-compact-note flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {TYPE_LABELS[l.type as LeaveType] ?? l.type}
                      </span>
                      {l.note ? (
                        <span className="break-words text-muted-foreground">
                          {l.note}
                        </span>
                      ) : null}
                    </div>

                    <div className="attendance-compact-actions">
                      {!l.approved && (
                        <Button
                          aria-label="تعديل"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (
                              await askConfirm(
                                `تأكيد اعتماد إجازة ${l.empName ?? l.empCd} من ${l.dateFrom} إلى ${l.dateTo}؟`,
                              )
                            ) {
                              approveMut.mutate({ leaveId: l.id });
                            }
                          }}
                          disabled={approveMut.isPending}
                          className="min-h-10 px-3 text-success border-success/30"
                        >
                          اعتماد
                        </Button>
                      )}
                      <Button
                        aria-label={`تعديل إجازة ${l.empName ?? l.empCd}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(l)}
                        className="h-10 w-10 p-0"
                      >
                        <Pencil size={15} className="text-primary" />
                      </Button>
                      <Button
                        aria-label="حذف"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (
                            await askConfirm(
                              `تأكيد حذف إجازة ${l.empName ?? l.empCd} من ${l.dateFrom} إلى ${l.dateTo}؟`,
                            )
                          ) {
                            deleteMut.mutate({ leaveId: l.id });
                          }
                        }}
                        disabled={deleteMut.isPending}
                        className="h-10 w-10 p-0"
                      >
                        <Trash2 size={15} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              role="region"
              aria-label="جدول بيانات"
              tabIndex={0}
              className="overflow-x-auto"
              dir="rtl"
            >
              <table
                aria-label="طلبات الإجازة"
                dir="rtl"
                className="min-w-[52rem] w-full text-sm"
              >
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th scope="col" className="text-start py-3 px-4">
                      الموظف
                    </th>
                    <th scope="col" className="text-start py-3 px-4">
                      من
                    </th>
                    <th scope="col" className="text-start py-3 px-4">
                      إلى
                    </th>
                    <th scope="col" className="text-start py-3 px-4">
                      أيام
                    </th>
                    <th scope="col" className="text-start py-3 px-4">
                      النوع
                    </th>
                    <th scope="col" className="text-start py-3 px-4">
                      الحالة
                    </th>
                    <th scope="col" className="text-start py-3 px-4">
                      ملاحظة
                    </th>
                    <th scope="col" className="text-start py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l: any) => (
                    <tr key={l.id} className="border-b hover:bg-muted/40">
                      <td className="py-2 px-4">
                        <span className="block font-mono text-xs text-muted-foreground">
                          {l.empCd}
                        </span>
                        <span>{l.empName ?? "-"}</span>
                      </td>
                      <td className="py-2 px-4">{l.dateFrom}</td>
                      <td className="py-2 px-4">{l.dateTo}</td>
                      <td className="py-2 px-4 font-medium">
                        {dayCount(l.dateFrom, l.dateTo)}
                      </td>
                      <td className="py-2 px-4">
                        {TYPE_LABELS[l.type as LeaveType] ?? l.type}
                      </td>
                      <td className="py-2 px-4">
                        {l.approved ? (
                          <span className="flex items-center gap-1 font-medium text-success">
                            <CheckCircle size={14} />
                            معتمدة
                          </span>
                        ) : (
                          <span className="font-medium text-warning-text">
                            انتظار
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-xs text-muted-foreground">
                        {l.note ?? "-"}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          {!l.approved && (
                            <Button
                              aria-label="تعديل"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                if (
                                  await askConfirm(
                                    `تأكيد اعتماد إجازة ${l.empName ?? l.empCd} من ${l.dateFrom} إلى ${l.dateTo}؟`,
                                  )
                                ) {
                                  approveMut.mutate({ leaveId: l.id });
                                }
                              }}
                              disabled={approveMut.isPending}
                              className="min-h-10 px-3 text-success border-success/30"
                            >
                              اعتماد
                            </Button>
                          )}
                          <Button
                            aria-label={`تعديل إجازة ${l.empName ?? l.empCd}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(l)}
                            className="h-10 w-10 p-0"
                          >
                            <Pencil size={15} className="text-primary" />
                          </Button>
                          <Button
                            aria-label="حذف"
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              if (
                                await askConfirm(
                                  `تأكيد حذف إجازة ${l.empName ?? l.empCd} من ${l.dateFrom} إلى ${l.dateTo}؟`,
                                )
                              ) {
                                deleteMut.mutate({ leaveId: l.id });
                              }
                            }}
                            disabled={deleteMut.isPending}
                            className="h-10 w-10 p-0"
                          >
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
