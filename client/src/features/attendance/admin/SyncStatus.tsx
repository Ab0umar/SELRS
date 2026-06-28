import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  FileDown,
  ArrowDownToLine,
  History,
} from "lucide-react";
import { toast } from "sonner";

const tRPC = trpc as any;

function fmt(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const runsQ = tRPC.attendance.listSyncRuns?.useQuery?.(
    { limit: 8 },
    { refetchInterval: 15000, refetchOnWindowFocus: false },
  );

  const exportMut = tRPC.attendance.exportDevicePunches.useMutation({
    onSuccess: (result: any) => {
      if (!result.success || !result.punches?.length) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      const header =
        "empNo,timestamp,direction,year,month,day,hour,minute,second";
      const rows = result.punches.map(
        (p: any) =>
          `${p.empNo},${p.timestamp},${p.direction},${p.year},${p.month},${p.day},${p.hour},${p.minute},${p.second}`,
      );
      const csv = [header, ...rows].join("\r\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `punches_${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`تم تصدير ${result.count} بصمة بنجاح`);
    },
    onError: (e: any) => toast.error("خطأ في التصدير: " + e.message),
  });

  const syncMut = tRPC.attendance.syncFromFKDevice.useMutation({
    onSuccess: (result: SyncResult) => {
      setLastResult(result);
      if (result.success) {
        toast.success(`تم استيراد ${result.recordsInserted} بصمة جديدة`);
        runsQ?.refetch?.();
      } else {
        toast.error("فشل التزامن: " + (result.error ?? "خطأ غير معروف"));
      }
    },
    onError: (e: any) => {
      toast.error("خطأ: " + e.message);
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
    <div className="space-y-6" dir="rtl">
      <Card className="border border-slate-100 shadow-lg shadow-slate-100/80 bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300">
        <CardHeader className="pb-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-slate-50/30 to-white">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 shrink-0">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            سحب بصمات الحضور اليدوي
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">عنوان IP (اختياري)</label>
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="تلقائي من الإعدادات"
                dir="ltr"
                className="text-xs border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono py-1.5 h-auto rounded-lg"
              />
            </div>
            <div className="w-24 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 block">المنفذ</label>
              <Input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="5005"
                dir="ltr"
                className="text-xs border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 font-mono py-1.5 h-auto rounded-lg"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            * اتركه فارغاً ليقوم النظام بالاتصال مباشرة بعنوان IP المثبت في نموذج الإعدادات.
          </p>

          <div className="flex gap-2 pt-2 border-t border-slate-50">
            <Button
              onClick={handleSync}
              disabled={busy || exportMut.isPending}
              className="text-xs font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg py-2 h-auto flex-1 gap-1.5 shadow-md shadow-teal-100/50 hover:shadow-lg transition-all"
            >
              {busy ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {busy ? "جاري السحب..." : "سحب البصمات"}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportMut.mutate(
                  ip.trim()
                    ? { ip: ip.trim(), port: parseInt(port) || 5005 }
                    : ({} as any),
                )
              }
              disabled={busy || exportMut.isPending}
              className="text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg py-2 h-auto gap-1.5"
            >
              {exportMut.isPending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              {exportMut.isPending ? "جاري..." : "تصدير CSV"}
            </Button>
          </div>

          {lastResult && (
            <Alert
              variant="default"
              className={`py-2.5 px-3 text-right animate-in fade-in slide-in-from-top-1 duration-200 ${
                lastResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-md shadow-emerald-50/30"
                  : "border-rose-200 bg-rose-50 text-rose-800 shadow-md shadow-rose-50/30"
              }`}
            >
              {lastResult.success ? (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 float-right ml-2 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold">تم سحب البيانات بنجاح</div>
                    <div className="mt-1 space-y-0.5 font-medium opacity-90 text-[11px]">
                      <div>سجلات مقروءة: {lastResult.recordsSeen}</div>
                      <div>سجلات جديدة: {lastResult.recordsInserted}</div>
                      <div>سجلات مكررة: {lastResult.recordsSkipped}</div>
                      {lastResult.duration != null && (
                        <div>الزمن المستغرق: {(lastResult.duration / 1000).toFixed(1)} ثانية</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-rose-600 float-right ml-2 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold">فشل عملية المزامنة</div>
                    <div className="mt-0.5 font-mono">{lastResult.error}</div>
                  </div>
                </div>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent sync runs timeline */}
      {runsQ?.data?.runs?.length > 0 && (
        <Card className="border border-slate-100 shadow-lg shadow-slate-100/80 bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-slate-50/30 to-white flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <div className="p-1 rounded bg-teal-50 text-teal-600 shrink-0">
                <History className="w-3.5 h-3.5" />
              </div>
              سجل العمليات الأخيرة
            </CardTitle>
            <Clock className="h-3.5 w-3.5 text-slate-400" />
          </CardHeader>
          <CardContent className="p-0 bg-white">
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {runsQ.data.runs.map((run: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    {run.status === "ok" ? (
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    ) : (
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                    <span className="text-slate-500 font-mono text-[10px]">
                      {fmt(run.startedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[10px]">
                    <span className="text-slate-400">
                      سجلات: {run.recordsSeen ?? 0}
                    </span>
                    <span className="font-bold text-emerald-600">
                      +{run.recordsInserted ?? 0}
                    </span>
                    {run.errorMessage && (
                      <span className="text-rose-500 truncate max-w-[120px]" title={run.errorMessage}>
                        {run.errorMessage}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
