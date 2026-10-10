import { useEffect, useMemo, useState } from "react";
import { Download, Printer, RefreshCw, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toLocalDateKey } from "@/lib/localDate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportToolbar } from "./ReportToolbar";

const formatDate = toLocalDateKey;

type PunchDay = {
  in: string[];
  out: string[];
  other: string[];
};

type MonthlyEmployee = {
  empCd: string;
  empName: string;
  department: string | null;
  section: "center" | "clinic";
  days: Record<string, PunchDay>;
  totalPunches: number;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatTimes = (times: string[]) => times.map(formatTime).join("، ");

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeCsv = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

const getDayRows = (employee: MonthlyEmployee) =>
  Object.entries(employee.days)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, day]) => ({ date, day }));

const formatDisplayDate = (date: string) => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const renderTimes = (times: string[], tone: string) =>
  times.length > 0 ? (
    <div className={`flex flex-wrap gap-1 ${tone}`}>
      {times.map((time) => (
        <span
          key={time}
          className="rounded bg-current/10 px-1.5 py-0.5 whitespace-nowrap"
        >
          {formatTime(time)}
        </span>
      ))}
    </div>
  ) : (
    <span className="text-muted-foreground">-</span>
  );

export default function MonthlyFingerprints({
  from,
  to,
  department,
}: {
  from: string;
  to: string;
  department?: string;
}) {
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [appliedEmployee, setAppliedEmployee] = useState("");
  useEffect(() => {
    setFromDate(from);
    setToDate(to);
  }, [from, to]);

  const isValidRange = Boolean(fromDate && toDate && fromDate <= toDate);
  const monthlyQuery = trpc.attendance.monthlyPunches.useQuery(
    {
      fromDate,
      toDate,
      empCd: appliedEmployee || undefined,
      department,
    },
    { enabled: isValidRange },
  );

  const employees = (monthlyQuery.data?.employees ?? []) as MonthlyEmployee[];
  const groupedEmployees = useMemo(
    () => ({
      center: employees.filter((employee) => employee.section === "center"),
      clinic: employees.filter((employee) => employee.section === "clinic"),
    }),
    [employees],
  );

  const periodLabel = `${fromDate} إلى ${toDate}`;
  const applySearch = () => setAppliedEmployee(employeeSearch.trim());

  const exportCsv = () => {
    if (!employees.length) return;
    const rows = employees.flatMap((employee) =>
      getDayRows(employee).map(({ date, day }) => [
        employee.section === "clinic" ? "العيادة" : "المركز",
        employee.empCd,
        employee.empName,
        date,
        formatTimes(day.in),
        formatTimes(day.out),
        formatTimes(day.other),
      ]),
    );
    const headers = [
      "القسم",
      "رقم الموظف",
      "اسم الموظف",
      "التاريخ",
      "دخول",
      "خروج",
      "حركات أخرى",
    ];
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `fingerprints-${fromDate}-${toDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!employees.length) return;
    const rows = employees.flatMap((employee) =>
      getDayRows(employee).map(({ date, day }) => [
        employee.section === "clinic" ? "العيادة" : "المركز",
        employee.empCd,
        employee.empName,
        date,
        formatTimes(day.in) || "-",
        formatTimes(day.out) || "-",
        formatTimes(day.other) || "-",
      ]),
    );
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>البصمات - ${escapeHtml(periodLabel)}</title><style>body{font-family:Arial,sans-serif;font-size:11px;direction:rtl}h2{font-size:17px;margin-bottom:4px}p{color:#555}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px;text-align:right}th{background:#e9eef5}@media print{@page{margin:10mm}}</style></head><body><h2>البصمات حسب الموظف والقسم</h2><p>الفترة: ${escapeHtml(periodLabel)}</p><table><thead><tr>${["القسم", "رقم الموظف", "اسم الموظف", "التاريخ", "دخول", "خروج", "غير محدد"].map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const renderSection = (
    key: "center" | "clinic",
    label: string,
    sectionEmployees: MonthlyEmployee[],
  ) => (
    <Card key={key} className="attendance-section overflow-hidden">
      <CardHeader
        className={key === "clinic" ? "bg-primary/10 " : "bg-info/10 "}
      >
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{label}</span>
          <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {sectionEmployees.length} موظف
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sectionEmployees.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            مفيش بيانات في القسم خلال الفترة.
          </div>
        ) : (
          (() => {
            const dayRows = sectionEmployees.flatMap((employee) =>
              getDayRows(employee).map(({ date, day }) => ({
                employee,
                date,
                day,
              })),
            );
            return (
              <>
                <div className="hidden w-full sm:block">
                  <table
                    aria-label="البصمات حسب الموظف والقسم"
                    className="w-full table-auto text-xs sm:text-xs"
                    dir="rtl"
                  >
                    <colgroup>
                      <col className="w-[1%]" />
                      <col className="w-[1%]" />
                      <col className="w-[1%]" />
                      <col className="w-[1%]" />
                      <col />
                    </colgroup>
                    <thead className="bg-muted/60 text-foreground">
                      <tr className="border-b border-border">
                        <th
                          scope="col"
                          className="whitespace-nowrap px-1.5 py-2.5 text-start font-bold"
                        >
                          الرقم
                        </th>
                        <th
                          scope="col"
                          className="whitespace-nowrap px-1.5 py-2.5 text-start font-bold"
                        >
                          الاسم
                        </th>
                        <th
                          scope="col"
                          className="whitespace-nowrap px-1 py-2.5 text-center font-bold"
                        >
                          الأيام
                        </th>
                        <th
                          scope="col"
                          className="whitespace-nowrap px-1 py-2.5 text-center font-bold"
                        >
                          البصمات
                        </th>
                        <th
                          scope="col"
                          className="whitespace-nowrap px-1.5 py-2.5 text-start font-bold"
                        >
                          تفاصيل الأيام
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionEmployees.map((employee) => (
                        <tr
                          key={employee.empCd}
                          className="border-b border-border align-top last:border-0 hover:bg-muted/30"
                        >
                          <td className="whitespace-nowrap px-1.5 py-2.5 text-start font-mono font-bold text-info">
                            {employee.empCd}
                          </td>
                          <td className="whitespace-nowrap px-1.5 py-2.5 text-start font-medium text-foreground">
                            {employee.empName}
                          </td>
                          <td className="whitespace-nowrap px-1 py-2.5 text-center font-semibold tabular-nums text-foreground">
                            {Object.keys(employee.days).length}
                          </td>
                          <td className="whitespace-nowrap px-1 py-2.5 text-center font-semibold tabular-nums text-foreground">
                            {employee.totalPunches}
                          </td>
                          <td className="px-1.5 py-2.5">
                            <div className="grid grid-cols-3 gap-1 sm:grid-cols-3 sm:gap-1.5 lg:grid-cols-4">
                              {getDayRows(employee).map(({ date, day }) => (
                                <div
                                  key={date}
                                  className="min-w-0 rounded-md border border-border bg-background px-1 py-1 leading-4 text-xs sm:px-1.5 sm:py-1.5 sm:text-xs"
                                >
                                  <div
                                    className="mb-0.5 text-center font-bold text-foreground"
                                    dir="ltr"
                                  >
                                    <span className="sm:hidden">
                                      {date.slice(8, 10)}/{date.slice(5, 7)}
                                    </span>
                                    <span className="hidden sm:inline">
                                      {formatDisplayDate(date)}
                                    </span>
                                  </div>
                                  <div
                                    className="space-y-0.5 text-center"
                                    dir="ltr"
                                  >
                                    {day.in.length > 0 && (
                                      <div className="break-words text-success-text">
                                        <span className="sm:hidden">
                                          د: {formatTimes(day.in)}
                                        </span>
                                        <span className="hidden sm:inline">
                                          دخول: {formatTimes(day.in)}
                                        </span>
                                      </div>
                                    )}
                                    {day.out.length > 0 && (
                                      <div className="break-words text-warning-text">
                                        <span className="sm:hidden">
                                          خ: {formatTimes(day.out)}
                                        </span>
                                        <span className="hidden sm:inline">
                                          خروج: {formatTimes(day.out)}
                                        </span>
                                      </div>
                                    )}
                                    {day.other.length > 0 && (
                                      <div className="break-words text-muted-foreground">
                                        أ: {formatTimes(day.other)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="block p-3 sm:hidden">
                  <div className="space-y-3">
                    {sectionEmployees.map((employee) => (
                      <article
                        key={employee.empCd}
                        className="overflow-hidden rounded-xl border border-border bg-background shadow-xs"
                      >
                        <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-3 py-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-foreground">
                              {employee.empName}
                            </h3>
                            <div className="mt-0.5 font-mono text-xs font-semibold text-info">
                              رقم الموظف: {employee.empCd}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1.5 text-center text-xs">
                            <div className="rounded-lg bg-background px-2 py-1">
                              <div className="font-bold text-foreground">
                                {Object.keys(employee.days).length}
                              </div>
                              <div className="text-muted-foreground">أيام</div>
                            </div>
                            <div className="rounded-lg bg-background px-2 py-1">
                              <div className="font-bold text-foreground">
                                {employee.totalPunches}
                              </div>
                              <div className="text-muted-foreground">بصمات</div>
                            </div>
                          </div>
                        </header>
                        <div className="grid grid-cols-1 gap-2 p-3">
                          {getDayRows(employee).map(({ date, day }) => (
                            <div
                              key={date}
                              className="rounded-xl border border-border/80 bg-muted/20 p-2.5"
                            >
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {formatDisplayDate(date)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  تفاصيل البصمة
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-1.5 text-xs">
                                <div className="flex items-center justify-between gap-2 rounded-lg bg-success/10 px-2 py-1.5">
                                  <span className="font-semibold text-success-text">
                                    دخول
                                  </span>
                                  <div dir="ltr">
                                    {renderTimes(day.in, "text-success-text ")}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 rounded-lg bg-warning/10 px-2 py-1.5">
                                  <span className="font-semibold text-warning-text">
                                    خروج
                                  </span>
                                  <div dir="ltr">
                                    {renderTimes(day.out, "text-warning-text ")}
                                  </div>
                                </div>
                                {day.other.length > 0 && (
                                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5">
                                    <span className="font-semibold text-muted-foreground">
                                      أخرى
                                    </span>
                                    <div dir="ltr">
                                      {renderTimes(
                                        day.other,
                                        "text-muted-foreground",
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            );
          })()
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5" dir="rtl">
      <ReportToolbar>
        <Input
          value={employeeSearch}
          onChange={(event) => setEmployeeSearch(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && applySearch()}
          placeholder="رقم الموظف"
          aria-label="رقم الموظف"
          className="h-10 w-full sm:w-44 bg-background"
        />
        <Button onClick={applySearch} className="gap-2">
          <Search className="h-4 w-4" /> بحث
        </Button>
        <Button
          variant="outline"
          onClick={() => monthlyQuery.refetch()}
          disabled={!isValidRange || monthlyQuery.isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 ${monthlyQuery.isFetching ? "animate-spin" : ""}`}
          />
          تحديث
        </Button>
        <Button
          variant="outline"
          onClick={exportCsv}
          disabled={!employees.length}
        >
          <Download className="h-4 w-4" /> تصدير CSV
        </Button>
        <Button
          variant="outline"
          onClick={printReport}
          disabled={!employees.length}
        >
          <Printer className="h-4 w-4" /> طباعة / PDF
        </Button>
      </ReportToolbar>

      {!isValidRange && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          اختار تاريخ بداية قبل أو يساوي تاريخ النهاية.
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={!employees.length}
          className="gap-2"
        >
          <Download className="h-4 w-4" /> تصدير CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={printReport}
          disabled={!employees.length}
          className="gap-2"
        >
          <Printer className="h-4 w-4" /> طباعة / PDF
        </Button>
      </div>

      {monthlyQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-12 w-full" />
          ))}
        </div>
      ) : monthlyQuery.isError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 py-10 text-center text-sm text-destructive">
          تعذر تحميل بصمات الفترة المحددة.
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            مفيش بصمات مسجلة في الفترة أو الفلتر المختار.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {renderSection("center", "المركز", groupedEmployees.center)}
          {renderSection("clinic", "العيادة", groupedEmployees.clinic)}
        </div>
      )}
    </div>
  );
}
