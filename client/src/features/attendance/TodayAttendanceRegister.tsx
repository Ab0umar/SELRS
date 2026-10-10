import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalToday } from "@/hooks/useLocalToday";
import { trpc } from "@/lib/trpc";
import { ROUTES } from "../../../../shared/routes";
import { Input } from "@/components/ui/input";

const statuses: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  leave: "إجازة",
  partial: "حضور جزئي",
  holiday: "عطلة",
  missing_checkout: "بصمة خروج ناقصة",
};

type TodayAttendanceRow = {
  empCd: string;
  empName: string | null;
  shiftId: number | null;
  firstIn: string | Date | null;
  lastOut: string | Date | null;
  status: string;
  lateMinutes: number | null;
};

function displayStatus(status: string, lateMinutes: number | null) {
  return status === "present" && Number(lateMinutes) > 0 ? "late" : status;
}

function timeLabel(value: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export default function TodayAttendanceRegister({
  canSeeReports,
}: {
  canSeeReports: boolean;
}) {
  const today = useLocalToday();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = trpc.attendance.dailyByDate.useQuery(
    { date: today },
    { refetchInterval: 30_000, refetchIntervalInBackground: false },
  );
  const records: TodayAttendanceRow[] = query.data ?? [];
  const needle = search.trim().toLocaleLowerCase();
  const filtered = records.filter(
    (row) =>
      (!needle ||
        `${row.empName ?? ""} ${row.empCd}`
          .toLocaleLowerCase()
          .includes(needle)) &&
      (!status || displayStatus(row.status, row.lateMinutes) === status),
  );

  return (
    <section
      className="attendance-today-register attendance-panel"
      aria-labelledby="today-register-title"
    >
      <header className="attendance-panel-heading flex flex-wrap items-center justify-between gap-3">
        <h2 id="today-register-title" className="text-base font-semibold">
          سجل اليوم
        </h2>
        {canSeeReports && (
          <Link
            href={ROUTES.attendanceReports}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary"
          >
            التقارير <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </header>
      <div className="attendance-register-filters">
        <label className="attendance-register-search">
          <Search
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <Input bare
            aria-label="البحث في سجل اليوم"
            placeholder="ابحث بالاسم أو الكود"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          aria-label="حالة الحضور في سجل اليوم"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">كل الحالات</option>
          {Object.entries(statuses).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {query.isLoading ? (
        <div
          className="space-y-3 p-5"
          role="status"
          aria-label="جارٍ تحميل سجل اليوم"
        >
          <p className="text-sm">جارٍ تحميل سجل حضور اليوم.</p>
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 p-5"
          role="alert"
        >
          <span className="text-sm">تعذر تحميل سجل اليوم.</span>
          <Button variant="outline" onClick={() => query.refetch()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : !filtered.length ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {records.length
            ? "لا توجد نتائج تطابق البحث أو الحالة. غيّر البحث أو اختر كل الحالات."
            : "لا توجد سجلات حضور اليوم. يتحدث السجل تلقائياً عند توفر البيانات."}
        </p>
      ) : (
        <div className="attendance-register-table-wrap">
          <table
            className="attendance-register-table"
            aria-label="سجل حضور اليوم"
          >
            <thead>
              <tr>
                <th scope="col">الموظف</th>
                <th scope="col">الدخول</th>
                <th scope="col">الخروج</th>
                <th scope="col">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const rowStatus = displayStatus(row.status, row.lateMinutes);
                return (
                  <tr key={`${row.empCd}-${row.shiftId ?? "none"}-${index}`}>
                    <td className="attendance-register-person">
                      <strong>{row.empName || "بدون اسم"}</strong>
                      <small>{row.empCd}</small>
                    </td>
                    <td data-label="الدخول" className="tabular-nums">
                      {timeLabel(row.firstIn)}
                    </td>
                    <td data-label="الخروج" className="tabular-nums">
                      {timeLabel(row.lastOut)}
                    </td>
                    <td>
                      <span
                        className="attendance-status"
                        data-status={rowStatus}
                      >
                        {statuses[rowStatus] ?? rowStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!query.isLoading && !query.isError && (
        <footer className="attendance-register-footer" role="status">
          السجلات المعروضة: {filtered.length} من {records.length}
        </footer>
      )}
    </section>
  );
}
