import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Printer, Clock } from "lucide-react";

const thisYear = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

export default function PermissionReport() {
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(thisMonth);

  const query = trpc.attendance.permissionReport.useQuery({ year, month });
  const rows: any[] = (query.data as any[]) ?? [];

  const totalInCount = rows.reduce((s, r) => s + (r.inCount ?? 0), 0);
  const totalOutCount = rows.reduce((s, r) => s + (r.outCount ?? 0), 0);
  const totalInMins = rows.reduce((s, r) => s + (r.totalInMins ?? 0), 0);
  const totalOutMins = rows.reduce((s, r) => s + (r.totalOutMins ?? 0), 0);

  const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  const handleExport = () => {
    if (!rows.length) return;
    const headers = ["الكود","الاسم","أذونات دخول","مجموع دخول (د)","أذونات خروج","مجموع خروج (د)","إجمالي (د)"];
    const csv = [
      headers.join(","),
      ...rows.map((r) => [
        `"${r.empCd}"`,
        `"${r.empName ?? ""}"`,
        r.inCount,
        r.totalInMins,
        r.outCount,
        r.totalOutMins,
        (r.totalInMins ?? 0) + (r.totalOutMins ?? 0),
      ].join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-الأذونات-${year}-${String(month).padStart(2,"0")}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!rows.length) return;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>تقرير الأذونات — ${MONTHS[month-1]} ${year}</title>
      <style>
        body{font-family:Arial,sans-serif;direction:rtl;font-size:12px;}
        h2{font-size:16px;margin-bottom:4px;}
        p{font-size:11px;color:#555;margin:0 0 12px;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;}
        th{background:#f0f0f0;font-weight:bold;}
        tr:nth-child(even){background:#f9f9f9;}
        tfoot td{font-weight:bold;background:#e8e8e8;}
        @media print{@page{margin:15mm;}}
      </style></head><body>
      <h2>تقرير الأذونات</h2>
      <p>${MONTHS[month-1]} ${year}</p>
      <table>
        <thead><tr>
          <th>الكود</th><th>الاسم</th>
          <th>أذونات دخول</th><th>دقائق دخول</th>
          <th>أذونات خروج</th><th>دقائق خروج</th>
          <th>إجمالي دقائق</th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>
            <td>${r.empCd}</td><td>${r.empName ?? "—"}</td>
            <td>${r.inCount}</td><td>${r.totalInMins}</td>
            <td>${r.outCount}</td><td>${r.totalOutMins}</td>
            <td>${(r.totalInMins ?? 0)+(r.totalOutMins ?? 0)}</td>
          </tr>`).join("")}
        </tbody>
        <tfoot><tr>
          <td colspan="2">الإجمالي</td>
          <td>${totalInCount}</td><td>${totalInMins}</td>
          <td>${totalOutCount}</td><td>${totalOutMins}</td>
          <td>${totalInMins+totalOutMins}</td>
        </tr></tfoot>
      </table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">تقرير الأذونات</h1>

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
            <div>
              <label className="block text-sm font-medium mb-1">الشهر</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-md">
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
            <Button onClick={() => query.refetch()} variant="outline">تحديث</Button>
            <div className="flex gap-2 mr-auto">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!rows.length} className="gap-2">
                <Download className="w-4 h-4" /> تصدير CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={!rows.length} className="gap-2">
                <Printer className="w-4 h-4" /> طباعة / PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "عدد أذونات الدخول",    value: totalInCount,              color: "text-blue-600" },
            { label: "دقائق أذونات الدخول",  value: `${totalInMins} د`,        color: "text-blue-700" },
            { label: "عدد أذونات الخروج",    value: totalOutCount,             color: "text-orange-600" },
            { label: "دقائق أذونات الخروج",  value: `${totalOutMins} د`,       color: "text-orange-700" },
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
            <Clock className="w-5 h-5" />
            {MONTHS[month-1]} {year} — {rows.length} موظف
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !rows.length ? (
            <div className="text-center py-10 text-gray-500">لا توجد أذونات لهذا الشهر</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-right py-3 px-4">الكود</th>
                    <th className="text-right py-3 px-4">الاسم</th>
                    <th className="text-right py-3 px-4 text-blue-700">أذونات دخول</th>
                    <th className="text-right py-3 px-4 text-blue-700">دقائق دخول</th>
                    <th className="text-right py-3 px-4 text-orange-700">أذونات خروج</th>
                    <th className="text-right py-3 px-4 text-orange-700">دقائق خروج</th>
                    <th className="text-right py-3 px-4">إجمالي (د)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.empCd} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-mono text-xs">{r.empCd}</td>
                      <td className="py-2 px-4 font-medium">{r.empName ?? "—"}</td>
                      <td className="py-2 px-4 text-blue-700">{r.inCount}</td>
                      <td className="py-2 px-4 text-blue-700">{r.totalInMins}</td>
                      <td className="py-2 px-4 text-orange-700">{r.outCount}</td>
                      <td className="py-2 px-4 text-orange-700">{r.totalOutMins}</td>
                      <td className="py-2 px-4 font-semibold">{(r.totalInMins ?? 0) + (r.totalOutMins ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-gray-100 font-bold">
                    <td className="py-2 px-4" colSpan={2}>الإجمالي</td>
                    <td className="py-2 px-4 text-blue-700">{totalInCount}</td>
                    <td className="py-2 px-4 text-blue-700">{totalInMins}</td>
                    <td className="py-2 px-4 text-orange-700">{totalOutCount}</td>
                    <td className="py-2 px-4 text-orange-700">{totalOutMins}</td>
                    <td className="py-2 px-4">{totalInMins + totalOutMins}</td>
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
