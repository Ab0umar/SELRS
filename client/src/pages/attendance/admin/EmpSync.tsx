import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const tRPC = trpc as any;

interface EmpSyncResult {
  success: boolean;
  inserted: number;
  updated: number;
  total: number;
  employees?: { empNo: string; name: string }[];
}

export default function EmpSync() {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [result, setResult] = useState<EmpSyncResult | null>(null);

  const mut = tRPC.attendance.syncEmployeesFromDevice.useMutation({
    onSuccess: (r: EmpSyncResult) => {
      setResult(r);
      toast.success(`تم تزامن الموظفين: ${r.inserted} جديد، ${r.updated} محدَّث`);
    },
    onError: (e: any) => toast.error('خطأ: ' + e.message),
  });

  const handleSync = () => {
    const input: Record<string, unknown> = {};
    if (ip.trim()) input.ip = ip.trim();
    if (port.trim()) input.port = parseInt(port) || 5005;
    mut.mutate(input as any);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">الجهاز</p>
        <h2 className="text-2xl font-bold text-foreground">تزامن الموظفين</h2>
        <p className="mt-1 text-sm text-muted-foreground">سحب أسماء وأكواد الموظفين من ذاكرة الجهاز وحفظها محلياً</p>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 space-y-4 max-w-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">IP الجهاز</label>
            <Input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.0.10" dir="ltr" className="text-sm" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted-foreground">المنفذ</label>
            <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="5005" dir="ltr" className="text-sm" />
          </div>
        </div>

        <Button onClick={handleSync} disabled={mut.isPending} className="gap-2 w-full">
          {mut.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          {mut.isPending ? 'جاري التزامن...' : 'تزامن الموظفين من الجهاز'}
        </Button>
      </div>

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 px-4 py-3 text-sm text-green-800 dark:text-green-200 max-w-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">تم تزامن الموظفين</div>
              <div className="mt-1 text-xs opacity-80 space-y-0.5">
                <div>إجمالي: {result.total} موظف</div>
                <div>مُضافون جدد: <span className="font-bold">{result.inserted}</span></div>
                <div>محدَّثون: {result.updated}</div>
              </div>
              {(result.employees?.length ?? 0) > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto space-y-0.5 text-xs">
                  {result.employees!.slice(0, 30).map((e) => (
                    <div key={e.empNo} className="flex gap-2">
                      <span className="tabular-nums w-8 shrink-0">{e.empNo}</span>
                      <span>{e.name}</span>
                    </div>
                  ))}
                  {(result.employees?.length ?? 0) > 30 && (
                    <div className="opacity-60">و {result.employees!.length - 30} آخرون...</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
