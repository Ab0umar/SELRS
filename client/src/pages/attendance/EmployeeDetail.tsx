import { useRoute } from 'wouter';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import {
  ArrowRight, Calendar, Clock, FileText, ShieldCheck,
  TrendingDown, TrendingUp, Hourglass, CheckCircle2,
} from 'lucide-react';

const todayStr = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString().split('T')[0];
const thisYear = new Date().getFullYear();

const STATUS_AR: Record<string, string> = {
  present: 'حاضر', absent: 'غائب', leave: 'إجازة',
  partial: 'جزئي', holiday: 'عطلة', missing_checkout: 'بدون خروج',
};
const STATUS_CLS: Record<string, string> = {
  present: 'bg-success/10 text-success',
  absent: 'bg-destructive/10 text-destructive',
  leave: 'bg-primary/10 text-primary',
  partial: 'bg-warning/10 text-warning',
  holiday: 'bg-secondary/10 text-secondary',
  missing_checkout: 'bg-muted text-muted-foreground',
};

function fmt(date: string | Date | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

export default function EmployeeDetail() {
  const [, params] = useRoute('/attendance/employees/:empCd');
  const empCd = params?.empCd ?? '';

  // Date range for attendance history
  const [dateRange, setDateRange] = useState({
    fromDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    toDate: todayStr,
  });

  // Permission request form
  const [permForm, setPermForm] = useState({
    date: todayStr,
    type: 'out' as 'in' | 'out',
    durationMinutes: 60,
    note: '',
  });

  // Leave request form
  const [leaveForm, setLeaveForm] = useState({
    dateFrom: todayStr,
    dateTo: todayStr,
    type: 'annual' as 'annual' | 'sick',
    note: '',
  });

  const [permMsg, setPermMsg] = useState<string | null>(null);
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null);

  // Queries
  const employeeQuery = (trpc as any).attendance.employeesList.useQuery();
  const employee = employeeQuery.data?.employees?.find((e: any) => e.empCd === empCd);

  const dailyQuery = (trpc as any).attendance.dailyByEmployee.useQuery(
    { empCd, ...dateRange },
    { enabled: !!empCd }
  );

  const leaveBalanceQuery = (trpc as any).attendance.leaveBalance.useQuery(
    { empCd, year: thisYear },
    { enabled: !!empCd }
  );

  const permReportQuery = (trpc as any).attendance.permissionReport.useQuery(
    { from: firstOfMonth, to: todayStr },
    { enabled: !!empCd }
  );

  // Mutations
  const createPermMut = (trpc as any).attendance.createPermission.useMutation({
    onSuccess: () => {
      setPermMsg('✓ تم حفظ الإذن');
      permReportQuery.refetch();
      setPermForm({ date: todayStr, type: 'out', durationMinutes: 60, note: '' });
    },
    onError: (err: any) => setPermMsg(`✗ ${err.message}`),
  });

  const createLeaveMut = (trpc as any).attendance.createLeave.useMutation({
    onSuccess: () => {
      setLeaveMsg('✓ تم حفظ الإجازة');
      leaveBalanceQuery.refetch();
      setLeaveForm({ dateFrom: todayStr, dateTo: todayStr, type: 'annual', note: '' });
    },
    onError: (err: any) => setLeaveMsg(`✗ ${err.message}`),
  });

  // Compute current-month stats from daily records
  const thisMonthPrefix = firstOfMonth.slice(0, 7);
  const monthlyRecords = (dailyQuery.data ?? []).filter(
    (r: any) => String(r.workDate).startsWith(thisMonthPrefix)
  );
  const monthStats = {
    lateMins: monthlyRecords.reduce((s: number, r: any) => s + (r.lateMinutes ?? 0), 0),
    earlyMins: monthlyRecords.reduce((s: number, r: any) => s + (r.earlyLeaveMin ?? 0), 0),
  };

  // Permission stats for current month
  const empPermRow = (permReportQuery.data ?? []).find((r: any) => r.empCd === empCd);
  const permStats = {
    inMins: empPermRow?.totalInMins ?? 0,
    outMins: empPermRow?.totalOutMins ?? 0,
    inCount: empPermRow?.inCount ?? 0,
    outCount: empPermRow?.outCount ?? 0,
  };

  const leaveBalance = leaveBalanceQuery.data;

  const inputCls = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20';

  if (!empCd) {
    return (
      <div className="p-6 text-center text-muted-foreground">الموظف غير موجود</div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6" dir="rtl">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/attendance/employees" className="mb-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4" /> الموظفون
          </Link>
          {employee ? (
            <>
              <h1 className="text-2xl font-bold text-foreground">{employee.fullName}</h1>
              <p className="text-sm text-muted-foreground font-mono">{employee.empCd} · {employee.department || 'بدون قسم'}</p>
            </>
          ) : (
            <Skeleton className="h-8 w-48" />
          )}
        </div>
        {employee && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${employee.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
            {employee.active ? 'نشط' : 'غير نشط'}
          </span>
        )}
      </div>

      {/* ── Info Card ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Left column: stats */}
        <div className="space-y-4">

          {/* Leave balance */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <FileText className="h-4 w-4 text-primary" />
                رصيد الإجازات {thisYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {leaveBalanceQuery.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : leaveBalance ? (
                <>
                  {/* Annual */}
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">إجازة سنوية</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-foreground">{leaveBalance.annualAllocation}</div>
                        <div className="text-xs text-muted-foreground">المستحق</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-destructive">{leaveBalance.usedDays}</div>
                        <div className="text-xs text-muted-foreground">مستخدم</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-success">{leaveBalance.remainingDays}</div>
                        <div className="text-xs text-muted-foreground">متبقي</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (leaveBalance.usedDays / leaveBalance.annualAllocation) * 100)}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly stats */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Clock className="h-4 w-4 text-warning" />
                إحصائيات هذا الشهر
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 gap-3">
                <StatPill
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="تأخير"
                  value={`${monthStats.lateMins} د`}
                  tone="destructive"
                />
                <StatPill
                  icon={<TrendingDown className="h-3.5 w-3.5" />}
                  label="مغادرة مبكرة"
                  value={`${monthStats.earlyMins} د`}
                  tone="warning"
                />
                <StatPill
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                  label={`إذن دخول (${permStats.inCount})`}
                  value={`${permStats.inMins} د`}
                  tone="primary"
                />
                <StatPill
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                  label={`إذن خروج (${permStats.outCount})`}
                  value={`${permStats.outMins} د`}
                  tone="secondary"
                />
                <div className="col-span-2">
                  <StatPill
                    icon={<Hourglass className="h-3.5 w-3.5" />}
                    label="إجمالي الخصومات (تأخير + مبكر)"
                    value={`${monthStats.lateMins + monthStats.earlyMins} د`}
                    tone="muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: request forms */}
        <div className="space-y-4">

          {/* Permission request */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                طلب إذن
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {/* Type toggle */}
              <div className="flex overflow-hidden rounded-md border border-border">
                {(['out', 'in'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPermForm({ ...permForm, type: t })}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      permForm.type === t
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t === 'out' ? 'إذن خروج' : 'إذن دخول'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">التاريخ</label>
                  <input
                    type="date"
                    value={permForm.date}
                    onChange={(e) => setPermForm({ ...permForm, date: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">المدة (دقيقة)</label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={permForm.durationMinutes}
                    onChange={(e) => setPermForm({ ...permForm, durationMinutes: parseInt(e.target.value) || 60 })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">ملاحظة</label>
                <input
                  type="text"
                  value={permForm.note}
                  onChange={(e) => setPermForm({ ...permForm, note: e.target.value })}
                  placeholder="اختياري"
                  className={inputCls}
                />
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setPermMsg(null);
                  createPermMut.mutate({ empCd, ...permForm });
                }}
                disabled={createPermMut.isPending}
                className="w-full"
              >
                <CheckCircle2 className="ml-2 h-4 w-4" />
                {createPermMut.isPending ? 'جارٍ الحفظ…' : 'حفظ الإذن'}
              </Button>

              {permMsg && (
                <p className={`text-center text-xs font-medium ${permMsg.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>
                  {permMsg}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Leave request */}
          <Card className="border-border">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                طلب إجازة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {/* Type toggle */}
              <div className="flex overflow-hidden rounded-md border border-border">
                {(['annual', 'sick'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLeaveForm({ ...leaveForm, type: t })}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      leaveForm.type === t
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t === 'annual' ? 'سنوية' : 'مرضية'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">من</label>
                  <input
                    type="date"
                    value={leaveForm.dateFrom}
                    onChange={(e) => setLeaveForm({ ...leaveForm, dateFrom: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">إلى</label>
                  <input
                    type="date"
                    value={leaveForm.dateTo}
                    min={leaveForm.dateFrom}
                    onChange={(e) => setLeaveForm({ ...leaveForm, dateTo: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">ملاحظة</label>
                <input
                  type="text"
                  value={leaveForm.note}
                  onChange={(e) => setLeaveForm({ ...leaveForm, note: e.target.value })}
                  placeholder="اختياري"
                  className={inputCls}
                />
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setLeaveMsg(null);
                  createLeaveMut.mutate({ empCd, ...leaveForm });
                }}
                disabled={createLeaveMut.isPending}
                className="w-full"
              >
                <CheckCircle2 className="ml-2 h-4 w-4" />
                {createLeaveMut.isPending ? 'جارٍ الحفظ…' : 'حفظ الإجازة'}
              </Button>

              {leaveMsg && (
                <p className={`text-center text-xs font-medium ${leaveMsg.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>
                  {leaveMsg}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Attendance History ── */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              سجل الحضور
            </CardTitle>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">من</label>
                <input
                  type="date"
                  value={dateRange.fromDate}
                  onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">إلى</label>
                <input
                  type="date"
                  value={dateRange.toDate}
                  onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => dailyQuery.refetch()}>
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {dailyQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !dailyQuery.data?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد سجلات في هذه الفترة</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-right font-semibold text-foreground">التاريخ</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">دخول</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">خروج</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">عمل (د)</th>
                    <th className="px-4 py-3 text-right font-semibold text-destructive">تأخير</th>
                    <th className="px-4 py-3 text-right font-semibold text-warning">مبكر</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyQuery.data.map((r: any) => (
                    <tr key={r.workDate} className="border-b transition-colors hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{r.workDate}</td>
                      <td className="px-4 py-2 text-foreground">{fmt(r.firstIn)}</td>
                      <td className="px-4 py-2 text-foreground">{fmt(r.lastOut)}</td>
                      <td className="px-4 py-2 text-foreground">{r.workedMinutes ?? '—'}</td>
                      <td className="px-4 py-2">
                        {r.lateMinutes > 0
                          ? <span className="font-semibold text-destructive">{r.lateMinutes} د</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        {r.earlyLeaveMin > 0
                          ? <span className="font-semibold text-warning">{r.earlyLeaveMin} د</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLS[r.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {STATUS_AR[r.status] ?? r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatPill({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'secondary' | 'warning' | 'destructive' | 'muted';
}) {
  const cls = {
    primary: 'border-primary/20 bg-primary/5 text-primary',
    secondary: 'border-secondary/20 bg-secondary/5 text-secondary',
    warning: 'border-warning/30 bg-warning/5 text-warning',
    destructive: 'border-destructive/20 bg-destructive/5 text-destructive',
    muted: 'border-border bg-muted/30 text-muted-foreground',
  }[tone];

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${cls}`}>
      <div className="flex items-center gap-2 text-xs font-medium">
        {icon}
        {label}
      </div>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
}
