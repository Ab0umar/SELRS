import { useState } from 'react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Calendar, Clock, ShieldCheck, TrendingDown, TrendingUp,
  Hourglass, AlertCircle,
} from 'lucide-react';

const todayStr = new Date().toISOString().split('T')[0];

function fmt(min: number): string {
  if (!min) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
}

function StatBox({ label, value, sub, cls }: { label: string; value: string | number; sub?: string; cls?: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-lg border px-4 py-3 ${cls ?? 'border-border bg-card'}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function MyAttendanceProfile() {
  const [permForm, setPermForm] = useState({
    date: todayStr, type: 'out' as 'in' | 'out', durationMinutes: 60, note: '',
  });
  const [leaveForm, setLeaveForm] = useState({
    dateFrom: todayStr, dateTo: todayStr, type: 'annual' as 'annual' | 'sick', note: '',
  });
  const [permMsg, setPermMsg] = useState<string | null>(null);
  const [leaveMsg, setLeaveMsg] = useState<string | null>(null);

  const profileQuery = (trpc as any).attendance.myAttendanceProfile.useQuery();
  const data = profileQuery.data;

  const permMut = (trpc as any).attendance.myRequestPermission.useMutation({
    onSuccess: () => {
      setPermMsg('✓ تم إرسال طلب الإذن');
      profileQuery.refetch();
      setPermForm({ date: todayStr, type: 'out', durationMinutes: 60, note: '' });
    },
    onError: (err: any) => setPermMsg(`✗ ${err.message}`),
  });

  const leaveMut = (trpc as any).attendance.myRequestLeave.useMutation({
    onSuccess: () => {
      setLeaveMsg('✓ تم إرسال طلب الإجازة');
      profileQuery.refetch();
      setLeaveForm({ dateFrom: todayStr, dateTo: todayStr, type: 'annual', note: '' });
    },
    onError: (err: any) => setLeaveMsg(`✗ ${err.message}`),
  });

  if (profileQuery.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data?.linked) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">حسابك غير مرتبط بسجل موظف في الحضور.</p>
        <p className="text-xs text-muted-foreground">تواصل مع المسؤول لربط حسابك.</p>
      </div>
    );
  }

  const bal = data.leaveBalance;
  const stats = data.monthStats;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
    <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
      <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
        <ArrowRight className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-base font-semibold">حضوري</h1>
        <p className="text-xs text-muted-foreground">رصيد الإجازات والإحصائيات وطلب الأذونات</p>
      </div>
    </div>
    <div className="space-y-5 p-4">
      {/* Leave balance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-primary" />
            رصيد الإجازات {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="المخصص سنوياً" value={bal.annualAllocation} sub="يوم" />
          <StatBox label="المستخدم" value={bal.usedAnnual} sub="يوم"
            cls="border-destructive/30 bg-destructive/5 text-foreground" />
          <StatBox label="المتبقي" value={bal.remainingAnnual} sub="يوم"
            cls="border-success/30 bg-success/5 text-foreground" />
          <StatBox label="إجازة مرضية" value={bal.usedSick} sub="يوم هذا العام" />
        </CardContent>
      </Card>

      {/* Monthly stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-orange-500" />
            إحصائيات هذا الشهر
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="تأخير" value={fmt(stats.lateMins)}
            cls="border-destructive/20 bg-destructive/5 text-foreground" />
          <StatBox label="خروج مبكر" value={fmt(stats.earlyMins)}
            cls="border-amber-200 bg-amber-50 text-foreground" />
          <StatBox label="إجمالي (تأخير+مبكر)" value={fmt(stats.lateMins + stats.earlyMins)} />
          <StatBox label="أذونات دخول" value={fmt(stats.permInMins)}
            cls="border-blue-200 bg-blue-50 text-foreground" />
        </CardContent>
        {stats.permOutMins > 0 && (
          <CardContent className="pt-0">
            <div className="rounded-md border border-border px-4 py-2 text-sm">
              <span className="text-muted-foreground">أذونات خروج هذا الشهر: </span>
              <span className="font-medium">{fmt(stats.permOutMins)}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Pending requests */}
      {(data.pendingLeaves.length > 0 || data.pendingPerms.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hourglass className="h-4 w-4 text-amber-500" />
              طلبات قيد الانتظار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingLeaves.map((l: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                <span>إجازة {l.type === 'annual' ? 'سنوية' : 'مرضية'}: {String(l.dateFrom).slice(0, 10)} → {String(l.dateTo).slice(0, 10)}</span>
              </div>
            ))}
            {data.pendingPerms.map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                <span>إذن {p.type === 'in' ? 'دخول متأخر' : 'خروج مبكر'} — {p.durationMinutes} دقيقة ({String(p.date).slice(0, 10)})</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Permission request */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-blue-500" />
            طلب إذن
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">النوع</label>
              <select
                value={permForm.type}
                onChange={e => setPermForm({ ...permForm, type: e.target.value as 'in' | 'out' })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="out">خروج مبكر</option>
                <option value="in">دخول متأخر</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">التاريخ</label>
              <input
                type="date" value={permForm.date}
                onChange={e => setPermForm({ ...permForm, date: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">المدة (دقيقة)</label>
              <input
                type="number" min={15} max={480} step={15} value={permForm.durationMinutes}
                onChange={e => setPermForm({ ...permForm, durationMinutes: Number(e.target.value) })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">ملاحظة</label>
              <input
                type="text" value={permForm.note} placeholder="اختياري"
                onChange={e => setPermForm({ ...permForm, note: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          {permMsg && (
            <p className={`text-sm ${permMsg.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>{permMsg}</p>
          )}
          <Button size="sm" disabled={permMut.isPending}
            onClick={() => {
              setPermMsg(null);
              permMut.mutate(permForm);
            }}
          >
            {permMut.isPending ? 'جاري الإرسال…' : 'إرسال الطلب'}
          </Button>
        </CardContent>
      </Card>

      {/* Leave request */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            طلب إجازة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">النوع</label>
              <select
                value={leaveForm.type}
                onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value as 'annual' | 'sick' })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="annual">سنوية</option>
                <option value="sick">مرضية</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 col-span-1" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">من</label>
              <input
                type="date" value={leaveForm.dateFrom}
                onChange={e => setLeaveForm({ ...leaveForm, dateFrom: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">إلى</label>
              <input
                type="date" value={leaveForm.dateTo}
                onChange={e => setLeaveForm({ ...leaveForm, dateTo: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs text-muted-foreground">ملاحظة</label>
              <input
                type="text" value={leaveForm.note} placeholder="اختياري"
                onChange={e => setLeaveForm({ ...leaveForm, note: e.target.value })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          {leaveMsg && (
            <p className={`text-sm ${leaveMsg.startsWith('✓') ? 'text-success' : 'text-destructive'}`}>{leaveMsg}</p>
          )}
          <Button size="sm" disabled={leaveMut.isPending}
            onClick={() => {
              setLeaveMsg(null);
              leaveMut.mutate(leaveForm);
            }}
          >
            {leaveMut.isPending ? 'جاري الإرسال…' : 'إرسال الطلب'}
          </Button>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
