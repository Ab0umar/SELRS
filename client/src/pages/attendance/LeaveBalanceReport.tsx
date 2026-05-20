import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Printer, CalendarCheck, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface EditRow {
  empCd: string;
  annualAllocation: number;
  carryOver: number;
}

export default function LeaveBalanceReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empCd: "", annualAllocation: 21, carryOver: 0 });
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

  const totalAlloc  = rows.reduce((s, r) => s + (r.annualAllocation ?? 0), 0);
  const totalCarry  = rows.reduce((s, r) => s + (r.carryOver ?? 0), 0);
  const totalUsed   = rows.reduce((s, r) => s + (r.usedDays ?? 0), 0);
  const totalRemain = rows.reduce((s, r) => s + (r.remainingDays ?? 0), 0);

  const handleExport = () => {
    if (!rows.length) return;
    const headers = ["الكود","الاسم","الرصيد السنوي","مرحّل","الإجمالي","المستخدم","المتبقي"];
    const csv = [
      headers.join(","),
      ...rows.map((r) => [`"${r.empCd}"`,`"${r.empName ?? ""}"`,r.annualAllocation,r.carryOver,r.total,r.usedDays,r.remainingDays].join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `رصيد-الإجازات-${year}.csv`;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!rows.length) return;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>رصيد الإجازات — ${year}</title>
      <style>body{font-family:Arial,sans-serif;direction:rtl;font-size:12px;}h2{font-size:16px;margin-bottom:4px;}p{font-size:11px;color:#555;margin:0 0 12px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;}th{background:#f0f0f0;font-weight:bold;}tr:nth-child(even){background:#f9f9f9;}tfoot td{font-weight:bold;background:#e8e8e8;}@media print{@page{margin:15mm;}}</style>
      </head><body>
      <h2>رصيد الإجازات السنوية</h2><p>السنة: ${year}</p>
      <table><thead><tr><th>الكود</th><th>الاسم</th><th>الرصيد</th><th>مرحّل</th><th>الإجمالي</th><th>المستخدم</th><th>المتبقي</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${r.empCd}</td><td>${r.empName??""}</td><td>${r.annualAllocation}</td><td>${r.carryOver}</td><td>${r.total}</td><td>${r.usedDays}</td><td>${r.remainingDays}</td></tr>`).join("")}</tbody>
      <tfoot><tr><td colspan="2">الإجمالي</td><td>${totalAlloc}</td><td>${totalCarry}</td><td>${totalAlloc+totalCarry}</td><td>${totalUsed}</td><td>${totalRemain}</td></tr></tfoot>
      </table></body></html>`;
    const win = window.open("","_blank"); if (!win) return;
    win.document.write(html); win.document.close(); win.focus(); win.print();
  };

  const remainColor = (remain: number, total: number) => {
    if (total === 0) return "";
    const pct = remain / total;
    if (pct >= 0.5) return "text-green-600";
    if (pct >= 0.25) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">رصيد الإجازات</h1>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">السنة</label>
              <input type="number" min={2020} max={2099} value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-24 px-3 py-2 border rounded-md" />
            </div>
            <Button onClick={() => query.refetch()} variant="outline">تحديث</Button>
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus size={16} /> تعيين رصيد موظف
            </Button>
            <div className="flex gap-2 mr-auto">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!rows.length} className="gap-2">
                <Download className="w-4 h-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!rows.length} className="gap-2">
                <Printer className="w-4 h-4" /> طباعة
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add / set form */}
      {showForm && (
        <Card className="mb-4 border-blue-200">
          <CardHeader><CardTitle>تعيين رصيد إجازة</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الموظف</label>
                <select value={form.empCd} onChange={(e) => setForm({ ...form, empCd: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md">
                  <option value="">اختر الموظف</option>
                  {employees.map((e) => <option key={e.empCd} value={e.empCd}>{e.fullName} ({e.empCd})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الرصيد السنوي (أيام)</label>
                <input type="number" min={0} max={365} value={form.annualAllocation}
                  onChange={(e) => setForm({ ...form, annualAllocation: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">مرحّل من السنة السابقة</label>
                <input type="number" min={0} max={365} value={form.carryOver}
                  onChange={(e) => setForm({ ...form, carryOver: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              الإجمالي المتاح: <span className="font-semibold">{form.annualAllocation + form.carryOver} يوم</span> — السنة: {year}
            </p>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setBalanceMut.mutate({ empCd: form.empCd, year, annualAllocation: form.annualAllocation, carryOver: form.carryOver })}
                disabled={!form.empCd || setBalanceMut.isPending}>
                {setBalanceMut.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "إجمالي الرصيد",  value: totalAlloc + totalCarry, color: "text-gray-800" },
            { label: "المستخدم",         value: totalUsed,               color: "text-yellow-600" },
            { label: "المتبقي",          value: totalRemain,             color: "text-green-600" },
            { label: "عدد الموظفين",    value: rows.length,             color: "text-blue-600" },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-4 pb-4 px-4">
                <div className="text-xs text-muted-foreground mb-1">{c.label}</div>
                <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            رصيد إجازات {year} — {rows.length} موظف
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !rows.length ? (
            <div className="text-center py-10 text-gray-500">
              لا توجد بيانات رصيد لهذه السنة.
              <br />
              <span className="text-xs">اضغط "تعيين رصيد موظف" لإضافة رصيد.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right py-3 px-4">الكود</th>
                    <th className="text-right py-3 px-4">الاسم</th>
                    <th className="text-right py-3 px-4">الرصيد</th>
                    <th className="text-right py-3 px-4">مرحّل</th>
                    <th className="text-right py-3 px-4">الإجمالي</th>
                    <th className="text-right py-3 px-4 text-yellow-700">مستخدم</th>
                    <th className="text-right py-3 px-4 text-green-700">متبقي</th>
                    <th className="text-right py-3 px-4">%</th>
                    <th className="text-right py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => {
                    const pct = r.total > 0 ? Math.round((r.usedDays / r.total) * 100) : 0;
                    const isEditingThis = editing?.empCd === r.empCd;
                    return (
                      <tr key={r.empCd} className={`border-b hover:bg-gray-50 ${isEditingThis ? "bg-blue-50" : ""}`}>
                        <td className="py-2 px-4 font-mono text-xs">{r.empCd}</td>
                        <td className="py-2 px-4 font-medium">{r.empName ?? "—"}</td>

                        {isEditingThis ? (
                          <>
                            <td className="py-1 px-2">
                              <input type="number" min={0} max={365} value={editing!.annualAllocation}
                                onChange={(e) => setEditing({ ...editing!, annualAllocation: parseInt(e.target.value)||0 })}
                                className="w-16 px-2 py-1 border rounded text-sm" />
                            </td>
                            <td className="py-1 px-2">
                              <input type="number" min={0} max={365} value={editing!.carryOver}
                                onChange={(e) => setEditing({ ...editing!, carryOver: parseInt(e.target.value)||0 })}
                                className="w-16 px-2 py-1 border rounded text-sm" />
                            </td>
                            <td className="py-2 px-4 font-semibold">{editing!.annualAllocation + editing!.carryOver}</td>
                            <td className="py-2 px-4 text-yellow-700">{r.usedDays}</td>
                            <td className="py-2 px-4">{Math.max(0,(editing!.annualAllocation+editing!.carryOver)-r.usedDays)}</td>
                            <td className="py-2 px-4"></td>
                            <td className="py-2 px-4">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600"
                                  onClick={() => setBalanceMut.mutate({ empCd: editing!.empCd, year, annualAllocation: editing!.annualAllocation, carryOver: editing!.carryOver })}
                                  disabled={setBalanceMut.isPending}>
                                  <Check size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400"
                                  onClick={() => setEditing(null)}>
                                  <X size={14} />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 px-4">{r.annualAllocation}</td>
                            <td className="py-2 px-4 text-gray-500">{r.carryOver}</td>
                            <td className="py-2 px-4 font-semibold">{r.total}</td>
                            <td className="py-2 px-4 text-yellow-700 font-medium">{r.usedDays}</td>
                            <td className={`py-2 px-4 font-bold ${remainColor(r.remainingDays, r.total)}`}>{r.remainingDays}</td>
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(pct,100)}%` }} />
                                </div>
                                <span className="text-xs text-gray-500">{pct}%</span>
                              </div>
                            </td>
                            <td className="py-2 px-4">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                                onClick={() => setEditing({ empCd: r.empCd, annualAllocation: r.annualAllocation, carryOver: r.carryOver })}>
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
                  <tr className="border-t-2 bg-gray-100 font-bold">
                    <td className="py-2 px-4" colSpan={2}>الإجمالي</td>
                    <td className="py-2 px-4">{totalAlloc}</td>
                    <td className="py-2 px-4 text-gray-500">{totalCarry}</td>
                    <td className="py-2 px-4">{totalAlloc + totalCarry}</td>
                    <td className="py-2 px-4 text-yellow-700">{totalUsed}</td>
                    <td className="py-2 px-4 text-green-700">{totalRemain}</td>
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
