import { useState } from "react";
import {
  CalendarCheck,
  Check,
  Download,
  Pencil,
  Plus,
  Printer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface EditRow {
  empCd: string;
  annualAllocation: number;
  carryOver: number;
}

const toneForBalance = (remaining: number, total: number) => {
  if (total === 0)
    return "border-muted-foreground/20 bg-muted/70 text-foreground";
  const pct = remaining / total;
  if (pct >= 0.5) return "border-success/20 bg-success/10 text-success";
  if (pct >= 0.25) return "border-warning/30 bg-warning/10 text-warning";
  return "border-destructive/20 bg-destructive/10 text-destructive";
};

export default function LeaveBalanceReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    empCd: "",
    annualAllocation: 21,
    carryOver: 0,
  });
  const [editing, setEditing] = useState<EditRow | null>(null);

  const query = trpc.attendance.allLeaveBalances.useQuery({ year });
  const empsQuery = trpc.attendance.employeesList.useQuery();
  const rows: any[] = (query.data as any[]) ?? [];
  const employees: any[] = (empsQuery.data?.employees ?? []) as any;

  const setBalanceMut = trpc.attendance.setLeaveBalance.useMutation({
    onSuccess: () => {
      query.refetch();
      setShowForm(false);
      setEditing(null);
      setForm({ empCd: "", annualAllocation: 21, carryOver: 0 });
      toast.success("تم حفظ الرصيد");
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const totalAlloc = rows.reduce(
    (sum, row) => sum + (row.annualAllocation ?? 0),
    0,
  );
  const totalCarry = rows.reduce((sum, row) => sum + (row.carryOver ?? 0), 0);
  const totalUsed = rows.reduce((sum, row) => sum + (row.usedDays ?? 0), 0);
  const totalRemain = rows.reduce(
    (sum, row) => sum + (row.remainingDays ?? 0),
    0,
  );

  const handleExport = () => {
    if (!rows.length) return;
    const headers = [
      "الكود",
      "الاسم",
      "الرصيد السنوي",
      "مرحّل",
      "الإجمالي",
      "المستخدم",
      "المتبقي",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        [
          `"${row.empCd}"`,
          `"${row.empName ?? ""}"`,
          row.annualAllocation,
          row.carryOver,
          row.total,
          row.usedDays,
          row.remainingDays,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `رصيد-الإجازات-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!rows.length) return;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>رصيد الإجازات: ${year}</title>
      <style>
        body{font-family:Arial,sans-serif;direction:rtl;font-size:12px;}
        h2{font-size:16px;margin-bottom:4px;color:#003d82;}
        p{font-size:11px;color:#4b5563;margin:0 0 12px;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:right;}
        th{background:#e8f0f8;font-weight:bold;color:#001f47;}
        tr:nth-child(even){background:#f8fafc;}
        tfoot td{font-weight:bold;background:#dbeafe;}
        @media print{@page{margin:15mm;}}
      </style>
      </head><body>
      <h2>رصيد الإجازات السنوية</h2><p>السنة: ${year}</p>
      <table><thead><tr><th>الكود</th><th>الاسم</th><th>الرصيد</th><th>مرحّل</th><th>الإجمالي</th><th>المستخدم</th><th>المتبقي</th></tr></thead>
      <tbody>${rows
        .map(
          (row) =>
            `<tr><td>${row.empCd}</td><td>${row.empName ?? ""}</td><td>${row.annualAllocation}</td><td>${row.carryOver}</td><td>${row.total}</td><td>${row.usedDays}</td><td>${row.remainingDays}</td></tr>`,
        )
        .join("")}</tbody>
      <tfoot><tr><td colspan="2">الإجمالي</td><td>${totalAlloc}</td><td>${totalCarry}</td><td>${totalAlloc + totalCarry}</td><td>${totalUsed}</td><td>${totalRemain}</td></tr></tfoot>
      </table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="mx-auto max-w-5xl p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">رصيد الإجازات</h1>
          <p className="text-sm text-muted-foreground">
            ألوان الرصيد توضح سريعًا من لديه فائض، ومن يقترب من النفاد.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
          <CalendarCheck className="h-3.5 w-3.5" />
          {year}
        </span>
      </div>

      <Card className="mb-6 border-border bg-muted/20">
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-muted-foreground">
                السنة
              </label>
              <input
                type="number"
                min={2020}
                max={2099}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <Button
              onClick={() => query.refetch()}
              variant="outline"
              className="border-primary/20 text-primary hover:bg-primary/10"
            >
              تحديث
            </Button>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} /> تعيين رصيد موظف
            </Button>
            <div className="mr-auto flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!rows.length}
                className="gap-2 border-info/20 text-info hover:bg-info/10"
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!rows.length}
                className="gap-2 border-secondary/20 text-secondary hover:bg-secondary/10"
              >
                <Printer className="h-4 w-4" /> طباعة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-4 border-border bg-background">
          <CardHeader>
            <CardTitle className="text-foreground">تعيين رصيد إجازة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-muted-foreground">
                  الموظف
                </label>
                <select
                  value={form.empCd}
                  onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                >
                  <option value="">اختر الموظف</option>
                  {employees.map((employee) => (
                    <option key={employee.empCd} value={employee.empCd}>
                      {employee.fullName} ({employee.empCd})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-muted-foreground">
                  الرصيد السنوي (أيام)
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={form.annualAllocation}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      annualAllocation: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:ring-2 focus:ring-success/15"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-muted-foreground">
                  مرحّل من السنة السابقة
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={form.carryOver}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      carryOver: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-info focus:ring-2 focus:ring-info/15"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              الإجمالي المتاح:{" "}
              <span className="font-semibold text-foreground">
                {form.annualAllocation + form.carryOver} يوم
              </span>{" "}
              ، السنة: {year}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() =>
                  setBalanceMut.mutate({
                    empCd: form.empCd,
                    year,
                    annualAllocation: form.annualAllocation,
                    carryOver: form.carryOver,
                  })
                }
                disabled={!form.empCd || setBalanceMut.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {setBalanceMut.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="border-border"
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            {
              label: "إجمالي الرصيد",
              value: totalAlloc + totalCarry,
              tone: "primary",
            },
            { label: "المستخدم", value: totalUsed, tone: "warning" },
            { label: "المتبقي", value: totalRemain, tone: "success" },
            { label: "عدد الموظفين", value: rows.length, tone: "info" },
          ].map((card) => (
            <Card key={card.label} className="border-border bg-background">
              <CardContent className="space-y-2 px-4 py-4">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    card.tone === "primary"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : card.tone === "warning"
                        ? "border-warning/30 bg-warning/10 text-warning"
                        : card.tone === "success"
                          ? "border-success/20 bg-success/10 text-success"
                          : "border-info/20 bg-info/10 text-info"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full bg-current"
                    aria-hidden
                  />
                  {card.label}
                </div>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    card.tone === "primary"
                      ? "text-primary"
                      : card.tone === "warning"
                        ? "text-warning"
                        : card.tone === "success"
                          ? "text-success"
                          : "text-info"
                  }`}
                >
                  {card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CalendarCheck className="h-5 w-5 text-success" />
            رصيد إجازات {year} ، {rows.length} موظف
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !rows.length ? (
            <div className="py-10 text-center text-muted-foreground">
              لا توجد بيانات رصيد لهذه السنة.
              <br />
              <span className="text-xs">
                اضغط "تعيين رصيد موظف" لإضافة رصيد.
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الكود
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الاسم
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-primary">
                      الرصيد
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-info">
                      مرحّل
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الإجمالي
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-warning">
                      مستخدم
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-success">
                      متبقي
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      %
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any) => {
                    const pct =
                      row.total > 0
                        ? Math.round((row.usedDays / row.total) * 100)
                        : 0;
                    const isEditingThis = editing?.empCd === row.empCd;

                    return (
                      <tr
                        key={row.empCd}
                        className={`border-b transition-colors hover:bg-muted/30 ${
                          isEditingThis ? "bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {row.empCd}
                        </td>
                        <td className="px-4 py-2 font-medium text-foreground">
                          {row.empName ?? "-"}
                        </td>

                        {isEditingThis ? (
                          <>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={0}
                                max={365}
                                value={editing!.annualAllocation}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing!,
                                    annualAllocation:
                                      parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-16 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-success focus:ring-2 focus:ring-success/15"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={0}
                                max={365}
                                value={editing!.carryOver}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing!,
                                    carryOver: parseInt(e.target.value) || 0,
                                  })
                                }
                                className="w-16 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-info focus:ring-2 focus:ring-info/15"
                              />
                            </td>
                            <td className="px-4 py-2 font-semibold text-foreground">
                              {editing!.annualAllocation + editing!.carryOver}
                            </td>
                            <td className="px-4 py-2 text-warning">
                              {row.usedDays}
                            </td>
                            <td className="px-4 py-2 text-success">
                              {Math.max(
                                0,
                                editing!.annualAllocation +
                                  editing!.carryOver -
                                  row.usedDays,
                              )}
                            </td>
                            <td className="px-4 py-2"></td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-success hover:bg-success/10"
                                  onClick={() =>
                                    setBalanceMut.mutate({
                                      empCd: editing!.empCd,
                                      year,
                                      annualAllocation:
                                        editing!.annualAllocation,
                                      carryOver: editing!.carryOver,
                                    })
                                  }
                                  disabled={setBalanceMut.isPending}
                                  aria-label={`حفظ رصيد الموظف ${editing!.empCd}`}
                                >
                                  <Check size={14} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                  onClick={() => setEditing(null)}
                                  aria-label="إلغاء التعديل"
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-primary">
                              {row.annualAllocation}
                            </td>
                            <td className="px-4 py-2 text-info">
                              {row.carryOver}
                            </td>
                            <td className="px-4 py-2 font-semibold text-foreground">
                              {row.total}
                            </td>
                            <td className="px-4 py-2 text-warning font-medium">
                              {row.usedDays}
                            </td>
                            <td
                              className={`px-4 py-2 font-bold ${toneForBalance(row.remainingDays, row.total)}`}
                            >
                              {row.remainingDays}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full ${
                                      row.remainingDays > row.total * 0.5
                                        ? "bg-success"
                                        : row.remainingDays > row.total * 0.25
                                          ? "bg-warning"
                                          : "bg-destructive"
                                    }`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                onClick={() =>
                                  setEditing({
                                    empCd: row.empCd,
                                    annualAllocation: row.annualAllocation,
                                    carryOver: row.carryOver,
                                  })
                                }
                                aria-label={`تعديل رصيد الموظف ${row.empName ?? row.empCd}`}
                              >
                                <Pencil size={14} />
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-info/5 font-bold">
                    <td className="px-4 py-2" colSpan={2}>
                      الإجمالي
                    </td>
                    <td className="px-4 py-2 text-primary">{totalAlloc}</td>
                    <td className="px-4 py-2 text-info">{totalCarry}</td>
                    <td className="px-4 py-2">{totalAlloc + totalCarry}</td>
                    <td className="px-4 py-2 text-warning">{totalUsed}</td>
                    <td className="px-4 py-2 text-success">{totalRemain}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
