import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import "./salary-home.css";
import { Input } from "@/components/ui/input";

const fmt = (n: number) =>
  Number(n).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function SalaryDashboard() {
  const now = new Date();
  const [period, setPeriod] = useState(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [year, month] = period.split("-").map(Number);
  const summaryQ = (trpc as any).salary.monthSummary.useQuery(
    { year, month },
    { refetchInterval: 60_000, refetchIntervalInBackground: false },
  );

  const summary = summaryQ.data as any;
  const staffCount = Number(summary?.staffCount ?? 0);
  const finalCount = Number(summary?.finalCount ?? 0);
  const figure = (value: number | undefined, suffix = " ج.م") => {
    if (summaryQ.isLoading) return "...";
    if (summaryQ.isError || value === undefined) return "غير متاح";
    return `${fmt(value)}${suffix}`;
  };

  const count = (value: number | undefined) =>
    summaryQ.isLoading
      ? "..."
      : summaryQ.isError || value === undefined
        ? "غير متاح"
        : Number(value).toLocaleString("ar-EG");

  let statusTitle = "";
  let statusBody = "";
  let statusTone = "border-border bg-muted/40 text-foreground";
  if (summaryQ.isError) {
    statusTitle = "تعذر تحميل ملخص الشهر";
    statusBody = "الأرقام أدناه غير متاحة. أعد المحاولة قبل اتخاذ أي قرار.";
    statusTone = "border-destructive/30 bg-destructive/5 text-destructive-text";
  } else if (!summaryQ.isLoading && staffCount === 0) {
    statusTitle = "لا يوجد موظفون في كشف هذا الشهر";
    statusBody =
      "أضف الموظفين والرواتب الأساسية أولاً، ثم افتح كشف الرواتب لإعداده.";
  } else if (!summaryQ.isLoading && finalCount >= staffCount) {
    statusTitle = "الكشف معتمد نهائياً";
    statusBody = `${staffCount} موظف في كشف ${month}/${year}.`;
    statusTone = "border-success/30 bg-success/10 text-success-text";
  } else if (!summaryQ.isLoading) {
    statusTitle = "الكشف مسودة";
    statusBody = `${finalCount} من ${staffCount} موظف معتمد. راجع الكشف ثم اعتمده.`;
    statusTone = "border-warning/40 bg-warning/10 text-warning-text";
  }

  return (
    <div className="salary-home-focused w-full" dir="rtl">
      <h1 className="salary-home-title">ملخص الرواتب</h1>
      <header className="salary-home-toolbar">
        <label className="salary-home-month" htmlFor="salary-summary-month">
          <span>الشهر</span>
          <Input bare
            id="salary-summary-month"
            type="month"
            dir="ltr"
            value={period}
            onChange={(event) => {
              if (event.target.validity.valid && event.target.value)
                setPeriod(event.target.value);
            }}
          />
        </label>
        <Link href="/salary/payroll" className="salary-home-payroll">
          كشف الرواتب
        </Link>
      </header>

      <div className="salary-home-ledger">
        {[
          { key: "center", label: "المركز", data: summary?.center },
          { key: "clinic", label: "العيادة", data: summary?.clinic },
        ].map(({ key, label, data }) => {
          const staff = Number(data?.staffCount ?? 0);
          const done = Number(data?.finalCount ?? 0);
          const pct = staff > 0 ? Math.min(100, Math.round((done / staff) * 100)) : 0;
          const headingId = `salary-totals-${key}`;
          return (
            <section key={key} className="salary-home-pane" aria-labelledby={headingId}>
              <h2 id={headingId} className="salary-home-eyebrow">
                {label} · صافي الرواتب المستحقة · {month}/{year}
              </h2>
              <p className="salary-home-net">{figure(data?.totalPay)}</p>
              {!summaryQ.isLoading && !summaryQ.isError && staff > 0 && (
                <div className="salary-home-approval">
                  <div
                    role="progressbar"
                    aria-label={`نسبة الموظفين المعتمدين في ${label}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    className="salary-home-meter"
                  >
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <p>
                    {done.toLocaleString("ar-EG")} من {staff.toLocaleString("ar-EG")} موظف معتمد
                  </p>
                </div>
              )}
              <dl className="salary-home-entries">
                <div>
                  <dt>إجمالي العمولات</dt>
                  <dd>{figure(data?.totalCommissions)}</dd>
                </div>
                <div>
                  <dt>إجمالي الجزاءات</dt>
                  <dd>{figure(data?.totalPenalties)}</dd>
                </div>
                <div>
                  <dt>الموظفون في الكشف</dt>
                  <dd>{count(data ? staff : undefined)}</dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>

      <section
        aria-live="polite"
        className={`salary-home-status rounded-md border ${statusTone}`}
      >
        <h2 className="text-xs font-bold">حالة الاحتساب والتدقيق</h2>
        <p className="text-base font-bold">
          {summaryQ.isLoading ? "جارٍ تحميل ملخص الشهر..." : statusTitle}
        </p>
        {statusBody && <p className="text-sm">{statusBody}</p>}
        {summaryQ.isError && (
          <Button variant="outline" onClick={() => summaryQ.refetch()}>
            إعادة المحاولة
          </Button>
        )}
        {!summaryQ.isLoading && !summaryQ.isError && staffCount === 0 && (
          <Link
            href="/salary/basics"
            className="inline-flex min-h-11 items-center text-sm font-bold underline"
          >
            تحضير الرواتب الأساسية
          </Link>
        )}
      </section>

      <nav aria-label="ترتيب العمل الشهري" className="salary-home-flow">
        <h2 className="salary-home-eyebrow">ترتيب العمل الشهري</h2>
        <ol>
          {[
            { href: "/salary/basics", label: "تحضير الرواتب الأساسية", note: "الأساسي والبدلات" },
            { href: "/salary/pools", label: "العمولات الشهرية", note: "الكشف والبنتاكام" },
            { href: "/salary/penalties", label: "الخصومات والسلف", note: "الجزاءات والتأمينات" },
            { href: "/salary/payroll", label: "كشف الرواتب", note: "احتساب واعتماد وطباعة" },
          ].map(({ href, label, note }, index) => (
            <li key={href}>
              <Link href={href}>
                <span className="salary-home-step" aria-hidden>
                  {(index + 1).toLocaleString("ar-EG")}
                </span>
                <span className="salary-home-step-text">
                  <strong>{label}</strong>
                  <small>{note}</small>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
