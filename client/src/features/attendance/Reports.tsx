import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Printer } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { ReportToolbar } from "./ReportToolbar";

type ReportTab =
  | "summary"
  | "late"
  | "absent"
  | "ot"
  | "permissions"
  | "leaves"
  | "monthly";

const todayStr = new Date().toISOString().split("T")[0];
export default function Reports({
  from,
  to,
  department,
}: {
  from: string;
  to: string;
  department?: string;
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<ReportTab>("summary");
  const dates = useMemo(() => ({ from, to }), [from, to]);
  const balanceYear = Number(to.slice(0, 4));

  const rangeQuery = trpc.attendance.rangeReport.useQuery({
    from: dates.from,
    to: dates.to,
    department,
  });
  const permQuery = trpc.attendance.permissionReport.useQuery({
    from: dates.from,
    to: dates.to,
    department,
  });
  const balanceQuery = trpc.attendance.allLeaveBalances.useQuery({
    year: balanceYear,
    department,
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

  const perms: any[] = (permQuery.data as any[]) ?? [];
  const balances: any[] = (balanceQuery.data as any[]) ?? [];
  const data: any[] = rangeQuery.data ?? [];

  const permByEmp = new Map<string, { inMins: number; outMins: number }>();
  for (const permission of perms) {
    permByEmp.set(permission.empCd, {
      inMins: permission.totalInMins ?? 0,
      outMins: permission.totalOutMins ?? 0,
    });
  }

  const summaryData = data.map((r: any) => {
    const permission = permByEmp.get(r.empCd);
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
      "إذن دخول (د)": permission?.inMins ?? 0,
      "إذن خروج (د)": permission?.outMins ?? 0,
    };
  });

  const monthlyData = data.map((r: any) => {
    const permission = permByEmp.get(r.empCd);
    return {
      كود: r.empCd,
      الاسم: r.empName ?? "-",
      حاضر: r.presentDays,
      غائب: r.absentDays,
      إجازة: r.leaveDays,
      "تأخير (د)": r.totalLateMins,
      "مبكر (د)": r.totalEarlyMins,
      "إضافي (د)": r.totalOTMins,
      "إذن دخول (د)": permission?.inMins ?? 0,
      "إذن خروج (د)": permission?.outMins ?? 0,
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
    مأموريات: p.missionCount ?? 0,
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

    if (isMobile) {
      const [titleCol, ...restCols] = cols;
      return (
        <div className="space-y-2" dir="rtl">
          {rows.map((row: any, i: number) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-background p-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <span className="text-sm font-semibold text-foreground">
                  {row[restCols[0]] ?? row[titleCol]}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {titleCol}: {row[titleCol]}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {restCols.slice(1).map((c) => (
                  <div
                    key={c}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
                  >
                    <span className="text-muted-foreground">{c}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {row[c]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto" dir="rtl">
        <table dir="rtl" className="min-w-[42rem] w-full text-sm">
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
    { key: "monthly", label: "تقرير الفترة" },
    { key: "summary", label: "الملخص" },
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
    permissions: "border-secondary/20 bg-secondary/10 text-primary",
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
      : activeTab === "permissions"
        ? permQuery.isLoading
        : rangeQuery.isLoading;

  const activeLabel = tabs.find((t) => t.key === activeTab)?.label ?? "";
  return (
    <div className="p-6 w-full" dir="rtl">
      <ReportToolbar>
        <div
          role="tablist"
          aria-label="أنواع التقارير"
          className="flex flex-wrap gap-2"
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`h-10 rounded-lg border px-3 text-sm font-semibold ${
                activeTab === key
                  ? tabToneClasses[key]
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            handleExportCSV(activeRows(), `${activeLabel}-${dates.from}-${dates.to}.csv`)
          }
          disabled={!activeRows().length}
        >
          <Download className="w-4 h-4" /> تصدير CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePrint(activeRows(), activeLabel)}
          disabled={!activeRows().length}
        >
          <Printer className="w-4 h-4" /> طباعة / PDF
        </Button>
      </ReportToolbar>
      <Card>
        <CardHeader>
          <div
            role="tablist"
            aria-label="أنواع التقارير"
            className="hidden"
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
          <div className="hidden">
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
              className="w-full gap-2 border-secondary/20 text-primary hover:bg-secondary/10 sm:w-auto"
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
