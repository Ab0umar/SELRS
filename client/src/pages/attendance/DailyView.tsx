import { useState } from "react";
import { Calendar, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const statusTone: Record<string, string> = {
  present: "border-success/20 bg-success/10 text-success",
  absent: "border-destructive/20 bg-destructive/10 text-destructive",
  leave: "border-info/20 bg-info/10 text-info",
  partial: "border-warning/30 bg-warning/10 text-warning",
  holiday: "border-secondary/20 bg-secondary/10 text-secondary",
  missing_checkout: "border-muted-foreground/20 bg-muted/70 text-foreground",
};

const timeTone: Record<string, string> = {
  in: "border-success/20 bg-success/10 text-success",
  out: "border-destructive/20 bg-destructive/10 text-destructive",
  late: "border-warning/30 bg-warning/10 text-warning",
  early: "border-info/20 bg-info/10 text-info",
  overtime: "border-primary/20 bg-primary/10 text-primary",
};

export default function DailyView() {
  const today = new Date().toISOString().split("T")[0];
  const [dates, setDates] = useState({ from: today, to: today });
  const [empFilter, setEmpFilter] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const filtered = empFilter.trim()
    ? records.filter(
        (r) =>
          r.empCd.toLowerCase().includes(empFilter.trim().toLowerCase()) ||
          (r.empName ?? "")
            .toLowerCase()
            .includes(empFilter.trim().toLowerCase()),
      )
    : records;

  const handleLoadRange = async () => {
    if (!dates.from || !dates.to) return;
    setLoading(true);
    let allRecords: any[] = [];

    const [fy, fm, fd] = dates.from.split("-").map(Number);
    const [ty, tm, td] = dates.to.split("-").map(Number);
    const fromDate = new Date(fy, fm - 1, fd);
    const toDate = new Date(ty, tm - 1, td);

    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`;
      try {
        const response = await utils.attendance.dailyByDate.fetch({
          date: dateStr,
        });
        allRecords = [...allRecords, ...response];
      } catch (error) {
        console.error(`Failed to load ${dateStr}:`, error);
      }
    }

    setRecords(allRecords);
    setLoading(false);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      present: "حاضر",
      absent: "غائب",
      leave: "إجازة",
      partial: "جزئي",
      holiday: "عطلة",
      missing_checkout: "لم يسجل الخروج",
    };
    return labels[status] || status;
  };

  const handleExportCSV = () => {
    if (!records.length) return;

    const headers = [
      "كود الموظف",
      "الاسم",
      "تاريخ العمل",
      "الحضور",
      "المغادرة",
      "الحالة",
      "التأخير",
      "المغادرة المبكرة",
    ];
    const csv = [
      headers.join(","),
      ...records.map((row) =>
        [
          row.empCd,
          row.empName ?? "",
          row.workDate,
          row.firstIn ? new Date(row.firstIn).toLocaleTimeString("ar-EG") : "-",
          row.lastOut ? new Date(row.lastOut).toLocaleTimeString("ar-EG") : "-",
          getStatusLabel(row.status),
          row.lateMinutes || 0,
          row.earlyLeaveMin || 0,
        ]
          .map((v) => `"${v}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `daily-attendance-${dates.from}-to-${dates.to}.csv`,
    );
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">الحضور اليومي</h1>
          <p className="text-sm text-muted-foreground">
            الألوان تفرق بين الدخول والخروج والتأخير والحالة العامة بسرعة.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
          <Calendar className="h-3.5 w-3.5" />
          سجل حي
        </span>
      </div>

      <Card className="mb-6 border-border bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            اختيار الفترة الزمنية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <Button
              onClick={handleLoadRange}
              className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "جاري التحميل..." : "تحميل"}
            </Button>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-muted-foreground">
                إلى
              </label>
              <input
                type="date"
                value={dates.to}
                onChange={(e) => setDates({ ...dates, to: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-muted-foreground">
                من
              </label>
              <input
                type="date"
                value={dates.from}
                onChange={(e) => setDates({ ...dates, from: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-muted-foreground">
                كود الموظف
              </label>
              <input
                type="text"
                value={empFilter}
                onChange={(e) => setEmpFilter(e.target.value)}
                placeholder="كل الموظفين"
                className="w-40 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-info focus:ring-2 focus:ring-info/15"
              />
            </div>
            <Calendar className="mb-2 self-end text-info" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-foreground">
              الحضور من {dates.from} إلى {dates.to}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={records.length === 0}
              className="gap-2 border-info/20 text-info hover:bg-info/10"
            >
              <Download className="h-4 w-4" />
              تصدير
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : records.length > 0 ? (
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
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      التاريخ
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-success">
                      وقت الحضور
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-destructive">
                      وقت المغادرة
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-destructive">
                      التأخير (دقيقة)
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-warning">
                      المغادرة المبكرة
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-primary">
                      الساعات الإضافية
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((record: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {record.empCd}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {record.empName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {record.workDate}
                      </td>
                      <td className="px-4 py-3">
                        {record.firstIn ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${timeTone.in}`}
                          >
                            <span>↑</span>
                            <span>
                              {new Date(record.firstIn).toLocaleTimeString(
                                "ar-EG",
                              )}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {record.lastOut ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${timeTone.out}`}
                          >
                            <span>↓</span>
                            <span>
                              {new Date(record.lastOut).toLocaleTimeString(
                                "ar-EG",
                              )}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.lateMinutes > 0 ? (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${timeTone.late}`}
                          >
                            {record.lateMinutes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.earlyLeaveMin > 0 ? (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${timeTone.early}`}
                          >
                            {record.earlyLeaveMin}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {record.overtimeMinutes > 0 ? (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${timeTone.overtime}`}
                          >
                            {record.overtimeMinutes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            statusTone[record.status] ??
                            "border-muted-foreground/20 bg-muted/70 text-foreground"
                          }`}
                        >
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              لا توجد سجلات حضور
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
