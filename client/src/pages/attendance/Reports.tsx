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
  const permQuery = trpc.attendance.permissionReport.useQuery({ from: dates.from, to: dates.to });
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

  const summaryData = data.map((r: any) => {
    const perm = permByEmp.get(r.empCd);
    return {
      كود: r.empCd,
      الاسم: r.empName ?? "-",
      أيام: r.totalDays,
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

  const monthlyData = data.map((r: any) => {
    const perm = permByEmp.get(r.empCd);
    return {
      كود: r.empCd,
      الاسم: r.empName ?? "-",
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
      الاسم: r.empName ?? "-",
      "تأخير (د)": r.totalLateMins,
    }))
    .sort((a: any, b: any) => b["تأخير (د)"] - a["تأخير (د)"]);

  const absentData = data
    .filter((r: any) => r.absentDays > 0)
    .map((r: any) => ({
      كود: r.empCd,
      الاسم: r.empName ?? "-",
      غياب: r.absentDays,
    }))
    .sort((a: any, b: any) => b.غياب - a.غياب);

  const otData = data
    .filter((r: any) => r.totalOTMins > 0)
    .map((r: any) => ({
      كود: r.empCd,
      الاسم: r.empName ?? "-",
      "ساعات إضافية": (r.totalOTMins / 60).toFixed(2),
    }))
    .sort(
      (a: any, b: any) =>
        parseFloat(b["ساعات إضافية"]) - parseFloat(a["ساعات إضافية"]),
    );

  const permData = perms.map((p: any) => ({
    كود: p.empCd,
    الاسم: p.empName ?? "-",
    "أذونات دخول": p.inCount,
    "مجموع دخول (د)": p.totalInMins,
    "أذونات خروج": p.outCount,
    "مجموع خروج (د)": p.totalOutMins,
  }));

  const balanceData = balances.map((b: any) => ({
    كود: b.empCd,
    الاسم: b.empName ?? "-",
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

  const tabToneClasses: Record<ReportTab, string> = {
    summary: "border-primary/20 bg-primary/10 text-primary",
    monthly: "border-info/20 bg-info/10 text-info",
    late: "border-destructive/20 bg-destructive/10 text-destructive",
    absent: "border-warning/30 bg-warning/10 text-warning",
    ot: "border-success/20 bg-success/10 text-success",
    permissions: "border-secondary/20 bg-secondary/10 text-secondary",
    leaves: "border-muted-foreground/20 bg-muted/70 text-foreground",
  };

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
  const summaryCards = [
    {
      label: "أيام الحضور",
      value: summaryData.reduce((sum, row) => sum + Number(row.أيام ?? 0), 0),
      tone: "primary",
    },
    {
      label: "التأخير",
      value: summaryData.reduce(
        (sum, row) => sum + Number(row["تأخير (د)"] ?? 0),
        0,
      ),
      tone: "destructive",
    },
    {
      label: "الغياب",
      value: summaryData.reduce((sum, row) => sum + Number(row.غائب ?? 0), 0),
      tone: "warning",
    },
    {
      label: "الإضافي",
      value: summaryData.reduce(
        (sum, row) => sum + Number(row["إضافي (د)"] ?? 0),
        0,
      ),
      tone: "success",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">تقارير الحضور</h1>
          <p className="text-sm text-muted-foreground">
            ملخصات ملوّنة للحضور، الأذونات، الإجازات، والسجلات الخام.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tabToneClasses[activeTab]}`}
        >
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
          {activeLabel || "التقارير"}
        </span>
      </div>

      <Card className="mb-6 border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            اختيار الفترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="min-w-[10rem] flex-1 space-y-1 sm:flex-none">
              <label
                htmlFor="attendance-report-from"
                className="block text-sm font-medium text-muted-foreground"
              >
                من
              </label>
              <input
                id="attendance-report-from"
                type="date"
                value={dates.from}
                onChange={(e) => setDates({ ...dates, from: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="min-w-[10rem] flex-1 space-y-1 sm:flex-none">
              <label
                htmlFor="attendance-report-to"
                className="block text-sm font-medium text-muted-foreground"
              >
                إلى
              </label>
              <input
                id="attendance-report-to"
                type="date"
                value={dates.to}
                onChange={(e) => setDates({ ...dates, to: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <Button
              onClick={() => {
                rangeQuery.refetch();
                permQuery.refetch();
              }}
              variant="outline"
              className="w-full border-primary/20 text-primary hover:bg-primary/10 sm:w-auto"
            >
              تحديث
            </Button>

            {activeTab === "leaves" && (
              <div className="mr-auto flex flex-wrap items-end gap-2">
                <div className="min-w-[9rem] space-y-1">
                  <label
                    htmlFor="attendance-balance-year"
                    className="block text-sm font-medium text-muted-foreground"
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
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-success focus:ring-2 focus:ring-success/15"
                  />
                </div>
                <Button
                  onClick={() => balanceQuery.refetch()}
                  variant="outline"
                  className="w-full border-success/20 text-success hover:bg-success/10 sm:w-auto"
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

      {activeRows().length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {summaryCards.map((card) => (
            <Card
              key={card.label}
              className="overflow-hidden border-border bg-background"
            >
              <CardContent className="space-y-2 px-4 py-4">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    card.tone === "primary"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : card.tone === "destructive"
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : card.tone === "warning"
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "border-success/20 bg-success/10 text-success"
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
                      : card.tone === "destructive"
                        ? "text-destructive"
                        : card.tone === "warning"
                          ? "text-warning"
                          : "text-success"
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
          <div
            role="tablist"
            aria-label="أنواع التقارير"
            className="flex flex-wrap gap-2 border-b border-border overflow-x-auto"
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
                className={`inline-flex min-h-11 items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? tabToneClasses[key]
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    activeTab === key ? "bg-current" : "bg-muted-foreground/40"
                  }`}
                  aria-hidden
                />
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
              className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/10 sm:w-auto"
            >
              <Download className="w-4 h-4" /> تصدير CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint(activeRows(), activeLabel)}
              disabled={!activeRows().length}
              className="w-full gap-2 border-secondary/20 text-secondary hover:bg-secondary/10 sm:w-auto"
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
