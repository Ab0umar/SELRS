import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Download, Timer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsCompact } from "@/hooks/useMobile";
import { ReportToolbar } from "./ReportToolbar";
import { toast } from "sonner";
import {
  AttendanceStatusBadge,
  attendanceTimeClass,
  getAttendanceStatusLabel,
} from "./attendanceStatus";
import { Input } from "@/components/ui/input";

const permissionHours = (minutes: unknown) => {
  const value = Number(minutes ?? 0);
  return Number.isFinite(value) && value > 0 ? (value / 60).toFixed(2) : "0";
};

const permissionHoursLabel = (minutes: unknown) => {
  const hours = permissionHours(minutes);
  return hours === "0" ? "-" : `${hours} ساعة`;
};

export default function DailyView({
  from,
  to,
  department,
}: {
  from: string;
  to: string;
  department?: string;
}) {
  const isMobile = useIsCompact();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [dates, setDates] = useState({ from: today, to: today });
  const [empFilter, setEmpFilter] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const loadGeneration = useRef(0);
  const utils = trpc.useUtils();
  useEffect(() => {
    setDates({ from, to });
    setRecords([]);
    loadGeneration.current += 1;
    setLoading(false);
  }, [from, to, department]);
  const setOvertimeEnabled =
    trpc.attendance.setDailyOvertimeEnabled.useMutation({
      onError: (error) => toast.error(`تعذر تعديل الإضافي: ${error.message}`),
      onSuccess: (result, input) => {
        setRecords((current) =>
          current.map((record) =>
            record.empCd === input.empCd && record.workDate === input.workDate
              ? {
                  ...record,
                  [input.type === "in"
                    ? "overtimeInEnabled"
                    : input.type === "out"
                      ? "overtimeOutEnabled"
                      : "extraDayEnabled"]: result.enabled,
                }
              : record,
          ),
        );
      },
    });

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
    const generation = ++loadGeneration.current;
    setLoading(true);
    let allRecords: any[] = [];

    let responses: any[] = [];
    try {
      responses = await utils.attendance.dailyByDate.fetch({
        fromDate: dates.from,
        toDate: dates.to,
        department,
      });
    } catch (error) {
      if (generation !== loadGeneration.current) return;
      console.error(`Failed to load ${dates.from} to ${dates.to}:`, error);
      toast.error(
        `تعذر تحميل الفترة: ${error instanceof Error ? error.message : ""}`,
      );
      setLoading(false);
      return;
    }
    if (generation !== loadGeneration.current) return;
    allRecords = [...responses].sort((a, b) => {
      const dateCompare = String(a.workDate).localeCompare(String(b.workDate));
      if (dateCompare !== 0) return dateCompare;
      const employeeCompare = String(a.empCd).localeCompare(
        String(b.empCd),
        undefined,
        {
          numeric: true,
        },
      );
      if (employeeCompare !== 0) return employeeCompare;
      return Number(a.shiftId ?? 0) - Number(b.shiftId ?? 0);
    });

    setRecords(allRecords);
    setLoading(false);
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
      "إذن دخول (ساعات)",
      "إذن خروج (ساعات)",
    ];
    const csv = [
      headers.join(","),
      ...filtered.map((row) =>
        [
          row.empCd,
          row.empName ?? "",
          row.workDate,
          row.firstIn ? new Date(row.firstIn).toLocaleTimeString("ar-EG") : "-",
          row.lastOut ? new Date(row.lastOut).toLocaleTimeString("ar-EG") : "-",
          getAttendanceStatusLabel(row.status),
          row.lateMinutes || 0,
          row.earlyLeaveMin || 0,
          permissionHours(row.entryPermissionMinutes),
          permissionHours(row.exitPermissionMinutes),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
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
    <div className="w-full p-0" dir="rtl">
      <ReportToolbar>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <Button
            onClick={handleLoadRange}
            className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "جارٍ التحميل" : "تحميل الفترة"}
          </Button>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-muted-foreground">
              كود الموظف
            </label>
            <Input bare
              aria-label="كود الموظف"
              type="text"
              value={empFilter}
              onChange={(e) => setEmpFilter(e.target.value)}
              placeholder="كل الموظفين"
              className="w-full sm:w-40 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-info focus:ring-2 focus:ring-info/15"
            />
          </div>
        </div>
      </ReportToolbar>

      <Card className="attendance-section">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div />
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
            isMobile ? (
              <div
                className="space-y-2 md:grid md:grid-cols-2 md:items-start md:gap-2 md:space-y-0"
                dir="rtl"
              >
                {filtered.map((record: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-border bg-background p-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-foreground">
                          {record.empName ?? "-"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {record.empCd} · {record.workDate}
                        </div>
                      </div>
                      <AttendanceStatusBadge status={record.status} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {record.firstIn ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("in")}`}
                        >
                          <span>↑</span>
                          <span>
                            {new Date(record.firstIn).toLocaleTimeString(
                              "ar-EG",
                            )}
                          </span>
                        </span>
                      ) : null}
                      {(record.status === "holiday" || !record.shiftId) &&
                      record.firstIn &&
                      record.lastOut ? (
                        <Button variant="bare"
                          type="button"
                          title="تفعيل أو إلغاء احتساب يوم إجازة إضافي"
                          disabled={setOvertimeEnabled.isPending}
                          onClick={() =>
                            setOvertimeEnabled.mutate({
                              empCd: record.empCd,
                              workDate: record.workDate,
                              type: "day",
                              enabled: !record.extraDayEnabled,
                            })
                          }
                          className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-semibold ${record.extraDayEnabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-background text-muted-foreground"}`}
                        >
                          <CalendarPlus size={13} />
                          {record.extraDayEnabled
                            ? "يوم إضافي مفعّل"
                            : "احتساب يوم إضافي"}
                        </Button>
                      ) : null}
                      {record.lastOut ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("out")}`}
                        >
                          <span>↓</span>
                          <span>
                            {new Date(record.lastOut).toLocaleTimeString(
                              "ar-EG",
                            )}
                          </span>
                        </span>
                      ) : null}
                    </div>

                    {(record.lateMinutes > 0 ||
                      record.earlyLeaveMin > 0 ||
                      record.overtimeMinutes > 0 ||
                      record.entryPermissionMinutes > 0 ||
                      record.exitPermissionMinutes > 0) && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 text-center text-xs sm:grid-cols-4">
                        <div>
                          <div className="text-muted-foreground">تأخير</div>
                          <div
                            className={
                              record.lateMinutes > 0
                                ? "font-semibold text-warning-text"
                                : "text-muted-foreground"
                            }
                          >
                            {record.lateMinutes || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            مغادرة مبكرة
                          </div>
                          <div
                            className={
                              record.earlyLeaveMin > 0
                                ? "font-semibold text-info"
                                : "text-muted-foreground"
                            }
                          >
                            {record.earlyLeaveMin || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">إذن دخول</div>
                          <div
                            className={
                              record.entryPermissionMinutes > 0
                                ? "font-semibold text-info"
                                : "text-muted-foreground"
                            }
                          >
                            {permissionHoursLabel(
                              record.entryPermissionMinutes,
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">إذن خروج</div>
                          <div
                            className={
                              record.exitPermissionMinutes > 0
                                ? "font-semibold text-info"
                                : "text-muted-foreground"
                            }
                          >
                            {permissionHoursLabel(record.exitPermissionMinutes)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            إضافي الحضور
                          </div>
                          <div
                            className={
                              record.overtimeInMinutes > 0
                                ? "font-semibold text-primary"
                                : "text-muted-foreground"
                            }
                          >
                            {record.overtimeInMinutes || "-"}
                          </div>
                          <Button variant="bare"
                            type="button"
                            title="تفعيل أو إلغاء إضافي الحضور لهذا اليوم"
                            disabled={setOvertimeEnabled.isPending}
                            onClick={() =>
                              setOvertimeEnabled.mutate({
                                empCd: record.empCd,
                                workDate: record.workDate,
                                type: "in",
                                enabled: !record.overtimeInEnabled,
                              })
                            }
                            className={`mt-1 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${record.overtimeInEnabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-background text-muted-foreground"}`}
                          >
                            <Timer size={11} />
                            {record.overtimeInEnabled ? "مفعّل" : "غير مفعّل"}
                          </Button>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            إضافي الانصراف
                          </div>
                          <div
                            className={
                              record.overtimeOutMinutes > 0
                                ? "font-semibold text-primary"
                                : "text-muted-foreground"
                            }
                          >
                            {record.overtimeOutMinutes || "-"}
                          </div>
                          <Button variant="bare"
                            type="button"
                            title="تفعيل أو إلغاء إضافي الانصراف لهذا اليوم"
                            disabled={setOvertimeEnabled.isPending}
                            onClick={() =>
                              setOvertimeEnabled.mutate({
                                empCd: record.empCd,
                                workDate: record.workDate,
                                type: "out",
                                enabled: !record.overtimeOutEnabled,
                              })
                            }
                            className={`mt-1 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${record.overtimeOutEnabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-background text-muted-foreground"}`}
                          >
                            <Timer size={11} />
                            {record.overtimeOutEnabled ? "مفعّل" : "غير مفعّل"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div role="region" aria-label="جدول بيانات" tabIndex={0} className="overflow-x-auto" dir="rtl">
                <table
                  aria-label="سجلات الحضور اليومية"
                  dir="rtl"
                  className="w-full text-sm"
                >
                  <thead>
                    <tr className="border-b bg-muted/60">
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-foreground"
                      >
                        الكود
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-foreground"
                      >
                        الاسم
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-foreground"
                      >
                        التاريخ
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-success"
                      >
                        وقت الحضور
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-destructive"
                      >
                        وقت المغادرة
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-destructive"
                      >
                        التأخير (دقيقة)
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-warning-text"
                      >
                        المغادرة المبكرة
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center font-semibold text-info"
                      >
                        إذن دخول (ساعات)
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center font-semibold text-info"
                      >
                        إذن خروج (ساعات)
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center font-semibold text-primary"
                      >
                        إضافي الحضور
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center font-semibold text-primary"
                      >
                        إضافي الانصراف
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-start font-semibold text-foreground"
                      >
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
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("in")}`}
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
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("out")}`}
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
                        <td className="px-4 py-3 text-start">
                          {record.lateMinutes > 0 ? (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("late")}`}
                            >
                              {record.lateMinutes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-start">
                          {record.earlyLeaveMin > 0 ? (
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("early")}`}
                            >
                              {record.earlyLeaveMin}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {permissionHoursLabel(record.entryPermissionMinutes)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {permissionHoursLabel(record.exitPermissionMinutes)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {record.overtimeInMinutes > 0 ? (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("overtime")}`}
                              >
                                {record.overtimeInMinutes} د
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                            <Button variant="bare"
                              type="button"
                              title="تفعيل أو إلغاء إضافي الحضور لهذا اليوم"
                              disabled={setOvertimeEnabled.isPending}
                              onClick={() =>
                                setOvertimeEnabled.mutate({
                                  empCd: record.empCd,
                                  workDate: record.workDate,
                                  type: "in",
                                  enabled: !record.overtimeInEnabled,
                                })
                              }
                              className={`inline-flex min-w-20 items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${record.overtimeInEnabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-background text-muted-foreground"}`}
                            >
                              <Timer size={13} />
                              {record.overtimeInEnabled ? "مفعّل" : "غير مفعّل"}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {record.overtimeOutMinutes > 0 ? (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${attendanceTimeClass("overtime")}`}
                              >
                                {record.overtimeOutMinutes} د
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                            <Button variant="bare"
                              type="button"
                              title="تفعيل أو إلغاء إضافي الانصراف لهذا اليوم"
                              disabled={setOvertimeEnabled.isPending}
                              onClick={() =>
                                setOvertimeEnabled.mutate({
                                  empCd: record.empCd,
                                  workDate: record.workDate,
                                  type: "out",
                                  enabled: !record.overtimeOutEnabled,
                                })
                              }
                              className={`inline-flex min-w-20 items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${record.overtimeOutEnabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-background text-muted-foreground"}`}
                            >
                              <Timer size={13} />
                              {record.overtimeOutEnabled
                                ? "مفعّل"
                                : "غير مفعّل"}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <AttendanceStatusBadge status={record.status} />
                            {(record.status === "holiday" || !record.shiftId) &&
                            record.firstIn &&
                            record.lastOut ? (
                              <Button variant="bare"
                                type="button"
                                title="تفعيل أو إلغاء احتساب يوم إجازة إضافي"
                                disabled={setOvertimeEnabled.isPending}
                                onClick={() =>
                                  setOvertimeEnabled.mutate({
                                    empCd: record.empCd,
                                    workDate: record.workDate,
                                    type: "day",
                                    enabled: !record.extraDayEnabled,
                                  })
                                }
                                className={`inline-flex min-w-24 items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${record.extraDayEnabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-background text-muted-foreground"}`}
                              >
                                <CalendarPlus size={13} />
                                {record.extraDayEnabled
                                  ? "يوم إضافي مفعّل"
                                  : "احتساب يوم إضافي"}
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <p
              role="status"
              className="py-8 text-center text-sm text-muted-foreground"
            >
              لا توجد سجلات ضمن الفترة المحددة
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
