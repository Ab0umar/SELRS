import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Download, CheckCircle2, XCircle, Clock, FileDown } from 'lucide-react';
import { toast } from 'sonner';

const tRPC = trpc as any;

function fmt(date: string | Date | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString('ar-EG', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

interface SyncResult {
  success: boolean;
  recordsSeen: number;
  recordsInserted: number;
  recordsSkipped: number;
  duration?: number;
  error?: string;
}

export default function SyncStatus() {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const runsQ = tRPC.attendance.listSyncRuns?.useQuery?.(
    { limit: 10 },
    { refetchInterval: 15000, refetchOnWindowFocus: false }
  );

  const exportMut = tRPC.attendance.exportDevicePunches.useMutation({
    onSuccess: (result: any) => {
      if (!result.success || !result.punches?.length) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }
      const header = 'empNo,timestamp,direction,year,month,day,hour,minute,second';
      const rows = result.punches.map((p: any) =>
        `${p.empNo},${p.timestamp},${p.direction},${p.year},${p.month},${p.day},${p.hour},${p.minute},${p.second}`
      );
      const csv = [header, ...rows].join('\r\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `punches_${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${result.count} بصمة`);
    },
    onError: (e: any) => toast.error('خطأ في التصدير: ' + e.message),
  });

  const syncMut = tRPC.attendance.syncFromFKDevice.useMutation({
    onSuccess: (result: SyncResult) => {
      setLastResult(result);
      if (result.success) {
        toast.success(`تم استيراد ${result.recordsInserted} بصمة جديدة`);
        runsQ?.refetch?.();
      } else {
        toast.error('فشل التزامن: ' + (result.error ?? 'خطأ غير معروف'));
      }
    },
    onError: (e: any) => {
      toast.error('خطأ: ' + e.message);
    },
  });

  const handleSync = () => {
    const input: Record<string, unknown> = {};
    if (ip.trim()) input.ip = ip.trim();
    if (port.trim()) input.port = parseInt(port) || 5005;
    syncMut.mutate(input as any);
  };

  const busy = syncMut.isPending;

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">الجهاز</p>
        <h2 className="text-2xl font-bold text-foreground">تزامن البصمات</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          سحب البصمات من جهاز البصمة وحفظها في قاعدة البيانات المحلية
        </p>
      </div>

      {/* Manual sync card */}
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <h3 className="font-semibold text-base">سحب يدوي من الجهاز</h3>

        <div className="grid gap-3 sm:grid-cols-2 max-w-sm">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">IP الجهاز (اختياري)</label>
            <Input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.0.10"
              dir="ltr"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">المنفذ (اختياري)</label>
            <Input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="5005"
              dir="ltr"
              className="text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSync} disabled={busy || exportMut.isPending} className="gap-2">
            {busy
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {busy ? 'جاري السحب...' : 'سحب وحفظ في قاعدة البيانات'}
          </Button>
          <Button
            variant="outline"
            onClick={() => exportMut.mutate(ip.trim() ? { ip: ip.trim(), port: parseInt(port) || 5005 } : {} as any)}
            disabled={busy || exportMut.isPending}
            className="gap-2"
          >
            {exportMut.isPending
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />}
            {exportMut.isPending ? 'جاري التصدير...' : 'تصدير CSV'}
          </Button>
        </div>

        {lastResult && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            lastResult.success
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
              : 'border-destructive/30 bg-destructive/5 text-destructive'
          }`}>
            {lastResult.success ? (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">تم التزامن بنجاح</div>
                  <div className="mt-1 space-y-0.5 text-xs opacity-80">
                    <div>إجمالي السجلات: {lastResult.recordsSeen}</div>
                    <div>مُضافة جديدة: <span className="font-bold">{lastResult.recordsInserted}</span></div>
                    <div>مكررة (تجاهل): {lastResult.recordsSkipped}</div>
                    {lastResult.duration != null && (
                      <div>الوقت: {(lastResult.duration / 1000).toFixed(1)} ث</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium">فشل التزامن</div>
                  <div className="mt-1 text-xs opacity-80">{lastResult.error}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent sync runs */}
      {runsQ?.data?.runs?.length > 0 && (
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="border-b border-border px-4 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">آخر عمليات التزامن</h3>
          </div>
          <div className="divide-y divide-border">
            {runsQ.data.runs.map((run: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  {run.status === 'ok'
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-muted-foreground text-xs">{fmt(run.startedAt)}</span>
                </div>
                <div className="flex items-center gap-4 text-xs tabular-nums">
                  <span className="text-muted-foreground">رُئي: {run.recordsSeen ?? '—'}</span>
                  <span className="font-medium text-green-600">+{run.recordsInserted ?? 0}</span>
                  {run.errorMessage && (
                    <span className="text-destructive truncate max-w-[160px]">{run.errorMessage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
