import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Calendar, Printer } from "lucide-react";

type ReportTab =
  | "summary"
  | "late"
  | "absent"
  | "ot"
  | "permissions"
  | "leaves"
  | "monthly";

const todayStr = new Date().toISOString().split("T")[0];
const firstOfMonth = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1,
)
  .toISOString()
  .split("T")[0];

export default function Reports() {
  const [dates, setDates] = useState({ from: firstOfMonth, to: todayStr });
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const [balanceYear, setBalanceYear] = useState(new Date().getFullYear());

  const selectedDate = new Date(dates.from);
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;

  const rangeQuery = trpc.attendance.rangeReport.useQuery({
    from: dates.from,
    to: dates.to,
  });
  const permQuery = trpc.attendance.permissionReport.useQuery({ year, month });
  const balanceQuery = trpc.attendance.allLeaveBalances.useQuery({
    year: balanceYear,
  });

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row: any) =>
        headers.map((h) => `"${row[h] ?? ""}"`).join(","),
      ),
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

  const handlePrint = (rows: any[], title: string) => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>${escapeHtml(title)}</title>
      <style>
        body{font-family:Arial,sans-serif;direction:rtl;font-size:12px;}
        h2{font-size:16px;margin-bottom:4px;}
        p{font-size:11px;color:#555;margin:0 0 12px;}
        table{width:100%;border-collapse:collapse;}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;}
        th{background:#f0f0f0;font-weight:bold;}
        tr:nth-child(even){background:#f9f9f9;}
        @media print{@page{margin:15mm;}}
      </style></head><body>
      <h2>${escapeHtml(title)}</h2>
      <p>الفترة: ${escapeHtml(dates.from)} إلى ${escapeHtml(dates.to)}</p>
      <table><thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
      <tbody>${rows
        .map(
          (r: any) =>
            `<tr>${cols.map((c) => `<td>${escapeHtml(r[c])}</td>`).join("")}</tr>`,
        )
        .join("")}</tbody>
      </table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const data: any[] = rangeQuery.data ?? [];
  const perms: any[] = (permQuery.data as any[]) ?? [];
  const balances: any[] = (balanceQuery.data as any[]) ?? [];

  // Build a permission lookup: empCd → { totalInMins, totalOutMins }
  const permByEmp = new Map<string, { inMins: number; outMins: number }>();
  for (const p of perms) {
    permByEmp.set(p.empCd, {
      inMins: p.totalInMins ?? 0,
      outMins: p.totalOutMins ?? 0,
    });
  }

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

  const monthlyData = data.map((r: any) => {
    const perm = permByEmp.get(r.empCd);
    return {
      كود: r.empCd,
      الاسم: r.empName ?? "—",
      حاضر: r.presentDays,
      غائب: r.absentDays,
      إجازة: r.leaveDays,
      "تأخير (د)": r.totalLateMins,
      "مبكر (د)": r.totalEarlyMins,
      "إضافي (د)": r.totalOTMins,
      "إذن دخول (د)": perm?.inMins ?? 0,
      "إذن خروج (د)": perm?.outMins ?? 0,
    };
  });

  const lateData = data
    .filter((r: any) => r.totalLateMins > 0)
    .map((r: any) => ({
      كود: r.empCd,
      الاسم: r.empName ?? "—",
      "تأخير (د)": r.totalLateMins,
    }))
    .sort((a: any, b: any) => b["تأخير (د)"] - a["تأخير (د)"]);

  const absentData = data
    .filter((r: any) => r.absentDays > 0)
    .map((r: any) => ({
      كود: r.empCd,
      الاسم: r.empName ?? "—",
      غياب: r.absentDays,
    }))
    .sort((a: any, b: any) => b.غياب - a.غياب);

  const otData = data
    .filter((r: any) => r.totalOTMins > 0)
    .map((r: any) => ({
      كود: r.empCd,
      الاسم: r.empName ?? "—",
      "ساعات إضافية": (r.totalOTMins / 60).toFixed(2),
    }))
    .sort(
      (a: any, b: any) =>
        parseFloat(b["ساعات إضافية"]) - parseFloat(a["ساعات إضافية"]),
    );

  const permData = perms.map((p: any) => ({
    كود: p.empCd,
    الاسم: p.empName ?? "—",
    "أذونات دخول": p.inCount,
    "مجموع دخول (د)": p.totalInMins,
    "أذونات خروج": p.outCount,
    "مجموع خروج (د)": p.totalOutMins,
  }));

  const balanceData = balances.map((b: any) => ({
    كود: b.empCd,
    الاسم: b.empName ?? "—",
    "الرصيد السنوي": b.annualAllocation,
    مرحّل: b.carryOver,
    الإجمالي: b.total,
    المستخدم: b.usedDays,
    المتبقي: b.remainingDays,
  }));

  const renderTable = (rows: any[]) => {
    if (!rows.length)
      return (
        <div className="text-center py-8 text-gray-500">لا توجد بيانات</div>
      );
    const cols = Object.keys(rows[0]);
    return (
      <div className="overflow-x-auto">
        <table className="min-w-[42rem] w-full text-sm" dir="rtl">
          <thead>
            <tr className="border-b bg-muted/50">
              {cols.map((c) => (
                <th
                  key={c}
                  className="text-right py-3 px-4 font-semibold text-foreground"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={i} className="border-b hover:bg-muted/40">
                {cols.map((c) => (
                  <td key={c} className="py-2 px-4 text-right">
                    {row[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "monthly", label: "شهري موسع" },
    { key: "summary", label: "ملخص" },
    { key: "late", label: "التأخير" },
    { key: "absent", label: "الغياب" },
    { key: "ot", label: "الإضافي" },
    { key: "permissions", label: "الأذونات" },
    { key: "leaves", label: "رصيد الإجازات" },
  ];

  const activeRows = () => {
    if (activeTab === "summary") return summaryData;
    if (activeTab === "monthly") return monthlyData;
    if (activeTab === "late") return lateData;
    if (activeTab === "absent") return absentData;
    if (activeTab === "ot") return otData;
    if (activeTab === "permissions") return permData;
    if (activeTab === "leaves") return balanceData;
    return [];
  };

  const isLoading =
    activeTab === "leaves"
      ? balanceQuery.isLoading
      : rangeQuery.isLoading ||
        (activeTab === "permissions" || activeTab === "monthly"
          ? permQuery.isLoading
          : false);

  const activeLabel = tabs.find((t) => t.key === activeTab)?.label ?? "";

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
            <div className="min-w-[10rem] flex-1 sm:flex-none">
              <label
                htmlFor="attendance-report-from"
                className="block text-sm font-medium mb-1"
              >
                من
              </label>
              <input
                id="attendance-report-from"
                type="date"
                value={dates.from}
                onChange={(e) => setDates({ ...dates, from: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-[10rem] flex-1 sm:flex-none">
              <label
                htmlFor="attendance-report-to"
                className="block text-sm font-medium mb-1"
              >
                إلى
              </label>
              <input
                id="attendance-report-to"
                type="date"
                value={dates.to}
                onChange={(e) => setDates({ ...dates, to: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              onClick={() => {
                rangeQuery.refetch();
                permQuery.refetch();
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              تحديث
            </Button>

            {activeTab === "leaves" && (
              <div className="flex flex-wrap items-end gap-2 mr-auto">
                <div className="min-w-[9rem]">
                  <label
                    htmlFor="attendance-balance-year"
                    className="block text-sm font-medium mb-1"
                  >
                    سنة الرصيد
                  </label>
                  <input
                    id="attendance-balance-year"
                    type="number"
                    min={2020}
                    max={2099}
                    value={balanceYear}
                    onChange={(e) => setBalanceYear(parseInt(e.target.value))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button
                  onClick={() => balanceQuery.refetch()}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  تحديث
                </Button>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            الشهر المحدد للأذونات والتقرير الشهري: {year}/
            {String(month).padStart(2, "0")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div
            role="tablist"
            aria-label="أنواع التقارير"
            className="flex gap-1 border-b overflow-x-auto flex-wrap"
          >
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                id={`attendance-report-tab-${key}`}
                role="tab"
                aria-selected={activeTab === key}
                aria-controls={`attendance-report-panel-${key}`}
                tabIndex={activeTab === key ? 0 : -1}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 font-medium whitespace-nowrap text-sm border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExportCSV(
                  activeRows(),
                  `${activeLabel}-${dates.from}-${dates.to}.csv`,
                )
              }
              disabled={!activeRows().length}
              className="gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" /> تصدير CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint(activeRows(), activeLabel)}
              disabled={!activeRows().length}
              className="gap-2 w-full sm:w-auto"
            >
              <Printer className="w-4 h-4" /> طباعة / PDF
            </Button>
          </div>
          <div
            id={`attendance-report-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`attendance-report-tab-${activeTab}`}
          >
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              renderTable(activeRows())
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
