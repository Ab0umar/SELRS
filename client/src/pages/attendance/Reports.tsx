import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Calendar, Printer } from "lucide-react";

type ReportTab = "summary" | "late" | "absent" | "ot" | "permissions";

const todayStr = new Date().toISOString().split("T")[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .split("T")[0];

export default function Reports() {
  const [dates, setDates] = useState({ from: firstOfMonth, to: todayStr });
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");

  // Year/month for permission report
  const selectedDate = new Date(dates.from);
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const tableRef = useRef<HTMLDivElement>(null);

  const rangeQuery = trpc.attendance.rangeReport.useQuery({ from: dates.from, to: dates.to });
  const permQuery = trpc.attendance.permissionReport.useQuery({ year, month });

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const data = rangeQuery.data ?? [];
  const perms = permQuery.data ?? [];

  const summaryData = data.map((r: any) => ({
    كود: r.empCd,
    الاسم: r.empName ?? "—",
    أيام: r.totalDays,
    حاضر: r.presentDays,
    غائب: r.absentDays,
    إجازة: r.leaveDays,
    "تأخير (د)": r.totalLateMins,
    "مبكر (د)": r.totalEarlyMins,
    "إضافي (د)": r.totalOTMins,
  }));

  const lateData = data
    .filter((r: any) => r.totalLateMins > 0)
    .map((r: any) => ({ كود: r.empCd, الاسم: r.empName ?? "—", "تأخير (د)": r.totalLateMins }))
    .sort((a: any, b: any) => b["تأخير (د)"] - a["تأخير (د)"]);

  const absentData = data
    .filter((r: any) => r.absentDays > 0)
    .map((r: any) => ({ كود: r.empCd, الاسم: r.empName ?? "—", غياب: r.absentDays }))
    .sort((a: any, b: any) => b.غياب - a.غياب);

  const otData = data
    .filter((r: any) => r.totalOTMins > 0)
    .map((r: any) => ({
      كود: r.empCd,
      الاسم: r.empName ?? "—",
      "ساعات إضافية": (r.totalOTMins / 60).toFixed(2),
    }))
    .sort((a: any, b: any) => parseFloat(b["ساعات إضافية"]) - parseFloat(a["ساعات إضافية"]));

  const permData = (perms as any[]).map((p) => ({
    كود: p.empCd,
    الاسم: p.empName ?? "—",
    "أذونات دخول": p.inCount,
    "مجموع دخول (د)": p.totalInMins,
    "أذونات خروج": p.outCount,
    "مجموع خروج (د)": p.totalOutMins,
  }));

  const handlePrint = () => {
    const rows = activeData();
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const tabLabel = tabs.find((t) => t.key === activeTab)?.label ?? activeTab;
    const html = `
      <!DOCTYPE html><html dir="rtl" lang="ar">
      <head><meta charset="utf-8"/><title>تقرير الحضور - ${tabLabel}</title>
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; font-size: 12px; }
        h2 { font-size: 16px; margin-bottom: 4px; }
        p { font-size: 11px; color: #555; margin: 0 0 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
        th { background: #f0f0f0; font-weight: bold; }
        tr:nth-child(even) { background: #f9f9f9; }
        @media print { @page { margin: 15mm; } }
      </style></head>
      <body>
        <h2>تقرير الحضور — ${tabLabel}</h2>
        <p>الفترة: ${dates.from} إلى ${dates.to}</p>
        <table>
          <thead><tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((r: any) => `<tr>${cols.map((c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const renderTable = (rows: any[]) => {
    if (!rows.length) return <div className="text-center py-8 text-gray-500">لا توجد بيانات</div>;
    const cols = Object.keys(rows[0]);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-gray-50">
              {cols.map((c) => <th key={c} className="text-right py-3 px-4 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                {cols.map((c) => <td key={c} className="py-2 px-4 text-right">{row[c]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "summary", label: "ملخص" },
    { key: "late", label: "التأخير" },
    { key: "absent", label: "الغياب" },
    { key: "ot", label: "الساعات الإضافية" },
    { key: "permissions", label: "الأذونات" },
  ];

  const activeData = () => {
    if (activeTab === "summary") return summaryData;
    if (activeTab === "late") return lateData;
    if (activeTab === "absent") return absentData;
    if (activeTab === "ot") return otData;
    if (activeTab === "permissions") return permData;
    return [];
  };

  const isLoading = activeTab === "permissions" ? permQuery.isLoading : rangeQuery.isLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6">تقارير الحضور</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            اختيار الفترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="block text-sm font-medium mb-1">من</label>
              <input type="date" value={dates.from} onChange={(e) => setDates({ ...dates, from: e.target.value })} className="px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">إلى</label>
              <input type="date" value={dates.to} onChange={(e) => setDates({ ...dates, to: e.target.value })} className="px-3 py-2 border rounded-md" />
            </div>
            <Button onClick={() => { rangeQuery.refetch(); permQuery.refetch(); }} variant="outline">تحديث</Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">تقرير الأذونات يعرض الشهر المحدد في تاريخ البداية: {year}/{String(month).padStart(2,"0")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex gap-2 border-b overflow-x-auto">
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === key ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExportCSV(activeData(), `تقرير-${activeTab}-${dates.from}-${dates.to}.csv`)} disabled={!activeData().length} className="gap-2">
              <Download className="w-4 h-4" /> تصدير CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={!activeData().length} className="gap-2">
              <Printer className="w-4 h-4" /> طباعة / PDF
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : renderTable(activeData())}
        </CardContent>
      </Card>
    </div>
  );
}
