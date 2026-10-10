import { useEffect, useState } from "react";
import { Clock, Download, Printer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsCompact } from "@/hooks/useMobile";
import { ReportToolbar } from "./ReportToolbar";
import { escapeHtml } from "@/lib/escapeHtml";

const now = new Date();
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

export default function PermissionReport({
  from: reportFrom,
  to: reportTo,
  department,
}: {
  from: string;
  to: string;
  department?: string;
}) {
  const isMobile = useIsCompact();
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);
  useEffect(() => {
    setFrom(reportFrom);
    setTo(reportTo);
  }, [reportFrom, reportTo]);

  const query = trpc.attendance.permissionReport.useQuery({
    from,
    to,
    department,
  });
  const rows: any[] = (query.data as any[]) ?? [];

  const totalInCount = rows.reduce((sum, row) => sum + (row.inCount ?? 0), 0);
  const totalOutCount = rows.reduce((sum, row) => sum + (row.outCount ?? 0), 0);
  const totalInMins = rows.reduce(
    (sum, row) => sum + (row.totalInMins ?? 0),
    0,
  );
  const totalOutMins = rows.reduce(
    (sum, row) => sum + (row.totalOutMins ?? 0),
    0,
  );

  const handleExport = () => {
    if (!rows.length) return;
    const headers = [
      "الكود",
      "الاسم",
      "أذونات دخول",
      "مجموع دخول (د)",
      "أذونات خروج",
      "مجموع خروج (د)",
      "إجمالي (د)",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        [
          `"${String(row.empCd).replace(/"/g, '""')}"`,
          `"${String(row.empName ?? "").replace(/"/g, '""')}"`,
          row.inCount,
          row.totalInMins,
          row.outCount,
          row.totalOutMins,
          (row.totalInMins ?? 0) + (row.totalOutMins ?? 0),
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-الأذونات-${from}-${to}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!rows.length) return;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>تقرير الأذونات: من ${escapeHtml(from)} إلى ${escapeHtml(to)}</title>
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
      </style></head><body>
      <h2>تقرير الأذونات</h2>
      <p>من ${escapeHtml(from)} إلى ${escapeHtml(to)}</p>
      <table>
        <thead><tr>
          <th>الكود</th><th>الاسم</th>
          <th>أذونات دخول</th><th>دقائق دخول</th>
          <th>أذونات خروج</th><th>دقائق خروج</th>
          <th>إجمالي دقائق</th>
        </tr></thead>
        <tbody>
          ${rows
            .map(
              (row) => `<tr>
            <td>${escapeHtml(row.empCd)}</td><td>${escapeHtml(row.empName ?? "-")}</td>
            <td>${escapeHtml(row.inCount)}</td><td>${escapeHtml(row.totalInMins)}</td>
            <td>${escapeHtml(row.outCount)}</td><td>${escapeHtml(row.totalOutMins)}</td>
            <td>${escapeHtml((row.totalInMins ?? 0) + (row.totalOutMins ?? 0))}</td>
          </tr>`,
            )
            .join("")}
        </tbody>
        <tfoot><tr>
          <td colspan="2">الإجمالي</td>
          <td>${escapeHtml(totalInCount)}</td><td>${escapeHtml(totalInMins)}</td>
          <td>${escapeHtml(totalOutCount)}</td><td>${escapeHtml(totalOutMins)}</td>
          <td>${escapeHtml(totalInMins + totalOutMins)}</td>
        </tr></tfoot>
      </table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const summaryCards = [
    { label: "أذونات الدخول", value: totalInCount, tone: "primary" },
    { label: "دقائق الدخول", value: `${totalInMins} د`, tone: "info" },
    { label: "أذونات الخروج", value: totalOutCount, tone: "secondary" },
    { label: "دقائق الخروج", value: `${totalOutMins} د`, tone: "warning" },
    {
      label: "المأموريات",
      value: rows.reduce((sum, row) => sum + (row.missionCount ?? 0), 0),
      tone: "info",
    },
  ];

  return (
    <div className="w-full p-0" dir="rtl">
      <ReportToolbar>
        <Button onClick={() => query.refetch()} variant="outline">
          تحديث
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={!rows.length}
        >
          <Download className="h-4 w-4" /> تصدير CSV
        </Button>
        <Button variant="outline" onClick={handlePrint} disabled={!rows.length}>
          <Printer className="h-4 w-4" /> طباعة / PDF
        </Button>
      </ReportToolbar>

      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {summaryCards.map((card) => (
            <Card key={card.label} className="border-border bg-background">
              <CardContent className="space-y-2 px-4 py-4">
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    card.tone === "primary"
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : card.tone === "info"
                        ? "border-info/20 bg-info/10 text-info"
                        : card.tone === "secondary"
                          ? "border-secondary/20 bg-secondary/10 text-primary"
                          : "border-warning/30 bg-warning/10 text-warning-text"
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
                      : card.tone === "info"
                        ? "text-info"
                        : card.tone === "secondary"
                          ? "text-primary"
                          : "text-warning-text"
                  }`}
                >
                  {card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="attendance-section">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            من {from} إلى {to}، {rows.length} موظف
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : query.error ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground"
            >
              تعذر تحميل التقرير:{" "}
              {String((query.error as any).message ?? query.error)}
            </div>
          ) : !rows.length ? (
            <div className="py-10 text-center text-muted-foreground">
              لا توجد أذونات في هذه الفترة
            </div>
          ) : isMobile ? (
            <div
              className="space-y-2 md:grid md:grid-cols-2 md:items-start md:gap-2 md:space-y-0"
              dir="rtl"
            >
              {rows.map((row: any) => (
                <div
                  key={row.empCd}
                  className="rounded-xl border border-border bg-background p-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-foreground">
                        {row.empName ?? "-"}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {row.empCd}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs text-muted-foreground">
                        إجمالي
                      </div>
                      <div className="font-bold text-foreground">
                        {(row.totalInMins ?? 0) + (row.totalOutMins ?? 0)} د
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-center text-xs">
                      <div className="font-semibold text-primary">
                        أذونات دخول
                      </div>
                      <div className="mt-1 text-primary/90">
                        {row.inCount} عدد · {row.totalInMins} دقيقة
                      </div>
                    </div>
                    <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-2 text-center text-xs">
                      <div className="font-semibold text-primary">
                        أذونات خروج
                      </div>
                      <div className="mt-1 text-primary/90">
                        {row.outCount} عدد · {row.totalOutMins} دقيقة
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3 text-sm font-bold">
                <div className="flex items-center justify-between">
                  <span>الإجمالي</span>
                  <span>{totalInMins + totalOutMins} د</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>
                    دخول: {totalInCount} · {totalInMins} د
                  </span>
                  <span>
                    خروج: {totalOutCount} · {totalOutMins} د
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto" dir="rtl">
              <table
                aria-label="تقرير الأذونات"
                dir="rtl"
                className="w-full text-sm"
              >
                <thead>
                  <tr className="bg-muted/60">
                    <th
                      scope="col"
                      className="border-b px-4 py-2 text-right font-semibold text-foreground"
                      rowSpan={2}
                    >
                      الكود
                    </th>
                    <th
                      scope="col"
                      className="border-b px-4 py-2 text-right font-semibold text-foreground"
                      rowSpan={2}
                    >
                      الاسم
                    </th>
                    <th
                      scope="col"
                      className="border-b border-primary/20 bg-primary/5 px-4 py-2 text-center font-semibold text-primary"
                      colSpan={2}
                    >
                      أذونات دخول
                    </th>
                    <th
                      scope="col"
                      className="border-b border-secondary/20 bg-secondary/5 px-4 py-2 text-center font-semibold text-primary"
                      colSpan={2}
                    >
                      أذونات خروج
                    </th>
                    <th
                      scope="col"
                      className="border-b px-4 py-2 text-right font-semibold text-foreground"
                      rowSpan={2}
                    >
                      إجمالي (د)
                    </th>
                  </tr>
                  <tr className="border-b bg-muted/40">
                    <th
                      scope="col"
                      className="px-4 py-1.5 text-right text-xs font-medium text-primary/80"
                    >
                      عدد
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-1.5 text-right text-xs font-medium text-primary/80"
                    >
                      دقائق
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-1.5 text-right text-xs font-medium text-primary/80"
                    >
                      عدد
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-1.5 text-right text-xs font-medium text-primary/80"
                    >
                      دقائق
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any) => (
                    <tr
                      key={row.empCd}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {row.empCd}
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">
                        {row.empName ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-primary">{row.inCount}</td>
                      <td className="px-4 py-2 text-primary">
                        {row.totalInMins}
                      </td>
                      <td className="px-4 py-2 text-primary">{row.outCount}</td>
                      <td className="px-4 py-2 text-primary">
                        {row.totalOutMins}
                      </td>
                      <td className="px-4 py-2 font-semibold text-foreground">
                        {(row.totalInMins ?? 0) + (row.totalOutMins ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-primary/5 font-bold">
                    <td className="px-4 py-2" colSpan={2}>
                      الإجمالي
                    </td>
                    <td className="px-4 py-2 text-primary">{totalInCount}</td>
                    <td className="px-4 py-2 text-primary">{totalInMins}</td>
                    <td className="px-4 py-2 text-primary">{totalOutCount}</td>
                    <td className="px-4 py-2 text-primary">{totalOutMins}</td>
                    <td className="px-4 py-2">{totalInMins + totalOutMins}</td>
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
